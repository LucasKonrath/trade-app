import { prisma } from "@/lib/prisma";
import { GameSlug, ListingKind, OfferType, Prisma } from "@prisma/client";
import type { LgsScope } from "@/lib/lgs";
import { getVisibleUserIds } from "@/lib/lgs";
import { getViewerGameSlugs } from "@/lib/games";

/**
 * Merge an existing userId filter with a set of allowed IDs. Preserves
 * `not: excludedId` clauses when present.
 */
function excludeIdCombine(
  existing: Prisma.ListingWhereInput["userId"],
  allowedIds: string[],
): Prisma.ListingWhereInput["userId"] {
  const excluded =
    existing && typeof existing === "object" && "not" in existing
      ? (existing.not as string | undefined)
      : undefined;
  return { in: allowedIds, ...(excluded ? { not: excluded } : {}) };
}

export type CardSearchArgs = {
  q?: string;
  game?: GameSlug;
  setCode?: string;
  rarity?: string;
  cardType?: string;
  domain?: string;
  region?: string;
  viewerId?: string | null;
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
  viewerId = null,
  take = 48,
  skip = 0,
}: CardSearchArgs) {
  const viewerGames = await getViewerGameSlugs(viewerId);
  const gameFilter: GameSlug[] =
    game && (viewerGames as string[]).includes(game) ? [game] : viewerGames;

  const where: Prisma.CardWhereInput = {};
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
  const viewerGames = await getViewerGameSlugs(userId);
  return prisma.listing.findMany({
    where: { userId, card: { game: { slug: { in: viewerGames } } } },
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
 * Distinct values for the filter dropdowns on /cards. Scoped to the
 * viewer's game preferences.
 */
export async function getCardFilterOptions(viewerId: string | null = null) {
  const viewerGames = await getViewerGameSlugs(viewerId);

  const [sets, rarityRows, typeRows, domainRows, regionRows] = await Promise.all([
    prisma.cardSet.findMany({
      where: { game: { slug: { in: viewerGames } } },
      select: { code: true, name: true },
      orderBy: [{ releaseDate: "desc" }, { name: "asc" }],
    }),
    prisma.card.findMany({
      where: { rarity: { not: null }, game: { slug: { in: viewerGames } } },
      select: { rarity: true },
      distinct: ["rarity"],
      orderBy: { rarity: "asc" },
    }),
    prisma.card.findMany({
      where: { cardType: { not: null }, game: { slug: { in: viewerGames } } },
      select: { cardType: true },
      distinct: ["cardType"],
      orderBy: { cardType: "asc" },
    }),
    prisma.$queryRaw<{ v: string }[]>`
      SELECT DISTINCT unnest("domains") AS v
      FROM "Card"
      WHERE "gameId" IN (SELECT id FROM "Game" WHERE slug::text = ANY (${viewerGames as string[]}))
      ORDER BY v ASC
    `,
    prisma.$queryRaw<{ v: string }[]>`
      SELECT DISTINCT unnest("regions") AS v
      FROM "Card"
      WHERE "gameId" IN (SELECT id FROM "Game" WHERE slug::text = ANY (${viewerGames as string[]}))
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
  viewerId?: string | null;
  scope?: LgsScope;
  take?: number;
  skip?: number;
};

export async function browseListings({
  q,
  game,
  kind,
  intent,
  excludeUserId,
  viewerId = null,
  scope = "primary",
  take = 48,
  skip = 0,
}: BrowseArgs) {
  const viewerGames = await getViewerGameSlugs(viewerId);
  const gameFilter: GameSlug[] =
    game && (viewerGames as string[]).includes(game) ? [game] : viewerGames;

  const where: Prisma.ListingWhereInput = {};
  if (kind) where.kind = kind;
  if (excludeUserId) where.userId = { not: excludeUserId };
  const visibleIds = await getVisibleUserIds(viewerId, scope);
  if (visibleIds !== null) {
    where.userId = excludeIdCombine(where.userId, visibleIds);
  }
  if (intent === "TRADE") where.offerType = { in: ["TRADE_ONLY", "TRADE_OR_CASH"] };
  else if (intent === "CASH") where.offerType = { in: ["CASH_ONLY", "TRADE_OR_CASH"] };
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

export type Match = {
  userId: string;
  handle: string | null;
  name: string | null;
  image: string | null;
  theyWantIds: string[];
  iWantIds: string[];
};

export async function findMatches(userId: string, scope: LgsScope = "primary"): Promise<Match[]> {
  const viewerGames = await getViewerGameSlugs(userId);
  const gameScope = { card: { game: { slug: { in: viewerGames } } } };
  const tradeEligible = { offerType: { in: ["TRADE_ONLY", "TRADE_OR_CASH"] as OfferType[] } };

  const myListings = await prisma.listing.findMany({
    where: { userId, ...gameScope, ...tradeEligible },
    select: { cardId: true, kind: true },
  });

  const myHaveIds = myListings.filter((l) => l.kind === "HAVE").map((l) => l.cardId);
  const myWantIds = myListings.filter((l) => l.kind === "WANT").map((l) => l.cardId);

  if (myHaveIds.length === 0 || myWantIds.length === 0) return [];

  const visibleIds = await getVisibleUserIds(userId, scope);
  const scopeFilter =
    visibleIds !== null ? { userId: { in: visibleIds, not: userId } } : { userId: { not: userId } };

  const theyWant = await prisma.listing.findMany({
    where: {
      kind: "WANT",
      cardId: { in: myHaveIds },
      ...scopeFilter,
      ...gameScope,
      ...tradeEligible,
    },
    select: { userId: true, cardId: true },
  });

  const theyHave = await prisma.listing.findMany({
    where: {
      kind: "HAVE",
      cardId: { in: myWantIds },
      ...scopeFilter,
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

  matches.sort((a, b) => {
    const scoreA =
      Math.min(a.theyWantIds.length, a.iWantIds.length) * 100 + a.theyWantIds.length + a.iWantIds.length;
    const scoreB =
      Math.min(b.theyWantIds.length, b.iWantIds.length) * 100 + b.theyWantIds.length + b.iWantIds.length;
    return scoreB - scoreA;
  });

  return matches;
}

/**
 * Number of trades that need my attention:
 * - REQUESTED and I'm not the last proposer (someone sent me an offer / countered)
 * - ACCEPTED where the other party has confirmed finish but I haven't
 * - Any trade I participate in with unread comments from someone else
 */
export async function getPendingTradeCount(userId: string): Promise<number> {
  const trades = await prisma.trade.findMany({
    where: { OR: [{ requesterId: userId }, { responderId: userId }] },
    select: {
      id: true,
      requesterId: true,
      responderId: true,
      status: true,
      lastProposedById: true,
      requesterFinishedAt: true,
      responderFinishedAt: true,
      readStates: {
        where: { userId },
        select: { lastReadAt: true },
      },
      comments: {
        select: { userId: true, createdAt: true },
      },
    },
  });

  const flagged = new Set<string>();
  for (const t of trades) {
    // Responders shouldn't see OPEN drafts (matches getTradeForUser visibility).
    if (t.status === "OPEN" && t.responderId === userId && t.requesterId !== userId) {
      continue;
    }
    if (t.status === "REQUESTED" && t.lastProposedById && t.lastProposedById !== userId) {
      flagged.add(t.id);
    }
    if (t.status === "ACCEPTED") {
      const iAmRequester = t.requesterId === userId;
      const myConfirmed = iAmRequester ? t.requesterFinishedAt : t.responderFinishedAt;
      const otherConfirmed = iAmRequester ? t.responderFinishedAt : t.requesterFinishedAt;
      if (!myConfirmed && otherConfirmed) flagged.add(t.id);
    }
    const lastRead = t.readStates[0]?.lastReadAt ?? new Date(0);
    const hasUnread = t.comments.some(
      (c) => c.userId !== userId && c.createdAt > lastRead,
    );
    if (hasUnread) flagged.add(t.id);
  }
  return flagged.size;
}

/**
 * Number of unread comments (from other participants) per trade, keyed by
 * trade id. Used to badge rows on /trades.
 */
export async function getUnreadCommentCounts(
  userId: string,
  tradeIds: string[],
): Promise<Map<string, number>> {
  if (tradeIds.length === 0) return new Map();
  const [comments, readStates] = await Promise.all([
    prisma.tradeComment.findMany({
      where: { tradeId: { in: tradeIds }, userId: { not: userId } },
      select: { tradeId: true, createdAt: true },
    }),
    prisma.tradeReadState.findMany({
      where: { userId, tradeId: { in: tradeIds } },
      select: { tradeId: true, lastReadAt: true },
    }),
  ]);

  const lastReadByTrade = new Map(readStates.map((r) => [r.tradeId, r.lastReadAt]));
  const counts = new Map<string, number>();
  for (const c of comments) {
    const lastRead = lastReadByTrade.get(c.tradeId) ?? new Date(0);
    if (c.createdAt > lastRead) {
      counts.set(c.tradeId, (counts.get(c.tradeId) ?? 0) + 1);
    }
  }
  return counts;
}

/**
 * Called from /trades/[id] after we successfully render the trade.
 * Fire-and-forget via after() so it never blocks the render.
 */
export async function markTradeAsRead(userId: string, tradeId: string): Promise<void> {
  const now = new Date();
  await prisma.tradeReadState.upsert({
    where: { userId_tradeId: { userId, tradeId } },
    update: { lastReadAt: now },
    create: { userId, tradeId, lastReadAt: now },
  });
}

export async function getLgsList(viewerId: string | null) {
  const [lgss, myMemberships] = await Promise.all([
    prisma.lgs.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        city: true,
        _count: { select: { memberships: true } },
      },
      orderBy: [{ createdAt: "asc" }],
    }),
    viewerId
      ? prisma.lgsMembership.findMany({
          where: { userId: viewerId },
          select: { lgsId: true, isPrimary: true, role: true },
        })
      : Promise.resolve([]),
  ]);

  const membershipByLgs = new Map(myMemberships.map((m) => [m.lgsId, m]));
  return lgss.map((l) => ({
    ...l,
    memberCount: l._count.memberships,
    myMembership: membershipByLgs.get(l.id) ?? null,
  }));
}

export async function getLgsBySlug(slug: string) {
  return prisma.lgs.findUnique({
    where: { slug },
    include: {
      memberships: {
        include: {
          user: { select: { id: true, handle: true, name: true, image: true } },
        },
        orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
      },
    },
  });
}

export async function getMyTrades(userId: string) {
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

export async function findCashMatches(
  userId: string,
  scope: LgsScope = "primary",
): Promise<CashMatch[]> {
  const viewerGames = await getViewerGameSlugs(userId);

  const myWants = await prisma.listing.findMany({
    where: {
      userId,
      kind: "WANT",
      priceCents: { not: null },
      offerType: { in: ["CASH_ONLY", "TRADE_OR_CASH"] as OfferType[] },
      card: { game: { slug: { in: viewerGames } } },
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

  const visibleIds = await getVisibleUserIds(userId, scope);
  const scopeUserFilter =
    visibleIds !== null ? { userId: { in: visibleIds, not: userId } } : { userId: { not: userId } };

  const results: CashMatch[] = [];
  for (const want of myWants) {
    const sellers = await prisma.listing.findMany({
      where: {
        kind: "HAVE",
        cardId: want.cardId,
        ...scopeUserFilter,
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

  results.sort((a, b) => {
    const savingsA = a.myMaxCents - a.sellers[0].priceCents;
    const savingsB = b.myMaxCents - b.sellers[0].priceCents;
    return savingsB - savingsA;
  });

  return results;
}

export async function getCardWithListings(
  cardId: string,
  viewerId?: string,
  scope: LgsScope = "primary",
) {
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

  const visibleIds = await getVisibleUserIds(viewerId ?? null, scope);
  const mine = viewerId ? card.listings.filter((l) => l.userId === viewerId) : [];
  const others = card.listings.filter((l) => (viewerId ? l.userId !== viewerId : true));
  const scoped =
    visibleIds !== null
      ? others.filter((l) => visibleIds.includes(l.userId))
      : others;
  const sellers = scoped.filter((l) => l.kind === "HAVE");
  const buyers = scoped.filter((l) => l.kind === "WANT");

  return { card, mine, sellers, buyers };
}

export async function getSuggestedPrices(
  cardIds: string[],
  excludeUserId?: string,
  scope: LgsScope = "primary",
): Promise<Map<string, number>> {
  if (cardIds.length === 0) return new Map();
  const visibleIds = await getVisibleUserIds(excludeUserId ?? null, scope);
  const userFilter =
    visibleIds !== null
      ? { userId: { in: visibleIds, ...(excludeUserId ? { not: excludeUserId } : {}) } }
      : excludeUserId
        ? { userId: { not: excludeUserId } }
        : {};
  const rows = await prisma.listing.findMany({
    where: {
      cardId: { in: cardIds },
      kind: "HAVE",
      priceCents: { not: null },
      ...userFilter,
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
  finishedTrades: number;
};

/**
 * Trade history stats for a single user. Shown on their public profile.
 */
export async function getUserTradeStats(userId: string): Promise<{
  finishedCount: number;
  lastFinishedAt: Date | null;
}> {
  const [count, latest] = await Promise.all([
    prisma.trade.count({
      where: {
        status: "FINISHED",
        OR: [{ requesterId: userId }, { responderId: userId }],
      },
    }),
    prisma.trade.findFirst({
      where: {
        status: "FINISHED",
        OR: [{ requesterId: userId }, { responderId: userId }],
      },
      orderBy: { finishedAt: "desc" },
      select: { finishedAt: true },
    }),
  ]);
  return { finishedCount: count, lastFinishedAt: latest?.finishedAt ?? null };
}

/**
 * Finished-trade counts for many users at once. One roundtrip, counted
 * in-memory because a user can appear on either side.
 */
async function getFinishedCountsBatch(userIds: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  for (const id of userIds) result.set(id, 0);
  if (userIds.length === 0) return result;

  const trades = await prisma.trade.findMany({
    where: {
      status: "FINISHED",
      OR: [{ requesterId: { in: userIds } }, { responderId: { in: userIds } }],
    },
    select: { requesterId: true, responderId: true },
  });

  for (const t of trades) {
    if (result.has(t.requesterId)) {
      result.set(t.requesterId, result.get(t.requesterId)! + 1);
    }
    if (result.has(t.responderId)) {
      result.set(t.responderId, result.get(t.responderId)! + 1);
    }
  }
  return result;
}

export async function getTraders(
  viewerId: string | null = null,
  scope: LgsScope = "primary",
): Promise<TraderRow[]> {
  const viewerGames = await getViewerGameSlugs(viewerId);
  const visibleIds = await getVisibleUserIds(viewerId, scope);
  const userFilter: Prisma.UserWhereInput = { handle: { not: null } };
  if (visibleIds !== null) userFilter.id = { in: visibleIds };

  const [users, counts] = await Promise.all([
    prisma.user.findMany({
      where: userFilter,
      select: { id: true, handle: true, name: true, image: true },
    }),
    prisma.listing.groupBy({
      by: ["userId", "kind"],
      where: {
        card: { game: { slug: { in: viewerGames } } },
        ...(visibleIds !== null ? { userId: { in: visibleIds } } : {}),
      },
      _count: { _all: true },
    }),
  ]);

  const finishedByUser = await getFinishedCountsBatch(users.map((u) => u.id));

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
      finishedTrades: finishedByUser.get(u.id) ?? 0,
    };
  });

  // Rank by activity (listings + finished trades) then alphabetical.
  rows.sort((a, b) => {
    const scoreA = a.haves + a.wants + a.finishedTrades * 2;
    const scoreB = b.haves + b.wants + b.finishedTrades * 2;
    if (scoreB !== scoreA) return scoreB - scoreA;
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

/* --------------------------------------------------------------------------
 * Homepage feed
 * ------------------------------------------------------------------------ */

/**
 * Recent HAVE + WANT listings from the viewer's community, in their games,
 * excluding their own. Anonymous viewers get everything unfiltered.
 */
export async function getRecentListings(
  viewerId: string | null,
  take = 12,
): Promise<
  {
    id: string;
    kind: ListingKind;
    createdAt: Date;
    quantity: number;
    priceCents: number | null;
    offerType: OfferType;
    userId: string;
    user: { handle: string | null; name: string | null; image: string | null };
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
  }[]
> {
  const viewerGames = await getViewerGameSlugs(viewerId);
  const visibleIds = await getVisibleUserIds(viewerId, "primary");
  const where: Prisma.ListingWhereInput = {
    card: { game: { slug: { in: viewerGames } } },
  };
  if (viewerId) where.userId = { not: viewerId };
  if (visibleIds !== null) {
    where.userId = viewerId
      ? { in: visibleIds, not: viewerId }
      : { in: visibleIds };
  }

  return prisma.listing.findMany({
    where,
    include: {
      user: { select: { handle: true, name: true, image: true } },
      card: {
        include: {
          set: { select: { name: true } },
          game: { select: { slug: true } },
        },
      },
    },
    orderBy: [{ createdAt: "desc" }],
    take,
  });
}

/**
 * Recently completed trades where at least one participant shares an LGS
 * with the viewer (or all trades for anonymous viewers).
 */
export async function getRecentFinishedTrades(viewerId: string | null, take = 6) {
  const visibleIds = await getVisibleUserIds(viewerId, "primary");
  const where: Prisma.TradeWhereInput = { status: "FINISHED" };
  if (visibleIds !== null) {
    where.OR = [
      { requesterId: { in: visibleIds } },
      { responderId: { in: visibleIds } },
    ];
  }
  return prisma.trade.findMany({
    where,
    include: {
      requester: { select: { id: true, handle: true, name: true, image: true } },
      responder: { select: { id: true, handle: true, name: true, image: true } },
      items: {
        include: {
          card: {
            include: {
              set: { select: { name: true } },
              game: { select: { slug: true } },
            },
          },
        },
        take: 4,
      },
    },
    orderBy: [{ finishedAt: "desc" }],
    take,
  });
}

/**
 * Community stats (this week + all-time) — scoped to the viewer's LGSs.
 */
export async function getCommunityStats(viewerId: string | null) {
  const visibleIds = await getVisibleUserIds(viewerId, "primary");
  const viewerGames = await getViewerGameSlugs(viewerId);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const scopedUsersFilter = visibleIds !== null ? { in: visibleIds } : undefined;

  const [traders, activeListings, tradesThisWeek] = await Promise.all([
    prisma.user.count({
      where: {
        handle: { not: null },
        ...(scopedUsersFilter ? { id: scopedUsersFilter } : {}),
      },
    }),
    prisma.listing.count({
      where: {
        card: { game: { slug: { in: viewerGames } } },
        ...(scopedUsersFilter ? { userId: scopedUsersFilter } : {}),
      },
    }),
    prisma.trade.count({
      where: {
        status: "FINISHED",
        finishedAt: { gte: weekAgo },
        ...(visibleIds
          ? {
              OR: [
                { requesterId: { in: visibleIds } },
                { responderId: { in: visibleIds } },
              ],
            }
          : {}),
      },
    }),
  ]);

  return { traders, activeListings, tradesThisWeek };
}

export type DeliveryTrade = {
  id: string;
  updatedAt: Date;
  cashOwedByMe: number; // positive → I owe them; negative → they owe me
  iGive: {
    id: string;
    quantity: number;
    card: {
      id: string;
      name: string;
      imageUrl: string | null;
      orientation: string | null;
      set: { name: string };
      game: { slug: string };
    };
  }[];
  iReceive: {
    id: string;
    quantity: number;
    card: {
      id: string;
      name: string;
      imageUrl: string | null;
      orientation: string | null;
      set: { name: string };
      game: { slug: string };
    };
  }[];
};

export type DeliveryGroup = {
  counterparty: {
    id: string;
    handle: string | null;
    name: string | null;
    image: string | null;
  };
  trades: DeliveryTrade[];
  totalCardsIGive: number;
  totalCardsIReceive: number;
  netCashOwedByMe: number;
};

/**
 * All ACCEPTED trades where I'm a participant, grouped by counterparty.
 * "What do I need to bring to the meetup, and what am I getting back?"
 *
 * cashOwedByMe follows a from-my-perspective convention (positive means I
 * hand over cash, negative means they hand it to me). Canonical storage
 * (positive = responder pays requester) is converted per-side.
 */
export async function getMyPendingDeliveries(userId: string): Promise<DeliveryGroup[]> {
  const trades = await prisma.trade.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: userId }, { responderId: userId }],
    },
    include: {
      requester: { select: { id: true, handle: true, name: true, image: true } },
      responder: { select: { id: true, handle: true, name: true, image: true } },
      items: {
        include: {
          card: {
            include: {
              set: { select: { name: true } },
              game: { select: { slug: true } },
            },
          },
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }],
  });

  const groups = new Map<string, DeliveryGroup>();

  for (const t of trades) {
    const iAmRequester = t.requesterId === userId;
    const counterparty = iAmRequester ? t.responder : t.requester;
    const iGiveDirection = iAmRequester ? "FROM_REQUESTER" : "FROM_RESPONDER";

    const iGive = t.items
      .filter((i) => i.direction === iGiveDirection)
      .map((i) => ({
        id: i.id,
        quantity: i.quantity,
        card: {
          id: i.card.id,
          name: i.card.name,
          imageUrl: i.card.imageUrl,
          orientation: i.card.orientation,
          set: i.card.set,
          game: i.card.game,
        },
      }));
    const iReceive = t.items
      .filter((i) => i.direction !== iGiveDirection)
      .map((i) => ({
        id: i.id,
        quantity: i.quantity,
        card: {
          id: i.card.id,
          name: i.card.name,
          imageUrl: i.card.imageUrl,
          orientation: i.card.orientation,
          set: i.card.set,
          game: i.card.game,
        },
      }));

    // Canonical cashCents: positive = responder pays requester.
    // Convert to "how much I owe": positive when I hand over cash.
    let cashOwedByMe = 0;
    if (t.cashCents) {
      cashOwedByMe = iAmRequester ? -t.cashCents : t.cashCents;
    }

    const trade: DeliveryTrade = {
      id: t.id,
      updatedAt: t.updatedAt,
      cashOwedByMe,
      iGive,
      iReceive,
    };

    const entry = groups.get(counterparty.id) ?? {
      counterparty,
      trades: [],
      totalCardsIGive: 0,
      totalCardsIReceive: 0,
      netCashOwedByMe: 0,
    };
    entry.trades.push(trade);
    entry.totalCardsIGive += iGive.reduce((s, x) => s + x.quantity, 0);
    entry.totalCardsIReceive += iReceive.reduce((s, x) => s + x.quantity, 0);
    entry.netCashOwedByMe += cashOwedByMe;
    groups.set(counterparty.id, entry);
  }

  // Sort by most recent trade activity per counterparty.
  return [...groups.values()].sort((a, b) => {
    const aLatest = Math.max(...a.trades.map((t) => t.updatedAt.getTime()));
    const bLatest = Math.max(...b.trades.map((t) => t.updatedAt.getTime()));
    return bLatest - aLatest;
  });
}

export async function getUserGameInterests(userId: string): Promise<GameSlug[]> {
  const rows = await prisma.userGameInterest.findMany({
    where: { userId },
    select: { game: { select: { slug: true } } },
  });
  return rows.map((r) => r.game.slug);
}
