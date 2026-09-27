/**
 * Create a mock user with HAVE/WANT listings so you can test /matches.
 *
 * Usage: npm run seed:mock-user
 *
 * Idempotent — safe to run multiple times. Prints their handle and listings.
 */

import { PrismaClient, ListingKind } from "@prisma/client";

const prisma = new PrismaClient();

const HANDLE = "test_trader";
const EMAIL = "test-trader@example.local";

// A mix of well-known Pokemon + a few Riftbound picks.
const HAVES: string[] = [
  "Charizard",
  "Pikachu",
  "Blastoise",
  "Mewtwo",
  "Vi, Destructive",
  "Jinx, Rebel",
];

const WANTS: string[] = [
  "Bulbasaur",
  "Squirtle",
  "Eevee",
  "Gengar",
  "Caitlyn, Patrolling",
  "Heimerdinger, Inventor",
];

async function upsertUser() {
  return prisma.user.upsert({
    where: { email: EMAIL },
    update: { handle: HANDLE, name: "Test Trader" },
    create: {
      email: EMAIL,
      handle: HANDLE,
      name: "Test Trader",
    },
  });
}

async function pickCardByName(name: string) {
  return prisma.card.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    orderBy: { setId: "asc" }, // prefer an older printing so it's a recognizable copy
  });
}

async function seedListings(userId: string, names: string[], kind: ListingKind) {
  const results: { name: string; ok: boolean; setName?: string }[] = [];
  for (const name of names) {
    const card = await pickCardByName(name);
    if (!card) {
      results.push({ name, ok: false });
      continue;
    }
    await prisma.listing.upsert({
      where: { userId_cardId_kind: { userId, cardId: card.id, kind } },
      update: { quantity: 1 },
      create: { userId, cardId: card.id, kind, quantity: 1 },
    });
    const set = await prisma.cardSet.findUnique({ where: { id: card.setId } });
    results.push({ name, ok: true, setName: set?.name });
  }
  return results;
}

async function main() {
  const user = await upsertUser();
  console.log(`Mock user: @${user.handle} (${user.email})`);

  const haves = await seedListings(user.id, HAVES, "HAVE");
  const wants = await seedListings(user.id, WANTS, "WANT");

  console.log("\nHAVEs:");
  for (const r of haves) {
    console.log(`  ${r.ok ? "✓" : "✗"} ${r.name}${r.setName ? ` — ${r.setName}` : " (not in catalog)"}`);
  }
  console.log("\nWANTs:");
  for (const r of wants) {
    console.log(`  ${r.ok ? "✓" : "✗"} ${r.name}${r.setName ? ` — ${r.setName}` : " (not in catalog)"}`);
  }

  console.log(`\nView them at http://localhost:3000/u/${HANDLE}`);
  console.log(
    "\nTo see a match, log in as yourself and add:\n" +
      "  · Some HAVEs from their WANT list above\n" +
      "  · Some WANTs from their HAVE list above\n" +
      "Then visit /matches."
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
