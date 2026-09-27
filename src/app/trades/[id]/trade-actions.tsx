"use client";

import { useTransition } from "react";
import {
  sendTrade,
  acceptTrade,
  confirmFinish,
  unconfirmFinish,
  deleteTrade,
} from "@/app/actions/trades";
import { useT } from "@/lib/i18n/client";
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
  const t = useT();

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
  const otherLabel = otherHandle ? `@${otherHandle}` : t("tradeDetail.tradingWith");

  if (status === "OPEN" && iAmRequester) {
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
        {t("tradeDetail.sendRequest")}
      </button>,
      <button
        key="del"
        onClick={() => confirm(t("tradeDetail.confirmDeleteDraft")) && run(deleteTrade)}
        disabled={pending}
        className="button is-light is-danger is-outlined"
      >
        {t("tradeDetail.deleteDraft")}
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
        {t("tradeDetail.accept")}
      </button>,
      <button
        key="decline"
        onClick={() => confirm(t("tradeDetail.confirmDecline")) && run(deleteTrade)}
        disabled={pending}
        className="button is-danger is-outlined"
      >
        {t("tradeDetail.decline")}
      </button>,
    );
  }

  if (status === "REQUESTED" && iAmRequester) {
    buttons.push(
      <button
        key="cancel"
        onClick={() => confirm(t("tradeDetail.confirmCancelRequest")) && run(deleteTrade)}
        disabled={pending}
        className="button is-light is-danger is-outlined"
      >
        {t("tradeDetail.cancelRequest")}
      </button>,
    );
  }

  if (status === "ACCEPTED") {
    if (!myConfirmed && !otherConfirmed) {
      banner = (
        <div className="notification is-light is-info mb-3">
          {t("tradeDetail.bothMustConfirm")}
        </div>
      );
      buttons.push(
        <button
          key="confirm"
          onClick={() => run(confirmFinish)}
          disabled={pending}
          className={`button is-success ${pending ? "is-loading" : ""}`}
        >
          {t("tradeDetail.confirmMySide")}
        </button>,
      );
    } else if (myConfirmed && !otherConfirmed) {
      banner = (
        <div className="notification is-warning mb-3">
          {t("tradeDetail.waitingOnOther", { other: otherLabel })}
        </div>
      );
      buttons.push(
        <button
          key="unconfirm"
          onClick={() => run(unconfirmFinish)}
          disabled={pending}
          className="button is-light"
        >
          {t("tradeDetail.undoConfirmation")}
        </button>,
      );
    } else if (!myConfirmed && otherConfirmed) {
      banner = (
        <div className="notification is-warning mb-3">
          {t("tradeDetail.otherHasConfirmed", { other: otherLabel })}
        </div>
      );
      buttons.push(
        <button
          key="confirm-final"
          onClick={() =>
            confirm(t("tradeDetail.confirmFinishFinal")) && run(confirmFinish)
          }
          disabled={pending}
          className={`button is-success ${pending ? "is-loading" : ""}`}
        >
          {t("tradeDetail.confirmAndFinish")}
        </button>,
      );
    }

    buttons.push(
      <button
        key="cancel-a"
        onClick={() => confirm(t("tradeDetail.confirmCancelAccepted")) && run(deleteTrade)}
        disabled={pending}
        className="button is-light is-danger is-outlined"
      >
        {t("tradeDetail.cancelTrade")}
      </button>,
    );
  }

  if (buttons.length === 0) {
    return (
      <p className="has-text-grey is-size-7">
        {t("tradeDetail.noActions", { status: t(`tradeStatus.${status}`) })}
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
