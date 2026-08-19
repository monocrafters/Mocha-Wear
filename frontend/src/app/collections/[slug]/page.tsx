"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { API_URL, apiFetch } from "@/lib/api";
import type { Collection } from "@/components/admin-collections";
import type { Product } from "@/components/admin-products";
import { ProductCard, productGridClass } from "@/components/product-card";
import { CollectionMedia } from "@/components/collection-media";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { collectionBannerSrc } from "@/lib/collection";

export default function CollectionPage() {
  const params = useParams<{ slug: string }>();
  const [item, setItem] = useState<Collection | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!params.slug) return;
    apiFetch(`${API_URL}/api/collections/${params.slug}`)
      .then((res) => {
        if (!res.ok) throw new Error("missing");
        return res.json();
      })
      .then((data) => {
        setItem(data.item);
        return apiFetch(`${API_URL}/api/products?collection=${params.slug}`)
          .then((res) => res.json())
          .then((productData) => setProducts(productData.items || []))
          .catch(() => setProducts([]));
      })
      .catch(() => setMissing(true));
  }, [params.slug]);

  const kicker = item?.is_on_sale
    ? item.sale_label || item.subtitle || "On sale"
    : item?.subtitle;
  const banner = item ? collectionBannerSrc(item) : { mobile: "", desktop: "" };

  return (
    <>
      <SiteHeader />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-ivory">
        {missing ? (
          <section className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
            <h1 className="font-serif text-3xl">Collection not found</h1>
            <a href="/collections" className="mt-6 text-[11px] tracking-[0.18em] uppercase underline">
              Back to collections
            </a>
          </section>
        ) : !item ? (
          <section className="flex flex-1 items-center justify-center px-5 text-sm tracking-[0.16em] text-mocha/45 uppercase">
            Loading…
          </section>
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
                <p className="text-[10px] font-semibold tracking-[0.22em] text-sale uppercase">{kicker}</p>
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
                  <a
                    href="/shop"
                    className="mt-6 inline-block bg-mocha-deep px-5 py-3 text-[11px] font-semibold tracking-[0.18em] text-ivory uppercase"
                  >
                    Shop the sale
                  </a>
                </div>
              )}
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
