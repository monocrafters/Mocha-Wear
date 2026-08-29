"use client";

import { useEffect, useMemo, useState } from "react";
import { API_URL, apiFetch } from "@/lib/api";
import { formatPkr } from "@/lib/money";
import { ResellerShell } from "@/components/reseller-shell";
import { resellerErrorMessage, useResellerLocale } from "@/components/reseller-locale-provider";

type ResellerOrder = {
  id: string;
  created_at?: string;
  status: string;
  total: number;
  commission_total: number;
  customer_name?: string;
};

function maskName(name?: string) {
  if (!name) return "—";
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
}

function statusTone(status: string) {
  if (status === "delivered") return "bg-emerald-50 text-emerald-800";
  if (status === "cancelled") return "bg-red-50 text-red-700";
  if (status === "shipped") return "bg-blue-50 text-blue-700";
  return "bg-amber-50 text-amber-800";
}

export function ResellerOrders() {
  const { t } = useResellerLocale();
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
    return items.filter((o) => [o.id, o.status, maskName(o.customer_name)].join(" ").toLowerCase().includes(q));
  }, [items, query]);

  return (
    <ResellerShell active="orders" kicker={t("orders.kicker")} title={t("orders.title")} copy={t("orders.copy")}>
      {error ? <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 animate-pulse border border-slate-200 bg-white" />
          ))}
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("orders.searchPlaceholder")}
              className="w-full border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 sm:max-w-sm"
            />
            <p className="text-[11px] text-slate-500 uppercase">
              {visible.length} {t("orders.count")}
            </p>
          </div>

          <div className="mt-4 space-y-2 lg:hidden">
            {visible.map((order) => (
              <div key={order.id} className="flex items-start justify-between gap-3 bg-white px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-500 uppercase">{order.id}</p>
                  <p className="mt-0.5 text-sm text-slate-900">{maskName(order.customer_name)}</p>
                  <p className="mt-0.5 text-[12px] text-slate-500">{fmtDate(order.created_at)}</p>
                </div>
                <div className="shrink-0 text-right">
                  <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${statusTone(order.status)}`}>
                    {order.status}
                  </span>
                  <p className="mt-1 text-sm font-medium text-slate-900">{formatPkr(order.total)}</p>
                  <p className="text-[11px] text-slate-500">
                    {t("orders.commShort")} {formatPkr(order.commission_total)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 hidden overflow-x-auto border border-slate-200 bg-white lg:block">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-slate-200 text-[10px] text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("orders.order")}</th>
                  <th className="px-4 py-3 font-medium">{t("orders.date")}</th>
                  <th className="px-4 py-3 font-medium">{t("orders.customer")}</th>
                  <th className="px-4 py-3 font-medium">{t("orders.status")}</th>
                  <th className="px-4 py-3 font-medium">{t("orders.total")}</th>
                  <th className="px-4 py-3 font-medium">{t("orders.commission")}</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((order) => (
                  <tr key={order.id} className="border-b border-slate-200 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-900">{order.id}</td>
                    <td className="px-4 py-3 text-slate-500">{fmtDate(order.created_at)}</td>
                    <td className="px-4 py-3">{maskName(order.customer_name)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${statusTone(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{formatPkr(order.total)}</td>
                    <td className="px-4 py-3 font-medium">{formatPkr(order.commission_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!visible.length ? (
            <p className="mt-4 border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
              {items.length ? t("orders.noMatch") : t("orders.empty")}
            </p>
          ) : null}
        </>
      )}
    </ResellerShell>
  );
}
