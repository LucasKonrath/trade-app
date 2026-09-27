/**
 * Seed the Card catalog from pokemontcg.io.
 *
 * Usage: npm run seed:pokemon
 *
 * Idempotent: keyed on Card.(gameId, externalId) and CardSet.(gameId, code).
 * Optional POKEMON_TCG_API_KEY env for higher rate limits.
 */

import { PrismaClient, GameSlug } from "@prisma/client";

const prisma = new PrismaClient();

const API = "https://api.pokemontcg.io/v2";
const PAGE_SIZE = 250;

type ApiSet = {
  id: string;
  name: string;
  releaseDate?: string; // "YYYY/MM/DD"
};

type ApiCard = {
  id: string;
  name: string;
  number?: string;
  rarity?: string;
  set: { id: string };
  images?: { small?: string; large?: string };
};

type ApiEnvelope<T> = {
  data: T[];
  page: number;
  pageSize: number;
  count: number;
  totalCount: number;
};

function headers(): HeadersInit {
  const key = process.env.POKEMON_TCG_API_KEY;
  return key ? { "X-Api-Key": key } : {};
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

const MAX_ATTEMPTS = 12;

async function fetchJson<T>(url: string, attempt = 1): Promise<T> {
  try {
    const res = await fetch(url, { headers: headers() });
    if (res.ok) return (await res.json()) as T;
    if ((res.status === 429 || res.status >= 500) && attempt < MAX_ATTEMPTS) {
      const wait = Math.min(2 ** attempt * 500, 30_000);
      console.warn(`GET ${url} -> ${res.status}. Retry ${attempt}/${MAX_ATTEMPTS - 1} in ${wait}ms`);
      await sleep(wait);
      return fetchJson<T>(url, attempt + 1);
    }
    throw new Error(`GET ${url} failed: ${res.status} ${res.statusText}`);
  } catch (err) {
    if (attempt < MAX_ATTEMPTS) {
      const wait = Math.min(2 ** attempt * 500, 30_000);
      console.warn(`GET ${url} threw ${(err as Error).message}. Retry ${attempt}/${MAX_ATTEMPTS - 1} in ${wait}ms`);
      await sleep(wait);
      return fetchJson<T>(url, attempt + 1);
    }
    throw err;
  }
}

function parseReleaseDate(raw?: string): Date | null {
  if (!raw) return null;
  const iso = raw.replace(/\//g, "-");
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d : null;
}

async function ensureGame() {
  return prisma.game.upsert({
    where: { slug: GameSlug.pokemon },
    update: { name: "Pokémon TCG" },
    create: { slug: GameSlug.pokemon, name: "Pokémon TCG" },
  });
}

async function seedSets(gameId: string): Promise<Map<string, string>> {
  const setIdBySetCode = new Map<string, string>();
  const { data } = await fetchJson<ApiEnvelope<ApiSet>>(`${API}/sets?pageSize=250`);

  for (const s of data) {
    const record = await prisma.cardSet.upsert({
      where: { gameId_code: { gameId, code: s.id } },
      update: { name: s.name, releaseDate: parseReleaseDate(s.releaseDate) },
      create: {
        gameId,
        code: s.id,
        name: s.name,
        releaseDate: parseReleaseDate(s.releaseDate),
      },
    });
    setIdBySetCode.set(s.id, record.id);
  }

  console.log(`Sets upserted: ${data.length}`);
  return setIdBySetCode;
}

async function seedCards(gameId: string, setIdBySetCode: Map<string, string>) {
  let page = 1;
  let total = 0;

  const failedPages: number[] = [];

  for (;;) {
    const url = `${API}/cards?pageSize=${PAGE_SIZE}&page=${page}&select=id,name,number,rarity,set,images`;
    let envelope: ApiEnvelope<ApiCard>;
    try {
      envelope = await fetchJson<ApiEnvelope<ApiCard>>(url);
    } catch (err) {
      console.warn(`Skipping page ${page} after exhausting retries: ${(err as Error).message}`);
      failedPages.push(page);
      page += 1;
      // Bail out only if we've been failing indefinitely with no progress marker.
      // The API caps around ~83 pages for 20k cards at pageSize=250; stop past that.
      if (page > 100) break;
      continue;
    }

    if (envelope.data.length === 0) break;

    await prisma.$transaction(
      envelope.data.map((c) => {
        const setId = setIdBySetCode.get(c.set.id);
        if (!setId) {
          throw new Error(`Card ${c.id} references unknown set ${c.set.id} — reseed sets first`);
        }
        const imageUrl = c.images?.large ?? c.images?.small ?? null;
        return prisma.card.upsert({
          where: { gameId_externalId: { gameId, externalId: c.id } },
          update: {
            name: c.name,
            number: c.number ?? null,
            rarity: c.rarity ?? null,
            imageUrl,
            setId,
          },
          create: {
            gameId,
            setId,
            externalId: c.id,
            name: c.name,
            number: c.number ?? null,
            rarity: c.rarity ?? null,
            imageUrl,
          },
        });
      })
    );

    total += envelope.data.length;
    console.log(`Cards: page ${page}, +${envelope.data.length}, running total ${total}/${envelope.totalCount}`);

    if (total >= envelope.totalCount) break;
    page += 1;
  }

  console.log(`Cards upserted: ${total}`);
  if (failedPages.length > 0) {
    console.warn(`Failed pages (rerun to retry): ${failedPages.join(", ")}`);
  }
}

async function main() {
  const game = await ensureGame();
  const setIdBySetCode = await seedSets(game.id);
  await seedCards(game.id, setIdBySetCode);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
