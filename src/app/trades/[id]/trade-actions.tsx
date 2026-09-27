"use client";

import { useTransition } from "react";
import {
  sendTrade,
  acceptTrade,
  confirmFinish,
  unconfirmFinish,
  deleteTrade,
} from "@/app/actions/trades";
import type { TradeStatus } from "@prisma/client";

type Props = {
  tradeId: string;
  status: TradeStatus;
  iAmRequester: boolean;
  iGiveCount: number;
  iReceiveCount: number;
  cashCents: number | null;
  myConfirmed: boolean;
  otherConfirmed: boolean;
  otherHandle: string | null;
};

export function TradeActions({
  tradeId,
  status,
  iAmRequester,
  iGiveCount,
  iReceiveCount,
  cashCents,
  myConfirmed,
  otherConfirmed,
  otherHandle,
}: Props) {
  const [pending, startTransition] = useTransition();

  const run = (fn: (fd: FormData) => Promise<void>) => {
    const fd = new FormData();
    fd.set("tradeId", tradeId);
    startTransition(async () => {
      try {
        await fn(fd);
      } catch (err) {
        if ((err as Error).message !== "NEXT_REDIRECT") {
          alert((err as Error).message);
        }
      }
    });
  };

  const buttons: React.ReactNode[] = [];
  let banner: React.ReactNode = null;

  if (status === "OPEN" && iAmRequester) {
    // Match sendTrade's server-side validation: each side must contribute
    // either cards or cash.
    const cash = cashCents ?? 0;
    const requesterProvides = iGiveCount > 0 || cash < 0;
    const responderProvides = iReceiveCount > 0 || cash > 0;
    const canSend = requesterProvides && responderProvides;
    buttons.push(
      <button
        key="send"
        onClick={() => run(sendTrade)}
        disabled={pending || !canSend}
        className={`button is-primary ${pending ? "is-loading" : ""}`}
      >
        Send request
      </button>,
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
    const otherLabel = otherHandle ? `@${otherHandle}` : "the other party";

    if (!myConfirmed && !otherConfirmed) {
      banner = (
        <div className="notification is-light is-info mb-3">
          Both of you need to confirm before the trade is finalized. Confirm once you&apos;ve made the swap.
        </div>
      );
      buttons.push(
        <button
          key="confirm"
          onClick={() => run(confirmFinish)}
          disabled={pending}
          className={`button is-success ${pending ? "is-loading" : ""}`}
        >
          Confirm my side
        </button>,
      );
    } else if (myConfirmed && !otherConfirmed) {
      banner = (
        <div className="notification is-warning mb-3">
          You&apos;ve confirmed. Waiting on {otherLabel} to confirm before cards are moved.
        </div>
      );
      buttons.push(
        <button
          key="unconfirm"
          onClick={() => run(unconfirmFinish)}
          disabled={pending}
          className="button is-light"
        >
          Undo my confirmation
        </button>,
      );
    } else if (!myConfirmed && otherConfirmed) {
      banner = (
        <div className="notification is-warning mb-3">
          {otherLabel} has confirmed. Confirming will finalize the trade and remove the
          cards from both HAVE/WANT lists.
        </div>
      );
      buttons.push(
        <button
          key="confirm-final"
          onClick={() =>
            confirm("Finalize the trade? Cards will be removed from both lists.") &&
            run(confirmFinish)
          }
          disabled={pending}
          className={`button is-success ${pending ? "is-loading" : ""}`}
        >
          Confirm and finish
        </button>,
      );
    }

    buttons.push(
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
    return (
      <p className="has-text-grey is-size-7">
        No actions available while the trade is <strong>{status}</strong>.
      </p>
    );
  }

  return (
    <div>
      {banner}
      <div className="buttons">{buttons}</div>
    </div>
  );
}
