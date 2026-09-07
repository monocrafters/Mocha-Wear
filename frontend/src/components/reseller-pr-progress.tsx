"use client";

import { useEffect, useState } from "react";
import { Gift, Loader2 } from "lucide-react";
import {
  fetchPrProgress,
  requestPrPackage,
  type PrProgress,
} from "@/lib/reseller-pr";
import { resellerErrorMessage, useResellerLocale } from "@/components/reseller-locale-provider";

export function ResellerPrProgress({ compact = false }: { compact?: boolean }) {
  const { t } = useResellerLocale();
  const [progress, setProgress] = useState<PrProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setError("");
    try {
      const data = await fetchPrProgress();
      setProgress(data);
    } catch (err) {
      setError(resellerErrorMessage(err, t("pr.loadError")));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onRequest() {
    if (!progress?.can_request || sending) return;
    setSending(true);
    setError("");
    setMessage("");
    try {
      await requestPrPackage(note);
      setNote("");
      setMessage(t("pr.requestSent"));
      await load();
    } catch (err) {
      setError(resellerErrorMessage(err, t("pr.requestError")));
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className={`animate-pulse rounded-xl bg-white ${compact ? "h-16" : "h-28"}`} />
    );
  }

  if (!progress) {
    return error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p> : null;
  }

  const pending = progress.pending_request;
  const statusText = pending
    ? t("pr.pendingReview")
    : progress.can_request
      ? t("pr.unlocked")
      : t("pr.progressHint", {
          current: String(progress.current),
          target: String(progress.target),
        });

  return (
    <div className={`rounded-xl border border-slate-200 bg-white ${compact ? "px-3 py-3" : "px-4 py-4"}`}>
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-900 text-white">
          <Gift size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-900">{t("pr.title")}</p>
              <p className="mt-0.5 text-[11px] text-slate-500">{statusText}</p>
            </div>
            <p className="text-xs font-semibold tabular-nums text-slate-700">
              {progress.delivered} / {progress.next_milestone}
            </p>
          </div>

          <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all ${
                progress.can_request || pending ? "bg-emerald-500" : "bg-slate-900"
              }`}
              style={{ width: `${Math.max(4, progress.percent)}%` }}
            />
          </div>

          {!compact ? (
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{t("pr.copy")}</p>
          ) : null}

          {error ? <p className="mt-2 text-[11px] text-red-600">{error}</p> : null}
          {message ? <p className="mt-2 text-[11px] text-emerald-700">{message}</p> : null}
          {pending?.admin_note ? (
            <p className="mt-2 text-[11px] text-slate-500">{t("pr.adminNote")}: {pending.admin_note}</p>
          ) : null}

          {progress.can_request ? (
            <div className={`mt-3 space-y-2 ${compact ? "" : ""}`}>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("pr.notePlaceholder")}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
              <button
                type="button"
                disabled={sending}
                onClick={() => void onRequest()}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {sending ? <Loader2 size={14} className="animate-spin" /> : <Gift size={14} />}
                {sending ? t("pr.sending") : t("pr.requestCta")}
              </button>
            </div>
          ) : null}

          {pending ? (
            <p className="mt-2 text-[11px] font-medium text-amber-700">{t("pr.waitingAdmin")}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
