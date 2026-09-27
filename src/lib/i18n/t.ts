import { MESSAGES, type Locale } from "./messages";

/**
 * Look up a translation by dot-path (e.g. "cards.title"), substituting
 * {placeholders} from params.
 */
export function translate(
  locale: Locale,
  key: string,
  params?: Record<string, string | number>,
): string {
  const parts = key.split(".");
  let node: unknown = MESSAGES[locale];
  for (const p of parts) {
    if (node && typeof node === "object" && p in (node as Record<string, unknown>)) {
      node = (node as Record<string, unknown>)[p];
    } else {
      node = undefined;
      break;
    }
  }
  if (typeof node !== "string") {
    // Fall back to English if key missing in requested locale.
    if (locale !== "en") return translate("en", key, params);
    return key;
  }
  if (!params) return node;
  return node.replace(/\{(\w+)\}/g, (_, k) =>
    k in params ? String(params[k]) : `{${k}}`,
  );
}
