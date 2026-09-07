"use client";

import { useEffect, useMemo, useState } from "react";
import { API_URL, apiFetch } from "@/lib/api";

type PrRequest = {
  id: string;
  reseller_id: string;
  reseller_name?: string;
  reseller_username?: string;
  reseller_code?: string;
  reseller_phone?: string;
  status: string;
  note?: string;
  admin_note?: string;
  delivered_at_request?: number;
  milestone?: number;
  created_at?: string;
};

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
}

function statusTone(status: string) {
  if (status === "approved") return "bg-emerald-50 text-emerald-800";
  if (status === "rejected") return "bg-red-50 text-red-700";
  return "bg-amber-50 text-amber-800";
}

export function AdminPrRequests() {
  const [items, setItems] = useState<PrRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [updating, setUpdating] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  async function load() {
    setError("");
    try {
      const res = await apiFetch(`${API_URL}/api/admin/pr-requests`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not load PR requests");
      setItems(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load PR requests");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const visible = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((row) => row.status === "pending");
  }, [items, filter]);

  async function review(id: string, status: "approved" | "rejected") {
    setUpdating(id);
    setError("");
    try {
      const res = await apiFetch(`${API_URL}/api/admin/pr-requests/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, admin_note: notes[id] || "" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not update request");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update request");
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="mt-8">
      {error ? <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {visible.length} {filter === "pending" ? "pending" : ""} request{visible.length === 1 ? "" : "s"}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFilter("pending")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              filter === "pending" ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-600"
            }`}
          >
            Pending
          </button>
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              filter === "all" ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-600"
            }`}
          >
            All
          </button>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse border border-slate-200 bg-white" />
          ))}
        </div>
      ) : !visible.length ? (
        <p className="mt-4 border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
          {filter === "pending" ? "No pending PR requests." : "No PR requests yet."}
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {visible.map((row) => (
            <article key={row.id} className="border border-slate-200 bg-white px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{row.reseller_name || "Reseller"}</p>
                  <p className="mt-0.5 text-[12px] text-slate-500">
                    @{row.reseller_username || "—"}
                    {row.reseller_code ? ` · /r/${row.reseller_code}` : ""}
                    {row.reseller_phone ? ` · ${row.reseller_phone}` : ""}
                  </p>
                  <p className="mt-2 text-sm text-slate-700">
                    Milestone #{row.milestone || 1} · {row.delivered_at_request || 0} delivered products
                  </p>
                  {row.note ? <p className="mt-1 text-sm text-slate-500">Note: {row.note}</p> : null}
                  <p className="mt-1 text-[11px] text-slate-400">{fmtDate(row.created_at)}</p>
                </div>
                <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium capitalize ${statusTone(row.status)}`}>
                  {row.status}
                </span>
              </div>

              {row.status === "pending" ? (
                <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                  <input
                    value={notes[row.id] || ""}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [row.id]: e.target.value }))}
                    placeholder="Admin note (optional)"
                    className="w-full border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={updating === row.id}
                      onClick={() => void review(row.id, "approved")}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={updating === row.id}
                      onClick={() => void review(row.id, "rejected")}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-red-600 disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ) : row.admin_note ? (
                <p className="mt-3 text-sm text-slate-500">Admin note: {row.admin_note}</p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
