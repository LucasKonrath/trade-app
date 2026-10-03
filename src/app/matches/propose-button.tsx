"use client";

import { useTransition } from "react";
import { createTrade } from "@/app/actions/trades";
import { useT } from "@/lib/i18n/client";

type Props = {
  responderId: string;
  iGiveIds: string[];
  iReceiveIds: string[];
};

export function ProposeTradeButton({ responderId, iGiveIds, iReceiveIds }: Props) {
  const [pending, startTransition] = useTransition();
  const t = useT();

  const onClick = () => {
    startTransition(async () => {
      try {
        const result = await createTrade({ responderId, iGiveIds, iReceiveIds });
        if (result && result.ok === false) {
          alert(result.error);
        }
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
      disabled={pending}
      className={`button is-primary ${pending ? "is-loading" : ""}`}
    >
      {t("propose.proposeTrade")}
    </button>
  );
}
