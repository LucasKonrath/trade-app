"use client";

import { createContext, useContext } from "react";
import { translate } from "./t";
import type { Locale } from "./messages";

const LocaleCtx = createContext<Locale>("pt-BR");

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return <LocaleCtx.Provider value={locale}>{children}</LocaleCtx.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleCtx);
}

export function useT() {
  const locale = useLocale();
  return (key: string, params?: Record<string, string | number>) =>
    translate(locale, key, params);
}
