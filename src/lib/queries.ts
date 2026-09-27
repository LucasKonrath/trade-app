import { prisma } from "@/lib/prisma";
import { GameSlug, ListingKind, Prisma } from "@prisma/client";
import { ENABLED_GAMES } from "@/lib/config";

export type CardSearchArgs = {
  q?: string;
  game?: GameSlug;
  setId?: string;
  take?: number;
  skip?: number;
};

export async function searchCards({ q, game, setId, take = 48, skip = 0 }: CardSearchArgs) {
  const where: Prisma.CardWhereInput = {};
  const gameFilter: GameSlug[] = game && ENABLED_GAMES.includes(game) ? [game] : ENABLED_GAMES;
  where.game = { slug: { in: gameFilter } };
  if (setId) where.setId = setId;
  if (q && q.trim()) where.name = { contains: q.trim(), mode: "insensitive" };

  const [items, total] = await Promise.all([
    prisma.card.findMany({
      where,
      include: { set: { select: { name: true, code: true } }, game: { select: { slug: true } } },
      orderBy: [{ name: "asc" }],
      take,
      skip,
    }),
    prisma.card.count({ where }),
  ]);
  return { items, total };
}

export async function getMyListings(userId: string) {
  return prisma.listing.findMany({
    where: { userId, card: { game: { slug: { in: ENABLED_GAMES } } } },
    include: {
      card: {
        include: {
          set: { select: { name: true, code: true } },
          game: { select: { slug: true } },
        },
      },
    },
    orderBy: [{ kind: "asc" }, { createdAt: "desc" }],
  });
}

export type BrowseArgs = {
  q?: string;
  game?: GameSlug;
  kind?: ListingKind;
  excludeUserId?: string;
  take?: number;
  skip?: number;
};

export async function browseListings({
  q,
  game,
  kind,
  excludeUserId,
  take = 48,
  skip = 0,
}: BrowseArgs) {
  const where: Prisma.ListingWhereInput = {};
  if (kind) where.kind = kind;
  if (excludeUserId) where.userId = { not: excludeUserId };
  const gameFilter: GameSlug[] = game && ENABLED_GAMES.includes(game) ? [game] : ENABLED_GAMES;
  where.card = { game: { slug: { in: gameFilter } } };
  if (q && q.trim()) where.card.name = { contains: q.trim(), mode: "insensitive" };

  const [items, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      include: {
        user: { select: { handle: true, name: true, image: true } },
        card: {
          include: {
            set: { select: { name: true, code: true } },
            game: { select: { slug: true } },
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take,
      skip,
    }),
    prisma.listing.count({ where }),
  ]);

  return { items, total };
}

/**
 * Mutual match: users B where
 *   A.HAVE ∩ B.WANT ≠ ∅   AND   A.WANT ∩ B.HAVE ≠ ∅
 *
 * Returns each candidate with the concrete card ids on each side of the trade.
 */
export type Match = {
  userId: string;
  handle: string | null;
  name: string | null;
  image: string | null;
  theyWantIds: string[]; // cards A has that B wants (A → B)
  iWantIds: string[]; // cards B has that A wants (B → A)
};

export async function findMatches(userId: string): Promise<Match[]> {
  const gameScope = { card: { game: { slug: { in: ENABLED_GAMES } } } };

  const myListings = await prisma.listing.findMany({
    where: { userId, ...gameScope },
    select: { cardId: true, kind: true },
  });

  const myHaveIds = myListings.filter((l) => l.kind === "HAVE").map((l) => l.cardId);
  const myWantIds = myListings.filter((l) => l.kind === "WANT").map((l) => l.cardId);

  if (myHaveIds.length === 0 || myWantIds.length === 0) return [];

  // Users who WANT something I HAVE.
  const theyWant = await prisma.listing.findMany({
    where: { kind: "WANT", cardId: { in: myHaveIds }, userId: { not: userId }, ...gameScope },
    select: { userId: true, cardId: true },
  });

  // Users who HAVE something I WANT.
  const theyHave = await prisma.listing.findMany({
    where: { kind: "HAVE", cardId: { in: myWantIds }, userId: { not: userId }, ...gameScope },
    select: { userId: true, cardId: true },
  });

  const theyWantByUser = new Map<string, Set<string>>();
  for (const l of theyWant) {
    if (!theyWantByUser.has(l.userId)) theyWantByUser.set(l.userId, new Set());
    theyWantByUser.get(l.userId)!.add(l.cardId);
  }
  const theyHaveByUser = new Map<string, Set<string>>();
  for (const l of theyHave) {
    if (!theyHaveByUser.has(l.userId)) theyHaveByUser.set(l.userId, new Set());
    theyHaveByUser.get(l.userId)!.add(l.cardId);
  }

  const matchedUserIds = [...theyWantByUser.keys()].filter((id) => theyHaveByUser.has(id));
  if (matchedUserIds.length === 0) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: matchedUserIds } },
    select: { id: true, handle: true, name: true, image: true },
  });

  const matches: Match[] = users.map((u) => ({
    userId: u.id,
    handle: u.handle,
    name: u.name,
    image: u.image,
    theyWantIds: [...(theyWantByUser.get(u.id) ?? [])],
    iWantIds: [...(theyHaveByUser.get(u.id) ?? [])],
  }));

  // Rank: reward balanced two-way overlap.
  matches.sort((a, b) => {
    const scoreA = Math.min(a.theyWantIds.length, a.iWantIds.length) * 100 + a.theyWantIds.length + a.iWantIds.length;
    const scoreB = Math.min(b.theyWantIds.length, b.iWantIds.length) * 100 + b.theyWantIds.length + b.iWantIds.length;
    return scoreB - scoreA;
  });

  return matches;
}

export async function getCardsByIds(ids: string[]) {
  if (ids.length === 0) return [];
  return prisma.card.findMany({
    where: { id: { in: ids } },
    include: {
      set: { select: { name: true, code: true } },
      game: { select: { slug: true } },
    },
  });
}
