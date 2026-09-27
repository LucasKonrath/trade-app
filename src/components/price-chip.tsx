"use client";

import { useState, useTransition } from "react";
import { addPriceToListing, removePriceFromListing } from "@/app/actions/listings";
import { formatBRL, parseBRLInput } from "@/lib/money";
import { useT } from "@/lib/i18n/client";
import type { ListingKind } from "@prisma/client";

type Props = {
  cardId: string;
  kind: ListingKind;
  currentPriceCents: number | null;
};

export function PriceChip({ cardId, kind, currentPriceCents }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState(
    currentPriceCents ? String(currentPriceCents / 100).replace(".", ",") : "",
  );
  const [error, setError] = useState<string | null>(null);
  const t = useT();

  const save = () => {
    setError(null);
    const cents = parseBRLInput(amount);
    if (cents == null || cents <= 0) {
      setError(t("priceChip.enterPrice"));
      return;
    }
    startTransition(async () => {
      try {
        await addPriceToListing({ cardId, kind, priceCents: cents });
        setOpen(false);
      } catch (err) {
        setError((err as Error).message);
      }
    });
  };

  const clear = () => {
    startTransition(async () => {
      await removePriceFromListing({ cardId, kind });
      setOpen(false);
      setAmount("");
    });
  };

  if (!open) {
    if (currentPriceCents != null) {
      const price = formatBRL(currentPriceCents);
      return (
        <button
          onClick={() => setOpen(true)}
          disabled={pending}
          className="button is-small is-fullwidth is-primary is-light"
        >
          {kind === "HAVE"
            ? t("priceChip.sellWithPrice", { price })
            : t("priceChip.buyWithPrice", { price })}
        </button>
      );
    }
    return (
      <button
        onClick={() => setOpen(true)}
        disabled={pending}
        className="button is-small is-fullwidth"
      >
        {kind === "HAVE" ? t("priceChip.sellPromptShort") : t("priceChip.buyPromptShort")}
      </button>
    );
  }

  return (
    <div>
      <div className="field has-addons mb-1">
        <div className="control has-icons-left is-expanded">
          <input
            type="text"
            inputMode="decimal"
            autoFocus
            placeholder={t("priceChip.pricePlaceholder")}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") setOpen(false);
            }}
            className={`input is-small ${error ? "is-danger" : ""}`}
          />
          <span className="icon is-small is-left is-size-7">R$</span>
        </div>
        <div className="control">
          <button
            onClick={save}
            disabled={pending}
            className={`button is-small is-primary ${pending ? "is-loading" : ""}`}
          >
            {t("priceChip.save")}
          </button>
        </div>
      </div>
      <div className="buttons are-small" style={{ gap: "0.25rem" }}>
        <button
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="button is-small is-light"
          style={{ flex: 1 }}
        >
          {t("priceChip.cancel")}
        </button>
        {currentPriceCents != null && (
          <button
            onClick={clear}
            disabled={pending}
            className="button is-small is-danger is-outlined"
          >
            {t("priceChip.remove")}
          </button>
        )}
      </div>
      {error && <p className="help is-danger is-size-7">{error}</p>}
    </div>
  );
}
