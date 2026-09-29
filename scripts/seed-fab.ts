/**
 * Seed the Card catalog with Flesh and Blood using the community-maintained
 * `the-fab-cube/flesh-and-blood-cards` dataset on GitHub.
 *
 * Dataset: card-flattened.json has one entry per printing. We dedupe by
 * unique_id (one row per unique card) and take the first printing encountered
 * for image + set metadata — matches how we handle MTG (oracle-only).
 *
 * Usage: npm run seed:fab
 *
 * Idempotent: keyed on Card.(gameId, externalId) and CardSet.(gameId, code).
 */

import { PrismaClient, GameSlug } from "@prisma/client";

const prisma = new PrismaClient();

const CARDS_URL =
  "https://raw.githubusercontent.com/the-fab-cube/flesh-and-blood-cards/develop/json/english/card-flattened.json";
const SETS_URL =
  "https://raw.githubusercontent.com/the-fab-cube/flesh-and-blood-cards/develop/json/english/set.json";

const UA = "Mulligan-Seeder/1.0 (contact: lucaskdamaceno@gmail.com)";

type FabPrinting = {
  unique_id: string;
  name: string;
  color?: string;
  types?: string[];
  type_text?: string;
  played_horizontally?: boolean;
  id?: string;
  set_id?: string;
  rarity?: string;
  image_url?: string;
};

type FabSet = {
  unique_id: string;
  id: string;
  name: string;
  release_date?: string;
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

async function main() {
  console.log("Fetching FaB catalog…");
  const [printings, sets] = await Promise.all([
    fetchJson<FabPrinting[]>(CARDS_URL),
    fetchJson<FabSet[]>(SETS_URL),
  ]);
  console.log(
    `Received ${printings.length.toLocaleString()} printings across ${sets.length} sets`,
  );

  const game = await prisma.game.upsert({
    where: { slug: GameSlug.fab },
    update: { name: "Flesh and Blood" },
    create: { slug: GameSlug.fab, name: "Flesh and Blood" },
  });
  console.log(`Game: ${game.name}`);

  // Upsert every set.
  const setIdByCode = new Map<string, string>();
  for (const s of sets) {
    const record = await prisma.cardSet.upsert({
      where: { gameId_code: { gameId: game.id, code: s.id } },
      update: {
        name: s.name,
        releaseDate: s.release_date ? new Date(s.release_date) : null,
      },
      create: {
        gameId: game.id,
        code: s.id,
        name: s.name,
        releaseDate: s.release_date ? new Date(s.release_date) : null,
      },
    });
    setIdByCode.set(s.id, record.id);
  }
  console.log(`Sets upserted: ${sets.length}`);

  // Dedupe printings → one card per unique_id, using the first printing seen.
  const byUnique = new Map<string, FabPrinting>();
  for (const p of printings) {
    if (!p.unique_id || !p.set_id) continue;
    if (!setIdByCode.has(p.set_id)) continue;
    if (byUnique.has(p.unique_id)) continue;
    byUnique.set(p.unique_id, p);
  }
  const cards = [...byUnique.values()];
  console.log(`Unique cards to upsert: ${cards.length.toLocaleString()}`);

  const BATCH = 100;
  let done = 0;
  const startedAt = Date.now();
  for (let i = 0; i < cards.length; i += BATCH) {
    const batch = cards.slice(i, i + BATCH);
    await prisma.$transaction(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      batch.map((c): any => {
        const setId = setIdByCode.get(c.set_id!)!;
        const orientation = c.played_horizontally ? "landscape" : "portrait";
        const cardType = c.type_text ?? c.types?.join(" - ") ?? null;
        const domains = c.color ? [c.color] : [];
        // types array often has hero classes plus card types — keep it as a
        // secondary filter dimension via regions
        const regions = c.types ?? [];
        return prisma.card.upsert({
          where: { gameId_externalId: { gameId: game.id, externalId: c.unique_id } },
          update: {
            name: c.name,
            number: c.id ?? null,
            rarity: c.rarity ?? null,
            imageUrl: c.image_url ?? null,
            orientation,
            cardType,
            domains,
            regions,
            setId,
          },
          create: {
            gameId: game.id,
            setId,
            externalId: c.unique_id,
            name: c.name,
            number: c.id ?? null,
            rarity: c.rarity ?? null,
            imageUrl: c.image_url ?? null,
            orientation,
            cardType,
            domains,
            regions,
          },
        });
      }),
    );
    done += batch.length;
    if (done % 500 === 0 || done === cards.length) {
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
