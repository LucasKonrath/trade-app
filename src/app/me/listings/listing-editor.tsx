"use client";

import { useState, useTransition } from "react";
import { upsertListing, deleteListing } from "@/app/actions/listings";
import { formatBRL, parseBRLInput } from "@/lib/money";
import type { CardCondition, ListingKind, OfferType } from "@prisma/client";

const CONDITIONS: CardCondition[] = ["NM", "LP", "MP", "HP", "DMG"];

const OFFER_LABEL_HAVE: Record<OfferType, string> = {
  TRADE_ONLY: "Trade only",
  CASH_ONLY: "For sale (cash only)",
  TRADE_OR_CASH: "Trade or sale",
};

const OFFER_LABEL_WANT: Record<OfferType, string> = {
  TRADE_ONLY: "Trade only",
  CASH_ONLY: "Buying (cash only)",
  TRADE_OR_CASH: "Trade or buying",
};

type Props = {
  listingId: string;
  cardId: string;
  kind: ListingKind;
  quantity: number;
  condition: CardCondition | null;
  note: string | null;
  offerType: OfferType;
  priceCents: number | null;
};

export function ListingEditor({
  listingId,
  cardId,
  kind,
  quantity,
  condition,
  note,
  offerType,
  priceCents,
}: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [q, setQ] = useState(String(quantity));
  const [c, setC] = useState<CardCondition | "">(condition ?? "");
  const [n, setN] = useState(note ?? "");
  const [ot, setOt] = useState<OfferType>(offerType);
  const [price, setPrice] = useState(priceCents ? String(priceCents / 100).replace(".", ",") : "");
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    setError(null);
    if (ot !== "TRADE_ONLY") {
      const cents = parseBRLInput(price);
      if (cents == null || cents <= 0) {
        setError("Set a price for cash listings");
        return;
      }
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("cardId", cardId);
      fd.set("kind", kind);
      fd.set("quantity", q);
      if (c) fd.set("condition", c);
      if (n) fd.set("note", n);
      fd.set("offerType", ot);
      if (ot !== "TRADE_ONLY") {
        const cents = parseBRLInput(price);
        if (cents != null) fd.set("priceCents", String(cents));
      }
      try {
        await upsertListing(fd);
        setOpen(false);
      } catch (err) {
        setError((err as Error).message);
      }
    });
  };

  const remove = () => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("listingId", listingId);
      await deleteListing(fd);
    });
  };

  const offerLabels = kind === "HAVE" ? OFFER_LABEL_HAVE : OFFER_LABEL_WANT;

  if (!open) {
    return (
      <div className="is-size-7">
        <div className="has-text-grey">
          Qty {quantity}
          {condition ? ` · ${condition}` : ""}
        </div>
        <div className="mt-1">
          <span
            className={`tag is-small ${
              offerType === "TRADE_ONLY" ? "is-light" : offerType === "CASH_ONLY" ? "is-primary" : "is-warning"
            }`}
          >
            {offerLabels[offerType]}
            {priceCents ? ` · ${formatBRL(priceCents)}` : ""}
          </span>
        </div>
        {note && (
          <div className="has-text-grey mt-1" style={{ lineHeight: 1.3 }}>
            {note}
          </div>
        )}
        <div className="buttons are-small mt-2" style={{ gap: "0.375rem" }}>
          <button onClick={() => setOpen(true)} className="button is-light is-small is-fullwidth" style={{ flex: 1 }}>
            Edit
          </button>
          <button
            onClick={remove}
            disabled={pending}
            className={`button is-danger is-outlined is-small ${pending ? "is-loading" : ""}`}
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="is-size-7">
      <div className="field is-horizontal mb-1">
        <div className="field-label is-small" style={{ flexBasis: "3rem", flexGrow: 0 }}>
          <label className="label is-small has-text-grey">Qty</label>
        </div>
        <div className="field-body">
          <div className="field">
            <div className="control">
              <input
                type="number"
                min={1}
                max={999}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="input is-small"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="field is-horizontal mb-1">
        <div className="field-label is-small" style={{ flexBasis: "3rem", flexGrow: 0 }}>
          <label className="label is-small has-text-grey">Cond</label>
        </div>
        <div className="field-body">
          <div className="field">
            <div className="control">
              <div className="select is-small is-fullwidth">
                <select value={c} onChange={(e) => setC(e.target.value as CardCondition | "")}>
                  <option value="">—</option>
                  {CONDITIONS.map((cond) => (
                    <option key={cond} value={cond}>
                      {cond}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="field is-horizontal mb-1">
        <div className="field-label is-small" style={{ flexBasis: "3rem", flexGrow: 0 }}>
          <label className="label is-small has-text-grey">Type</label>
        </div>
        <div className="field-body">
          <div className="field">
            <div className="control">
              <div className="select is-small is-fullwidth">
                <select value={ot} onChange={(e) => setOt(e.target.value as OfferType)}>
                  <option value="TRADE_ONLY">{offerLabels.TRADE_ONLY}</option>
                  <option value="CASH_ONLY">{offerLabels.CASH_ONLY}</option>
                  <option value="TRADE_OR_CASH">{offerLabels.TRADE_OR_CASH}</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {ot !== "TRADE_ONLY" && (
        <div className="field is-horizontal mb-1">
          <div className="field-label is-small" style={{ flexBasis: "3rem", flexGrow: 0 }}>
            <label className="label is-small has-text-grey">R$</label>
          </div>
          <div className="field-body">
            <div className="field">
              <div className="control">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="12,50"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="input is-small"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="field">
        <div className="control">
          <textarea
            value={n}
            onChange={(e) => setN(e.target.value)}
            placeholder="Note (optional)"
            maxLength={280}
            rows={2}
            className="textarea is-small"
          />
        </div>
      </div>

      {error && <p className="help is-danger mb-2">{error}</p>}

      <div className="buttons are-small mt-2" style={{ gap: "0.375rem" }}>
        <button
          onClick={save}
          disabled={pending}
          className={`button is-primary is-small ${pending ? "is-loading" : ""}`}
          style={{ flex: 1 }}
        >
          Save
        </button>
        <button
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="button is-light is-small"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
