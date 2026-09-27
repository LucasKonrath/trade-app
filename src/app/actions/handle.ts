"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getT } from "@/lib/i18n/server";

export type HandleState = { error?: string };

export async function setHandle(_prev: HandleState, formData: FormData): Promise<HandleState> {
  const { t } = await getT();

  const session = await auth();
  if (!session?.user) return { error: t("onboarding.errorNotSignedIn") };

  const HandleSchema = z
    .string()
    .trim()
    .min(3, t("onboarding.errorTooShort"))
    .max(24, t("onboarding.errorTooLong"))
    .regex(/^[a-z0-9_]+$/, t("onboarding.errorBadChars"));

  const parsed = HandleSchema.safeParse(formData.get("handle"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("onboarding.errorInvalid") };
  }

  const handle = parsed.data.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { handle } });
  if (existing && existing.id !== session.user.id) {
    return { error: t("onboarding.errorTaken") };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { handle },
  });

  revalidatePath("/", "layout");
  redirect("/me/listings");
}
