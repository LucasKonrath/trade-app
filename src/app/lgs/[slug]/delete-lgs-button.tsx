"use client";

import { useTransition, useState } from "react";
import { deleteLgs } from "@/app/actions/lgs";
import { useT } from "@/lib/i18n/client";

type Props = {
  lgsId: string;
  lgsName: string;
  memberCount: number;
};

export function DeleteLgsButton({ lgsId, lgsName, memberCount }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const t = useT();

  const onClick = () => {
    const prompt = t("lgs.deletePrompt", { name: lgsName, count: memberCount });
    const confirmation = window.prompt(prompt);
    if (confirmation === null) return;
    if (confirmation.trim() !== lgsName) {
      setError(t("lgs.deleteMismatch"));
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const result = await deleteLgs({ lgsId });
        if (result && result.ok === false) {
          setError(result.error);
        }
      } catch (err) {
        if ((err as Error).message !== "NEXT_REDIRECT") {
          setError((err as Error).message);
        }
      }
    });
  };

  return (
    <div>
      <button
        onClick={onClick}
        disabled={pending}
        className={`button is-small is-danger ${pending ? "is-loading" : ""}`}
      >
        {t("lgs.deleteBtn")}
      </button>
      {error && <p className="help is-danger mt-2">{error}</p>}
    </div>
  );
}
