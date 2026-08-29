"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ExternalLink, Loader2 } from "lucide-react";
import { API_URL, apiFetch } from "@/lib/api";
import { formatPkr } from "@/lib/money";
import { ui } from "@/lib/admin-ui";
import { isLiveProduct, type ResellerProduct } from "@/lib/reseller-products";
import { ResellerShell } from "@/components/reseller-shell";
import { ActiveToggle, ProductStatusBadge } from "@/components/reseller-product-ui";
import { resellerErrorMessage, useResellerLocale } from "@/components/reseller-locale-provider";

export function ResellerProductDetail({ productId }: { productId: string }) {
  const { t } = useResellerLocale();
  const [product, setProduct] = useState<ResellerProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [price, setPrice] = useState("");
  const [active, setActive] = useState(true);
  const [resellerCode, setResellerCode] = useState("");

  useEffect(() => {
    apiFetch(`${API_URL}/api/reseller/me`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        setResellerCode(String(data.reseller?.code || "").trim().toLowerCase());
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    apiFetch(`${API_URL}/api/reseller/products/${productId}`, { credentials: "include" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Could not load product");
        const item = data.item as ResellerProduct;
        setProduct(item);
        setPrice(item.custom_price != null && item.custom_price > 0 ? String(item.custom_price) : "");
        setActive(item.custom_price != null ? item.is_active : true);
      })
      .catch((err) => setError(resellerErrorMessage(err, "Could not load product")))
      .finally(() => setLoading(false));
  }, [productId]);

  const ready = product ? product.pricing_ready !== false && product.wholesale_price > 0 : false;
  const hasSavedPrice = product ? product.custom_price != null && product.custom_price > 0 : false;
  const margin = (() => {
    const sell = price ? Number(price) : product?.custom_price;
    if (!product || sell == null || !Number.isFinite(sell)) return 0;
    return Math.max(0, sell - product.wholesale_price);
  })();

  async function save() {
    if (!product) return;
    if (!ready) {
      setError("Wholesale price is missing. Ask admin to set wholesale for this product first.");
      return;
    }
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await apiFetch(`${API_URL}/api/reseller/products/${product.id}/price`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          custom_price: price === "" ? null : Number(price),
          is_active: active,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not save");
      const nextPrice =
        data.item?.custom_price != null ? Number(data.item.custom_price) : Number(price);
      const nextActive = data.item?.is_active != null ? Boolean(data.item.is_active) : active;
      setProduct((prev) =>
        prev
          ? {
              ...prev,
              custom_price: nextPrice,
              is_active: nextActive,
              margin: Math.max(0, nextPrice - prev.wholesale_price),
            }
          : prev,
      );
      setPrice(String(nextPrice));
      setActive(nextActive);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(resellerErrorMessage(err, "Could not save"));
    } finally {
      setSaving(false);
    }
  }

  const shellActive = product && isLiveProduct(product) ? "products-active" : "products";
  const backHref = product && isLiveProduct(product) ? "/reseller/products/live" : "/reseller/products";
  const images = product?.images?.length ? product.images : product?.image ? [{ id: "cover", url: product.image }] : [];
  const previewHref =
    product && hasSavedPrice && product.slug
      ? resellerCode
        ? `/r/${encodeURIComponent(resellerCode)}/p/${encodeURIComponent(product.slug)}`
        : `/products/${product.slug}`
      : null;

  return (
    <ResellerShell
      active={shellActive}
      kicker={t("products.detailKicker")}
      title={product?.name || t("products.detailTitle")}
      compact
    >
      <div className="mx-auto max-w-lg lg:max-w-2xl">
        <Link
          href={backHref}
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft size={15} />
          {t("products.backToList")}
        </Link>

        {error ? <p className={`mb-3 ${ui.error}`}>{error}</p> : null}

        {loading ? (
          <div className={`h-64 animate-pulse ${ui.card}`} />
        ) : !product ? (
          <p className={ui.empty}>{t("products.notFound")}</p>
        ) : (
          <div className="space-y-3">
            {/* Gallery */}
            {images.length ? (
              <div className={`overflow-hidden ${ui.card}`}>
                <div className="flex gap-2 overflow-x-auto p-3">
                  {images.map((img) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={img.id}
                      src={img.url}
                      alt=""
                      className="h-48 w-36 shrink-0 rounded-lg object-cover sm:h-56 sm:w-44"
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {/* Info */}
            <div className={`p-4 ${ui.card}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-slate-900">{product.name}</h2>
                  {[product.fabric, product.pieces, product.color].filter(Boolean).length ? (
                    <p className="mt-1 text-sm text-slate-500">
                      {[product.fabric, product.pieces, product.color].filter(Boolean).join(" · ")}
                    </p>
                  ) : null}
                </div>
                <ProductStatusBadge ready={ready} saved={hasSavedPrice} active={active} />
              </div>

              {product.description ? (
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{product.description}</p>
              ) : null}

              {product.labels?.length ? (
                <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                  {product.labels.map((row) => (
                    <div key={row.id} className="rounded-lg bg-slate-50 px-3 py-2">
                      <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                        {row.label}
                      </dt>
                      <dd className="mt-0.5 text-sm text-slate-800">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}

              <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-[10px] text-slate-400">{t("products.wholesale")}</p>
                  <p className="font-semibold text-slate-900">{formatPkr(product.wholesale_price)}</p>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-[10px] text-slate-400">{t("products.retail")}</p>
                  <p className="font-semibold text-slate-900">{formatPkr(product.retail_price)}</p>
                </div>
                {ready ? (
                  <div className="rounded-lg bg-slate-50 px-3 py-2 col-span-2 sm:col-span-1">
                    <p className="text-[10px] text-slate-400">{t("products.allowedRange")}</p>
                    <p className="font-semibold text-slate-900">
                      {formatPkr(product.min_price)} – {formatPkr(product.max_price)}
                    </p>
                  </div>
                ) : (
                  <div className="col-span-2 rounded-lg bg-amber-50 px-3 py-2 sm:col-span-1">
                    <p className="text-[11px] text-amber-800">{t("products.wholesaleMissing")}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Pricing */}
            <div className={`p-4 ${ui.card}`}>
              {previewHref ? (
                <Link
                  href={previewHref}
                  className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  <ExternalLink size={14} />
                  {t("products.viewAsCustomer")}
                </Link>
              ) : null}
              <p className="text-sm font-semibold text-slate-900">{t("products.yourPrice")}</p>
              <div className="mt-3 grid grid-cols-[1fr_auto] items-end gap-3">
                <input
                  type="number"
                  inputMode="numeric"
                  min={ready ? product.min_price : undefined}
                  max={ready ? product.max_price : undefined}
                  value={price}
                  disabled={!ready}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder={ready ? String(product.min_price) : "—"}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-base font-semibold text-slate-900 outline-none disabled:bg-slate-50 disabled:text-slate-400"
                />
                <div className="shrink-0 rounded-lg bg-emerald-50 px-3 py-2 text-right">
                  <p className="text-[10px] text-emerald-600">{t("products.margin")}</p>
                  <p className="text-sm font-bold text-emerald-700">{formatPkr(margin)}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <ActiveToggle
                  checked={active}
                  disabled={!ready}
                  label={t("products.active")}
                  onChange={setActive}
                />
                <button
                  type="button"
                  disabled={!ready || saving}
                  onClick={save}
                  className={`inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition disabled:opacity-50 sm:w-auto ${
                    saved ? "bg-emerald-600" : "bg-slate-900 hover:bg-slate-800"
                  }`}
                >
                  {saving ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : saved ? (
                    <span className="grid h-4 w-4 place-items-center rounded-full bg-white/20">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  ) : null}
                  {saving ? t("products.saving") : saved ? t("products.saved") : t("products.save")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ResellerShell>
  );
}
