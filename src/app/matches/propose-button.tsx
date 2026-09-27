"use client";

import { useTransition } from "react";
import { createTrade } from "@/app/actions/trades";

type Props = {
  responderId: string;
  iGiveIds: string[];
  iReceiveIds: string[];
};

export function ProposeTradeButton({ responderId, iGiveIds, iReceiveIds }: Props) {
  const [pending, startTransition] = useTransition();

  const onClick = () => {
    startTransition(async () => {
      try {
        await createTrade({ responderId, iGiveIds, iReceiveIds });
      } catch (err) {
        // createTrade redirects to /trades/[id] on success, which throws a Next.js redirect.
        // Only re-alert on genuine errors, not on redirect throws.
        if ((err as Error).message !== "NEXT_REDIRECT") {
          alert((err as Error).message);
        }
      }
    });
  };

  return (
    <button
      onClick={onClick}
      disabled={pending}
      className={`button is-primary ${pending ? "is-loading" : ""}`}
    >
      Propose trade
    </button>
  );
}
