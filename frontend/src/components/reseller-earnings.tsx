"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { API_URL, apiFetch } from "@/lib/api";
import { formatPkr } from "@/lib/money";
import { ui } from "@/lib/admin-ui";
import { ResellerShell } from "@/components/reseller-shell";
import { resellerErrorMessage, useResellerLocale } from "@/components/reseller-locale-provider";

type Transaction = {
  id: string;
  type: string;
  amount: number;
  order_id?: string;
  description?: string;
  created_at?: string;
};

function shortOrderId(id: string) {
  const raw = String(id || "").trim();
  if (raw.length <= 10) return raw;
  return raw.slice(-8).toUpperCase();
}

function txLabel(tx: Transaction) {
  if (tx.type === "credit" && tx.order_id) return `Order #${shortOrderId(tx.order_id)}`;
  return tx.description || tx.type;
}

type EarningsData = {
  pending: number;
  cleared: number;
  min_payout: number;
  transactions: Transaction[];
};

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PK", { day: "numeric", month: "short" });
}

function typeTone(type: string) {
  if (type === "credit" || type === "commission") return "text-emerald-700";
  if (type === "debit" || type === "payout") return "text-red-700";
  return "text-slate-700";
}

function WalletStats({
  data,
  t,
}: {
  data: Pick<EarningsData, "pending" | "cleared" | "min_payout">;
  t: (key: string) => string;
}) {
  const cards = [
    { label: t("earnings.pending"), value: formatPkr(data.pending), className: "text-slate-900" },
    { label: t("earnings.cleared"), value: formatPkr(data.cleared), className: "text-slate-900" },
    { label: t("earnings.minPayout"), value: formatPkr(data.min_payout), className: "text-slate-700" },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4">
      {cards.map((card) => (
        <div key={card.label} className="min-w-0 rounded-lg bg-white px-2 py-2 sm:px-3 sm:py-2.5">
          <p className="truncate text-[9px] font-medium uppercase tracking-wide text-slate-400 sm:text-[10px]">
            {card.label}
          </p>
          <p className={`mt-0.5 truncate text-sm font-semibold sm:text-base lg:text-lg ${card.className}`}>
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function WalletStatsSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-[52px] animate-pulse rounded-lg bg-white sm:h-[58px]" />
      ))}
    </div>
  );
}

export function ResellerEarnings() {
  const { t } = useResellerLocale();
  const [data, setData] = useState<EarningsData>({
    pending: 0,
    cleared: 0,
    min_payout: 2000,
    transactions: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch(`${API_URL}/api/reseller/earnings`, { credentials: "include" })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Could not load earnings");
        setData({
          pending: Number(json.wallet_pending ?? json.pending) || 0,
          cleared: Number(json.wallet_cleared ?? json.cleared) || 0,
          min_payout: Number(json.min_payout) || 2000,
          transactions: json.transactions || [],
        });
      })
      .catch((err) => setError(resellerErrorMessage(err, "Could not load earnings")))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ResellerShell active="earnings" kicker={t("earnings.kicker")} title={t("earnings.title")} compact>
      <div className="mx-auto w-full max-w-lg lg:max-w-2xl">
        {error ? <p className={`mb-2 ${ui.error}`}>{error}</p> : null}

        {loading ? <WalletStatsSkeleton /> : <WalletStats data={data} t={t} />}

        {!loading ? (
          <Link
            href="/reseller/withdraw"
            className="mt-3 block rounded-lg bg-emerald-700 px-4 py-2.5 text-center text-sm font-medium text-white"
          >
            {t("nav.withdraw")}
          </Link>
        ) : null}

        {!loading && data.transactions.length ? (
          <section className="mt-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {t("earnings.transactions")}
            </p>
            <div className="divide-y divide-slate-200">
              {data.transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-slate-900">
                      {txLabel(tx)}
                    </p>
                    <p className="text-[10px] text-slate-500">{fmtDate(tx.created_at)}</p>
                  </div>
                  <p className={`shrink-0 text-xs font-semibold ${typeTone(tx.type)}`}>
                    {tx.type === "debit" || tx.type === "payout" ? "−" : "+"}
                    {formatPkr(Math.abs(tx.amount))}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {!loading && !data.transactions.length ? (
          <p className="mt-4 py-6 text-center text-xs text-slate-500">{t("earnings.empty")}</p>
        ) : null}
      </div>
    </ResellerShell>
  );
}
