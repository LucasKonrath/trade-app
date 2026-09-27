import { cookies, headers } from "next/headers";
import { translate } from "./t";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "./messages";

export const LOCALE_COOKIE = "locale";

/**
 * Resolves the current locale for a request using (in order):
 * 1. `locale` cookie set by the user
 * 2. Accept-Language header (matches on prefix)
 * 3. Default (pt-BR)
 */
export async function getLocale(): Promise<Locale> {
  const c = await cookies();
  const stored = c.get(LOCALE_COOKIE)?.value;
  if (stored && (LOCALES as string[]).includes(stored)) return stored as Locale;

  const h = await headers();
  const accept = h.get("accept-language") ?? "";
  const first = accept.split(",")[0]?.toLowerCase() ?? "";
  if (first.startsWith("pt")) return "pt-BR";
  if (first.startsWith("en")) return "en";
  return DEFAULT_LOCALE;
}

/**
 * Server-side translator bound to the current request's locale.
 * Use in server components / server actions.
 */
export async function getT() {
  const locale = await getLocale();
  const t = (key: string, params?: Record<string, string | number>) =>
    translate(locale, key, params);
  return { t, locale };
}
