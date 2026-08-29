"use client";

import { FormEvent, useEffect, useState } from "react";
import { Check, Copy, Loader2, Share2 } from "lucide-react";
import { API_URL, apiFetch } from "@/lib/api";
import { ResellerShell } from "@/components/reseller-shell";
import { resellerErrorMessage, useResellerLocale } from "@/components/reseller-locale-provider";

type LinkRequest = {
  id: string;
  requested_code?: string;
  status: string;
  note?: string;
  admin_note?: string;
};

type LinkData = {
  path?: string;
  code?: string;
  clicks?: number;
  pending_request?: LinkRequest | null;
  recent_requests?: LinkRequest[];
};

type LinkProduct = {
  id: string;
  name: string;
  slug: string;
  image?: string;
  is_active?: boolean;
  custom_price?: number | null;
};

function slugStatusTone(status: string) {
  if (status === "approved") return "bg-emerald-50 text-emerald-800";
  if (status === "rejected") return "bg-red-50 text-red-700";
  return "bg-amber-50 text-amber-800";
}

/** Cards on mobile; flat sections with dividers on desktop */
const section =
  "rounded-xl border border-slate-200 bg-white p-3 sm:p-4 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:pb-6 lg:border-b lg:border-slate-200 last:lg:border-b-0 last:lg:pb-0";

const sectionLabel = "text-[11px] font-medium uppercase tracking-wide text-slate-400 lg:text-sm lg:normal-case lg:tracking-normal lg:text-slate-700 lg:font-medium";

