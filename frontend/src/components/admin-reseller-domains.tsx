"use client";

import { useEffect, useMemo, useState } from "react";
import { API_URL, apiFetch } from "@/lib/api";

type ResellerDomain = {
  id: string;
  name: string;
  username: string;
  code: string;
  domain: string;
  status: string;
  error?: string;
  verified_at?: string;
  updated_at?: string;
};

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
}

function statusTone(status: string) {
  if (status === "live") return "bg-emerald-50 text-emerald-800";
  if (status === "error" || status === "suspended") return "bg-red-50 text-red-700";
  if (status === "pending_dns") return "bg-amber-50 text-amber-800";
  return "bg-slate-100 text-slate-600";
}

export function AdminResellerDomains() {
  const [items, setItems] = useState<ResellerDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "live" | "pending_dns" | "suspended">("all");
  const [updating, setUpdating] = useState<string | null>(null);

  async function load() {
    setError("");
    try {
      const res = await apiFetch(`${API_URL}/api/admin/reseller-domains`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not load domains");
      setItems(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load domains");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const visible = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((row) => row.status === filter);
  }, [items, filter]);

  async function runAction(id: string, action: string) {
    setUpdating(id);
    setError("");
    try {
      const res = await apiFetch(`${API_URL}/api/admin/reseller-domains/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not update domain");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update domain");
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="mt-8">
      {error ? <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{visible.length} domain{visible.length === 1 ? "" : "s"}</p>
        <div className="flex flex-wrap gap-2">
          {(["all", "live", "pending_dns", "suspended"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                filter === key ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-600"
              }`}
            >
              {key === "all" ? "All" : key.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="mt-4 space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse border border-slate-200 bg-white" />
          ))}
        </div>
      ) : !visible.length ? (
        <p className="mt-6 border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
          No reseller domains yet.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Reseller</th>
                <th className="px-4 py-3 font-medium">Domain</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Verified</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{row.name}</p>
                    <p className="text-[12px] text-slate-500">@{row.username} · /r/{row.code}</p>
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-[12px]">{row.domain}</code>
                    {row.error ? <p className="mt-1 text-[11px] text-red-600">{row.error}</p> : null}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusTone(row.status)}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-slate-500">{fmtDate(row.verified_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {row.status === "suspended" ? (
                        <button
                          type="button"
                          disabled={updating === row.id}
                          onClick={() => void runAction(row.id, "unsuspend")}
                          className="rounded border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 disabled:opacity-60"
                        >
                          Unsuspend
                        </button>
                      ) : row.status === "live" ? (
                        <button
                          type="button"
                          disabled={updating === row.id}
                          onClick={() => void runAction(row.id, "suspend")}
                          className="rounded border border-amber-200 px-2 py-1 text-[11px] font-medium text-amber-800 disabled:opacity-60"
                        >
                          Suspend
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={updating === row.id}
                        onClick={() => {
                          if (confirm(`Remove ${row.domain} from ${row.name}?`)) void runAction(row.id, "remove");
                        }}
                        className="rounded border border-red-200 px-2 py-1 text-[11px] font-medium text-red-700 disabled:opacity-60"
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
