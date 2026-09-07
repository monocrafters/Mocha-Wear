"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { API_URL, apiFetch } from "@/lib/api";
import { formatPkr } from "@/lib/money";
import { ui } from "@/lib/admin-ui";
import {
  emptyPayoutProfile,
  isWalletMethod,
  PAYOUT_METHODS,
  payoutMethodLabel,
  type PayoutMethod,
  type PayoutProfile,
} from "@/lib/reseller-payout";
import { ResellerShell } from "@/components/reseller-shell";
import { resellerErrorMessage, useResellerLocale } from "@/components/reseller-locale-provider";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none";

export function ResellerWithdrawMethodDetails() {
  const { t } = useResellerLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const amount = Number(searchParams.get("amount") || 0);
  const methodParam = String(searchParams.get("method") || "").trim().toLowerCase();
  const method = PAYOUT_METHODS.includes(methodParam as (typeof PAYOUT_METHODS)[number])
    ? (methodParam as PayoutMethod)
    : "";

  const [cleared, setCleared] = useState(0);
  const [minPayout, setMinPayout] = useState(2000);
  const [openRequest, setOpenRequest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<PayoutProfile>(() => ({
    ...emptyPayoutProfile(),
    payout_method: method,
  }));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const amountValid = Number.isFinite(amount) && amount >= minPayout && amount <= cleared && amount > 0;

  useEffect(() => {
    if (method) {
      setDraft((prev) => ({
        ...emptyPayoutProfile(),
        payout_method: method,
        payout_account_title: prev.payout_method === method ? prev.payout_account_title : "",
        payout_account_number: prev.payout_method === method ? prev.payout_account_number : "",
        payout_bank_name: prev.payout_method === method ? prev.payout_bank_name : "",
        payout_iban: prev.payout_method === method ? prev.payout_iban : "",
      }));
    }
  }, [method]);

  useEffect(() => {
    Promise.all([
      apiFetch(`${API_URL}/api/reseller/payout-method`, { credentials: "include" }),
      apiFetch(`${API_URL}/api/reseller/payouts`, { credentials: "include" }),
    ])
      .then(async ([methodRes, payoutsRes]) => {
        const methodData = await methodRes.json();
        const payoutsData = await payoutsRes.json();
        if (!methodRes.ok) throw new Error(methodData.message || "Could not load");
        if (!payoutsRes.ok) throw new Error(payoutsData.message || "Could not load");
        setCleared(Number(payoutsData.wallet_cleared) || 0);
        setMinPayout(Number(payoutsData.min_payout) || 2000);
        setOpenRequest(
          (payoutsData.items || []).some(
            (row: { status: string }) => row.status === "requested" || row.status === "processing",
          ),
        );
      })
      .catch((err) => setError(resellerErrorMessage(err, "Could not load")))
      .finally(() => setLoading(false));
  }, []);

  const canSubmit = useMemo(() => {
    if (!draft.payout_method) return false;
    if (!draft.payout_account_title.trim()) return false;
    if (isWalletMethod(draft.payout_method)) {
      const num = draft.payout_account_number.replace(/\D/g, "");
      return num.length === 11 && num.startsWith("03");
    }
    return Boolean(draft.payout_bank_name.trim() && draft.payout_account_number.trim());
  }, [draft]);

  async function sendRequest(e: FormEvent) {
    e.preventDefault();
    if (!amountValid || openRequest || !canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      const saveRes = await apiFetch(`${API_URL}/api/reseller/payout-method`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveData.message || "Could not save payment method");

      const payoutRes = await apiFetch(`${API_URL}/api/reseller/payouts`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const payoutData = await payoutRes.json();
      if (!payoutRes.ok) throw new Error(payoutData.message || "Could not request withdrawal");
      router.replace("/reseller/withdraw");
    } catch (err) {
      setError(resellerErrorMessage(err, "Could not complete withdrawal"));
    } finally {
      setSubmitting(false);
    }
  }

  if (!method) {
    return (
      <ResellerShell active="withdraw" kicker={t("earnings.kicker")} title={t("withdraw.accountDetails")} compact>
        <div className="mx-auto max-w-lg px-1 py-8 text-center">
          <p className="text-sm text-slate-500">{t("withdraw.chooseMethod")}</p>
          <Link href="/reseller/withdraw" className="mt-4 inline-block text-sm font-medium text-emerald-700">
            {t("withdraw.back")}
          </Link>
        </div>
      </ResellerShell>
    );
  }

  if (!loading && !amountValid) {
    return (
      <ResellerShell active="withdraw" kicker={t("earnings.kicker")} title={t("withdraw.accountDetails")} compact>
        <div className="mx-auto max-w-lg px-1 py-8 text-center">
          <p className="text-sm text-slate-500">{t("withdraw.invalidAmount")}</p>
          <Link href="/reseller/withdraw" className="mt-4 inline-block text-sm font-medium text-emerald-700">
            {t("withdraw.back")}
          </Link>
        </div>
      </ResellerShell>
    );
  }

  const backHref = `/reseller/withdraw/method?amount=${encodeURIComponent(String(amount))}`;

  return (
    <ResellerShell active="withdraw" kicker={t("earnings.kicker")} title={t("withdraw.accountDetails")} compact>
      <div className="mx-auto w-full max-w-lg">
        <Link
          href={backHref}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft size={15} />
          {t("withdraw.back")}
        </Link>

        <div className="mb-4 rounded-2xl bg-slate-900 px-4 py-4 text-white">
          <p className="text-xs text-white/70">{t("withdraw.withdrawing")}</p>
          <p className="mt-0.5 text-2xl font-semibold">{formatPkr(amount)}</p>
          <p className="mt-2 text-sm text-white/80">{payoutMethodLabel(method)}</p>
        </div>

        {error ? <p className={`mb-3 ${ui.error}`}>{error}</p> : null}
        {openRequest ? (
          <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
            {t("withdraw.openRequest")}
          </p>
        ) : null}

        {loading ? (
          <div className="grid place-items-center py-16">
            <Loader2 size={22} className="animate-spin text-slate-400" />
          </div>
        ) : (
          <form onSubmit={sendRequest} className="space-y-3">
            <input
              className={inputClass}
              value={draft.payout_account_title}
              onChange={(e) => setDraft((p) => ({ ...p, payout_account_title: e.target.value }))}
              placeholder={t("withdraw.fullName")}
              required
            />
            {draft.payout_method === "bank" ? (
              <>
                <input
                  className={inputClass}
                  value={draft.payout_bank_name}
                  onChange={(e) => setDraft((p) => ({ ...p, payout_bank_name: e.target.value }))}
                  placeholder={t("withdraw.bankName")}
                  required
                />
                <input
                  className={inputClass}
                  value={draft.payout_account_number}
                  onChange={(e) => setDraft((p) => ({ ...p, payout_account_number: e.target.value }))}
                  placeholder={t("withdraw.accountNumber")}
                  required
                />
                <input
                  className={inputClass}
                  value={draft.payout_iban}
                  onChange={(e) => setDraft((p) => ({ ...p, payout_iban: e.target.value }))}
                  placeholder={t("withdraw.iban")}
                />
              </>
            ) : (
              <input
                className={inputClass}
                value={draft.payout_account_number}
                onChange={(e) => setDraft((p) => ({ ...p, payout_account_number: e.target.value }))}
                placeholder={t("withdraw.mobileNumber")}
                inputMode="numeric"
                required
              />
            )}

            <button
              type="submit"
              disabled={!canSubmit || submitting || openRequest}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-3.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              {submitting ? t("withdraw.requesting") : t("withdraw.sendRequest")}
            </button>
          </form>
        )}
      </div>
    </ResellerShell>
  );
}
