"use client";

import { useState, useTransition } from "react";
import {
  sendTrade,
  acceptTrade,
  confirmFinish,
  unconfirmFinish,
  deleteTrade,
  counterTrade,
} from "@/app/actions/trades";
import { parseBRLInput } from "@/lib/money";
import { useT } from "@/lib/i18n/client";
import type { TradeStatus } from "@prisma/client";

type Props = {
  tradeId: string;
  status: TradeStatus;
  iAmRequester: boolean;
  iGiveCount: number;
  iReceiveCount: number;
  cashCents: number | null;
  lastProposedById: string | null;
  myUserId: string;
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
  lastProposedById,
  myUserId,
  myConfirmed,
  otherConfirmed,
  otherHandle,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [counterOpen, setCounterOpen] = useState(false);
  const [counterCash, setCounterCash] = useState(
    cashCents ? String(Math.abs(cashCents) / 100).replace(".", ",") : "",
  );
  const [counterDir, setCounterDir] = useState<"IN" | "OUT">(() => {
    // "IN" means they pay me; "OUT" means I pay them.
    const cash = cashCents ?? 0;
    // Canonical: cash > 0 = responder pays requester
    // For me: if I'm requester and cash > 0, they (responder) pay me → IN
    if (iAmRequester) return cash >= 0 ? "IN" : "OUT";
    return cash > 0 ? "OUT" : "IN";
  });
  const [counterError, setCounterError] = useState<string | null>(null);
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

  const submitCounter = () => {
    setCounterError(null);
    let value: number | null = null;
    const raw = counterCash.trim();
    if (raw !== "") {
      const cents = parseBRLInput(raw);
      if (cents == null || cents <= 0) {
        setCounterError(t("tradeDetail.invalidAmount"));
        return;
      }
      // Convert from my-perspective direction to canonical (from requester's POV).
      const myIsIn = counterDir === "IN";
      const responderPaysRequester = iAmRequester ? myIsIn : !myIsIn;
      value = responderPaysRequester ? cents : -cents;
    }
    startTransition(async () => {
      try {
        await counterTrade({ tradeId, cashCents: value });
        setCounterOpen(false);
      } catch (err) {
        setCounterError((err as Error).message);
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

  if (status === "REQUESTED") {
    const iAmLastProposer = lastProposedById === myUserId;
    if (iAmLastProposer) {
      // I proposed / countered most recently. Waiting on the other party.
      banner = (
        <div className="notification is-info is-light mb-3">
          {t("tradeDetail.waitingOnOtherParty", { other: otherLabel })}
        </div>
      );
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
    } else {
      // Other party proposed / countered. My turn.
      banner = (
        <div className="notification is-warning mb-3">
          {t("tradeDetail.yourTurn", { other: otherLabel })}
        </div>
      );
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
          key="counter"
          onClick={() => setCounterOpen((o) => !o)}
          disabled={pending}
          className="button is-info is-outlined"
        >
          {counterOpen ? t("common.cancel") : t("tradeDetail.counter")}
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

      {counterOpen && (
        <div className="box mt-3">
          <p className="is-size-7 has-text-grey mb-2">{t("tradeDetail.counterExplain")}</p>
          <div
            className="field is-grouped is-align-items-center"
            style={{ flexWrap: "wrap", gap: "0.5rem" }}
          >
            <div className="control">
              <div className="select is-small">
                <select
                  value={counterDir}
                  onChange={(e) => setCounterDir(e.target.value as "IN" | "OUT")}
                >
                  <option value="IN">{t("tradeDetail.theyPayYou")}</option>
                  <option value="OUT">{t("tradeDetail.youPayThem")}</option>
                </select>
              </div>
            </div>
            <div className="control has-icons-left">
              <input
                type="text"
                inputMode="decimal"
                placeholder={t("tradeDetail.cashPlaceholder")}
                value={counterCash}
                onChange={(e) => setCounterCash(e.target.value)}
                className="input is-small"
                style={{ maxWidth: 120 }}
              />
              <span className="icon is-small is-left is-size-7">R$</span>
            </div>
            <div className="control">
              <button
                onClick={submitCounter}
                disabled={pending}
                className={`button is-small is-primary ${pending ? "is-loading" : ""}`}
              >
                {t("tradeDetail.sendCounter")}
              </button>
            </div>
          </div>
          {counterError && <p className="help is-danger mt-2">{counterError}</p>}
        </div>
      )}
    </div>
  );
}
