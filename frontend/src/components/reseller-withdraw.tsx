"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL, apiFetch } from "@/lib/api";
import { formatPkr } from "@/lib/money";
import { ui } from "@/lib/admin-ui";
import { ResellerShell } from "@/components/reseller-shell";
import { resellerErrorMessage, useResellerLocale } from "@/components/reseller-locale-provider";

type WithdrawRequest = {
  id: string;
  amount: number;
  method?: string;
  status: string;
  requested_at?: string;
  note?: string;
};

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PK", { day: "numeric", month: "short" });
}

function statusTone(status: string) {
  if (status === "completed") return "bg-emerald-50 text-emerald-800";
  if (status === "rejected") return "bg-red-50 text-red-700";
  if (status === "processing") return "bg-blue-50 text-blue-700";
  return "bg-amber-50 text-amber-800";
}

export function ResellerWithdraw() {
  const { t } = useResellerLocale();
  const router = useRouter();
  const [cleared, setCleared] = useState(0);
  const [minPayout, setMinPayout] = useState(2000);
  const [requests, setRequests] = useState<WithdrawRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch(`${API_URL}/api/reseller/payouts`, { credentials: "include" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Could not load");
        setCleared(Number(data.wallet_cleared) || 0);
        setMinPayout(Number(data.min_payout) || 2000);
        setRequests(data.items || []);
      })
      .catch((err) => setError(resellerErrorMessage(err, "Could not load")))
      .finally(() => setLoading(false));
  }, []);

  const openRequest = requests.some((row) => row.status === "requested" || row.status === "processing");
  const amountNum = Number(amount);
  const amountValid =
    Number.isFinite(amountNum) && amountNum >= minPayout && amountNum <= cleared && amountNum > 0;

  function goToMethod(e: FormEvent) {
    e.preventDefault();
    if (!amountValid || openRequest) return;
    router.push(`/reseller/withdraw/method?amount=${encodeURIComponent(String(amountNum))}`);
  }

  return (
    <ResellerShell active="withdraw" kicker={t("earnings.kicker")} title={t("withdraw.title")} compact>
      <div className="mx-auto w-full max-w-lg">
        {error ? <p className={`mb-3 ${ui.error}`}>{error}</p> : null}

        {loading ? (
          <div className="h-40 animate-pulse rounded-2xl bg-white" />
        ) : (
          <>
            <div className="rounded-2xl bg-white px-4 py-5 text-center">
              <p className="text-xs text-slate-500">{t("withdraw.balance")}</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{formatPkr(cleared)}</p>
              <p className="mt-2 text-[11px] text-slate-400">
                {t("withdraw.minPayout")}: {formatPkr(minPayout)}
              </p>
            </div>

            {openRequest ? (
              <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                {t("withdraw.openRequest")}
              </p>
            ) : (
              <form onSubmit={goToMethod} className="mt-4 space-y-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-slate-600">
                    {t("withdraw.amount")}
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                    placeholder={formatPkr(minPayout)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-lg font-semibold text-slate-900 outline-none"
                  />
                </label>
                <button
                  type="submit"
                  disabled={!amountValid}
                  className="w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {t("withdraw.continue")}
                </button>
              </form>
            )}

            <section className="mt-6">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {t("withdraw.requests")}
              </p>
              {!requests.length ? (
                <p className="py-8 text-center text-xs text-slate-500">{t("withdraw.noRequests")}</p>
              ) : (
                <div className="divide-y divide-slate-200">
                  {requests.map((row) => (
                    <div key={row.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{formatPkr(row.amount)}</p>
                        <p className="text-[10px] text-slate-500">
                          {fmtDate(row.requested_at)} · {row.method || "—"}
                        </p>
                        {row.note ? <p className="mt-0.5 text-[10px] text-slate-500">{row.note}</p> : null}
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase ${statusTone(row.status)}`}
                      >
                        {row.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </ResellerShell>
  );
}
