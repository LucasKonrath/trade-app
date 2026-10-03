"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checkLimit, limiters } from "@/lib/ratelimit";
import { AVAILABLE_GAMES } from "@/lib/config";
import { GameSlug } from "@prisma/client";

const Schema = z.object({
  slugs: z.array(z.nativeEnum(GameSlug)).min(1),
});

/**
 * Replace the current user's game interests with the given set.
 * Requires at least one game — the picker enforces this too.
 */
export async function setGameInterests(
  input: { slugs: GameSlug[] },
): Promise<void | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const limit = await checkLimit(
    limiters.gameInterests,
    session.user.id,
    "Você mudou de jogos muitas vezes.",
  );
  if (!limit.ok) return limit;

  const parsed = Schema.parse(input);
  const requested = parsed.slugs.filter((s) => (AVAILABLE_GAMES as string[]).includes(s));
  if (requested.length === 0) throw new Error("Escolha pelo menos um jogo");

  const games = await prisma.game.findMany({
    where: { slug: { in: requested } },
    select: { id: true, slug: true },
  });

  await prisma.$transaction([
    prisma.userGameInterest.deleteMany({ where: { userId: session.user.id } }),
    prisma.userGameInterest.createMany({
      data: games.map((g) => ({ userId: session.user.id, gameId: g.id })),
    }),
  ]);

  revalidatePath("/", "layout");
}
