"use client";

import { useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";
import { API_URL, apiFetch } from "@/lib/api";
import { formatPkr } from "@/lib/money";
import { ResellerShell } from "@/components/reseller-shell";
import { resellerErrorMessage, useResellerLocale } from "@/components/reseller-locale-provider";

type MeData = {
  reseller?: { name?: string; username?: string; code?: string };
};

type EarningsData = {
  pending?: number;
  cleared?: number;
};

type LinkData = {
  path?: string;
  clicks?: number;
};

export function ResellerOverview() {
  const { t } = useResellerLocale();
  const [me, setMe] = useState<MeData>({});
  const [earnings, setEarnings] = useState<EarningsData>({});
  const [link, setLink] = useState<LinkData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch(`${API_URL}/api/reseller/me`, { credentials: "include" }).then((r) => r.json()),
      apiFetch(`${API_URL}/api/reseller/earnings`, { credentials: "include" }).then((r) => r.json()),
      apiFetch(`${API_URL}/api/reseller/link`, { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([meData, earningsData, linkData]) => {
        setMe(meData);
        setEarnings(earningsData);
        setLink(linkData);
      })
      .catch((err) => setError(resellerErrorMessage(err, "Could not load data")))
      .finally(() => setLoading(false));
  }, []);

  function copyLink() {
    if (!link.path) return;
    const url = window.location.origin + link.path;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const cards = [
    { label: t("overview.pending"), value: formatPkr(earnings.pending || 0) },
    { label: t("overview.cleared"), value: formatPkr(earnings.cleared || 0) },
    { label: t("overview.clicks"), value: String(link.clicks || 0) },
  ];

  return (
    <ResellerShell active="overview" kicker={t("overview.kicker")} title={t("overview.title")}>
      {error ? <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      {loading ? (
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[76px] animate-pulse border border-slate-200 bg-white" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            {cards.map((card) => (
              <article key={card.label} className="border border-slate-200 bg-white px-4 py-4">
                <p className="text-[10px] text-slate-500 uppercase">{card.label}</p>
                <p className="mt-1.5 text-xl font-semibold text-slate-900">{card.value}</p>
              </article>
            ))}
          </div>

          {link.path ? (
            <div className="mt-6 border border-slate-200 bg-white px-4 py-4">
              <p className="text-[10px] font-semibold text-slate-500 uppercase">{t("overview.yourReferralLink")}</p>
              <div className="mt-2 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {window.location.origin + link.path}
                </code>
                <button
                  type="button"
                  onClick={copyLink}
                  className="shrink-0 rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                  aria-label={t("overview.copyLink")}
                >
                  {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </ResellerShell>
  );
}
