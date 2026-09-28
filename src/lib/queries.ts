import { prisma } from "@/lib/prisma";
import { GameSlug, ListingKind, OfferType, Prisma } from "@prisma/client";
import { ENABLED_GAMES } from "@/lib/config";

export type CardSearchArgs = {
  q?: string;
  game?: GameSlug;
  setCode?: string;
  rarity?: string;
  cardType?: string;
  domain?: string;
  region?: string;
  take?: number;
  skip?: number;
};

export async function searchCards({
  q,
  game,
  setCode,
  rarity,
  cardType,
  domain,
  region,
  take = 48,
  skip = 0,
}: CardSearchArgs) {
  const where: Prisma.CardWhereInput = {};
  const gameFilter: GameSlug[] = game && ENABLED_GAMES.includes(game) ? [game] : ENABLED_GAMES;
  where.game = { slug: { in: gameFilter } };
  if (setCode) where.set = { code: setCode };
  if (rarity) where.rarity = rarity;
  if (cardType) where.cardType = cardType;
  if (domain) where.domains = { has: domain };
  if (region) where.regions = { has: region };
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

/**
 * Distinct values for the filter dropdowns on /cards.
 * Scoped to currently enabled games.
 */
export async function getCardFilterOptions() {
  const [sets, rarityRows, typeRows, domainRows, regionRows] = await Promise.all([
    prisma.cardSet.findMany({
      where: { game: { slug: { in: ENABLED_GAMES } } },
      select: { code: true, name: true },
      orderBy: [{ releaseDate: "desc" }, { name: "asc" }],
    }),
    prisma.card.findMany({
      where: { rarity: { not: null }, game: { slug: { in: ENABLED_GAMES } } },
      select: { rarity: true },
      distinct: ["rarity"],
      orderBy: { rarity: "asc" },
    }),
    prisma.card.findMany({
      where: { cardType: { not: null }, game: { slug: { in: ENABLED_GAMES } } },
      select: { cardType: true },
      distinct: ["cardType"],
      orderBy: { cardType: "asc" },
    }),
    prisma.$queryRaw<{ v: string }[]>`
      SELECT DISTINCT unnest("domains") AS v
      FROM "Card"
      WHERE "gameId" IN (SELECT id FROM "Game" WHERE slug::text = ANY (${ENABLED_GAMES as string[]}))
      ORDER BY v ASC
    `,
    prisma.$queryRaw<{ v: string }[]>`
      SELECT DISTINCT unnest("regions") AS v
      FROM "Card"
      WHERE "gameId" IN (SELECT id FROM "Game" WHERE slug::text = ANY (${ENABLED_GAMES as string[]}))
      ORDER BY v ASC
    `,
  ]);

  return {
    sets,
    rarities: rarityRows.map((r) => r.rarity!).filter(Boolean),
    cardTypes: typeRows.map((r) => r.cardType!).filter(Boolean),
    domains: domainRows.map((r) => r.v),
    regions: regionRows.map((r) => r.v),
  };
}

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

/**
 * Number of trades where I need to act:
 * - REQUESTED and I'm not the last proposer (someone sent me an offer / countered)
 * - ACCEPTED where the other party has confirmed finish but I haven't
 */
export async function getPendingTradeCount(userId: string): Promise<number> {
  const trades = await prisma.trade.findMany({
    where: {
      OR: [
        { requesterId: userId, status: "REQUESTED" },
        { responderId: userId, status: "REQUESTED" },
        { requesterId: userId, status: "ACCEPTED" },
        { responderId: userId, status: "ACCEPTED" },
      ],
    },
    select: {
      requesterId: true,
      responderId: true,
      status: true,
      lastProposedById: true,
      requesterFinishedAt: true,
      responderFinishedAt: true,
    },
  });

  let count = 0;
  for (const t of trades) {
    if (t.status === "REQUESTED") {
      if (t.lastProposedById && t.lastProposedById !== userId) count += 1;
    } else if (t.status === "ACCEPTED") {
      const iAmRequester = t.requesterId === userId;
      const myConfirmed = iAmRequester ? t.requesterFinishedAt : t.responderFinishedAt;
      const otherConfirmed = iAmRequester ? t.responderFinishedAt : t.requesterFinishedAt;
      if (!myConfirmed && otherConfirmed) count += 1;
    }
  }
  return count;
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
      comments: {
        include: {
          user: { select: { id: true, handle: true, name: true, image: true } },
        },
        orderBy: { createdAt: "asc" },
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

/**
 * Suggested market price per card: median of HAVE priceCents from other
 * users. Cards with no priced HAVE listings return no entry in the map.
 */
export async function getSuggestedPrices(
  cardIds: string[],
  excludeUserId?: string,
): Promise<Map<string, number>> {
  if (cardIds.length === 0) return new Map();
  const rows = await prisma.listing.findMany({
    where: {
      cardId: { in: cardIds },
      kind: "HAVE",
      priceCents: { not: null },
      ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
    },
    select: { cardId: true, priceCents: true },
  });
  const byCard = new Map<string, number[]>();
  for (const r of rows) {
    if (r.priceCents == null) continue;
    const arr = byCard.get(r.cardId) ?? [];
    arr.push(r.priceCents);
    byCard.set(r.cardId, arr);
  }
  const out = new Map<string, number>();
  for (const [cardId, prices] of byCard) {
    prices.sort((a, b) => a - b);
    const mid = Math.floor(prices.length / 2);
    const median =
      prices.length % 2 === 0 ? (prices[mid - 1] + prices[mid]) / 2 : prices[mid];
    out.set(cardId, Math.round(median));
  }
  return out;
}

export type TraderRow = {
  id: string;
  handle: string;
  name: string | null;
  image: string | null;
  haves: number;
  wants: number;
};

/**
 * Every user with a handle, plus their HAVE/WANT counts scoped to
 * enabled games. Sorted by total activity (haves + wants desc), then
 * alphabetical by handle.
 */
export async function getTraders(): Promise<TraderRow[]> {
  const [users, counts] = await Promise.all([
    prisma.user.findMany({
      where: { handle: { not: null } },
      select: { id: true, handle: true, name: true, image: true },
    }),
    prisma.listing.groupBy({
      by: ["userId", "kind"],
      where: { card: { game: { slug: { in: ENABLED_GAMES } } } },
      _count: { _all: true },
    }),
  ]);

  const byUser = new Map<string, { haves: number; wants: number }>();
  for (const c of counts) {
    const entry = byUser.get(c.userId) ?? { haves: 0, wants: 0 };
    if (c.kind === "HAVE") entry.haves = c._count._all;
    else entry.wants = c._count._all;
    byUser.set(c.userId, entry);
  }

  const rows: TraderRow[] = users.map((u) => {
    const c = byUser.get(u.id) ?? { haves: 0, wants: 0 };
    return {
      id: u.id,
      handle: u.handle!,
      name: u.name,
      image: u.image,
      haves: c.haves,
      wants: c.wants,
    };
  });

  rows.sort((a, b) => {
    const totalDiff = b.haves + b.wants - (a.haves + a.wants);
    if (totalDiff !== 0) return totalDiff;
    return a.handle.localeCompare(b.handle);
  });

  return rows;
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
