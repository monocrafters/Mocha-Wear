"use client";

import { FormEvent, useState } from "react";
import { ResellerShell } from "@/components/reseller-shell";
import { PasswordInput } from "@/components/password-input";
import { ThemePreferencePicker } from "@/components/theme-preference-picker";
import { resellerErrorMessage, useResellerLocale } from "@/components/reseller-locale-provider";
import type { ResellerLocale } from "@/lib/reseller-i18n";
import { API_URL, apiFetch } from "@/lib/api";
import { ui } from "@/lib/admin-ui";

export function ResellerSettings() {
  const { locale, setLocale, t } = useResellerLocale();
  const [saved, setSaved] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordOk, setPasswordOk] = useState("");

  function pick(next: ResellerLocale) {
    setLocale(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function onChangePassword(event: FormEvent) {
    event.preventDefault();
    setPasswordError("");
    setPasswordOk("");

    if (newPassword.length < 6) {
      setPasswordError(t("settings.passwordTooShort"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t("settings.passwordMismatch"));
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await apiFetch(`${API_URL}/api/reseller/change-password`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || t("settings.passwordError"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordOk(t("settings.passwordSaved"));
    } catch (err) {
      setPasswordError(resellerErrorMessage(err, t("settings.passwordError")));
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <ResellerShell active="settings" kicker={t("settings.kicker")} title={t("settings.title")} copy={t("settings.copy")}>
      <div className="w-full max-w-3xl space-y-4">
        {saved ? <p className={ui.ok}>{t("settings.saved")}</p> : null}

        <ThemePreferencePicker
          title={t("settings.theme")}
          help={t("settings.themeHelp")}
          labels={{
            light: { label: t("settings.themeLight"), hint: t("settings.themeLightHint") },
            dark: { label: t("settings.themeDark"), hint: t("settings.themeDarkHint") },
            system: { label: t("settings.themeSystem"), hint: t("settings.themeSystemHint") },
          }}
        />

        <div className="border border-slate-200 bg-white p-4 sm:p-5">
          <p className="text-sm font-semibold text-slate-900">{t("settings.language")}</p>
          <p className="mt-1 text-sm text-slate-500">{t("settings.languageHelp")}</p>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => pick("en")}
              className={`dash-choice rounded-lg px-4 py-3 text-left text-sm ${
                locale === "en" ? "dash-choice-active" : ""
              }`}
            >
              <span className="font-medium">{t("settings.english")}</span>
              <span className={`dash-choice-hint mt-0.5 block text-xs ${locale === "en" ? "" : "text-slate-500"}`}>
                {t("settings.englishHint")}
              </span>
            </button>
            <button
              type="button"
              onClick={() => pick("ur")}
              className={`dash-choice rounded-lg px-4 py-3 text-left text-sm ${
                locale === "ur" ? "dash-choice-active" : ""
              }`}
            >
              <span className="font-medium">{t("settings.romanUrdu")}</span>
              <span className={`dash-choice-hint mt-0.5 block text-xs ${locale === "ur" ? "" : "text-slate-500"}`}>
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

        <form onSubmit={onChangePassword} className="border border-slate-200 bg-white p-4 sm:p-5">
          <p className="text-sm font-semibold text-slate-900">{t("settings.passwordTitle")}</p>
          <p className="mt-1 text-sm text-slate-500">{t("settings.passwordHelp")}</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className={ui.label}>{t("settings.currentPassword")}</span>
              <PasswordInput
                value={currentPassword}
                onChange={setCurrentPassword}
                autoComplete="current-password"
                required
                placeholder={t("settings.currentPasswordPlaceholder")}
              />
            </label>
            <label className="block">
              <span className={ui.label}>{t("settings.newPassword")}</span>
              <PasswordInput
                value={newPassword}
                onChange={setNewPassword}
                autoComplete="new-password"
                required
                placeholder={t("settings.newPasswordPlaceholder")}
              />
            </label>
            <label className="block">
              <span className={ui.label}>{t("settings.confirmPassword")}</span>
              <PasswordInput
                value={confirmPassword}
                onChange={setConfirmPassword}
                autoComplete="new-password"
                required
                placeholder={t("settings.confirmPasswordPlaceholder")}
              />
            </label>
          </div>

          {passwordError ? <p className={`mt-3 ${ui.error}`}>{passwordError}</p> : null}
          {passwordOk ? <p className={`mt-3 ${ui.ok}`}>{passwordOk}</p> : null}

          <button
            type="submit"
            disabled={passwordSaving}
            className={`mt-4 ${ui.btnPrimary} w-full sm:w-auto`}
          >
            {passwordSaving ? t("settings.passwordSaving") : t("settings.passwordSave")}
          </button>
        </form>
      </div>
    </ResellerShell>
  );
}
