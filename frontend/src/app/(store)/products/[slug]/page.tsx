"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiJson, peekApiCache, primeApiCache } from "@/lib/api-cache";
import { formatPkr } from "@/lib/money";
import { collectionHref } from "@/lib/collection";
import type { Collection } from "@/components/admin-collections";
import type { Product, ProductImage, ProductLabel } from "@/components/admin-products";
import { ProductBuyActions } from "@/components/product-buy-actions";
import { ProductCard, productGridClass } from "@/components/product-card";
import { SaleTimerProduct } from "@/components/sale-timer";
import { StoreImage } from "@/components/store-image";
import { productInActiveSale, saleOffLabel, useActiveSale } from "@/lib/active-sale";
import { useCatalog, useCatalogProduct } from "@/components/catalog-provider";
import { SiteFooter } from "@/components/site-footer";
import { ProductPageSkeleton } from "@/components/skeletons";

function readProductCache(slug: string) {
  return peekApiCache<{ item: Product }>(`/api/products/${slug}`)?.item || null;
}

export default function ProductPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug || "";
  const sale = useActiveSale();
  const { products, collections } = useCatalog();
  const {
    product: catalogProduct,
    collection: catalogCollection,
    related: catalogRelated,
    catalogLoading,
  } = useCatalogProduct(slug);

  // Always null on first paint so SSR HTML matches client hydration.
  const [item, setItem] = useState<Product | null>(null);
  const [collection, setCollection] = useState<Collection | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [missing, setMissing] = useState(false);
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);

  useLayoutEffect(() => {
    setActive(0);
    setHovered(null);

    const cached = catalogProduct || (slug ? readProductCache(slug) : null);
    if (cached) {
      setItem(cached);
      setMissing(false);
      const col =
        catalogCollection ||
        (cached.collection_id ? collections.find((row) => row.id === cached.collection_id) || null : null);
      setCollection(col);
      setRelated(
        catalogRelated.length
          ? catalogRelated
          : products
              .filter((row) => row.collection_id === cached.collection_id && row.id !== cached.id)
              .slice(0, 6),
      );
      return;
    }

    if (!catalogLoading) setItem(null);
  }, [slug, catalogProduct, catalogCollection, catalogRelated, catalogLoading, products, collections]);

  useEffect(() => {
    if (!catalogProduct) return;
    setItem(catalogProduct);
    setCollection(catalogCollection);
    setRelated(catalogRelated);
    setMissing(false);
    primeApiCache(`/api/products/${slug}`, { item: catalogProduct }, { memoryOnly: true });
  }, [catalogProduct, catalogCollection, catalogRelated, slug]);

  useEffect(() => {
    if (!slug) return;
    if (catalogProduct) return;

    const cached = readProductCache(slug);
    if (cached) {
      setItem(cached);
      setMissing(false);
      if (cached.collection_id) {
        setCollection((prev) => prev || collections.find((row) => row.id === cached.collection_id) || null);
        setRelated((prev) =>
          prev.length
            ? prev
            : products.filter((row) => row.collection_id === cached.collection_id && row.id !== cached.id).slice(0, 6),
        );
      }
      return;
    }

    if (catalogLoading) return;

    let live = true;
    (async () => {
      try {
        const data = await apiJson<{ item: Product }>(`/api/products/${slug}`);
        if (!live) return;
        setItem(data.item);
        setActive(0);
        setHovered(null);
        setMissing(false);
        primeApiCache(`/api/products/${slug}`, data, { memoryOnly: true });

        const col =
          collections.find((row) => row.id === data.item.collection_id) ||
          (
            await apiJson<{ items?: Collection[] }>("/api/collections").catch(() => ({ items: [] as Collection[] }))
          ).items?.find((row) => row.id === data.item.collection_id) ||
          null;
        if (!live) return;
        setCollection(col || null);

        const fromCatalog = products
          .filter((row) => row.collection_id === data.item.collection_id && row.id !== data.item.id)
          .slice(0, 6);
        if (fromCatalog.length) {
          setRelated(fromCatalog);
          return;
        }

        if (data.item.collection_id) {
          const relatedData = await apiJson<{ items?: Product[] }>(
            `/api/products?collection=${data.item.collection_id}`,
          );
          if (!live) return;
          setRelated((relatedData.items || []).filter((row) => row.id !== data.item.id).slice(0, 6));
        }
      } catch {
        if (live) setMissing(true);
      }
    })();

    return () => {
      live = false;
    };
  }, [slug, catalogProduct, catalogLoading, products, collections]);

  const images = item?.images || [];
  const off = useMemo(() => {
    if (!item?.compare_at_price || item.compare_at_price <= item.price) return 0;
    return Math.round(((item.compare_at_price - item.price) / item.compare_at_price) * 100);
  }, [item]);

  return (
    <>
      <main className="bg-ivory pb-[calc(9.5rem+env(safe-area-inset-bottom))] lg:pb-0">
        {missing ? (
          <section className="mx-auto max-w-3xl px-5 py-24 text-center">
            <h1 className="font-serif text-4xl">Product not found</h1>
            <Link href="/shop" prefetch className="mt-6 inline-block text-sm uppercase tracking-[0.18em] underline">
              Back to shop
            </Link>
          </section>
        ) : !item ? (
          <ProductPageSkeleton />
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
                  <Link href="/" prefetch className="hover:text-mocha-deep">
                    Home
                  </Link>
                  <span className="mx-2">/</span>
                  {collection ? (
                    <Link href={collectionHref(collection)} prefetch className="hover:text-mocha-deep">
                      {collection.name}
                    </Link>
                  ) : (
                      <Link href="/shop" prefetch className="hover:text-mocha-deep">
                      Shop
                    </Link>
                  )}
                  <span className="mx-2">/</span>
                  <span className="text-mocha-deep">{item.name}</span>
                </p>

                {item.is_on_sale ? (
                  <p className="store-kicker mt-3 text-gold lg:mt-5">On sale</p>
                ) : (
                  <p className="store-kicker mt-3 text-mocha/40 lg:mt-5">
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
                    <span className="mb-0.5 bg-sale px-2 py-1 text-[10px] font-semibold tracking-[0.16em] text-white uppercase">
                      Save {off}%
                    </span>
                  ) : null}
                </div>

                <SaleTimerProduct />

                {item.description ? (
                  <p className="mt-4 max-w-md text-[14px] leading-7 text-mocha-deep/75 lg:mt-6 lg:text-[15px] lg:leading-8">{item.description}</p>
                ) : null}

                <ProductBuyActions product={item} />

                    {(item.fabric || item.pieces || item.color || item.code || (item.labels || []).length) ? (
                  <dl className="mt-10 divide-y divide-mocha/10 border-y border-mocha/10">
                    {item.fabric ? <DetailRow label="Fabric" value={item.fabric} /> : null}
                    {item.pieces ? <DetailRow label="Set" value={item.pieces} /> : null}
                    {item.color ? <DetailRow label="Color" value={item.color} /> : null}
                    {item.code ? <DetailRow label="Code" value={item.code} /> : null}
                    {(item.labels || []).map((row: ProductLabel) =>
                      row.label || row.value ? (
                        <DetailRow key={row.id} label={row.label || "Detail"} value={row.value} />
                      ) : null,
                    )}
                  </dl>
                ) : null}

                <Link
                  href={collection ? collectionHref(collection) : "/shop"}
                  prefetch
                  className="mt-8 inline-block text-[11px] tracking-[0.18em] text-mocha/50 uppercase underline decoration-mocha/20 underline-offset-8 hover:text-sale hover:decoration-sale"
                >
                  Continue shopping
                </Link>
              </div>
            </section>

            {related.length ? (
              <section className="border-t border-sand px-5 py-16 sm:px-8">
                <div className="mx-auto max-w-[1440px]">
                  <p className="store-kicker text-gold">More from this collection</p>
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
      <SiteFooter showOnMobile />
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
              className={`relative h-16 w-16 shrink-0 overflow-hidden border bg-sand lg:h-[68px] lg:w-[68px] ${
                selected === index ? "border-mocha-deep" : "border-mocha/15 hover:border-mocha/40"
              }`}
              aria-label={item.kind === "video" ? "Play video" : `View image ${index + 1}`}
            >
              {item.kind === "video" ? (
                <>
                  <video src={item.url} className="h-full w-full object-cover" muted playsInline />
                  <span className="absolute inset-0 grid place-items-center bg-mocha-deep/35 text-[10px] font-semibold tracking-[0.14em] text-white uppercase">
                    Video
                  </span>
                </>
              ) : (
                <StoreImage src={item.url} alt="" className="object-cover" sizes="68px" cloudWidth={136} cloudHeight={136} />
              )}
            </button>
          ))}
        </div>
      ) : null}

      <div className="relative order-1 min-h-[300px] flex-1 bg-sand lg:order-2 lg:min-h-[560px]">
        {shown?.kind === "video" ? (
          <video
            src={shown.url}
            className="mx-auto h-[300px] w-full object-contain sm:h-[460px] lg:h-[560px]"
            controls
            playsInline
          />
        ) : shown?.url ? (
          <StoreImage
            src={shown.url}
            alt={name}
            fill={false}
            width={900}
            height={1120}
            cloudWidth={900}
            className="mx-auto h-[300px] w-full object-contain sm:h-[460px] lg:h-[560px]"
            sizes="(max-width: 1024px) 100vw, 55vw"
          />
        ) : (
          <div className="h-[300px] bg-sand lg:h-[560px]" />
        )}
        {saleBadge || badge ? (
          <div className="absolute left-3 top-3 flex flex-col items-start gap-1">
            {saleBadge ? (
              <span className="bg-sale px-2.5 py-1 text-[10px] tracking-[0.18em] text-white uppercase">
                {saleBadge}
              </span>
            ) : null}
            {badge ? (
              <span className="bg-ivory px-2.5 py-1 text-[10px] tracking-[0.18em] text-mocha-deep uppercase">
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
