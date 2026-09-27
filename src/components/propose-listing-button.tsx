"use client";

import { useTransition } from "react";
import { createTrade } from "@/app/actions/trades";
import { useT } from "@/lib/i18n/client";
import type { ListingKind, OfferType } from "@prisma/client";

type Props = {
  ownerId: string;
  cardId: string;
  kind: ListingKind;
  offerType: OfferType;
  priceCents: number | null;
  disabled?: boolean;
};

export function ProposeListingButton({
  ownerId,
  cardId,
  kind,
  offerType,
  priceCents,
  disabled,
}: Props) {
  const [pending, startTransition] = useTransition();
  const t = useT();

  const label =
    offerType === "CASH_ONLY"
      ? kind === "HAVE"
        ? t("propose.buy")
        : t("propose.sell")
      : offerType === "TRADE_OR_CASH"
        ? kind === "HAVE"
          ? t("propose.tradeOrBuy")
          : t("propose.tradeOrSell")
        : kind === "HAVE"
          ? t("propose.proposeTrade")
          : t("propose.offerToTrade");

  const onClick = () => {
    startTransition(async () => {
      try {
        const iGiveIds = kind === "WANT" ? [cardId] : [];
        const iReceiveIds = kind === "HAVE" ? [cardId] : [];
        let cashCents: number | undefined;
        if (priceCents && (offerType === "CASH_ONLY" || offerType === "TRADE_OR_CASH")) {
          cashCents = kind === "HAVE" ? -priceCents : priceCents;
        }
        await createTrade({
          responderId: ownerId,
          iGiveIds,
          iReceiveIds,
          cashCents,
        });
      } catch (err) {
        if ((err as Error).message !== "NEXT_REDIRECT") {
          alert((err as Error).message);
        }
      }
    });
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || pending}
      className={`button is-small is-primary is-fullwidth ${pending ? "is-loading" : ""}`}
    >
      {label}
    </button>
  );
}
