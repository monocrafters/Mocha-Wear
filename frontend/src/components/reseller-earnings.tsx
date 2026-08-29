"use client";

import { FormEvent, useEffect, useState } from "react";
import { API_URL, apiFetch } from "@/lib/api";
import { formatPkr } from "@/lib/money";
import { ResellerShell } from "@/components/reseller-shell";
import { resellerErrorMessage, useResellerLocale } from "@/components/reseller-locale-provider";

type Transaction = {
  id: string;
  type: string;
  amount: number;
  description?: string;
  created_at?: string;
};

type Payout = {
  id: string;
  amount: number;
  status: string;
  method?: string;
  created_at?: string;
};

type EarningsData = {
  pending: number;
  cleared: number;
  min_payout: number;
  transactions: Transaction[];
  payouts: Payout[];
};

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
}

function typeTone(type: string) {
  if (type === "credit" || type === "commission") return "text-emerald-700";
  if (type === "debit" || type === "payout") return "text-red-700";
  return "text-slate-700";
}

function payoutTone(status: string) {
  if (status === "completed") return "bg-emerald-50 text-emerald-800";
  if (status === "rejected") return "bg-red-50 text-red-700";
  if (status === "processing") return "bg-blue-50 text-blue-700";
  return "bg-amber-50 text-amber-800";
}

export function ResellerEarnings() {
  const { t } = useResellerLocale();
  const [data, setData] = useState<EarningsData>({
    pending: 0,
    cleared: 0,
    min_payout: 2000,
    transactions: [],
    payouts: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [amount, setAmount] = useState("");
  const [requesting, setRequesting] = useState(false);

  async function load() {
    setError("");
    try {
      const res = await apiFetch(`${API_URL}/api/reseller/earnings`, { credentials: "include" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Could not load earnings");
      setData({
        pending: json.pending || 0,
        cleared: json.cleared || 0,
        min_payout: json.min_payout || 2000,
        transactions: json.transactions || [],
        payouts: json.payouts || [],
      });
    } catch (err) {
      setError(resellerErrorMessage(err, "Could not load earnings"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function requestPayout(e: FormEvent) {
    e.preventDefault();
    setRequesting(true);
    setError("");
    try {
      const res = await apiFetch(`${API_URL}/api/reseller/payouts`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount), method: "bank transfer" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Could not request payout");
      setAmount("");
      await load();
    } catch (err) {
      setError(resellerErrorMessage(err, "Could not request payout"));
    } finally {
      setRequesting(false);
    }
  }

  const canPayout = data.cleared >= data.min_payout;

  return (
    <ResellerShell
      active="earnings"
      kicker={t("earnings.kicker")}
      title={t("earnings.title")}
      copy={t("earnings.copy")}
    >
      {error ? <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-[76px] animate-pulse border border-slate-200 bg-white" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <article className="border border-slate-200 bg-white px-4 py-4">
              <p className="text-[10px] text-slate-500 uppercase">{t("earnings.pending")}</p>
              <p className="mt-1.5 text-xl font-semibold text-slate-900">{formatPkr(data.pending)}</p>
            </article>
            <article className="border border-slate-200 bg-white px-4 py-4">
              <p className="text-[10px] text-slate-500 uppercase">{t("earnings.cleared")}</p>
              <p className="mt-1.5 text-xl font-semibold text-slate-900">{formatPkr(data.cleared)}</p>
            </article>
            <article className="border border-slate-200 bg-white px-4 py-4 sm:col-span-2">
              <p className="text-[10px] text-slate-500 uppercase">{t("earnings.minPayout")}</p>
              <p className="mt-1.5 text-xl font-semibold text-slate-900">{formatPkr(data.min_payout)}</p>
            </article>
          </div>

          {canPayout ? (
            <form onSubmit={requestPayout} className="mt-6 border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">{t("earnings.requestPayout")}</p>
              <p className="mt-1 text-xs text-slate-500">
                {t("earnings.payoutHint", { min: formatPkr(data.min_payout) })}
              </p>
              <div className="mt-3 flex gap-2">
                <input
                  type="number"
                  min={data.min_payout}
                  max={data.cleared}
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={t("earnings.amount")}
                  className="w-40 border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={requesting}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {requesting ? t("earnings.requesting") : t("earnings.request")}
                </button>
              </div>
            </form>
          ) : null}

          {data.transactions.length ? (
            <div className="mt-6">
              <p className="text-[10px] font-semibold text-slate-500 uppercase">{t("earnings.transactions")}</p>
              <div className="mt-3 space-y-1">
                {data.transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between border border-slate-200 bg-white px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-slate-900">{tx.description || tx.type}</p>
                      <p className="text-[11px] text-slate-500">{fmtDate(tx.created_at)}</p>
                    </div>
                    <p className={`shrink-0 text-sm font-medium ${typeTone(tx.type)}`}>
                      {tx.type === "debit" || tx.type === "payout" ? "−" : "+"}
                      {formatPkr(Math.abs(tx.amount))}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {data.payouts.length ? (
            <div className="mt-6">
              <p className="text-[10px] font-semibold text-slate-500 uppercase">{t("earnings.payoutHistory")}</p>
              <div className="mt-3 space-y-1">
                {data.payouts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between border border-slate-200 bg-white px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm text-slate-900">{formatPkr(p.amount)}</p>
                      <p className="text-[11px] text-slate-500">
                        {fmtDate(p.created_at)} · {p.method || t("earnings.bankTransfer")}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${payoutTone(p.status)}`}>
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </ResellerShell>
  );
}
