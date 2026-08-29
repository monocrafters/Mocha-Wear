"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Check, ChevronRight, Copy, Loader2, Search, SlidersHorizontal } from "lucide-react";
import { API_URL, apiFetch } from "@/lib/api";
import { formatPkr } from "@/lib/money";
import { ui } from "@/lib/admin-ui";
import {
  filterByPage,
  hasResellerPrice,
  isActiveFlag,
  isInactiveListing,
  isLiveProduct,
  isPricingReady,
  productMargin,
  sortProducts,
  type ProductSort,
  type ResellerProduct,
  type ResellerProductLimits,
} from "@/lib/reseller-products";
import { ResellerShell } from "@/components/reseller-shell";
import { useResellerHeaderDock } from "@/components/reseller-header-dock";
import { ActiveToggle, ProductStatusBadge } from "@/components/reseller-product-ui";
import { resellerErrorMessage, useResellerLocale } from "@/components/reseller-locale-provider";

type ProductListMode = "pending" | "active";
type PendingStatus = "all" | "ready" | "locked";
type ActiveStatus = "live" | "inactive" | "all";

const meta: Record<
  ProductListMode,
  { shellActive: string; titleKey: string; emptyKey: string; kickerKey: string }
> = {
  pending: {
    shellActive: "products",
    titleKey: "products.pendingTitle",
    emptyKey: "products.noPending",
    kickerKey: "products.pendingKicker",
  },
  active: {
    shellActive: "products-active",
    titleKey: "products.activeTitle",
    emptyKey: "products.noActive",
    kickerKey: "products.activeKicker",
  },
};

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
        active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {label}
    </button>
  );
}

function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

