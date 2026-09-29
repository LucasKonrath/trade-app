"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LgsRole } from "@prisma/client";

async function currentUser() {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  if (!session.user.handle) redirect("/onboarding");
  return session.user;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const CreateSchema = z.object({
  name: z.string().trim().min(3).max(60),
  city: z.string().trim().max(60).optional(),
});

export async function createLgs(input: { name: string; city?: string }) {
  const me = await currentUser();
  const parsed = CreateSchema.parse(input);

  const base = slugify(parsed.name);
  if (base.length < 3) throw new Error("Nome inválido");

  // Pick a unique slug: base, base-2, base-3, …
  let slug = base;
  let n = 1;
  while (await prisma.lgs.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${base}-${n}`;
  }

  const otherMemberships = await prisma.lgsMembership.count({ where: { userId: me.id } });

  const lgs = await prisma.lgs.create({
    data: {
      slug,
      name: parsed.name,
      city: parsed.city && parsed.city.length > 0 ? parsed.city : null,
      memberships: {
        create: {
          userId: me.id,
          role: LgsRole.OWNER,
          isPrimary: otherMemberships === 0,
        },
      },
    },
  });

  revalidatePath("/lgs");
  revalidatePath("/", "layout");
  redirect(`/lgs/${lgs.slug}`);
}

const IdSchema = z.object({ lgsId: z.string().cuid() });

export async function joinLgs(input: { lgsId: string }) {
  const me = await currentUser();
  const { lgsId } = IdSchema.parse(input);

  const existing = await prisma.lgsMembership.findUnique({
    where: { userId_lgsId: { userId: me.id, lgsId } },
  });
  if (existing) return;

  const otherCount = await prisma.lgsMembership.count({ where: { userId: me.id } });

  await prisma.lgsMembership.create({
    data: {
      userId: me.id,
      lgsId,
      role: LgsRole.MEMBER,
      isPrimary: otherCount === 0,
    },
  });

  revalidatePath("/lgs");
  revalidatePath("/", "layout");
  revalidatePath("/browse");
  revalidatePath("/matches");
  revalidatePath("/users");
}

export async function leaveLgs(input: { lgsId: string }) {
  const me = await currentUser();
  const { lgsId } = IdSchema.parse(input);

  const membership = await prisma.lgsMembership.findUnique({
    where: { userId_lgsId: { userId: me.id, lgsId } },
  });
  if (!membership) return;

  if (membership.role === LgsRole.OWNER) {
    const otherOwners = await prisma.lgsMembership.count({
      where: { lgsId, role: LgsRole.OWNER, userId: { not: me.id } },
    });
    if (otherOwners === 0) {
      throw new Error("Você é o único dono. Transfira antes de sair.");
    }
  }

  await prisma.lgsMembership.delete({ where: { id: membership.id } });

  if (membership.isPrimary) {
    const another = await prisma.lgsMembership.findFirst({
      where: { userId: me.id },
      orderBy: { joinedAt: "asc" },
    });
    if (another) {
      await prisma.lgsMembership.update({
        where: { id: another.id },
        data: { isPrimary: true },
      });
    }
  }

  revalidatePath("/lgs");
  revalidatePath("/", "layout");
  revalidatePath("/browse");
  revalidatePath("/matches");
  revalidatePath("/users");
}

export async function setPrimaryLgs(input: { lgsId: string }) {
  const me = await currentUser();
  const { lgsId } = IdSchema.parse(input);

  const membership = await prisma.lgsMembership.findUnique({
    where: { userId_lgsId: { userId: me.id, lgsId } },
  });
  if (!membership) throw new Error("Você não é membro desse LGS");

  await prisma.$transaction([
    prisma.lgsMembership.updateMany({
      where: { userId: me.id, isPrimary: true },
      data: { isPrimary: false },
    }),
    prisma.lgsMembership.update({
      where: { id: membership.id },
      data: { isPrimary: true },
    }),
  ]);

  revalidatePath("/", "layout");
}
