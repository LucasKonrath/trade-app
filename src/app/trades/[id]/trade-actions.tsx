"use client";

import { useTransition } from "react";
import { sendTrade, acceptTrade, finishTrade, deleteTrade } from "@/app/actions/trades";
import type { TradeStatus } from "@prisma/client";

type Props = {
  tradeId: string;
  status: TradeStatus;
  iAmRequester: boolean;
  iGiveCount: number;
  iReceiveCount: number;
};

export function TradeActions({ tradeId, status, iAmRequester, iGiveCount, iReceiveCount }: Props) {
  const [pending, startTransition] = useTransition();

  const run = (fn: (fd: FormData) => Promise<void>) => {
    const fd = new FormData();
    fd.set("tradeId", tradeId);
    startTransition(async () => {
      try {
        await fn(fd);
      } catch (err) {
        alert((err as Error).message);
      }
    });
  };

  const buttons: React.ReactNode[] = [];

  if (status === "OPEN" && iAmRequester) {
    const canSend = iGiveCount > 0 && iReceiveCount > 0;
    buttons.push(
      <button
        key="send"
        onClick={() => run(sendTrade)}
        disabled={pending || !canSend}
        className={`button is-primary ${pending ? "is-loading" : ""}`}
      >
        Send request
      </button>,
    );
    buttons.push(
      <button
        key="del"
        onClick={() => confirm("Delete this draft?") && run(deleteTrade)}
        disabled={pending}
        className="button is-light is-danger is-outlined"
      >
        Delete draft
      </button>,
    );
  }

  if (status === "REQUESTED" && !iAmRequester) {
    buttons.push(
      <button
        key="accept"
        onClick={() => run(acceptTrade)}
        disabled={pending}
        className={`button is-primary ${pending ? "is-loading" : ""}`}
      >
        Accept
      </button>,
      <button
        key="decline"
        onClick={() => confirm("Decline this trade?") && run(deleteTrade)}
        disabled={pending}
        className="button is-danger is-outlined"
      >
        Decline
      </button>,
    );
  }

  if (status === "REQUESTED" && iAmRequester) {
    buttons.push(
      <button
        key="cancel"
        onClick={() => confirm("Cancel this request?") && run(deleteTrade)}
        disabled={pending}
        className="button is-light is-danger is-outlined"
      >
        Cancel request
      </button>,
    );
  }

  if (status === "ACCEPTED") {
    buttons.push(
      <button
        key="finish"
        onClick={() =>
          confirm("Mark trade as finished? Cards will be removed from both users' lists.") &&
          run(finishTrade)
        }
        disabled={pending}
        className={`button is-success ${pending ? "is-loading" : ""}`}
      >
        Mark as finished
      </button>,
      <button
        key="cancel-a"
        onClick={() => confirm("Back out of this accepted trade?") && run(deleteTrade)}
        disabled={pending}
        className="button is-light is-danger is-outlined"
      >
        Cancel trade
      </button>,
    );
  }

  if (buttons.length === 0) {
    return <p className="has-text-grey is-size-7">No actions available for this state.</p>;
  }

  return (
    <div className="buttons">
      {buttons}
    </div>
  );
}
