"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { looksLikeDiscordWebhook, sendTestNotification } from "@/lib/notifications";

const SetSchema = z.object({
  url: z.string().trim().max(500),
});

export async function setDiscordWebhook(input: { url: string }) {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const { url } = SetSchema.parse(input);
  const cleaned = url.trim();

  if (cleaned === "") {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { discordWebhookUrl: null },
    });
    revalidatePath("/me/preferences");
    return { ok: true, cleared: true };
  }

  if (!looksLikeDiscordWebhook(cleaned)) {
    return {
      ok: false,
      error: "URL não parece ser um webhook do Discord válido",
    };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { discordWebhookUrl: cleaned },
  });
  revalidatePath("/me/preferences");
  return { ok: true };
}

export async function testDiscordWebhook() {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { discordWebhookUrl: true },
  });
  if (!user?.discordWebhookUrl) {
    return { ok: false, error: "Nenhum webhook configurado" };
  }
  await sendTestNotification(session.user.id);
  return { ok: true };
}
