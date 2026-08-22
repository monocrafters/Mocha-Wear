"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiJson, peekApiCache, primeApiCache } from "@/lib/api-cache";
import type { Collection } from "@/components/admin-collections";
import type { Product } from "@/components/admin-products";
import { ProductCard, productGridClass } from "@/components/product-card";
import { CollectionMedia } from "@/components/collection-media";
import { useCatalogCollection } from "@/components/catalog-provider";
import { SiteFooter } from "@/components/site-footer";
import { collectionBannerSrc } from "@/lib/collection";
import { CollectionPageSkeleton } from "@/components/skeletons";

function readCollectionCache(slug: string) {
  return peekApiCache<{ item: Collection }>(`/api/collections/${slug}`)?.item || null;
}

function readCollectionProductsCache(slug: string) {
  return peekApiCache<{ items?: Product[] }>(`/api/products?collection=${slug}`)?.items || null;
}

export default function CollectionPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug || "";
  const {
    collection: catalogCollection,
    products: catalogProducts,
    catalogLoading,
  } = useCatalogCollection(slug);

  // Always empty on first paint so SSR matches hydration.
  const [item, setItem] = useState<Collection | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!catalogCollection) return;
    setItem(catalogCollection);
    setProducts(catalogProducts);
    setMissing(false);
    primeApiCache(`/api/collections/${slug}`, { item: catalogCollection }, { memoryOnly: true });
    primeApiCache(`/api/products?collection=${slug}`, { items: catalogProducts }, { memoryOnly: true });
  }, [catalogCollection, catalogProducts, slug]);

  useEffect(() => {
    if (!slug || catalogCollection || catalogLoading) return;

    const cachedItem = readCollectionCache(slug);
    const cachedProducts = readCollectionProductsCache(slug);
    if (cachedItem) {
      setItem(cachedItem);
      setProducts(cachedProducts || []);
      setMissing(false);
      return;
    }

    let live = true;
    (async () => {
      try {
        const [collectionData, productData] = await Promise.all([
          apiJson<{ item: Collection }>(`/api/collections/${slug}`),
          apiJson<{ items?: Product[] }>(`/api/products?collection=${slug}`),
        ]);
        if (!live) return;
        setItem(collectionData.item);
        setProducts(productData.items || []);
        setMissing(false);
        primeApiCache(`/api/collections/${slug}`, collectionData, { memoryOnly: true });
        primeApiCache(`/api/products?collection=${slug}`, productData, { memoryOnly: true });
      } catch {
        if (live) setMissing(true);
      }
    })();

    return () => {
      live = false;
    };
  }, [slug, catalogCollection, catalogLoading]);

  const kicker = item?.is_on_sale
    ? item.sale_label || item.subtitle || "On sale"
    : item?.subtitle;
  const banner = item ? collectionBannerSrc(item) : { mobile: "", desktop: "" };

  return (
    <>
      <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-ivory">
        {missing ? (
          <section className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
            <h1 className="font-serif text-3xl">Collection not found</h1>
            <Link href="/collections" prefetch className="mt-6 text-[11px] tracking-[0.18em] uppercase underline">
              Back to collections
            </Link>
          </section>
        ) : !item ? (
          <CollectionPageSkeleton />
        ) : (
          <section className="flex min-h-0 flex-1 flex-col">
            <div className="relative aspect-[2/1] w-full shrink-0 overflow-hidden bg-sand lg:aspect-[3/1]">
              {banner.mobile || banner.desktop ? (
                <CollectionMedia
                  mobile={banner.mobile}
                  desktop={banner.desktop}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : null}
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-ivory to-transparent" />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(4.75rem+env(safe-area-inset-bottom))] pt-1 lg:mx-auto lg:w-full lg:max-w-[1440px] lg:px-8 lg:pb-10">
              {kicker ? (
                <p className="store-kicker text-gold">{kicker}</p>
              ) : null}
              <div className="mt-1 flex items-end justify-between gap-3">
                <h1 className="font-serif text-[2rem] leading-none tracking-[-0.03em] text-mocha-deep sm:text-5xl">
                  {item.name}
                </h1>
                <p className="shrink-0 pb-0.5 text-[11px] tracking-[0.14em] text-mocha/45 uppercase">
                  {products.length} piece{products.length === 1 ? "" : "s"}
                </p>
              </div>
              {item.description ? (
                <p className="mt-3 max-w-2xl text-[13px] leading-6 text-mocha/65 lg:text-[15px] lg:leading-7">
                  {item.description}
                </p>
              ) : null}

              {products.length ? (
                <div className={`mt-5 ${productGridClass}`}>
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              ) : (
                <div className="mt-10 text-center">
                  <p className="text-sm text-mocha/50">No pieces in this collection yet.</p>
                  <Link
                    href="/shop"
                    prefetch
                    className="mt-6 inline-block bg-mocha-deep px-5 py-3 text-[11px] font-semibold tracking-[0.18em] text-ivory uppercase"
                  >
                    Shop the sale
                  </Link>
                </div>
              )}
            </div>
          </section>
        )}
      </main>
      <SiteFooter showOnMobile />
    </>
  );
}
