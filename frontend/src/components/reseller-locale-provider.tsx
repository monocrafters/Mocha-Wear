"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  readStoredLocale,
  storeLocale,
  translate,
  type ResellerLocale,
} from "@/lib/reseller-i18n";

type ResellerLocaleContextValue = {
  locale: ResellerLocale;
  setLocale: (locale: ResellerLocale) => void;
  t: (key: string, vars?: Record<string, string>) => string;
};

const ResellerLocaleContext = createContext<ResellerLocaleContextValue | null>(null);

export function ResellerLocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<ResellerLocale>("en");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLocaleState(readStoredLocale());
    setReady(true);
  }, []);

  const setLocale = useCallback((next: ResellerLocale) => {
    setLocaleState(next);
    storeLocale(next);
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string>) => translate(locale, key, vars),
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  if (!ready) {
    return <div className="min-h-svh bg-[#f3f4f6]" />;
  }

  return <ResellerLocaleContext.Provider value={value}>{children}</ResellerLocaleContext.Provider>;
}

export function useResellerLocale() {
  const ctx = useContext(ResellerLocaleContext);
  if (!ctx) {
    throw new Error("useResellerLocale must be used within ResellerLocaleProvider");
  }
  return ctx;
}

/** API / server errors — always English */
export function resellerErrorMessage(err: unknown, fallback = "Something went wrong") {
  return err instanceof Error ? err.message : fallback;
}
