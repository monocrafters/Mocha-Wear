"use client";

import { useEffect, useMemo, useState } from "react";
import { MapPin, MousePointerClick, Eye } from "lucide-react";
import { API_URL, apiFetch } from "@/lib/api";
import { AdminListSkeleton, AdminStatsSkeleton } from "@/components/skeletons";

type CountRow = { name: string; count: number };
type PageLocationRow = { page: string; location: string; count: number };
type RecentEvent = {
  id: string;
  type: "page_view" | "click";
  path: string;
  label?: string;
  href?: string;
  location: string;
  device?: string;
  created_at: string;
};

type EventsPayload = {
  days: number;
  totals: {
    events: number;
    page_views: number;
    clicks: number;
    pages: number;
    locations: number;
  };
  pages: CountRow[];
  locations: CountRow[];
  devices: CountRow[];
  page_locations: PageLocationRow[];
  recent: RecentEvent[];
};

function formatWhen(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return date.toLocaleString();
}

export function AdminEvents() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState<EventsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  async function load(nextDays = days) {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch(`${API_URL}/api/admin/events?days=${nextDays}`, { credentials: "include" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Could not load events");
      setData(json as EventsPayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load events");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const filteredRecent = useMemo(() => {
    const rows = data?.recent || [];
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [row.path, row.label, row.location, row.href, row.type, row.device].join(" ").toLowerCase().includes(q),
    );
  }, [data, query]);

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <AdminStatsSkeleton />
        <AdminListSkeleton rows={8} />
      </div>
    );
  }

  const totals = data?.totals || { events: 0, page_views: 0, clicks: 0, pages: 0, locations: 0 };

  return (
    <div className="space-y-4">
      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          See which store pages get views/clicks and from which cities visitors come.
        </p>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value={1}>Last 24 hours</option>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total events", value: totals.events, icon: Eye },
          { label: "Page views", value: totals.page_views, icon: Eye },
          { label: "Clicks", value: totals.clicks, icon: MousePointerClick },
          { label: "Locations", value: totals.locations, icon: MapPin },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
              <card.icon size={14} className="text-slate-400" />
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Top pages</h2>
            <p className="text-xs text-slate-500">How many times each page was opened or clicked.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {(data?.pages || []).length ? (
              data?.pages.map((row) => (
                <div key={row.name} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <p className="min-w-0 truncate font-medium text-slate-800">{row.name}</p>
                  <p className="shrink-0 tabular-nums text-slate-600">{row.count}</p>
                </div>
              ))
            ) : (
              <p className="px-4 py-10 text-center text-sm text-slate-500">No page activity yet.</p>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Top locations</h2>
            <p className="text-xs text-slate-500">Cities / regions where visitors opened the store.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {(data?.locations || []).length ? (
              data?.locations.map((row) => (
                <div key={row.name} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <p className="min-w-0 truncate font-medium text-slate-800">{row.name}</p>
                  <p className="shrink-0 tabular-nums text-slate-600">{row.count}</p>
                </div>
              ))
            ) : (
              <p className="px-4 py-10 text-center text-sm text-slate-500">No location data yet.</p>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Page × location</h2>
          <p className="text-xs text-slate-500">Which page is getting traffic from which place.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Page</th>
                <th className="px-4 py-2.5 font-semibold">Location</th>
                <th className="px-4 py-2.5 font-semibold text-right">Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data?.page_locations || []).length ? (
                data?.page_locations.map((row) => (
                  <tr key={`${row.page}-${row.location}`}>
                    <td className="max-w-[240px] truncate px-4 py-2.5 font-medium text-slate-800">{row.page}</td>
                    <td className="px-4 py-2.5 text-slate-600">{row.location}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{row.count}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-slate-500">
                    No combined page/location data yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Recent activity</h2>
            <p className="text-xs text-slate-500">Latest page views and clicks.</p>
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search page, city, label…"
            className="min-w-[200px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 sm:max-w-xs"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5 font-semibold">When</th>
                <th className="px-4 py-2.5 font-semibold">Type</th>
                <th className="px-4 py-2.5 font-semibold">Page</th>
                <th className="px-4 py-2.5 font-semibold">Location</th>
                <th className="px-4 py-2.5 font-semibold">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecent.length ? (
                filteredRecent.map((row) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{formatWhen(row.created_at)}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          row.type === "click" ? "bg-amber-50 text-amber-800" : "bg-sky-50 text-sky-800"
                        }`}
                      >
                        {row.type === "click" ? "Click" : "View"}
                      </span>
                    </td>
                    <td className="max-w-[180px] truncate px-4 py-2.5 font-medium text-slate-800">{row.path}</td>
                    <td className="px-4 py-2.5 text-slate-600">{row.location}</td>
                    <td className="max-w-[220px] truncate px-4 py-2.5 text-slate-500">
                      {row.type === "click" ? row.label || row.href || "—" : row.device || "—"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                    No recent events yet. Open the store once to start collecting.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