export function ResellerProductList({ mode }: { mode: ProductListMode }) {
  const { t } = useResellerLocale();
  const { docked, setDocked, setToolbar } = useResellerHeaderDock();
  const [items, setItems] = useState<ResellerProduct[]>([]);
  const [limits, setLimits] = useState<ResellerProductLimits | null>(null);
  const [resellerCode, setResellerCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [savedId, setSavedId] = useState("");
  const [copiedLinkId, setCopiedLinkId] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<PendingStatus>("all");
  const [activeStatus, setActiveStatus] = useState<ActiveStatus>("live");
  const [sortBy, setSortBy] = useState<ProductSort>("default");
  const toolbarRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setDocked(!entry.isIntersecting), {
      threshold: 0,
      rootMargin: "-56px 0px 0px 0px",
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [setDocked, loading]);

  useEffect(() => {
    return () => {
      setDocked(false);
      setToolbar(null);
    };
  }, [setDocked, setToolbar]);

  useEffect(() => {
    if (!filtersOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (!toolbarRef.current?.contains(event.target as Node)) {
        setFiltersOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [filtersOpen]);

  useEffect(() => {
    Promise.all([
      apiFetch(`${API_URL}/api/reseller/products`, { credentials: "include" }),
      apiFetch(`${API_URL}/api/reseller/me`, { credentials: "include" }),
    ])
      .then(async ([productsRes, meRes]) => {
        const productsData = await productsRes.json();
        if (!productsRes.ok) throw new Error(productsData.message || "Could not load products");
        setItems(productsData.items || []);
        if (productsData.limits) {
          setLimits({
            minPercent: Number(productsData.limits.minPercent) || 0,
            maxPercent: Number(productsData.limits.maxPercent) || 0,
          });
        }
        if (meRes.ok) {
          const meData = await meRes.json();
          setResellerCode(String(meData.reseller?.code || "").trim().toLowerCase());
        }
      })
      .catch((err) => setError(resellerErrorMessage(err, "Could not load products")))
      .finally(() => setLoading(false));
  }, []);

  const updateProduct = useCallback((id: string, patch: Partial<ResellerProduct>) => {
    setItems((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }, []);

  const savePrice = useCallback(
    async (product: ResellerProduct, priceStr: string, isActive = true) => {
      const price = Math.round(Number(priceStr));
      if (!Number.isFinite(price) || price <= 0) {
        setActionError("Enter a valid selling price");
        return;
      }
      if (price < product.min_price || price > product.max_price) {
        setActionError(`Price must be between ${formatPkr(product.min_price)} and ${formatPkr(product.max_price)}`);
        return;
      }

      setActionError("");
      setBusyId(product.id);
      setSavedId("");
      try {
        const res = await apiFetch(`${API_URL}/api/reseller/products/${product.id}/price`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ custom_price: price, is_active: isActive }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Could not save");
        const nextPrice = Number(data.item?.custom_price ?? price);
        const nextActive = data.item?.is_active != null ? Boolean(data.item.is_active) : isActive;
        updateProduct(product.id, {
          custom_price: nextPrice,
          is_active: nextActive,
          margin: Math.max(0, nextPrice - product.wholesale_price),
        });
        setDrafts((prev) => {
          const next = { ...prev };
          delete next[product.id];
          return next;
        });
        setSavedId(product.id);
        setTimeout(() => setSavedId((id) => (id === product.id ? "" : id)), 2000);
      } catch (err) {
        setActionError(resellerErrorMessage(err, "Could not save"));
      } finally {
        setBusyId("");
      }
    },
    [updateProduct],
  );

  const toggleActive = useCallback(
    async (product: ResellerProduct, next: boolean) => {
      if (!hasResellerPrice(product)) return;
      setActionError("");
      setBusyId(product.id);
      const prev = product.is_active;
      updateProduct(product.id, { is_active: next });
      try {
        const res = await apiFetch(`${API_URL}/api/reseller/products/${product.id}/price`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            custom_price: product.custom_price,
            is_active: next,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Could not update");
        const nextActive = data.item?.is_active != null ? Boolean(data.item.is_active) : next;
        updateProduct(product.id, { is_active: nextActive });
      } catch (err) {
        updateProduct(product.id, { is_active: prev });
        setActionError(resellerErrorMessage(err, "Could not update"));
      } finally {
        setBusyId("");
      }
    },
    [updateProduct],
  );

  const info = meta[mode];
  const pageItems = useMemo(() => filterByPage(items, mode), [items, mode]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = pageItems;

    if (mode === "pending") {
      if (pendingStatus === "ready") list = list.filter((p) => isPricingReady(p));
      else if (pendingStatus === "locked") list = list.filter((p) => !isPricingReady(p));
    } else if (activeStatus === "live") {
      list = list.filter(isLiveProduct);
    } else if (activeStatus === "inactive") {
      list = list.filter(isInactiveListing);
    }

    list = sortProducts(list, sortBy);

    if (!q) return list;
    return list.filter((p) => p.name.toLowerCase().includes(q));
  }, [pageItems, mode, pendingStatus, activeStatus, sortBy, query]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (mode === "pending" ? pendingStatus !== "all" : activeStatus !== "live") count += 1;
    if (sortBy !== "default") count += 1;
    return count;
  }, [mode, pendingStatus, activeStatus, sortBy]);

  function previewHref(product: ResellerProduct) {
    if (resellerCode && product.slug) {
      return `/r/${encodeURIComponent(resellerCode)}/p/${encodeURIComponent(product.slug)}`;
    }
    return `/products/${product.slug}`;
  }

  function liveProductShareUrl(product: ResellerProduct) {
    if (typeof window === "undefined" || !resellerCode || !product.slug) return "";
    return `${window.location.origin}/r/${encodeURIComponent(resellerCode)}/p/${encodeURIComponent(product.slug)}`;
  }

  function copyLiveLink(product: ResellerProduct) {
    const url = liveProductShareUrl(product);
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLinkId(product.id);
      setTimeout(() => setCopiedLinkId((id) => (id === product.id ? "" : id)), 2000);
    });
  }

  const toolbar = useMemo(
    () => (
      <div className="relative w-full" ref={toolbarRef}>
      <div className="flex items-center gap-2">
        <label className="relative min-w-0 flex-1">
          <Search
            size={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("products.searchPlaceholder")}
            className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-sm outline-none lg:py-2"
          />
        </label>
        <button
          type="button"
          aria-label={t("products.filters")}
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen((open) => !open)}
          className={`relative grid h-8 w-8 shrink-0 place-items-center rounded-lg border bg-white transition lg:h-9 lg:w-9 ${
            filtersOpen ? "border-slate-900 text-slate-900" : "border-slate-200 text-slate-600"
          }`}
        >
          <SlidersHorizontal size={15} />
          {activeFilterCount > 0 ? (
            <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-slate-900 px-0.5 text-[9px] font-bold text-white">
              {activeFilterCount}
            </span>
          ) : null}
        </button>
      </div>

      {filtersOpen ? (
        <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-full rounded-lg border border-slate-200 bg-white p-2.5 shadow-lg sm:max-w-xs">
          <div className="space-y-2">
            {mode === "pending" ? (
              <>
                <FilterGroup label={t("products.filterStatus")}>
                  <FilterChip
                    active={pendingStatus === "all"}
                    label={t("products.filterAll")}
                    onClick={() => setPendingStatus("all")}
                  />
                  <FilterChip
                    active={pendingStatus === "ready"}
                    label={t("products.filterReady")}
                    onClick={() => setPendingStatus("ready")}
                  />
                  <FilterChip
                    active={pendingStatus === "locked"}
                    label={t("products.filterLocked")}
                    onClick={() => setPendingStatus("locked")}
                  />
                </FilterGroup>
                <FilterGroup label={t("products.filterSort")}>
                  <FilterChip
                    active={sortBy === "name"}
                    label={t("products.filterName")}
                    onClick={() => setSortBy(sortBy === "name" ? "default" : "name")}
                  />
                  <FilterChip
                    active={sortBy === "wholesale_asc"}
                    label={t("products.filterWholesaleLow")}
                    onClick={() => setSortBy(sortBy === "wholesale_asc" ? "default" : "wholesale_asc")}
                  />
                  <FilterChip
                    active={sortBy === "wholesale_desc"}
                    label={t("products.filterWholesaleHigh")}
                    onClick={() => setSortBy(sortBy === "wholesale_desc" ? "default" : "wholesale_desc")}
                  />
                  <FilterChip
                    active={sortBy === "potential_high"}
                    label={t("products.filterPotential")}
                    onClick={() => setSortBy(sortBy === "potential_high" ? "default" : "potential_high")}
                  />
                </FilterGroup>
              </>
            ) : (
              <>
                <FilterGroup label={t("products.filterStatus")}>
                  <FilterChip
                    active={activeStatus === "live"}
                    label={t("products.filterLive")}
                    onClick={() => setActiveStatus("live")}
                  />
                  <FilterChip
                    active={activeStatus === "inactive"}
                    label={t("products.filterInactive")}
                    onClick={() => setActiveStatus("inactive")}
                  />
                  <FilterChip
                    active={activeStatus === "all"}
                    label={t("products.filterAll")}
                    onClick={() => setActiveStatus("all")}
                  />
                </FilterGroup>
                <FilterGroup label={t("products.filterSort")}>
                  <FilterChip
                    active={sortBy === "name"}
                    label={t("products.filterName")}
                    onClick={() => setSortBy(sortBy === "name" ? "default" : "name")}
                  />
                  <FilterChip
                    active={sortBy === "price_asc"}
                    label={t("products.filterPriceLow")}
                    onClick={() => setSortBy(sortBy === "price_asc" ? "default" : "price_asc")}
                  />
                  <FilterChip
                    active={sortBy === "price_desc"}
                    label={t("products.filterPriceHigh")}
                    onClick={() => setSortBy(sortBy === "price_desc" ? "default" : "price_desc")}
                  />
                  <FilterChip
                    active={sortBy === "margin_high"}
                    label={t("products.filterHighMargin")}
                    onClick={() => setSortBy(sortBy === "margin_high" ? "default" : "margin_high")}
                  />
                  <FilterChip
                    active={sortBy === "margin_low"}
                    label={t("products.filterLowMargin")}
                    onClick={() => setSortBy(sortBy === "margin_low" ? "default" : "margin_low")}
                  />
                  <FilterChip
                    active={sortBy === "wholesale_asc"}
                    label={t("products.filterWholesaleLow")}
                    onClick={() => setSortBy(sortBy === "wholesale_asc" ? "default" : "wholesale_asc")}
                  />
                </FilterGroup>
              </>
            )}
          </div>
        </div>
      ) : null}
      </div>
    ),
    [
      activeFilterCount,
      activeStatus,
      filtersOpen,
      mode,
      pendingStatus,
      query,
      sortBy,
      t,
    ],
  );

  useEffect(() => {
    if (docked) setToolbar(toolbar);
    else setToolbar(null);
  }, [docked, setToolbar, toolbar]);

  return (
    <ResellerShell active={info.shellActive} kicker={t(info.kickerKey)} title={t(info.titleKey)} compact>
      <div className="mx-auto w-full max-w-lg lg:max-w-6xl">
        <div ref={sentinelRef} className="h-px w-full" aria-hidden />

        {!loading && pageItems.length > 0 && !docked ? (
          <div className="mb-2">
            {toolbar}
            <p className="mt-1.5 text-[10px] text-slate-400">
              {visible.length} {t("products.count")}
              {mode === "pending" && limits
                ? ` · ${t("products.markupBadge", { min: String(limits.minPercent), max: String(limits.maxPercent) })}`
                : null}
            </p>
          </div>
        ) : null}

        {!loading && pageItems.length > 0 && docked ? (
          <p className="mb-2 text-[10px] text-slate-400">
            {visible.length} {t("products.count")}
            {mode === "pending" && limits
              ? ` · ${t("products.markupBadge", { min: String(limits.minPercent), max: String(limits.maxPercent) })}`
              : null}
          </p>
        ) : null}

        {error ? <p className={`mb-3 ${ui.error}`}>{error}</p> : null}
        {actionError ? <p className={`mb-3 ${ui.error}`}>{actionError}</p> : null}

        {loading ? (
          <div className="grid gap-3 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={`h-28 animate-pulse ${ui.card}`} />
            ))}
          </div>
        ) : !pageItems.length ? (
          <p className={ui.empty}>{t(info.emptyKey)}</p>
        ) : !visible.length ? (
          <p className={ui.empty}>{t("products.noPendingFilter")}</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {visible.map((product) => {
              const ready = isPricingReady(product);
              const saved = hasResellerPrice(product);
              const live = isLiveProduct(product);
              const margin = productMargin(product);
              const activeOnCard = isActiveFlag(product.is_active);
              const draft = drafts[product.id] ?? "";
              const draftNum = draft ? Number(draft) : 0;
              const draftMargin =
                Number.isFinite(draftNum) && draftNum > 0
                  ? Math.max(0, draftNum - product.wholesale_price)
                  : 0;
              const isBusy = busyId === product.id;
              const justSaved = savedId === product.id;

              return (
                <div
                  key={product.id}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                >
                  <div className="flex gap-3 p-3">
                    <Link
                      href={previewHref(product)}
                      className="group relative shrink-0"
                    >
                      {product.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.image}
                          alt=""
                          className="h-[88px] w-[68px] rounded-lg object-cover"
                        />
                      ) : (
                        <div className="grid h-[88px] w-[68px] place-items-center rounded-lg bg-slate-100 text-[9px] text-slate-400">
                          —
                        </div>
                      )}
                      {mode === "active" && live ? (
                        <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-emerald-600 text-white ring-2 ring-white">
                          <span className="text-[8px] font-bold">✓</span>
                        </span>
                      ) : null}
                    </Link>

                    <div className="flex min-w-0 flex-1 flex-col">
                      <Link
                        href={previewHref(product)}
                        className="group block min-w-0"
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900">
                            {product.name}
                          </h3>
                          <div className="flex shrink-0 items-center gap-1">
                            {mode === "pending" ? (
                              <ProductStatusBadge ready={ready} saved={saved} active={false} />
                            ) : !live ? (
                              <ProductStatusBadge ready saved={saved} active={false} />
                            ) : null}
                            <ChevronRight size={14} className="text-slate-300" />
                          </div>
                        </div>

                        <div className="mt-1 space-y-0.5 text-[11px] text-slate-500">
                          <p>
                            {t("products.wholesale")}{" "}
                            <span className="font-medium text-slate-700">
                              {formatPkr(product.wholesale_price)}
                            </span>
                          </p>
                          {mode === "active" && saved ? (
                            <p>
                              {t("products.yourSellPrice")}{" "}
                              <span className="font-semibold text-slate-900">
                                {formatPkr(product.custom_price || 0)}
                              </span>
                              <span className="text-emerald-600"> · +{formatPkr(margin)}</span>
                            </p>
                          ) : ready ? (
                            <p>
                              {formatPkr(product.min_price)} – {formatPkr(product.max_price)}
                            </p>
                          ) : (
                            <p className="text-amber-700">{t("products.wholesaleMissing")}</p>
                          )}
                        </div>
                      </Link>

                      {mode === "pending" && ready ? (
                        <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-end gap-1.5">
                            <label className="min-w-0 flex-1">
                              <input
                                type="number"
                                inputMode="numeric"
                                min={product.min_price}
                                max={product.max_price}
                                value={draft}
                                disabled={isBusy}
                                onChange={(e) =>
                                  setDrafts((prev) => ({ ...prev, [product.id]: e.target.value }))
                                }
                                placeholder={String(product.min_price)}
                                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-900 outline-none disabled:bg-slate-50"
                              />
                            </label>
                            <button
                              type="button"
                              disabled={isBusy || !draft}
                              onClick={() => savePrice(product, draft, true)}
                              className={`inline-flex shrink-0 items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition disabled:opacity-50 ${
                                justSaved ? "bg-emerald-600" : "bg-slate-900 hover:bg-slate-800"
                              }`}
                            >
                              {isBusy ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : justSaved ? (
                                <Check size={13} strokeWidth={3} />
                              ) : null}
                              {isBusy ? t("products.saving") : justSaved ? t("products.saved") : t("products.save")}
                            </button>
                          </div>
                          {draft ? (
                            <p className="mt-1 text-[10px] text-slate-500">
                              {t("products.margin")}{" "}
                              <span className="font-semibold text-emerald-600">
                                {formatPkr(draftMargin)}
                              </span>
                            </p>
                          ) : null}
                        </div>
                      ) : null}

                      {mode === "pending" && !ready ? (
                        <p className="mt-2 text-[10px] text-amber-700">{t("products.wholesaleMissing")}</p>
                      ) : null}

                      {mode === "active" && saved ? (
                        <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] text-slate-500">{t("products.activeOnLink")}</span>
                            <ActiveToggle
                              compact
                              checked={activeOnCard}
                              disabled={isBusy}
                              label={t("products.active")}
                              onChange={(next) => toggleActive(product, next)}
                            />
                          </div>
                          {live && resellerCode ? (
                            <button
                              type="button"
                              onClick={() => copyLiveLink(product)}
                              className={`inline-flex w-full items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition ${
                                copiedLinkId === product.id
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                              }`}
                            >
                              {copiedLinkId === product.id ? (
                                <Check size={13} strokeWidth={3} />
                              ) : (
                                <Copy size={13} />
                              )}
                              {copiedLinkId === product.id
                                ? t("products.linkCopied")
                                : t("products.copyLiveLink")}
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ResellerShell>
  );
}
