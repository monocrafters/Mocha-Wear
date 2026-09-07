"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { API_URL, apiFetch } from "@/lib/api";
import { formatPkr } from "@/lib/money";
import { ui } from "@/lib/admin-ui";
import {
  emptyPayoutProfile,
  isWalletMethod,
  PAYOUT_METHOD_OPTIONS,
  payoutMethodLabel,
  profileFromApi,
  type PayoutMethod,
  type PayoutProfile,
} from "@/lib/reseller-payout";
import { ResellerShell } from "@/components/reseller-shell";
import { resellerErrorMessage, useResellerLocale } from "@/components/reseller-locale-provider";

function SavedMethodCard({ profile, t }: { profile: PayoutProfile; t: (key: string) => string }) {
  const wallet = isWalletMethod(profile.payout_method);
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {payoutMethodLabel(profile.payout_method)}
          </p>
          <p className="mt-1 text-sm text-slate-700">{profile.payout_account_title}</p>
          <p className="text-sm text-slate-600">{profile.payout_account_number}</p>
          {!wallet && profile.payout_bank_name ? (
            <p className="text-xs text-slate-500">{profile.payout_bank_name}</p>
          ) : null}
        </div>
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
          {t("withdraw.saved")}
        </span>
      </div>
    </div>
  );
}

export function ResellerWithdrawMethod() {
  const { t } = useResellerLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const amount = Number(searchParams.get("amount") || 0);

  const [savedProfile, setSavedProfile] = useState<PayoutProfile>(emptyPayoutProfile());
  const [savedReady, setSavedReady] = useState(false);
  const [cleared, setCleared] = useState(0);
  const [minPayout, setMinPayout] = useState(2000);
  const [openRequest, setOpenRequest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [addingNew, setAddingNew] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PayoutMethod>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const amountValid = Number.isFinite(amount) && amount >= minPayout && amount <= cleared && amount > 0;

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
        const profile = profileFromApi(methodData.item);
        setSavedProfile(profile);
        setSavedReady(Boolean(methodData.ready));
        setSelectedMethod(profile.payout_method || "");
        setAddingNew(!methodData.ready);
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

  const showSaved = savedReady && !addingNew;

  async function createRequest(useProfile: PayoutProfile) {
    setSubmitting(true);
    setError("");
    try {
      const saveRes = await apiFetch(`${API_URL}/api/reseller/payout-method`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(useProfile),
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

  async function confirmSaved(e: FormEvent) {
    e.preventDefault();
    if (!amountValid || openRequest || !savedReady) return;
    await createRequest(savedProfile);
  }

  function goToDetails(e: FormEvent) {
    e.preventDefault();
    if (!amountValid || openRequest || !selectedMethod) return;
    router.push(
      `/reseller/withdraw/method/details?amount=${encodeURIComponent(String(amount))}&method=${encodeURIComponent(selectedMethod)}`,
    );
  }

  if (!loading && !amountValid) {
    return (
      <ResellerShell active="withdraw" kicker={t("earnings.kicker")} title={t("withdraw.paymentMethod")} compact>
        <div className="mx-auto max-w-lg px-1 py-8 text-center">
          <p className="text-sm text-slate-500">{t("withdraw.invalidAmount")}</p>
          <Link href="/reseller/withdraw" className="mt-4 inline-block text-sm font-medium text-emerald-700">
            {t("withdraw.back")}
          </Link>
        </div>
      </ResellerShell>
    );
  }

  return (
    <ResellerShell active="withdraw" kicker={t("earnings.kicker")} title={t("withdraw.paymentMethod")} compact>
      <div className="mx-auto w-full max-w-lg">
        <Link
          href="/reseller/withdraw"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft size={15} />
          {t("withdraw.back")}
        </Link>

        <div className="mb-4 rounded-2xl bg-slate-900 px-4 py-4 text-white">
          <p className="text-xs text-white/70">{t("withdraw.withdrawing")}</p>
          <p className="mt-0.5 text-2xl font-semibold">{formatPkr(amount)}</p>
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
        ) : showSaved ? (
          <form onSubmit={confirmSaved} className="space-y-4">
            <SavedMethodCard profile={savedProfile} t={t} />
            <button
              type="submit"
              disabled={submitting || openRequest}
              className="w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              {submitting ? t("withdraw.requesting") : t("withdraw.sendRequest")}
            </button>
            <button
              type="button"
              onClick={() => {
                setAddingNew(true);
                setSelectedMethod("");
              }}
              className="w-full py-2 text-sm font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
            >
              {t("withdraw.useDifferentMethod")}
            </button>
          </form>
        ) : (
          <form onSubmit={goToDetails} className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-medium text-slate-600">{t("withdraw.chooseMethod")}</p>
              <div className="grid grid-cols-2 gap-2">
                {PAYOUT_METHOD_OPTIONS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedMethod(item.id)}
                    className={`rounded-xl border px-3 py-3 text-left text-sm font-medium transition ${
                      selectedMethod === item.id
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    {t(item.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={!selectedMethod || openRequest}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-3.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              {t("withdraw.next")}
              <ArrowRight size={16} />
            </button>

            {savedReady ? (
              <button
                type="button"
                onClick={() => {
                  setAddingNew(false);
                  setSelectedMethod(savedProfile.payout_method);
                }}
                className="w-full py-2 text-sm text-slate-600 hover:text-slate-900"
              >
                {t("withdraw.useSavedMethod")}
              </button>
            ) : null}
          </form>
        )}
      </div>
    </ResellerShell>
  );
}
