"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const HandleSchema = z
  .string()
  .trim()
  .min(3, "Handle must be at least 3 characters")
  .max(24, "Handle must be at most 24 characters")
  .regex(/^[a-z0-9_]+$/, "Handle must be lowercase letters, numbers, or underscores");

export type HandleState = { error?: string };

export async function setHandle(_prev: HandleState, formData: FormData): Promise<HandleState> {
  const session = await auth();
  if (!session?.user) return { error: "Not signed in" };

  const parsed = HandleSchema.safeParse(formData.get("handle"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid handle" };
  }

  const handle = parsed.data.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { handle } });
  if (existing && existing.id !== session.user.id) {
    return { error: "That handle is taken" };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { handle },
  });

  revalidatePath("/", "layout");
  redirect("/me/listings");
}
