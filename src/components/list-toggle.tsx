"use client";

import { useTransition } from "react";
import { upsertListing, deleteListing } from "@/app/actions/listings";
import type { ListingKind } from "@prisma/client";

type Props = {
  cardId: string;
  existing: { id: string; quantity: number } | null;
  kind: ListingKind;
};

export function ListToggle({ cardId, existing, kind }: Props) {
  const [pending, startTransition] = useTransition();

  const active = !!existing;
  const label = kind === "HAVE" ? "I have this" : "I want this";
  const activeLabel = kind === "HAVE" ? "In my Haves" : "In my Wants";

  const onToggle = () => {
    startTransition(async () => {
      if (active) {
        const fd = new FormData();
        fd.set("listingId", existing!.id);
        await deleteListing(fd);
      } else {
        const fd = new FormData();
        fd.set("cardId", cardId);
        fd.set("kind", kind);
        fd.set("quantity", "1");
        await upsertListing(fd);
      }
    });
  };

  const color = kind === "HAVE" ? "is-success" : "is-warning";

  return (
    <button
      onClick={onToggle}
      disabled={pending}
      className={`button is-small is-fullwidth ${active ? color : "is-light"} ${pending ? "is-loading" : ""}`}
    >
      {active ? activeLabel : label}
    </button>
  );
}
