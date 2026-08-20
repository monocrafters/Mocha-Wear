"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { API_URL, apiFetch } from "@/lib/api";
import { formatPkr } from "@/lib/money";
import { AdminStatsSkeleton } from "@/components/skeletons";

type Stats = {
  total: number;
  processing: number;
  shipped: number;
  delivered: number;
  revenue: number;
};

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    apiFetch(`${API_URL}/api/admin/orders`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.stats) setStats(data.stats);
      })
      .catch(() => {});
  }, []);

  const cards = stats
    ? [
        { label: "Orders", value: String(stats.total) },
        { label: "Processing", value: String(stats.processing) },
        { label: "On the way", value: String(stats.shipped) },
        { label: "Delivered", value: String(stats.delivered) },
        { label: "Revenue", value: formatPkr(stats.revenue) },
      ]
    : [
        { label: "Orders", value: "—" },
        { label: "Processing", value: "—" },
        { label: "On the way", value: "—" },
        { label: "Delivered", value: "—" },
        { label: "Revenue", value: "—" },
      ];

  return (
    <AdminShell
      active="dashboard"
      kicker="Overview"
      title="Dashboard"
      copy="Orders, catalog, and storefront settings in one place."
    >
      {stats ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {cards.map((card) => (
            <article key={card.label} className="rounded-xl border border-slate-200 bg-white px-5 py-5">
              <p className="text-sm text-slate-500">{card.label}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{card.value}</p>
            </article>
          ))}
        </div>
      ) : (
        <AdminStatsSkeleton />
      )}
      <div className="mt-6 flex flex-wrap gap-4">
        <Link href="/admin/orders" className="text-sm font-medium text-blue-600 hover:text-blue-700">
          Open orders →
        </Link>
        <Link href="/admin/customers" className="text-sm font-medium text-blue-600 hover:text-blue-700">
          Open customers →
        </Link>
      </div>
    </AdminShell>
  );
}
