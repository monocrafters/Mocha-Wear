"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { API_URL, apiFetch } from "@/lib/api";
import { formatPkr } from "@/lib/money";
import { payoutMethodLabel } from "@/lib/reseller-payout";

type Payout = {
  id: string;
  reseller_id: string;
  reseller_name?: string;
  reseller_code?: string;
  amount: number;
  method?: string;
  status: string;
  requested_at?: string;
  payment?: {
    method?: string;
    account_title?: string;
    account_number?: string;
  };
};

const STATUS_OPTIONS = ["all", "requested", "processing", "completed", "rejected"] as const;
const METHOD_OPTIONS = ["all", "jazzcash", "easypaisa", "nayapay", "sadapay", "bank"] as const;

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

function statusLabel(status: string) {
  if (status === "completed") return "Processed";
  if (status === "processing") return "Processing";
  if (status === "requested") return "Requested";
  if (status === "rejected") return "Rejected";
  return status;
}

function paymentMethodKey(row: Payout) {
  return String(row.payment?.method || row.method || "").toLowerCase();
}

export function AdminPayouts() {
  const [items, setItems] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>("all");
  const [methodFilter, setMethodFilter] = useState<(typeof METHOD_OPTIONS)[number]>("all");
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState("");

  async function load() {
    setError("");
    try {
      const res = await apiFetch(`${API_URL}/api/admin/payouts`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not load payouts");
      setItems(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load payouts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (methodFilter !== "all") {
        const key = paymentMethodKey(row);
        if (methodFilter === "bank") {
          if (!key.includes("bank")) return false;
        } else if (!key.includes(methodFilter)) {
          return false;
        }
      }
      if (!q) return true;
      return (
        String(row.reseller_name || "").toLowerCase().includes(q) ||
        String(row.reseller_code || "").toLowerCase().includes(q) ||
        String(row.payment?.account_number || "").includes(q) ||
        String(row.payment?.account_title || "").toLowerCase().includes(q)
      );
    });
  }, [items, methodFilter, search, statusFilter]);

  async function updateStatus(id: string, status: string) {
    setUpdatingId(id);
    setError("");
    try {
      const res = await apiFetch(`${API_URL}/api/admin/payouts/${encodeURIComponent(id)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not update request");
      setItems((prev) => prev.map((row) => (row.id === id ? { ...row, ...data.item } : row)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update request");
    } finally {
      setUpdatingId("");
    }
  }

  return (
    <div className="mt-6">
      {error ? <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Status
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as (typeof STATUS_OPTIONS)[number])}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
            >
              <option value="all">All statuses</option>
              <option value="requested">Requested</option>
              <option value="processing">Processing</option>
              <option value="completed">Processed</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Payment method
            </span>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value as (typeof METHOD_OPTIONS)[number])}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
            >
              <option value="all">All methods</option>
              <option value="jazzcash">JazzCash</option>
              <option value="easypaisa">Easypaisa</option>
              <option value="nayapay">NayaPay</option>
              <option value="sadapay">SadaPay</option>
              <option value="bank">Bank account</option>
            </select>
          </label>
          <label className="block sm:col-span-2 lg:col-span-1">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Search
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Reseller, code, account…"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
            />
          </label>
        </div>
        <p className="text-sm text-slate-500">
          {filtered.length} of {items.length} request{items.length === 1 ? "" : "s"}
        </p>
      </div>

      {loading ? (
        <div className="mt-3 divide-y divide-slate-200">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 animate-pulse bg-slate-100/60" />
          ))}
        </div>
      ) : !filtered.length ? (
        <p className="mt-4 py-8 text-center text-sm text-slate-500">No payment requests match your filters.</p>
      ) : (
        <>
          <div className="mt-3 divide-y divide-slate-200 lg:hidden">
            {filtered.map((p) => (
              <div key={p.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/admin/payouts/${encodeURIComponent(p.id)}`} className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {p.reseller_name || p.reseller_code || "Reseller"}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {fmtDate(p.requested_at)} · {payoutMethodLabel(paymentMethodKey(p))}
                    </p>
                    {p.payment?.account_title ? (
                      <p className="mt-0.5 text-[11px] text-slate-500">{p.payment.account_title}</p>
                    ) : null}
                  </Link>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-slate-900">{formatPkr(p.amount)}</p>
                    <span
                      className={`mt-1 inline-flex rounded px-1.5 py-px text-[9px] font-semibold uppercase ${statusTone(p.status)}`}
                    >
                      {statusLabel(p.status)}
                    </span>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {["processing", "completed", "rejected"].map((status) => (
                    <button
                      key={status}
                      type="button"
                      disabled={updatingId === p.id || p.status === status}
                      onClick={() => updateStatus(p.id, status)}
                      className="rounded-md border border-slate-200 px-2 py-1 text-[10px] font-medium uppercase text-slate-600 disabled:opacity-40"
                    >
                      {status === "completed" ? "Processed" : status}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-slate-200 text-[10px] text-slate-500 uppercase">
                <tr>
                  <th className="py-2 pr-3 font-medium">Reseller</th>
                  <th className="px-3 py-2 font-medium">Amount</th>
                  <th className="px-3 py-2 font-medium">Method</th>
                  <th className="px-3 py-2 font-medium">Account</th>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="py-2 pl-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-2 pr-3">
                      <p className="font-medium text-slate-900">{p.reseller_name || "—"}</p>
                      <p className="text-[12px] text-slate-500">{p.reseller_code}</p>
                    </td>
                    <td className="px-3 py-2 font-medium">{formatPkr(p.amount)}</td>
                    <td className="px-3 py-2 text-slate-500">{payoutMethodLabel(paymentMethodKey(p))}</td>
                    <td className="px-3 py-2 text-slate-500">
                      <p>{p.payment?.account_title || "—"}</p>
                      <p className="text-[12px]">{p.payment?.account_number || ""}</p>
                    </td>
                    <td className="px-3 py-2 text-slate-500">{fmtDate(p.requested_at)}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${statusTone(p.status)}`}>
                        {statusLabel(p.status)}
                      </span>
                    </td>
                    <td className="py-2 pl-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={p.status}
                          disabled={updatingId === p.id}
                          onChange={(e) => updateStatus(p.id, e.target.value)}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none"
                        >
                          <option value="requested">Requested</option>
                          <option value="processing">Processing</option>
                          <option value="completed">Processed</option>
                          <option value="rejected">Rejected</option>
                        </select>
                        <Link
                          href={`/admin/payouts/${encodeURIComponent(p.id)}`}
                          className="text-sm font-medium text-blue-600"
                        >
                          Open
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
