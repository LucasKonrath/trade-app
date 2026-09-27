import { prisma } from "@/lib/prisma";
import { GameSlug, ListingKind, OfferType, Prisma } from "@prisma/client";
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

export type ListingIntent = "TRADE" | "CASH" | "ALL";

export type BrowseArgs = {
  q?: string;
  game?: GameSlug;
  kind?: ListingKind;
  intent?: ListingIntent;
  excludeUserId?: string;
  take?: number;
  skip?: number;
};

export async function browseListings({
  q,
  game,
  kind,
  intent,
  excludeUserId,
  take = 48,
  skip = 0,
}: BrowseArgs) {
  const where: Prisma.ListingWhereInput = {};
  if (kind) where.kind = kind;
  if (excludeUserId) where.userId = { not: excludeUserId };
  if (intent === "TRADE") where.offerType = { in: ["TRADE_ONLY", "TRADE_OR_CASH"] };
  else if (intent === "CASH") where.offerType = { in: ["CASH_ONLY", "TRADE_OR_CASH"] };
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
 * Only trade-eligible listings count — cash-only listings are excluded.
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
  const tradeEligible = { offerType: { in: ["TRADE_ONLY", "TRADE_OR_CASH"] as OfferType[] } };

  const myListings = await prisma.listing.findMany({
    where: { userId, ...gameScope, ...tradeEligible },
    select: { cardId: true, kind: true },
  });

  const myHaveIds = myListings.filter((l) => l.kind === "HAVE").map((l) => l.cardId);
  const myWantIds = myListings.filter((l) => l.kind === "WANT").map((l) => l.cardId);

  if (myHaveIds.length === 0 || myWantIds.length === 0) return [];

  // Users who WANT something I HAVE (trade-eligible only).
  const theyWant = await prisma.listing.findMany({
    where: {
      kind: "WANT",
      cardId: { in: myHaveIds },
      userId: { not: userId },
      ...gameScope,
      ...tradeEligible,
    },
    select: { userId: true, cardId: true },
  });

  // Users who HAVE something I WANT (trade-eligible only).
  const theyHave = await prisma.listing.findMany({
    where: {
      kind: "HAVE",
      cardId: { in: myWantIds },
      userId: { not: userId },
      ...gameScope,
      ...tradeEligible,
    },
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

export async function getMyTrades(userId: string) {
  // Requester sees all their trades (including OPEN drafts).
  // Responder only sees trades that have been sent (status != OPEN).
  return prisma.trade.findMany({
    where: {
      OR: [
        { requesterId: userId },
        { responderId: userId, status: { not: "OPEN" } },
      ],
    },
    include: {
      requester: { select: { id: true, handle: true, name: true, image: true } },
      responder: { select: { id: true, handle: true, name: true, image: true } },
      items: { select: { id: true, direction: true, cardId: true } },
    },
    orderBy: [{ updatedAt: "desc" }],
  });
}

export async function getTradeForUser(tradeId: string, userId: string) {
  const trade = await prisma.trade.findUnique({
    where: { id: tradeId },
    include: {
      requester: { select: { id: true, handle: true, name: true, image: true } },
      responder: { select: { id: true, handle: true, name: true, image: true } },
      items: {
        include: {
          card: {
            include: {
              set: { select: { name: true, code: true } },
              game: { select: { slug: true } },
            },
          },
        },
      },
    },
  });
  if (!trade) return null;
  const isRequester = trade.requesterId === userId;
  const isResponder = trade.responderId === userId;
  if (!isRequester && !isResponder) return null;
  // Responder cannot see the trade until it's been sent.
  if (isResponder && !isRequester && trade.status === "OPEN") return null;
  return trade;
}

export type CashMatch = {
  card: {
    id: string;
    name: string;
    imageUrl: string | null;
    number: string | null;
    rarity: string | null;
    orientation: string | null;
    set: { name: string };
    game: { slug: string };
  };
  myMaxCents: number;
  sellers: {
    listingId: string;
    userId: string;
    handle: string | null;
    name: string | null;
    image: string | null;
    priceCents: number;
    condition: string | null;
    note: string | null;
    offerType: OfferType;
    quantity: number;
  }[];
};

/**
 * For each of my WANT listings with a max price, find HAVE listings
 * (from other users) priced at or below my max. Ordered by savings
 * from my max — cheapest first.
 */
export async function findCashMatches(userId: string): Promise<CashMatch[]> {
  const myWants = await prisma.listing.findMany({
    where: {
      userId,
      kind: "WANT",
      priceCents: { not: null },
      offerType: { in: ["CASH_ONLY", "TRADE_OR_CASH"] as OfferType[] },
      card: { game: { slug: { in: ENABLED_GAMES } } },
    },
    include: {
      card: {
        include: {
          set: { select: { name: true } },
          game: { select: { slug: true } },
        },
      },
    },
  });

  const results: CashMatch[] = [];
  for (const want of myWants) {
    const sellers = await prisma.listing.findMany({
      where: {
        kind: "HAVE",
        cardId: want.cardId,
        userId: { not: userId },
        priceCents: { not: null, lte: want.priceCents! },
        offerType: { in: ["CASH_ONLY", "TRADE_OR_CASH"] as OfferType[] },
      },
      include: {
        user: { select: { id: true, handle: true, name: true, image: true } },
      },
      orderBy: { priceCents: "asc" },
      take: 20,
    });
    if (sellers.length === 0) continue;
    results.push({
      card: {
        id: want.card.id,
        name: want.card.name,
        imageUrl: want.card.imageUrl,
        number: want.card.number,
        rarity: want.card.rarity,
        orientation: want.card.orientation,
        set: want.card.set,
        game: want.card.game,
      },
      myMaxCents: want.priceCents!,
      sellers: sellers.map((s) => ({
        listingId: s.id,
        userId: s.user.id,
        handle: s.user.handle,
        name: s.user.name,
        image: s.user.image,
        priceCents: s.priceCents!,
        condition: s.condition,
        note: s.note,
        offerType: s.offerType,
        quantity: s.quantity,
      })),
    });
  }

  // Cards where we saved the most money first (bigger gap between my max and cheapest seller)
  results.sort((a, b) => {
    const savingsA = a.myMaxCents - a.sellers[0].priceCents;
    const savingsB = b.myMaxCents - b.sellers[0].priceCents;
    return savingsB - savingsA;
  });

  return results;
}

export async function getCardWithListings(cardId: string, viewerId?: string) {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: {
      set: { select: { name: true, code: true } },
      game: { select: { slug: true, name: true } },
      listings: {
        include: {
          user: { select: { id: true, handle: true, name: true, image: true } },
        },
        orderBy: [{ kind: "asc" }, { priceCents: "asc" }, { createdAt: "desc" }],
      },
    },
  });
  if (!card) return null;

  const mine = viewerId ? card.listings.filter((l) => l.userId === viewerId) : [];
  const others = card.listings.filter((l) => (viewerId ? l.userId !== viewerId : true));
  const sellers = others.filter((l) => l.kind === "HAVE");
  const buyers = others.filter((l) => l.kind === "WANT");

  return { card, mine, sellers, buyers };
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
