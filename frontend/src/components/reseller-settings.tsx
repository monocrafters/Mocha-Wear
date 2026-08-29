"use client";

import { useState } from "react";
import { ResellerShell } from "@/components/reseller-shell";
import { useResellerLocale } from "@/components/reseller-locale-provider";
import type { ResellerLocale } from "@/lib/reseller-i18n";

export function ResellerSettings() {
  const { locale, setLocale, t } = useResellerLocale();
  const [saved, setSaved] = useState(false);

  function pick(next: ResellerLocale) {
    setLocale(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <ResellerShell active="settings" kicker={t("settings.kicker")} title={t("settings.title")} copy={t("settings.copy")}>
      {saved ? (
        <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{t("settings.saved")}</p>
      ) : null}

      <div className="max-w-lg border border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold text-slate-900">{t("settings.language")}</p>
        <p className="mt-1 text-sm text-slate-500">{t("settings.languageHelp")}</p>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => pick("en")}
            className={`rounded-lg border px-4 py-3 text-left text-sm transition ${
              locale === "en"
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
            }`}
          >
            <span className="font-medium">{t("settings.english")}</span>
            <span className={`mt-0.5 block text-xs ${locale === "en" ? "text-slate-300" : "text-slate-500"}`}>
              {t("settings.englishHint")}
            </span>
          </button>
          <button
            type="button"
            onClick={() => pick("ur")}
            className={`rounded-lg border px-4 py-3 text-left text-sm transition ${
              locale === "ur"
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
            }`}
          >
            <span className="font-medium">{t("settings.romanUrdu")}</span>
            <span className={`mt-0.5 block text-xs ${locale === "ur" ? "text-slate-300" : "text-slate-500"}`}>
              {t("settings.romanUrduHint")}
            </span>
          </button>
        </div>

        <p className="mt-4 text-[12px] text-slate-500">
          {t("settings.current")}{" "}
          <span className="font-medium text-slate-800">
            {locale === "ur" ? t("settings.romanUrdu") : t("settings.english")}
          </span>
        </p>
      </div>
    </ResellerShell>
  );
}
