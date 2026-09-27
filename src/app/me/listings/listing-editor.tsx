"use client";

import { useState, useTransition } from "react";
import { upsertListing, deleteListing } from "@/app/actions/listings";
import type { CardCondition, ListingKind } from "@prisma/client";

const CONDITIONS: CardCondition[] = ["NM", "LP", "MP", "HP", "DMG"];

type Props = {
  listingId: string;
  cardId: string;
  kind: ListingKind;
  quantity: number;
  condition: CardCondition | null;
  note: string | null;
};

export function ListingEditor({ listingId, cardId, kind, quantity, condition, note }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [q, setQ] = useState(String(quantity));
  const [c, setC] = useState<CardCondition | "">(condition ?? "");
  const [n, setN] = useState(note ?? "");

  const save = () => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("cardId", cardId);
      fd.set("kind", kind);
      fd.set("quantity", q);
      if (c) fd.set("condition", c);
      if (n) fd.set("note", n);
      await upsertListing(fd);
      setOpen(false);
    });
  };

  const remove = () => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("listingId", listingId);
      await deleteListing(fd);
    });
  };

  if (!open) {
    return (
      <div className="is-size-7">
        <div className="has-text-grey">
          Qty {quantity}
          {condition ? ` · ${condition}` : ""}
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

      <div className="buttons are-small mt-2" style={{ gap: "0.375rem" }}>
        <button
          onClick={save}
          disabled={pending}
          className={`button is-primary is-small ${pending ? "is-loading" : ""}`}
          style={{ flex: 1 }}
        >
          Save
        </button>
        <button onClick={() => setOpen(false)} className="button is-light is-small">
          Cancel
        </button>
      </div>
    </div>
  );
}
