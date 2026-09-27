"use client";

import { useState, useTransition } from "react";
import { setTradeCash } from "@/app/actions/trades";
import { parseBRLInput } from "@/lib/money";
import { useT } from "@/lib/i18n/client";

type Props = {
  tradeId: string;
  cashCents: number | null;
};

export function CashEditor({ tradeId, cashCents }: Props) {
  const [pending, startTransition] = useTransition();
  const t = useT();
  const [amount, setAmount] = useState(
    cashCents ? String(Math.abs(cashCents) / 100).replace(".", ",") : "",
  );
  const [direction, setDirection] = useState<"IN" | "OUT">((cashCents ?? 0) < 0 ? "OUT" : "IN");
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    setError(null);
    startTransition(async () => {
      let value: number | null = null;
      if (amount.trim() !== "") {
        const cents = parseBRLInput(amount);
        if (cents == null || cents <= 0) {
          setError(t("tradeDetail.invalidAmount"));
          return;
        }
        value = direction === "IN" ? cents : -cents;
      }
      try {
        await setTradeCash({ tradeId, cashCents: value });
      } catch (err) {
        setError((err as Error).message);
      }
    });
  };

  return (
    <div className="box p-3 mb-0">
      <p className="is-size-7 has-text-grey mb-2">{t("tradeDetail.cashOptional")}</p>
      <div
        className="field is-grouped is-align-items-center"
        style={{ flexWrap: "wrap", gap: "0.5rem" }}
      >
        <div className="control">
          <div className="select is-small">
            <select value={direction} onChange={(e) => setDirection(e.target.value as "IN" | "OUT")}>
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
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="input is-small"
            style={{ maxWidth: 120 }}
          />
          <span className="icon is-small is-left">
            <span className="is-size-7">R$</span>
          </span>
        </div>
        <div className="control">
          <button
            onClick={save}
            disabled={pending}
            className={`button is-small is-primary ${pending ? "is-loading" : ""}`}
          >
            {t("tradeDetail.save")}
          </button>
        </div>
        {cashCents !== null && (
          <div className="control">
            <button
              onClick={() => {
                setAmount("");
                startTransition(async () => {
                  await setTradeCash({ tradeId, cashCents: null });
                });
              }}
              disabled={pending}
              className="button is-small is-light"
            >
              {t("tradeDetail.clear")}
            </button>
          </div>
        )}
      </div>
      {error && <p className="help is-danger">{error}</p>}
    </div>
  );
}
