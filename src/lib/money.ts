const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatBRL(cents: number | null | undefined): string {
  if (cents == null) return "";
  return BRL.format(cents / 100);
}

export function parseBRLInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const normalized = trimmed.replace(/[^\d,.-]/g, "").replace(",", ".");
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

/**
 * Format a per-unit price with an "each" suffix when quantity > 1.
 * The suffix comes from the caller (localized) so this function stays
 * lib-safe (no React / t() dependency).
 */
export function formatUnitPrice(
  cents: number | null | undefined,
  quantity: number,
  eachSuffix: string,
): string {
  const price = formatBRL(cents);
  if (!price) return "";
  return quantity > 1 ? `${price} ${eachSuffix}` : price;
}
