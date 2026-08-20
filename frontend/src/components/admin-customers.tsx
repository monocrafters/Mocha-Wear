"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { API_URL, apiFetch } from "@/lib/api";
import { formatPkr } from "@/lib/money";
import type { AdminCustomer } from "@/lib/admin-customers";
import { AdminListSkeleton, AdminStatsSkeleton } from "@/components/skeletons";

type Stats = {
  total: number;
  orders: number;
  spent: number;
};

export function AdminCustomers() {
  const [items, setItems] = useState<AdminCustomer[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, orders: 0, spent: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    setError("");
    apiFetch(`${API_URL}/api/admin/customers`, { credentials: "include" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Could not load customers");
        setItems(data.items || []);
        setStats(data.stats || { total: 0, orders: 0, spent: 0 });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load customers");
      })
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      [item.name, item.phone, item.whatsapp, item.city, item.area, item.address]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [items, query]);

  if (loading) {
    return (
      <div>
        <AdminStatsSkeleton count={3} />
        <AdminListSkeleton />
      </div>
    );
  }

  const cards = [
    { label: "Customers", value: String(stats.total) },
    { label: "Orders", value: String(stats.orders) },
    { label: "Spent", value: formatPkr(stats.spent) },
  ];

  return (
    <div className="mt-8">
      {error ? <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="mb-6 grid grid-cols-3 gap-3">
        {cards.map((card) => (
          <article key={card.label} className="border border-slate-200 bg-white px-4 py-4">
            <p className="text-[10px] text-slate-500 uppercase">{card.label}</p>
            <p className="mt-1.5 text-xl font-semibold text-slate-900 sm:text-2xl">{card.value}</p>
          </article>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, phone, city"
          className="w-full border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 sm:max-w-sm"
        />
        <p className="text-[11px] text-slate-500 uppercase">{visible.length} shown</p>
      </div>

      <div className="mt-4 space-y-2 lg:hidden">
        {visible.map((item) => (
          <Link
            key={item.id}
            href={`/admin/customers/${item.id}`}
            className="flex items-start justify-between gap-3 bg-white px-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">{item.name}</p>
              <p className="mt-0.5 text-[12px] text-slate-500">{item.phone}</p>
              <p className="mt-0.5 truncate text-[12px] text-slate-500">
                {[item.area, item.city].filter(Boolean).join(", ") || "—"}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-medium text-slate-900">{formatPkr(item.spent)}</p>
              <p className="mt-1 text-[11px] text-slate-500">
                {item.order_count} order{item.order_count === 1 ? "" : "s"}
              </p>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-4 hidden overflow-x-auto border border-slate-200 bg-white lg:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-slate-200 text-[10px] text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">City</th>
              <th className="px-4 py-3 font-medium">Orders</th>
              <th className="px-4 py-3 font-medium">Spent</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((item) => (
              <tr key={item.id} className="border-b border-slate-200 last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{item.name}</p>
                  <p className="text-[12px] text-slate-500">{item.phone}</p>
                </td>
                <td className="px-4 py-3">{[item.area, item.city].filter(Boolean).join(", ") || "—"}</td>
                <td className="px-4 py-3">{item.order_count}</td>
                <td className="px-4 py-3 font-medium">{formatPkr(item.spent)}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/customers/${item.id}`}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700"
                  >
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!visible.length ? (
        <p className="mt-4 border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
          {items.length ? "No customers match this search." : "Customers appear here after the first order."}
        </p>
      ) : null}
    </div>
  );
}
