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
  // Accept "12,50" or "12.50" or "12"
  const normalized = trimmed.replace(/[^\d,.-]/g, "").replace(",", ".");
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}
