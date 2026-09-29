"use client";

import { useState, useTransition } from "react";
import { saveListing, deleteListing } from "@/app/actions/listings";
import { formatBRL, parseBRLInput } from "@/lib/money";
import { useT } from "@/lib/i18n/client";
import type { ListingKind, OfferType } from "@prisma/client";

type Props = {
  cardId: string;
  kind: ListingKind;
  existing: {
    id: string;
    offerType: OfferType;
    priceCents: number | null;
    quantity: number;
  } | null;
  suggestedPriceCents?: number | null;
};

function initialFlags(kind: ListingKind, existing: Props["existing"]) {
  if (existing) {
    return {
      acceptTrades: existing.offerType !== "CASH_ONLY",
      acceptCash: existing.offerType !== "TRADE_ONLY",
    };
  }
  // Sensible defaults: HAVE side owns cards (likely trade), WANT side seeks (likely buy).
  return kind === "HAVE"
    ? { acceptTrades: true, acceptCash: false }
    : { acceptTrades: false, acceptCash: true };
}

export function ListingChip({ cardId, kind, existing, suggestedPriceCents }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const t = useT();

  const initial = initialFlags(kind, existing);
  const [price, setPrice] = useState(
    existing?.priceCents ? String(existing.priceCents / 100).replace(".", ",") : "",
  );
  const [acceptTrades, setAcceptTrades] = useState(initial.acceptTrades);
  const [acceptCash, setAcceptCash] = useState(initial.acceptCash);
  const [quantity, setQuantity] = useState(String(existing?.quantity ?? 1));
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    setError(null);
    if (!acceptTrades && !acceptCash) {
      setError(t("listingChip.pickAtLeastOne"));
      return;
    }
    let cents: number | null = null;
    if (acceptCash && price.trim()) {
      cents = parseBRLInput(price);
      if (cents == null || cents <= 0) {
        setError(t("listingChip.invalidPrice"));
        return;
      }
    }
    const qty = Math.max(1, Math.min(999, Number(quantity) || 1));
    startTransition(async () => {
      try {
        await saveListing({
          cardId,
          kind,
          priceCents: cents,
          acceptTrades,
          acceptCash,
          quantity: qty,
        });
        setOpen(false);
      } catch (err) {
        setError((err as Error).message);
      }
    });
  };

  const remove = () => {
    if (!existing) {
      setOpen(false);
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("listingId", existing.id);
      await deleteListing(fd);
      setOpen(false);
    });
  };

  const tone = kind === "HAVE" ? "is-success" : "is-warning";

  if (!open) {
    if (!existing) {
      const label = kind === "HAVE" ? t("cards.iHaveThis") : t("cards.iWantThis");
      return (
        <button
          onClick={() => setOpen(true)}
          disabled={pending}
          className="button is-small is-fullwidth"
        >
          {label}
        </button>
      );
    }
    const eachSuffix = existing.quantity > 1 ? ` ${t("common.perUnit")}` : "";
    let summary: string;
    if (existing.offerType === "TRADE_ONLY") {
      summary = kind === "HAVE" ? t("cards.listedForTrade") : t("cards.wantForTrade");
    } else if (existing.offerType === "CASH_ONLY") {
      if (existing.priceCents == null) {
        summary = kind === "HAVE" ? t("cards.listedForOffers") : t("cards.wantForOffers");
      } else {
        const priceStr = formatBRL(existing.priceCents) + eachSuffix;
        summary =
          kind === "HAVE"
            ? t("cards.listedForSale", { price: priceStr })
            : t("cards.wantForCash", { price: priceStr });
      }
    } else {
      if (existing.priceCents == null) {
        summary =
          kind === "HAVE" ? t("cards.listedForTradeOrOffers") : t("cards.wantForTradeOrOffers");
      } else {
        const priceStr = formatBRL(existing.priceCents) + eachSuffix;
        summary =
          kind === "HAVE"
            ? t("cards.listedForSaleOrTrade", { price: priceStr })
            : t("cards.wantForCashOrTrade", { price: priceStr });
      }
    }
    if (existing.quantity > 1) summary += ` · ${existing.quantity}×`;
    return (
      <button
        onClick={() => setOpen(true)}
        disabled={pending}
        className={`button is-small is-fullwidth ${tone}`}
      >
        {summary}
      </button>
    );
  }

  const tradeLabel =
    kind === "HAVE" ? t("listingChip.wouldTradeAway") : t("listingChip.wouldTradeFor");
  const cashLabel =
    kind === "HAVE" ? t("listingChip.wouldSell") : t("listingChip.wouldBuy");
  const priceLabel =
    kind === "HAVE" ? t("listingChip.priceOptional") : t("listingChip.maxPriceOptional");

  return (
    <div className="listing-chip-editor box p-2 mb-0">
      <label className="checkbox is-size-7 is-block mb-1">
        <input
          type="checkbox"
          checked={acceptTrades}
          onChange={(e) => setAcceptTrades(e.target.checked)}
        />{" "}
        {tradeLabel}
      </label>
      <label className="checkbox is-size-7 is-block mb-2">
        <input
          type="checkbox"
          checked={acceptCash}
          onChange={(e) => setAcceptCash(e.target.checked)}
        />{" "}
        {cashLabel}
      </label>

      <div className="field mb-2">
        <label className="label is-size-7 has-text-grey mb-1">{t("listingChip.quantity")}</label>
        <div className="control">
          <input
            type="number"
            min={1}
            max={999}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="input is-small"
            style={{ maxWidth: 100 }}
          />
        </div>
      </div>

      {acceptCash && (
        <div className="field mb-2">
          <label className="label is-size-7 has-text-grey mb-1">{priceLabel}</label>
          <div className="control has-icons-left">
            <input
              type="text"
              inputMode="decimal"
              placeholder={suggestedPriceCents ? formatBRL(suggestedPriceCents) : ""}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") setOpen(false);
              }}
              className={`input is-small ${error ? "is-danger" : ""}`}
            />
            <span className="icon is-small is-left is-size-7">R$</span>
          </div>
          {suggestedPriceCents != null && !price.trim() && (
            <p className="help">
              {t("listingChip.suggestion", { price: formatBRL(suggestedPriceCents) })}{" "}
              <a
                onClick={() =>
                  setPrice(String(suggestedPriceCents / 100).replace(".", ","))
                }
              >
                {t("listingChip.useSuggestion")}
              </a>
            </p>
          )}
        </div>
      )}

      {error && <p className="help is-danger mb-2">{error}</p>}

      <div className="buttons are-small mt-2" style={{ gap: "0.25rem" }}>
        <button
          onClick={save}
          disabled={pending}
          className={`button is-small is-primary ${pending ? "is-loading" : ""}`}
          style={{ flex: 1 }}
        >
          {t("common.save")}
        </button>
        <button
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="button is-small is-light"
        >
          {t("common.cancel")}
        </button>
        {existing && (
          <button
            onClick={remove}
            disabled={pending}
            className="button is-small is-danger is-outlined"
          >
            {t("common.remove")}
          </button>
        )}
      </div>
    </div>
  );
}
