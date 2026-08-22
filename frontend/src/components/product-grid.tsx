"use client";

import Link from "next/link";
import { useCatalog } from "@/components/catalog-provider";
import { ProductCard, productGridClass } from "@/components/product-card";
import { ProductGridSkeleton } from "@/components/skeletons";
import { useSiteSettings } from "@/components/site-settings";
import { HomeAtelierLine } from "@/components/home-trust";

export function ProductGrid() {
  const { products: items, loading } = useCatalog();
  const settings = useSiteSettings();

  if (!loading && !items.length) return null;

  return (
    <section id="shop" className="border-t border-sand bg-cream/70">
      <div className="mx-auto max-w-[1440px] px-4 py-14 sm:px-8 lg:py-20">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4 sm:mb-10">
          <div className="max-w-xl">
            <p className="store-kicker text-gold">{settings.products_kicker}</p>
            <h2 className="font-serif mt-2 text-4xl tracking-[-0.03em] text-mocha-deep">{settings.products_heading}</h2>
            {settings.products_copy ? (
              <p className="mt-3 text-[15px] leading-7 text-mocha/65">{settings.products_copy}</p>
            ) : null}
          </div>
          <Link
            href="/shop"
            prefetch
            className="text-[11px] tracking-[0.22em] text-mocha/70 uppercase underline decoration-gold underline-offset-8"
          >
            Shop all
          </Link>
        </div>

        {loading ? (
          <ProductGridSkeleton />
        ) : (
          <div className={productGridClass}>
            {items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
        <HomeAtelierLine />
      </div>
    </section>
  );
}
