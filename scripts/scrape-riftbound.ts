/**
 * Seed the Card catalog from riftbound-db.com's public JSON API.
 *
 * Usage: npm run seed:riftbound
 *
 * Idempotent: keyed on Card.(gameId, externalId) and CardSet.(gameId, code).
 */

import { PrismaClient, GameSlug } from "@prisma/client";

const prisma = new PrismaClient();

const API = "https://www.riftbound-db.com/api";
const PAGE_SIZE = 80;
const UA = "trade-app-seeder/0.1 (+local dev)";

type ApiCard = {
  id: string;
  name: string;
  number?: string;
  rarity?: string;
  setCode: string;
  setName: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  orientation?: string;
};

type Envelope = {
  cards: ApiCard[];
  pagination: { page: number; pageSize: number; total: number; hasMore: boolean };
};

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson<T>(url: string, attempt = 1): Promise<T> {
  const MAX_ATTEMPTS = 5;
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.ok) return (await res.json()) as T;
    if ((res.status === 429 || res.status >= 500) && attempt < MAX_ATTEMPTS) {
      const wait = Math.min(2 ** attempt * 500, 10_000);
      console.warn(`GET ${url} -> ${res.status}. Retry ${attempt}/${MAX_ATTEMPTS - 1} in ${wait}ms`);
      await sleep(wait);
      return fetchJson<T>(url, attempt + 1);
    }
    throw new Error(`GET ${url} failed: ${res.status} ${res.statusText}`);
  } catch (err) {
    if (attempt < MAX_ATTEMPTS) {
      const wait = Math.min(2 ** attempt * 500, 10_000);
      console.warn(`GET ${url} threw ${(err as Error).message}. Retry ${attempt}/${MAX_ATTEMPTS - 1} in ${wait}ms`);
      await sleep(wait);
      return fetchJson<T>(url, attempt + 1);
    }
    throw err;
  }
}

async function ensureGame() {
  return prisma.game.upsert({
    where: { slug: GameSlug.riftbound },
    update: { name: "Riftbound" },
    create: { slug: GameSlug.riftbound, name: "Riftbound" },
  });
}

async function main() {
  const game = await ensureGame();

  // Upsert sets as we go. Keyed on (gameId, setCode).
  const setIdByCode = new Map<string, string>();

  let page = 1;
  let total = 0;

  for (;;) {
    const url = `${API}/cards?page=${page}&pageSize=${PAGE_SIZE}`;
    const envelope = await fetchJson<Envelope>(url);
    if (envelope.cards.length === 0) break;

    // Ensure every referenced set exists before creating cards.
    const seenSetCodes = new Set(envelope.cards.map((c) => c.setCode));
    for (const code of seenSetCodes) {
      if (setIdByCode.has(code)) continue;
      const first = envelope.cards.find((c) => c.setCode === code)!;
      const setRecord = await prisma.cardSet.upsert({
        where: { gameId_code: { gameId: game.id, code } },
        update: { name: first.setName },
        create: { gameId: game.id, code, name: first.setName },
      });
      setIdByCode.set(code, setRecord.id);
    }

    await prisma.$transaction(
      envelope.cards.map((c) => {
        const setId = setIdByCode.get(c.setCode)!;
        const imageUrl = c.imageUrl ?? c.thumbnailUrl ?? null;
        return prisma.card.upsert({
          where: { gameId_externalId: { gameId: game.id, externalId: c.id } },
          update: {
            name: c.name,
            number: c.number ?? null,
            rarity: c.rarity ?? null,
            imageUrl,
            orientation: c.orientation ?? null,
            setId,
          },
          create: {
            gameId: game.id,
            setId,
            externalId: c.id,
            name: c.name,
            number: c.number ?? null,
            rarity: c.rarity ?? null,
            imageUrl,
            orientation: c.orientation ?? null,
          },
        });
      })
    );

    total += envelope.cards.length;
    console.log(`Cards: page ${page}, +${envelope.cards.length}, running total ${total}/${envelope.pagination.total}`);

    if (!envelope.pagination.hasMore) break;
    page += 1;
  }

  console.log(`Cards upserted: ${total}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
