/**
 * Backfill existing users with Riftbound as their sole game interest.
 * Preserves current behavior when Pokemon becomes available — no user
 * suddenly starts seeing Pokemon cards without opting in.
 *
 * Idempotent. Safe to re-run.
 *
 * Usage: npm run seed:user-games
 */

import { PrismaClient, GameSlug } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const riftbound = await prisma.game.findUnique({ where: { slug: GameSlug.riftbound } });
  if (!riftbound) {
    console.error("Riftbound game not seeded; run seed:riftbound first.");
    process.exit(1);
  }

  const users = await prisma.user.findMany({
    where: { handle: { not: null } },
    select: { id: true, handle: true },
  });

  let enrolled = 0;
  let existing = 0;
  for (const u of users) {
    const already = await prisma.userGameInterest.findUnique({
      where: { userId_gameId: { userId: u.id, gameId: riftbound.id } },
    });
    if (already) {
      existing += 1;
      continue;
    }
    await prisma.userGameInterest.create({
      data: { userId: u.id, gameId: riftbound.id },
    });
    enrolled += 1;
  }

  console.log(`Enrolled ${enrolled} users in Riftbound · ${existing} already had it`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
