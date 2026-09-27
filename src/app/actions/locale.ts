"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALES, type Locale } from "@/lib/i18n/messages";
import { LOCALE_COOKIE } from "@/lib/i18n/server";

export async function setLocale(locale: Locale) {
  if (!(LOCALES as string[]).includes(locale)) return;
  const c = await cookies();
  c.set(LOCALE_COOKIE, locale, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
}
