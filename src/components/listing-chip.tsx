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
  } | null;
};

export function ListingChip({ cardId, kind, existing }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const t = useT();

  const [price, setPrice] = useState(
    existing?.priceCents ? String(existing.priceCents / 100).replace(".", ",") : "",
  );
  // Default accept-trades to true unless the existing listing is CASH_ONLY.
  const [acceptTrades, setAcceptTrades] = useState(
    existing ? existing.offerType !== "CASH_ONLY" : true,
  );
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    setError(null);
    const trimmed = price.trim();
    let cents: number | null = null;
    if (trimmed) {
      cents = parseBRLInput(trimmed);
      if (cents == null || cents <= 0) {
        setError(t("listingChip.invalidPrice"));
        return;
      }
    }
    startTransition(async () => {
      try {
        await saveListing({ cardId, kind, priceCents: cents, acceptTrades });
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
    let summary: string;
    if (existing.offerType === "TRADE_ONLY") {
      summary = kind === "HAVE" ? t("cards.listedForTrade") : t("cards.wantForTrade");
    } else if (existing.offerType === "CASH_ONLY") {
      if (existing.priceCents == null) {
        summary = kind === "HAVE" ? t("cards.listedForOffers") : t("cards.wantForOffers");
      } else {
        const price = formatBRL(existing.priceCents);
        summary =
          kind === "HAVE"
            ? t("cards.listedForSale", { price })
            : t("cards.wantForCash", { price });
      }
    } else {
      if (existing.priceCents == null) {
        summary =
          kind === "HAVE" ? t("cards.listedForTradeOrOffers") : t("cards.wantForTradeOrOffers");
      } else {
        const price = formatBRL(existing.priceCents);
        summary =
          kind === "HAVE"
            ? t("cards.listedForSaleOrTrade", { price })
            : t("cards.wantForCashOrTrade", { price });
      }
    }
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

  const priceLabel =
    kind === "HAVE" ? t("listingChip.priceOptional") : t("listingChip.maxPriceOptional");

  return (
    <div className="listing-chip-editor box p-2 mb-0">
      <div className="field mb-2">
        <label className="label is-size-7 has-text-grey mb-1">{priceLabel}</label>
        <div className="control has-icons-left">
          <input
            type="text"
            inputMode="decimal"
            autoFocus
            placeholder="12,50"
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
      </div>
      <label className="checkbox is-size-7 mb-2 is-block">
        <input
          type="checkbox"
          checked={acceptTrades}
          onChange={(e) => setAcceptTrades(e.target.checked)}
        />{" "}
        {t("listingChip.acceptTrades")}
      </label>
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
