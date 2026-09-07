"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { API_URL, apiFetch } from "@/lib/api";
import { formatPkr } from "@/lib/money";
import { ui } from "@/lib/admin-ui";
import { ResellerShell } from "@/components/reseller-shell";
import { ResellerPrProgress } from "@/components/reseller-pr-progress";
import { resellerErrorMessage, useResellerLocale } from "@/components/reseller-locale-provider";

type ResellerOrder = {
  id: string;
  created_at?: string;
  status: string;
  total: number;
  commission_total: number;
  customer_name?: string;
  customer?: { name?: string };
};

function orderCustomerName(order: ResellerOrder) {
  return order.customer_name || order.customer?.name || "";
}

type OrderStats = {
  count: number;
  revenue: number;
  commission: number;
};

function maskName(name?: string) {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PK", { day: "numeric", month: "short" });
}

function fmtDateLong(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
}

function orderMeta(order: ResellerOrder) {
  const name = maskName(orderCustomerName(order));
  const date = fmtDate(order.created_at);
  if (name && date !== "—") return `${name} · ${date}`;
  if (name) return name;
  return date;
}

function shortOrderId(id: string) {
  const raw = String(id || "").trim();
  if (raw.length <= 10) return raw;
  return raw.slice(-8).toUpperCase();
}

function statusTone(status: string) {
  if (status === "delivered") return "bg-emerald-50 text-emerald-800";
  if (status === "cancelled") return "bg-red-50 text-red-700";
  if (status === "shipped") return "bg-blue-50 text-blue-700";
  return "bg-amber-50 text-amber-800";
}

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide ${statusTone(status)}`}
    >
      {status}
    </span>
  );
}

function orderStats(orders: ResellerOrder[]): OrderStats {
  const active = orders.filter((o) => o.status !== "cancelled");
  return {
    count: orders.length,
    revenue: active.reduce((sum, o) => sum + (Number(o.total) || 0), 0),
    commission: active.reduce((sum, o) => sum + (Number(o.commission_total) || 0), 0),
  };
}

function OrderStatsBar({ stats, t }: { stats: OrderStats; t: (key: string) => string }) {
  const cards = [
    { label: t("orders.statsTotalOrders"), value: String(stats.count), className: "text-slate-900" },
    { label: t("orders.statsRevenue"), value: formatPkr(stats.revenue), className: "text-slate-900" },
    { label: t("orders.statsCommission"), value: formatPkr(stats.commission), className: "text-emerald-700" },
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

function OrderStatsSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-[52px] animate-pulse rounded-lg bg-white sm:h-[58px]" />
      ))}
    </div>
  );
}

function MobileOrderRow({ order }: { order: ResellerOrder }) {
  return (
    <Link
      href={`/reseller/orders/${encodeURIComponent(order.id)}`}
      className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 border-b border-slate-200 py-2.5 last:border-b-0 active:bg-slate-50"
    >
      <p className="font-mono text-xs font-semibold text-slate-900">#{shortOrderId(order.id)}</p>
      <p className="text-right text-xs font-semibold text-slate-900">{formatPkr(order.total)}</p>
      <div className="flex min-w-0 items-center gap-1.5">
        <p className="truncate text-[10px] text-slate-500">{orderMeta(order)}</p>
        <StatusPill status={order.status} />
      </div>
      <p className="text-right text-[10px] font-medium text-emerald-700">
        +{formatPkr(order.commission_total)}
      </p>
    </Link>
  );
}

export function ResellerOrders() {
  const { t } = useResellerLocale();
  const router = useRouter();
  const [items, setItems] = useState<ResellerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    apiFetch(`${API_URL}/api/reseller/orders`, { credentials: "include" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Could not load orders");
        setItems(data.items || []);
      })
      .catch((err) => setError(resellerErrorMessage(err, "Could not load orders")))
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((o) =>
      [o.id, o.status, maskName(orderCustomerName(o))].join(" ").toLowerCase().includes(q),
    );
  }, [items, query]);

  const stats = useMemo(() => orderStats(visible), [visible]);
  const hasItems = items.length > 0;

  return (
    <ResellerShell active="orders" kicker={t("orders.kicker")} title={t("orders.title")} compact>
      <div className="mx-auto w-full max-w-lg lg:max-w-6xl">
        {error ? <p className={`mb-2 ${ui.error}`}>{error}</p> : null}

        {loading ? <OrderStatsSkeleton /> : hasItems ? <OrderStatsBar stats={stats} t={t} /> : null}

        <div className={loading ? "mt-2" : "mt-2"}>
          <ResellerPrProgress compact />
        </div>

        {!loading && hasItems ? (
          <label className="relative mt-2 block">
            <Search
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("orders.searchPlaceholder")}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-sm outline-none"
            />
          </label>
        ) : null}

        {loading ? (
          <div className="mt-3 divide-y divide-slate-200">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse bg-slate-100/50" />
            ))}
          </div>
        ) : !items.length ? (
          <p className="mt-4 py-8 text-center text-xs text-slate-500">{t("orders.empty")}</p>
        ) : !visible.length ? (
          <p className="mt-4 py-8 text-center text-xs text-slate-500">{t("orders.noMatch")}</p>
        ) : (
          <>
            <div className="mt-3 lg:hidden">
              {visible.map((order) => (
                <MobileOrderRow key={order.id} order={order} />
              ))}
            </div>

            <div className="mt-3 hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead className="border-b border-slate-200 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="py-2 pr-3 font-semibold">{t("orders.order")}</th>
                    <th className="px-3 py-2 font-semibold">{t("orders.date")}</th>
                    <th className="px-3 py-2 font-semibold">{t("orders.customer")}</th>
                    <th className="px-3 py-2 font-semibold">{t("orders.status")}</th>
                    <th className="px-3 py-2 text-right font-semibold">{t("orders.total")}</th>
                    <th className="py-2 pl-3 text-right font-semibold">{t("orders.commission")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {visible.map((order) => (
                    <tr
                      key={order.id}
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => router.push(`/reseller/orders/${encodeURIComponent(order.id)}`)}
                    >
                      <td className="py-2 pr-3 font-mono text-[11px] font-medium text-slate-900">
                        #{shortOrderId(order.id)}
                      </td>
                      <td className="px-3 py-2 text-slate-500">{fmtDateLong(order.created_at)}</td>
                      <td className="px-3 py-2 text-slate-700">{maskName(orderCustomerName(order)) || "—"}</td>
                      <td className="px-3 py-2">
                        <StatusPill status={order.status} />
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-900">
                        {formatPkr(order.total)}
                      </td>
                      <td className="py-2 pl-3 text-right font-medium text-emerald-700">
                        {formatPkr(order.commission_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </ResellerShell>
  );
}
