"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { API_URL, apiFetch } from "@/lib/api";
import { formatPkr } from "@/lib/money";
import { collectionHref } from "@/lib/collection";
import { productHref } from "@/lib/product";
import type { Collection } from "@/components/admin-collections";
import type { Product, ProductImage, ProductLabel } from "@/components/admin-products";
import { ProductBuyActions } from "@/components/product-buy-actions";
import { ProductCard, productGridClass } from "@/components/product-card";
import { SaleTimerProduct } from "@/components/sale-timer";
import { productInActiveSale, saleOffLabel, useActiveSale } from "@/lib/active-sale";
import { SiteFooter } from "@/components/site-footer";

export default function ProductPage() {
  const params = useParams<{ slug: string }>();
  const sale = useActiveSale();
  const [item, setItem] = useState<Product | null>(null);
  const [collection, setCollection] = useState<Collection | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [missing, setMissing] = useState(false);
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);

  useEffect(() => {
    if (!params.slug) return;
    apiFetch(`${API_URL}/api/products/${params.slug}`)
      .then((res) => {
        if (!res.ok) throw new Error("missing");
        return res.json();
      })
      .then(async (data) => {
        const product = data.item as Product;
        setItem(product);
        setActive(0);
        setHovered(null);
        const [collectionsRes, relatedRes] = await Promise.all([
          apiFetch(`${API_URL}/api/collections`),
          product.collection_id
            ? apiFetch(`${API_URL}/api/products?collection=${product.collection_id}`)
            : Promise.resolve(null),
        ]);
        const collectionsData = await collectionsRes.json().catch(() => ({ items: [] }));
        const match = (collectionsData.items || []).find((row: Collection) => row.id === product.collection_id);
        setCollection(match || null);
        if (relatedRes) {
          const relatedData = await relatedRes.json().catch(() => ({ items: [] }));
          setRelated((relatedData.items || []).filter((row: Product) => row.id !== product.id).slice(0, 6));
        }
      })
      .catch(() => setMissing(true));
  }, [params.slug]);

  const images = item?.images || [];
  const off = useMemo(() => {
    if (!item?.compare_at_price || item.compare_at_price <= item.price) return 0;
    return Math.round(((item.compare_at_price - item.price) / item.compare_at_price) * 100);
  }, [item]);

  return (
    <>
      <main className="bg-ivory pb-[calc(7.25rem+env(safe-area-inset-bottom))] lg:pb-0">
        {missing ? (
          <section className="mx-auto max-w-3xl px-5 py-24 text-center">
            <h1 className="font-serif text-4xl">Product not found</h1>
            <a href="/shop" className="mt-6 inline-block text-sm uppercase tracking-[0.18em] underline">
              Back to shop
            </a>
          </section>
        ) : !item ? (
          <section className="px-5 py-24 text-center text-sm tracking-[0.16em] text-mocha/45 uppercase">
            Loading…
          </section>
        ) : (
          <>
            <section className="mx-auto grid max-w-[1440px] gap-5 px-4 py-4 sm:px-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)] lg:gap-12 lg:py-10">
              <AmazonGallery
                name={item.name}
                badge={item.badge}
                saleBadge={productInActiveSale(item, sale) ? saleOffLabel(sale) : ""}
                images={images}
                videoUrl={item.video_url || ""}
                active={active}
                hovered={hovered}
                onActive={setActive}
                onHover={setHovered}
              />

              <div className="px-1 lg:pt-1">
                <p className="text-[10px] tracking-[0.18em] text-mocha/40 uppercase">
                  <a href="/" className="hover:text-mocha-deep">
                    Home
                  </a>
                  <span className="mx-2">/</span>
                  {collection ? (
                    <a href={collectionHref(collection)} className="hover:text-mocha-deep">
                      {collection.name}
                    </a>
                  ) : (
                      <a href="/shop" className="hover:text-mocha-deep">
                      Shop
                    </a>
                  )}
                  <span className="mx-2">/</span>
                  <span className="text-mocha-deep">{item.name}</span>
                </p>

                {item.is_on_sale ? (
                  <p className="mt-3 text-[10px] font-semibold tracking-[0.24em] text-sale uppercase lg:mt-5 lg:text-[11px] lg:tracking-[0.28em]">On sale</p>
                ) : (
                  <p className="mt-3 text-[10px] font-semibold tracking-[0.24em] text-mocha/40 uppercase lg:mt-5 lg:text-[11px] lg:tracking-[0.28em]">
                    {collection?.name || "Mocha Wear"}
                  </p>
                )}

                <h1 className="font-serif mt-1.5 text-[1.7rem] leading-[1.05] tracking-[-0.03em] text-mocha-deep sm:text-5xl lg:mt-2">
                  {item.name}
                </h1>

                <div className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-1 lg:mt-6">
                  <p className="font-serif text-[1.7rem] leading-none text-sale lg:text-[2.15rem]">{formatPkr(item.price)}</p>
                  {item.compare_at_price > item.price ? (
                    <p className="pb-1 text-[15px] text-mocha-deep/35 line-through">{formatPkr(item.compare_at_price)}</p>
                  ) : null}
                  {off ? (
                    <span className="mb-0.5 bg-sale px-2 py-1 text-[9px] font-semibold tracking-[0.16em] text-white uppercase">
                      Save {off}%
                    </span>
                  ) : null}
                </div>

                <SaleTimerProduct />

                {item.description ? (
                  <p className="mt-4 max-w-md text-[14px] leading-7 text-mocha-deep/75 lg:mt-6 lg:text-[15px] lg:leading-8">{item.description}</p>
                ) : null}

                <ProductBuyActions product={item} />

                {(item.fabric || item.pieces || item.color || item.code || item.sizes?.length || (item.labels || []).length) ? (
                  <dl className="mt-10 divide-y divide-mocha/10 border-y border-mocha/10">
                    {item.fabric ? <DetailRow label="Fabric" value={item.fabric} /> : null}
                    {item.pieces ? <DetailRow label="Set" value={item.pieces} /> : null}
                    {item.color ? <DetailRow label="Color" value={item.color} /> : null}
                    {item.sizes?.length ? <DetailRow label="Sizes" value={item.sizes.join(" · ")} /> : null}
                    {item.code ? <DetailRow label="Code" value={item.code} /> : null}
                    {(item.labels || []).map((row: ProductLabel) =>
                      row.label || row.value ? (
                        <DetailRow key={row.id} label={row.label || "Detail"} value={row.value} />
                      ) : null,
                    )}
                  </dl>
                ) : null}

                <a
                  href={collection ? collectionHref(collection) : "/shop"}
                  className="mt-8 inline-block text-[11px] tracking-[0.18em] text-mocha/50 uppercase underline decoration-mocha/20 underline-offset-8 hover:text-sale hover:decoration-sale"
                >
                  Continue shopping
                </a>
              </div>
            </section>

            {related.length ? (
              <section className="border-t border-sand px-5 py-16 sm:px-8">
                <div className="mx-auto max-w-[1440px]">
                  <p className="text-[11px] font-semibold tracking-[0.28em] text-sale uppercase">More from this collection</p>
                  <h2 className="font-serif mt-3 text-3xl text-mocha-deep sm:text-4xl">You may also like</h2>
                  <div className={`mt-8 ${productGridClass}`}>
                    {related.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                </div>
              </section>
            ) : null}
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

function AmazonGallery({
  name,
  badge,
  saleBadge,
  images,
  videoUrl,
  active,
  hovered,
  onActive,
  onHover,
}: {
  name: string;
  badge?: string;
  saleBadge?: string;
  images: ProductImage[];
  videoUrl?: string;
  active: number;
  hovered: number | null;
  onActive: (index: number) => void;
  onHover: (index: number | null) => void;
}) {
  const media = [
    ...(videoUrl ? [{ kind: "video" as const, url: videoUrl }] : []),
    ...images.map((image) => ({ kind: "image" as const, url: image.url, id: image.id })),
  ];
  const selected = hovered ?? active;
  const shown = media[selected] || media[0];

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-3">
      {media.length > 1 ? (
        <div className="order-2 flex gap-2 overflow-x-auto pb-1 lg:order-1 lg:max-h-[560px] lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden lg:pb-0">
          {media.map((item, index) => (
            <button
              key={item.kind === "video" ? "video" : item.id || item.url}
              type="button"
              onClick={() => onActive(index)}
              onMouseEnter={() => onHover(index)}
              onMouseLeave={() => onHover(null)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden border bg-white lg:h-[68px] lg:w-[68px] ${
                selected === index ? "border-sale" : "border-mocha/15 hover:border-mocha/40"
              }`}
              aria-label={item.kind === "video" ? "Play video" : `View image ${index + 1}`}
            >
              {item.kind === "video" ? (
                <>
                  <video src={item.url} className="h-full w-full object-cover" muted playsInline />
                  <span className="absolute inset-0 grid place-items-center bg-mocha-deep/35 text-[8px] font-semibold tracking-[0.14em] text-white uppercase">
                    Video
                  </span>
                </>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.url} alt="" className="h-full w-full object-cover" />
              )}
            </button>
          ))}
        </div>
      ) : null}

      <div className="relative order-1 min-h-[300px] flex-1 bg-white lg:order-2 lg:min-h-[560px]">
        {shown?.kind === "video" ? (
          <video
            src={shown.url}
            className="mx-auto h-[300px] w-full object-contain sm:h-[460px] lg:h-[560px]"
            controls
            playsInline
          />
        ) : shown?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shown.url}
            alt={name}
            className="mx-auto h-[300px] w-full object-contain sm:h-[460px] lg:h-[560px]"
          />
        ) : (
          <div className="h-[300px] bg-sand lg:h-[560px]" />
        )}
        {saleBadge || badge ? (
          <div className="absolute left-3 top-3 flex flex-col items-start gap-1">
            {saleBadge ? (
              <span className="bg-sale px-2.5 py-1 text-[9px] tracking-[0.18em] text-white uppercase shadow-sm">
                {saleBadge}
              </span>
            ) : null}
            {badge ? (
              <span className="bg-ivory px-2.5 py-1 text-[9px] tracking-[0.18em] text-mocha-deep uppercase shadow-sm">
                {badge}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[88px_minmax(0,1fr)] items-baseline gap-4 py-3.5 sm:grid-cols-[110px_minmax(0,1fr)]">
      <dt className="text-[10px] font-semibold tracking-[0.18em] text-mocha/40 uppercase">{label}</dt>
      <dd className="text-sm text-mocha-deep">{value}</dd>
    </div>
  );
}
