"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { API_URL, apiFetch } from "@/lib/api";
import { formatPkr } from "@/lib/money";
import { ui } from "@/lib/admin-ui";
import { payoutMethodLabel } from "@/lib/reseller-payout";

type PayoutDetail = {
  id: string;
  amount: number;
  method?: string;
  status: string;
  requested_at?: string;
  completed_at?: string;
  note?: string;
  admin_note?: string;
  reseller_name?: string;
  reseller_code?: string;
  reseller_email?: string;
  reseller_phone?: string;
  payment?: {
    method?: string;
    account_title?: string;
    account_number?: string;
    bank_name?: string;
    iban?: string;
  };
};

function fmtDateTime(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusTone(status: string) {
  if (status === "completed") return "bg-emerald-50 text-emerald-800";
  if (status === "rejected") return "bg-red-50 text-red-700";
  if (status === "processing") return "bg-blue-50 text-blue-700";
  return "bg-amber-50 text-amber-800";
}

function DetailRow({ label, value }: { label: string; value: string }) {
  if (!value || value === "—") return null;
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2.5 last:border-b-0">
      <p className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="min-w-0 text-right text-sm text-slate-900">{value}</p>
    </div>
  );
}

export function AdminPayoutDetail({ payoutId }: { payoutId: string }) {
  const [item, setItem] = useState<PayoutDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [resellerNote, setResellerNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setError("");
    try {
      const res = await apiFetch(`${API_URL}/api/admin/payouts/${encodeURIComponent(payoutId)}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Payout not found");
      setItem(data.item || null);
      setAdminNote(data.item?.admin_note || "");
      setResellerNote(data.item?.note || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load payout");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [payoutId]);

  async function setStatus(status: string) {
    if (!item) return;
    setSaving(true);
    setError("");
    try {
      const res = await apiFetch(`${API_URL}/api/admin/payouts/${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, admin_note: adminNote, note: resellerNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not update payout");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update payout");
    } finally {
      setSaving(false);
    }
  }

  async function saveNotes(e: FormEvent) {
    e.preventDefault();
    if (!item) return;
    setSaving(true);
    setError("");
    try {
      const res = await apiFetch(`${API_URL}/api/admin/payouts/${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: item.status, admin_note: adminNote, note: resellerNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not save notes");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save notes");
    } finally {
      setSaving(false);
    }
  }

  const payment = item?.payment;

  return (
    <div className="mx-auto mt-6 max-w-2xl">
      <Link
        href="/admin/payouts"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft size={15} />
        Back to payouts
      </Link>

      {error ? <p className={`mb-3 ${ui.error}`}>{error}</p> : null}

      {loading ? (
        <div className="grid place-items-center py-16 text-sm text-slate-500">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : !item ? (
        <p className="py-8 text-center text-sm text-slate-500">Payout not found.</p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-2xl font-semibold text-slate-900">{formatPkr(item.amount)}</p>
              <p className="mt-1 text-sm text-slate-500">Requested {fmtDateTime(item.requested_at)}</p>
            </div>
            <span className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${statusTone(item.status)}`}>
              {item.status === "completed" ? "Processed" : item.status}
            </span>
          </div>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Reseller</p>
            <DetailRow label="Name" value={item.reseller_name || "—"} />
            <DetailRow label="Code" value={item.reseller_code ? `/r/${item.reseller_code}` : "—"} />
            <DetailRow label="Email" value={item.reseller_email || "—"} />
            <DetailRow label="Phone" value={item.reseller_phone || "—"} />
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Payment details
            </p>
            <DetailRow label="Method" value={payoutMethodLabel(payment?.method || item.method)} />
            {payment?.method === "bank" ? (
              <>
                <DetailRow label="Account title" value={payment.account_title || "—"} />
                <DetailRow label="Bank" value={payment.bank_name || "—"} />
                <DetailRow label="Account number" value={payment.account_number || "—"} />
                <DetailRow label="IBAN" value={payment.iban || "—"} />
              </>
            ) : (
              <>
                <DetailRow label="Account title" value={payment?.account_title || "—"} />
                <DetailRow label="Mobile number" value={payment?.account_number || "—"} />
              </>
            )}
          </section>

          <form onSubmit={saveNotes} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Admin note (internal)
              </span>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Note to reseller
              </span>
              <textarea
                value={resellerNote}
                onChange={(e) => setResellerNote(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none"
              />
            </label>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-60"
            >
              Save notes
            </button>
          </form>

          <div className="flex flex-wrap gap-2">
            {["processing", "completed", "rejected"].map((status) => (
              <button
                key={status}
                type="button"
                disabled={saving || item.status === status}
                onClick={() => setStatus(status)}
                className={`rounded-lg px-4 py-2 text-sm font-medium uppercase disabled:opacity-40 ${
                  item.status === status ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-700"
                }`}
              >
                {status === "completed" ? "Processed" : status}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
