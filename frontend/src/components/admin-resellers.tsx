"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { API_URL, apiFetch } from "@/lib/api";

type Reseller = {
  id: string;
  name: string;
  username: string;
  email?: string;
  phone?: string;
  social_handle?: string;
  code: string;
  status: string;
  commission_min_percent?: number | null;
  commission_max_percent?: number | null;
  created_at?: string;
};

const emptyForm = {
  name: "",
  username: "",
  password: "",
  email: "",
  phone: "",
  social_handle: "",
  code: "",
  commission_min_percent: "",
  commission_max_percent: "",
};

function statusTone(status: string) {
  if (status === "active" || status === "approved") return "bg-emerald-50 text-emerald-800";
  if (status === "suspended") return "bg-red-50 text-red-700";
  return "bg-amber-50 text-amber-800";
}

export function AdminResellers() {
  const [items, setItems] = useState<Reseller[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMinMax, setEditMinMax] = useState({ min: "", max: "" });
  const [resetPwId, setResetPwId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");

  async function load() {
    setError("");
    try {
      const res = await apiFetch(`${API_URL}/api/admin/resellers`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not load resellers");
      setItems(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load resellers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((r) =>
      [r.name, r.username, r.email, r.phone, r.code].join(" ").toLowerCase().includes(q),
    );
  }, [items, query]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const body: Record<string, string | number | undefined> = {
        name: form.name,
        username: form.username,
        password: form.password,
        email: form.email || undefined,
        phone: form.phone || undefined,
        social_handle: form.social_handle || undefined,
      };
      if (form.code) body.code = form.code;
      if (form.commission_min_percent !== "") body.commission_min_percent = Number(form.commission_min_percent);
      if (form.commission_max_percent !== "") body.commission_max_percent = Number(form.commission_max_percent);
      const res = await apiFetch(`${API_URL}/api/admin/resellers`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not create reseller");
      setCreating(false);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create reseller");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(reseller: Reseller) {
    const next = reseller.status === "suspended" ? "active" : "suspended";
    setError("");
    try {
      const res = await apiFetch(`${API_URL}/api/admin/resellers/${reseller.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not update");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update");
    }
  }

  async function resetPassword(id: string) {
    if (!newPassword.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await apiFetch(`${API_URL}/api/admin/resellers/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not reset password");
      setResetPwId(null);
      setNewPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset password");
    } finally {
      setSaving(false);
    }
  }

  async function saveMinMax(id: string) {
    setSaving(true);
    setError("");
    try {
      const body: Record<string, number | null> = {};
      body.commission_min_percent = editMinMax.min !== "" ? Number(editMinMax.min) : null;
      body.commission_max_percent = editMinMax.max !== "" ? Number(editMinMax.max) : null;
      const res = await apiFetch(`${API_URL}/api/admin/resellers/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not update");
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-8">
      {error ? <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{items.length} reseller{items.length === 1 ? "" : "s"}</p>
        <button
          type="button"
          onClick={() => { setCreating(true); setForm(emptyForm); }}
          className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          Add reseller
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, username, code"
          className="w-full border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 sm:max-w-sm"
        />
      </div>

      {loading ? (
        <div className="mt-4 space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse border border-slate-200 bg-white" />
          ))}
        </div>
      ) : !visible.length ? (
        <p className="mt-4 border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
          {items.length ? "No resellers match this search." : "No resellers yet."}
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto border border-slate-200 bg-white">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="border-b border-slate-200 text-[10px] text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Min / Max %</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} className="border-b border-slate-200 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{r.name}</p>
                    <p className="text-[12px] text-slate-500">@{r.username}{r.phone ? ` · ${r.phone}` : ""}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-700">{r.code}</td>
                  <td className="px-4 py-3">
                    {editingId === r.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number" min="0" max="100"
                          value={editMinMax.min}
                          onChange={(e) => setEditMinMax((p) => ({ ...p, min: e.target.value }))}
                          className="w-14 border border-slate-200 px-1.5 py-1 text-xs outline-none"
                          placeholder="min"
                        />
                        <span className="text-slate-400">/</span>
                        <input
                          type="number" min="0" max="100"
                          value={editMinMax.max}
                          onChange={(e) => setEditMinMax((p) => ({ ...p, max: e.target.value }))}
                          className="w-14 border border-slate-200 px-1.5 py-1 text-xs outline-none"
                          placeholder="max"
                        />
                        <button type="button" disabled={saving} onClick={() => saveMinMax(r.id)}
                          className="text-[10px] font-medium text-blue-600 uppercase disabled:opacity-50">Save</button>
                        <button type="button" onClick={() => setEditingId(null)}
                          className="text-[10px] font-medium text-slate-500 uppercase">Cancel</button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setEditingId(r.id); setEditMinMax({ min: String(r.commission_min_percent ?? ""), max: String(r.commission_max_percent ?? "") }); }}
                        className="text-sm text-slate-700 hover:underline"
                      >
                        {r.commission_min_percent ?? "—"}% / {r.commission_max_percent ?? "—"}%
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${statusTone(r.status)}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <button type="button" onClick={() => toggleStatus(r)}
                        className="border border-slate-200 px-2 py-1 text-[10px] uppercase hover:bg-slate-50">
                        {r.status === "suspended" ? "Approve" : "Suspend"}
                      </button>
                      {resetPwId === r.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="New password"
                            className="w-24 border border-slate-200 px-1.5 py-1 text-xs outline-none"
                          />
                          <button type="button" disabled={saving} onClick={() => resetPassword(r.id)}
                            className="text-[10px] font-medium text-blue-600 uppercase disabled:opacity-50">Set</button>
                          <button type="button" onClick={() => { setResetPwId(null); setNewPassword(""); }}
                            className="text-[10px] font-medium text-slate-500 uppercase">Cancel</button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setResetPwId(r.id)}
                          className="border border-slate-200 px-2 py-1 text-[10px] uppercase hover:bg-slate-50">
                          Reset PW
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating ? (
        <div className="fixed inset-0 z-[70] flex justify-end bg-slate-900/40" onClick={() => setCreating(false)}>
          <form
            onSubmit={onCreate}
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="font-semibold text-xl text-slate-900">New reseller</h2>
              <button type="button" onClick={() => setCreating(false)} className="text-sm text-slate-500">Close</button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
              <label className="block">
                <span className="text-sm font-medium text-slate-600">Name *</span>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 w-full border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-600">Username *</span>
                <input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="mt-1 w-full border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-600">Password *</span>
                <input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="mt-1 w-full border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-600">Email</span>
                <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="mt-1 w-full border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-600">Phone</span>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="mt-1 w-full border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-600">Social handle</span>
                <input value={form.social_handle} onChange={(e) => setForm({ ...form, social_handle: e.target.value })}
                  className="mt-1 w-full border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-600">Referral code (optional)</span>
                <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="Auto-generated if blank"
                  className="mt-1 w-full border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm font-medium text-slate-600">Min % (optional)</span>
                  <input type="number" min="0" max="100" value={form.commission_min_percent} onChange={(e) => setForm({ ...form, commission_min_percent: e.target.value })}
                    className="mt-1 w-full border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-600">Max % (optional)</span>
                  <input type="number" min="0" max="100" value={form.commission_max_percent} onChange={(e) => setForm({ ...form, commission_max_percent: e.target.value })}
                    className="mt-1 w-full border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
                </label>
              </div>
            </div>
            <div className="border-t border-slate-200 px-5 py-4">
              <button type="submit" disabled={saving}
                className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white disabled:opacity-60">
                {saving ? "Creating…" : "Create reseller"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
