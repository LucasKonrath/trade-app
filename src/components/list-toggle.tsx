"use client";

import { useTransition } from "react";
import { upsertListing, deleteListing } from "@/app/actions/listings";
import { useT } from "@/lib/i18n/client";
import type { ListingKind } from "@prisma/client";

type Props = {
  cardId: string;
  existing: { id: string; quantity: number } | null;
  kind: ListingKind;
};

export function ListToggle({ cardId, existing, kind }: Props) {
  const [pending, startTransition] = useTransition();
  const t = useT();

  const active = !!existing;
  const label = kind === "HAVE" ? t("cards.iHaveThis") : t("cards.iWantThis");
  const activeLabel = kind === "HAVE" ? t("cards.inMyHaves") : t("cards.inMyWants");

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