export function ResellerLinkView() {
  const { t } = useResellerLocale();
  const [link, setLink] = useState<LinkData>({});
  const [products, setProducts] = useState<LinkProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copiedMain, setCopiedMain] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [codeDraft, setCodeDraft] = useState("");
  const [slugNote, setSlugNote] = useState("");
  const [codeCheck, setCodeCheck] = useState<{ available?: boolean; reason?: string } | null>(null);
  const [checkingCode, setCheckingCode] = useState(false);
  const [submittingSlug, setSubmittingSlug] = useState(false);

  function slugStatusLabel(status: string) {
    if (status === "approved") return t("link.statusApproved");
    if (status === "rejected") return t("link.statusRejected");
    return t("link.statusPending");
  }

  async function load() {
    setError("");
    try {
      const [linkRes, productsRes] = await Promise.all([
        apiFetch(`${API_URL}/api/reseller/link`, { credentials: "include" }),
        apiFetch(`${API_URL}/api/reseller/products`, { credentials: "include" }),
      ]);
      const linkData = await linkRes.json();
      const productsData = await productsRes.json();
      if (!linkRes.ok) throw new Error(linkData.message || "Could not load link");
      if (!productsRes.ok) throw new Error(productsData.message || "Could not load products");
      setLink(linkData);
      setProducts(
        (productsData.items || []).filter(
          (p: LinkProduct) => Boolean(p.is_active) || (p.custom_price != null && Number(p.custom_price) > 0),
        ),
      );
    } catch (err) {
      setError(resellerErrorMessage(err, "Could not load data"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const code = codeDraft.trim().toLowerCase();
    if (code.length < 4) {
      setCodeCheck(null);
      return;
    }
    const timer = setTimeout(async () => {
      setCheckingCode(true);
      try {
        const res = await apiFetch(
          `${API_URL}/api/reseller/link/check?code=${encodeURIComponent(code)}`,
          { credentials: "include" },
        );
        const data = await res.json();
        setCodeCheck(res.ok ? data.code || null : { available: false, reason: "invalid" });
      } catch {
        setCodeCheck(null);
      } finally {
        setCheckingCode(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [codeDraft]);

  function origin() {
    return typeof window !== "undefined" ? window.location.origin : "";
  }

  function mainUrl() {
    return origin() + (link.path || `/r/${link.code}`);
  }

  function productUrl(slug: string) {
    return `${origin()}/r/${link.code}/p/${slug}`;
  }

  function copyMain() {
    navigator.clipboard.writeText(mainUrl()).then(() => {
      setCopiedMain(true);
      setTimeout(() => setCopiedMain(false), 2000);
    });
  }

  function copyProduct(id: string, slug: string) {
    navigator.clipboard.writeText(productUrl(slug)).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  function shareWhatsApp() {
    const text = encodeURIComponent(`Check out Mocha Wear! ${mainUrl()}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }

  async function onSlugRequest(e: FormEvent) {
    e.preventDefault();
    setSubmittingSlug(true);
    setError("");
    setSuccess("");
    try {
      const body: Record<string, string> = { requested_code: codeDraft.trim() };
      if (slugNote.trim()) body.note = slugNote.trim();
      const res = await apiFetch(`${API_URL}/api/reseller/link/request`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not submit request");
      setCodeDraft("");
      setSlugNote("");
      setCodeCheck(null);
      setSuccess(t("link.requestSent"));
      await load();
    } catch (err) {
      setError(resellerErrorMessage(err, "Could not submit request"));
    } finally {
      setSubmittingSlug(false);
    }
  }

  const pendingSlug = link.pending_request;
  const canSubmitSlug =
    !pendingSlug && codeDraft.trim().length >= 4 && codeCheck?.available === true;
  const clickCount = link.clicks || 0;
  const recentDone = (link.recent_requests || []).filter(
    (r) => r.status !== "pending" && r.requested_code,
  );

  return (
    <ResellerShell active="link" kicker={t("link.kicker")} title={t("link.title")} compact>
      <div className="mx-auto max-w-lg space-y-3 lg:max-w-2xl lg:space-y-0">
        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}
        {success ? (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{success}</p>
        ) : null}

        {loading ? (
          <div className="h-20 animate-pulse rounded-xl border border-slate-200 bg-white lg:rounded-none lg:border-0 lg:bg-slate-200/60" />
        ) : (
          <>
            {/* Main link */}
            <div className={section}>
              <div className="lg:flex lg:items-center lg:justify-between lg:gap-6">
                <div className="min-w-0 flex-1">
                  <p className={sectionLabel}>{t("link.mainLink")}</p>
                  <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                    <p className="font-mono text-base font-semibold text-slate-900 lg:text-lg">/r/{link.code}</p>
                    <p className="text-[11px] text-slate-500 lg:text-xs">
                      {clickCount} {clickCount === 1 ? t("link.clicks") : t("link.clicksPlural")}
                    </p>
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-slate-400 lg:text-xs">{mainUrl()}</p>
                </div>
                <div className="mt-3 flex gap-2 lg:mt-0 lg:shrink-0">
                  <button
                    type="button"
                    onClick={copyMain}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 lg:flex-none lg:px-4"
                    aria-label={t("overview.copyLink")}
                  >
                    {copiedMain ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                    <span className="lg:hidden">{t("overview.copyLink")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={shareWhatsApp}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 lg:flex-none lg:px-4"
                    aria-label={t("link.shareWhatsApp")}
                  >
                    <Share2 size={15} />
                    <span className="lg:hidden">WhatsApp</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Change slug */}
            <div className={`${section} lg:mt-6`}>
              <p className={sectionLabel}>{t("link.changeLink")}</p>
              <p className="mt-1 hidden text-sm text-slate-500 lg:block">{t("link.changeLinkHelp")}</p>

              {pendingSlug ? (
                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900 lg:mt-3 lg:max-w-md">
                  <p className="font-medium">{t("link.pendingRequest")}</p>
                  <p className="mt-0.5 font-mono text-[13px]">/r/{pendingSlug.requested_code}</p>
                  <p className="mt-0.5 text-[11px] text-amber-700">{t("link.waitingAdmin")}</p>
                </div>
              ) : (
                <form onSubmit={onSlugRequest} className="mt-2 space-y-2.5 lg:mt-3 lg:max-w-xl">
                  <div className="lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
                    <label className="block">
                      <span className="text-xs font-medium text-slate-600">{t("link.newSlug")}</span>
                      <div className="mt-1 flex overflow-hidden rounded-lg border border-slate-200 bg-white focus-within:border-blue-500">
                        <span className="flex shrink-0 items-center bg-slate-50 px-2.5 text-xs text-slate-400">
                          /r/
                        </span>
                        <input
                          value={codeDraft}
                          onChange={(e) =>
                            setCodeDraft(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                          }
                          placeholder={t("link.slugPlaceholder")}
                          minLength={4}
                          maxLength={24}
                          className="min-w-0 flex-1 bg-white px-2 py-2 text-sm outline-none"
                        />
                      </div>
                      <p
                        className={`mt-1 text-[11px] ${
                          codeDraft.trim().length >= 4
                            ? codeCheck?.available
                              ? "text-emerald-700"
                              : codeCheck
                                ? "text-red-600"
                                : "text-slate-400"
                            : "text-slate-400"
                        }`}
                      >
                        {codeDraft.trim().length >= 4
                          ? checkingCode && !codeCheck
                            ? t("link.checking")
                            : codeCheck?.available
                              ? t("link.available")
                              : codeCheck
                                ? t("link.notAvailable")
                                : "…"
                          : t("link.slugHint")}
                      </p>
                    </label>

                    <label className="block">
                      <span className="text-xs font-medium text-slate-600">{t("link.noteForAdmin")}</span>
                      <input
                        value={slugNote}
                        onChange={(e) => setSlugNote(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm outline-none focus:border-blue-500"
                        placeholder={t("link.notePlaceholder")}
                      />
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={!canSubmitSlug || submittingSlug}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 sm:w-auto"
                  >
                    {submittingSlug ? <Loader2 size={15} className="animate-spin" /> : null}
                    {submittingSlug ? t("link.sending") : t("link.sendRequest")}
                  </button>
                </form>
              )}

              {recentDone.length ? (
                <div className="mt-3 border-t border-slate-100 pt-3 lg:mt-4 lg:border-t-0 lg:pt-0">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400 lg:text-xs lg:normal-case lg:text-slate-500">
                    {t("link.recentRequests")}
                  </p>
                  <ul className="mt-1.5 flex flex-wrap gap-2 lg:mt-2">
                    {recentDone.slice(0, 3).map((r) => (
                      <li
                        key={r.id}
                        className="inline-flex items-center gap-1.5 text-[11px] text-slate-600"
                      >
                        <span className={`rounded px-1.5 py-0.5 font-medium ${slugStatusTone(r.status)}`}>
                          {slugStatusLabel(r.status)}
                        </span>
                        <code className="font-mono">/r/{r.requested_code}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            {/* Product links */}
            {products.length ? (
              <div className={`${section} lg:mt-6`}>
                <p className={sectionLabel}>{t("link.productLinks")}</p>
                <ul className="mt-2 divide-y divide-slate-100 lg:mt-3 lg:grid lg:grid-cols-2 lg:gap-x-6 lg:gap-y-0 lg:divide-y-0">
                  {products.map((product) => (
                    <li
                      key={product.id}
                      className="flex items-center gap-2 py-2 first:pt-0 last:pb-0 lg:border-b lg:border-slate-100 lg:py-2.5"
                    >
                      {product.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.image} alt="" className="h-9 w-7 shrink-0 object-cover" />
                      ) : (
                        <div className="grid h-9 w-7 shrink-0 place-items-center bg-slate-100 text-[8px] text-slate-400">
                          —
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-slate-900">{product.name}</p>
                        <p className="truncate font-mono text-[10px] text-slate-400">
                          /r/{link.code}/p/{product.slug}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyProduct(product.id, product.slug)}
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 lg:border-0 lg:bg-transparent lg:hover:bg-slate-100"
                        aria-label={`${t("link.copyProduct")} ${product.name}`}
                      >
                        {copiedId === product.id ? (
                          <Check size={13} className="text-emerald-600" />
                        ) : (
                          <Copy size={13} />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </div>
    </ResellerShell>
  );
}
