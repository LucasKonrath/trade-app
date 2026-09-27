"use client";

import { useTransition } from "react";
import { createTrade } from "@/app/actions/trades";
import type { ListingKind, OfferType } from "@prisma/client";

type Props = {
  ownerId: string;
  cardId: string;
  kind: ListingKind;
  offerType: OfferType;
  priceCents: number | null;
  disabled?: boolean;
};

/**
 * Starts a trade with the listing owner as responder. The card is put on the
 * appropriate side (their HAVE → they give; their WANT → I give). If the
 * listing has a cash price, it becomes the trade's cashCents in the right
 * direction. The requester can edit everything on the resulting OPEN trade
 * before sending.
 */
export function ProposeListingButton({
  ownerId,
  cardId,
  kind,
  offerType,
  priceCents,
  disabled,
}: Props) {
  const [pending, startTransition] = useTransition();

  const label =
    offerType === "CASH_ONLY"
      ? kind === "HAVE"
        ? "Buy"
        : "Sell"
      : offerType === "TRADE_OR_CASH"
        ? kind === "HAVE"
          ? "Trade or buy"
          : "Trade or sell"
        : kind === "HAVE"
          ? "Propose trade"
          : "Offer to trade";

  const onClick = () => {
    startTransition(async () => {
      try {
        // HAVE listing: they give the card to me.
        // WANT listing: I give the card to them.
        const iGiveIds = kind === "WANT" ? [cardId] : [];
        const iReceiveIds = kind === "HAVE" ? [cardId] : [];
        // Cash direction:
        //   HAVE + priced → I pay them (cashCents negative from my POV as requester)
        //   WANT + priced → they pay me (cashCents positive)
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
