"use client";

import { useState, useTransition } from "react";
import { addPriceToListing, removePriceFromListing } from "@/app/actions/listings";
import { formatBRL, parseBRLInput } from "@/lib/money";
import type { ListingKind } from "@prisma/client";

type Props = {
  cardId: string;
  kind: ListingKind;
  currentPriceCents: number | null;
};

/**
 * Compact "For sale R$ X" / "To buy R$ X" chip on card tiles.
 * Collapsed: shows current price or "Sell" / "Buy" call to action.
 * Expanded: shows price input + save/clear.
 */
export function PriceChip({ cardId, kind, currentPriceCents }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState(
    currentPriceCents ? String(currentPriceCents / 100).replace(".", ",") : "",
  );
  const [error, setError] = useState<string | null>(null);

  const label = kind === "HAVE" ? "Sell" : "Buy";

  const save = () => {
    setError(null);
    const cents = parseBRLInput(amount);
    if (cents == null || cents <= 0) {
      setError("Enter a price");
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
      return (
        <button
          onClick={() => setOpen(true)}
          disabled={pending}
          className="button is-small is-fullwidth is-primary is-light"
        >
          {label} · {formatBRL(currentPriceCents)}
        </button>
      );
    }
    return (
      <button
        onClick={() => setOpen(true)}
        disabled={pending}
        className="button is-small is-fullwidth"
      >
        {label} for R$…
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
            placeholder="12,50"
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
            Save
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
          Cancel
        </button>
        {currentPriceCents != null && (
          <button
            onClick={clear}
            disabled={pending}
            className="button is-small is-danger is-outlined"
          >
            Remove
          </button>
        )}
      </div>
      {error && <p className="help is-danger is-size-7">{error}</p>}
    </div>
  );
}
