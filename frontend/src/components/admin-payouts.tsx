"use client";

import { useEffect, useState } from "react";
import { API_URL, apiFetch } from "@/lib/api";
import { formatPkr } from "@/lib/money";

type Payout = {
  id: string;
  reseller_id: string;
  reseller_name?: string;
  reseller_code?: string;
  amount: number;
  method?: string;
  status: string;
  created_at?: string;
};

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
}

function statusTone(status: string) {
  if (status === "completed") return "bg-emerald-50 text-emerald-800";
  if (status === "rejected") return "bg-red-50 text-red-700";
  if (status === "processing") return "bg-blue-50 text-blue-700";
  return "bg-amber-50 text-amber-800";
}

export function AdminPayouts() {
  const [items, setItems] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

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

  useEffect(() => { load(); }, []);

  async function setStatus(id: string, status: string) {
    setUpdating(id);
    setError("");
    try {
      const res = await apiFetch(`${API_URL}/api/admin/payouts/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not update payout");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update payout");
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="mt-8">
      {error ? <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <p className="text-sm text-slate-500">{items.length} payout request{items.length === 1 ? "" : "s"}</p>

      {loading ? (
        <div className="mt-4 space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse border border-slate-200 bg-white" />
          ))}
        </div>
      ) : !items.length ? (
        <p className="mt-4 border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
          No payout requests yet.
        </p>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="mt-4 space-y-2 lg:hidden">
            {items.map((p) => (
              <div key={p.id} className="border border-slate-200 bg-white px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{p.reseller_name || p.reseller_code || "Reseller"}</p>
                    <p className="text-[12px] text-slate-500">{fmtDate(p.created_at)} · {p.method || "bank transfer"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-900">{formatPkr(p.amount)}</p>
                    <span className={`mt-1 inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${statusTone(p.status)}`}>
                      {p.status}
                    </span>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {["processing", "completed", "rejected"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={updating === p.id || p.status === s}
                      onClick={() => setStatus(p.id, s)}
                      className={`px-2.5 py-1 text-[10px] font-semibold uppercase disabled:opacity-40 ${
                        p.status === s ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-700"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="mt-4 hidden overflow-x-auto border border-slate-200 bg-white lg:block">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="border-b border-slate-200 text-[10px] text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Reseller</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Method</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id} className="border-b border-slate-200 last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{p.reseller_name || "—"}</p>
                      <p className="text-[12px] text-slate-500">{p.reseller_code}</p>
                    </td>
                    <td className="px-4 py-3 font-medium">{formatPkr(p.amount)}</td>
                    <td className="px-4 py-3 text-slate-500">{p.method || "bank transfer"}</td>
                    <td className="px-4 py-3 text-slate-500">{fmtDate(p.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${statusTone(p.status)}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        {["processing", "completed", "rejected"].map((s) => (
                          <button
                            key={s}
                            type="button"
                            disabled={updating === p.id || p.status === s}
                            onClick={() => setStatus(p.id, s)}
                            className={`px-2 py-1 text-[10px] font-semibold uppercase disabled:opacity-40 ${
                              p.status === s ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
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
