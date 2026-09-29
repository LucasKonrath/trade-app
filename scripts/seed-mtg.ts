/**
 * Seed the Card catalog from Scryfall's bulk data API.
 *
 * Uses the "oracle_cards" bulk (one row per unique card, ~30k). Filters to
 * paper-only. For multi-face cards, stores the front face's name + image.
 *
 * Usage: npm run seed:mtg
 *
 * Idempotent: keyed on Card.(gameId, externalId) and CardSet.(gameId, code).
 */

import { PrismaClient, GameSlug } from "@prisma/client";
import { gunzipSync } from "node:zlib";

const prisma = new PrismaClient();

const UA = "Mulligan-Seeder/1.0 (contact: lucaskdamaceno@gmail.com)";

type ImageUris = {
  small?: string;
  normal?: string;
  large?: string;
  png?: string;
};

type CardFace = {
  name?: string;
  type_line?: string;
  image_uris?: ImageUris;
};

type ScryfallCard = {
  id: string;
  oracle_id?: string;
  name: string;
  lang: string;
  set: string;
  set_name: string;
  collector_number: string;
  rarity: string;
  colors?: string[];
  color_identity?: string[];
  type_line?: string;
  layout: string;
  image_uris?: ImageUris;
  card_faces?: CardFace[];
  released_at?: string;
  digital?: boolean;
  games?: string[];
};

type BulkDataInfo = {
  object: "bulk_data";
  id: string;
  type: string;
  name: string;
  compressed_size?: number;
  jsonl_download_uri: string;
  updated_at: string;
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

async function fetchAndUnzipJsonl<T>(url: string): Promise<T[]> {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status} ${res.statusText}`);
  const compressed = Buffer.from(await res.arrayBuffer());
  const jsonlText = gunzipSync(compressed).toString("utf8");
  const lines = jsonlText.split("\n").filter((l) => l.trim().length > 0);
  return lines.map((l) => JSON.parse(l) as T);
}

function landscapeLayout(layout: string): boolean {
  return layout === "split" || layout === "planar";
}

function pickImage(c: ScryfallCard): string | null {
  if (c.image_uris?.normal) return c.image_uris.normal;
  const face = c.card_faces?.[0];
  return face?.image_uris?.normal ?? null;
}

function pickType(c: ScryfallCard): string | null {
  if (c.type_line) return c.type_line;
  return c.card_faces?.[0]?.type_line ?? null;
}

async function main() {
  console.log("Fetching Scryfall bulk metadata…");
  const meta = await fetchJson<{ data: BulkDataInfo[] }>(
    "https://api.scryfall.com/bulk-data",
  );
  const oracle = meta.data.find((b) => b.type === "oracle_cards");
  if (!oracle) throw new Error("oracle_cards bulk not found");

  const sizeMb = oracle.compressed_size
    ? (oracle.compressed_size / 1024 / 1024).toFixed(1)
    : "?";
  console.log(`Downloading ${oracle.name} (${sizeMb} MB compressed)…`);
  const all = await fetchAndUnzipJsonl<ScryfallCard>(oracle.jsonl_download_uri);
  console.log(`Received ${all.length.toLocaleString()} cards`);

  // Filter: paper only, English-first cards. Oracle cards are already
  // deduplicated per game piece so most are already "en".
  const cards = all.filter(
    (c) => c.games?.includes("paper") && !c.digital && c.lang === "en",
  );
  console.log(`After paper/English filter: ${cards.length.toLocaleString()}`);

  const game = await prisma.game.upsert({
    where: { slug: GameSlug.mtg },
    update: { name: "Magic: The Gathering" },
    create: { slug: GameSlug.mtg, name: "Magic: The Gathering" },
  });
  console.log(`Game: ${game.name}`);

  // Collect sets from the card stream.
  const setMeta = new Map<string, { name: string; released?: string }>();
  for (const c of cards) {
    if (!setMeta.has(c.set)) {
      setMeta.set(c.set, { name: c.set_name, released: c.released_at });
    }
  }

  const setIdByCode = new Map<string, string>();
  console.log(`Upserting ${setMeta.size} sets…`);
  for (const [code, info] of setMeta) {
    const s = await prisma.cardSet.upsert({
      where: { gameId_code: { gameId: game.id, code } },
      update: {
        name: info.name,
        releaseDate: info.released ? new Date(info.released) : null,
      },
      create: {
        gameId: game.id,
        code,
        name: info.name,
        releaseDate: info.released ? new Date(info.released) : null,
      },
    });
    setIdByCode.set(code, s.id);
  }

  const BATCH = 100;
  let done = 0;
  const startedAt = Date.now();
  console.log(`Upserting ${cards.length} cards in batches of ${BATCH}…`);
  for (let i = 0; i < cards.length; i += BATCH) {
    const batch = cards.slice(i, i + BATCH);
    await prisma.$transaction(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      batch.map((c: ScryfallCard): any => {
        const setId = setIdByCode.get(c.set)!;
        const imageUrl = pickImage(c);
        const cardType = pickType(c);
        const orientation = landscapeLayout(c.layout) ? "landscape" : "portrait";
        const domains = c.colors ?? [];
        const regions = c.color_identity ?? [];
        return prisma.card.upsert({
          where: { gameId_externalId: { gameId: game.id, externalId: c.id } },
          update: {
            name: c.name,
            number: c.collector_number ?? null,
            rarity: c.rarity ?? null,
            imageUrl,
            orientation,
            cardType,
            domains,
            regions,
            setId,
          },
          create: {
            gameId: game.id,
            setId,
            externalId: c.id,
            name: c.name,
            number: c.collector_number ?? null,
            rarity: c.rarity ?? null,
            imageUrl,
            orientation,
            cardType,
            domains,
            regions,
          },
        });
      }),
    );
    done += batch.length;
    if (done % 1000 === 0 || done === cards.length) {
      const elapsed = ((Date.now() - startedAt) / 1000).toFixed(0);
      console.log(`${done.toLocaleString()}/${cards.length.toLocaleString()} · ${elapsed}s`);
    }
  }

  console.log(`Done. Cards upserted: ${done}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
