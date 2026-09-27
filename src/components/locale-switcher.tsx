"use client";

import { useTransition } from "react";
import { setLocale } from "@/app/actions/locale";
import { useLocale } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n/messages";

const LABELS: Record<Locale, string> = {
  "pt-BR": "PT",
  en: "EN",
};

export function LocaleSwitcher() {
  const locale = useLocale();
  const [pending, startTransition] = useTransition();

  const flip = () => {
    const next: Locale = locale === "pt-BR" ? "en" : "pt-BR";
    startTransition(async () => {
      await setLocale(next);
    });
  };

  return (
    <button
      onClick={flip}
      disabled={pending}
      className="button is-light is-small"
      title={locale === "pt-BR" ? "Switch to English" : "Mudar para Português"}
    >
      {LABELS[locale]}
    </button>
  );
}
