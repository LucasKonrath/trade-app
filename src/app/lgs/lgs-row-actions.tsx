"use client";

import { useTransition } from "react";
import { joinLgs, leaveLgs, setPrimaryLgs } from "@/app/actions/lgs";
import { useT } from "@/lib/i18n/client";

type Props = {
  lgsId: string;
  isMember: boolean;
  isPrimary: boolean;
  isOwner: boolean;
};

export function LgsRowActions({ lgsId, isMember, isPrimary, isOwner }: Props) {
  const [pending, startTransition] = useTransition();
  const t = useT();

  const run = (fn: () => Promise<void>, confirmMsg?: string) => {
    if (confirmMsg && !confirm(confirmMsg)) return;
    startTransition(async () => {
      try {
        await fn();
      } catch (err) {
        alert((err as Error).message);
      }
    });
  };

  if (!isMember) {
    return (
      <button
        onClick={() => run(() => joinLgs({ lgsId }))}
        disabled={pending}
        className={`button is-small is-primary ${pending ? "is-loading" : ""}`}
      >
        {t("lgs.join")}
      </button>
    );
  }

  return (
    <div className="buttons are-small mb-0" style={{ gap: "0.375rem" }}>
      {!isPrimary && (
        <button
          onClick={() => run(() => setPrimaryLgs({ lgsId }))}
          disabled={pending}
          className="button is-small is-success is-outlined"
        >
          {t("lgs.setPrimary")}
        </button>
      )}
      <button
        onClick={() =>
          run(
            () => leaveLgs({ lgsId }),
            isOwner ? t("lgs.confirmLeaveOwner") : t("lgs.confirmLeave"),
          )
        }
        disabled={pending}
        className="button is-small is-light is-danger is-outlined"
      >
        {t("lgs.leave")}
      </button>
    </div>
  );
}
