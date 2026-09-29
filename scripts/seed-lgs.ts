/**
 * Create the default seed LGS and auto-enroll every existing user as a MEMBER
 * with that LGS as their primary. Also promotes the app's original owner
 * (matched by email) to OWNER of the seed LGS.
 *
 * Idempotent. Safe to re-run.
 *
 * Usage: npm run seed:lgs
 */

import { PrismaClient, LgsRole } from "@prisma/client";

const prisma = new PrismaClient();

const SEED_SLUG = "taverna-turno-extra";
const SEED_NAME = "Taverna Turno Extra";
const SEED_CITY = "Brasil";
const OWNER_EMAIL = "lucaskdamaceno@gmail.com";

async function main() {
  const lgs = await prisma.lgs.upsert({
    where: { slug: SEED_SLUG },
    update: { name: SEED_NAME, city: SEED_CITY },
    create: { slug: SEED_SLUG, name: SEED_NAME, city: SEED_CITY },
  });
  console.log(`Seed LGS: ${lgs.name} (${lgs.id})`);

  // Enroll every user who isn't already a member.
  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  let enrolled = 0;
  let existing = 0;
  for (const u of users) {
    const already = await prisma.lgsMembership.findUnique({
      where: { userId_lgsId: { userId: u.id, lgsId: lgs.id } },
    });
    if (already) {
      existing += 1;
      continue;
    }
    await prisma.lgsMembership.create({
      data: {
        userId: u.id,
        lgsId: lgs.id,
        role: LgsRole.MEMBER,
        isPrimary: true,
      },
    });
    enrolled += 1;
  }
  console.log(`Members: ${enrolled} newly enrolled · ${existing} already present`);

  // Promote the app owner to OWNER of the seed LGS.
  const owner = users.find((u) => u.email?.toLowerCase() === OWNER_EMAIL.toLowerCase());
  if (owner) {
    await prisma.lgsMembership.upsert({
      where: { userId_lgsId: { userId: owner.id, lgsId: lgs.id } },
      update: { role: LgsRole.OWNER, isPrimary: true },
      create: {
        userId: owner.id,
        lgsId: lgs.id,
        role: LgsRole.OWNER,
        isPrimary: true,
      },
    });
    console.log(`Promoted ${OWNER_EMAIL} to OWNER`);
  } else {
    console.log(`OWNER email ${OWNER_EMAIL} not found in users — promote later manually`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
