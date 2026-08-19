"use client";

import { formatPkr } from "@/lib/money";
import { productHref } from "@/lib/product";
import { productInActiveSale, saleOffLabel, useActiveSale } from "@/lib/active-sale";
import type { Product } from "@/components/admin-products";

export const productGridClass =
  "grid grid-cols-2 gap-x-3 gap-y-8 lg:grid-cols-6 lg:gap-x-4 lg:gap-y-10";

function coverOf(product: Product) {
  return product.images?.[0]?.url || "";
}

export function ProductCard({ product }: { product: Product }) {
  const sale = useActiveSale();
  const offLabel = productInActiveSale(product, sale) ? saleOffLabel(sale) : "";
  const tag = String(product.badge || "").trim();
  const spec = [product.fabric, product.pieces].filter(Boolean).join(" · ");
  const soldOut = (product.stock ?? 0) <= 0;

  return (
    <article className="group">
      <a href={productHref(product)} className="block">
        <div className="relative aspect-[3/4] overflow-hidden bg-sand">
          {coverOf(product) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverOf(product)}
              alt={product.name}
              className="h-full w-full object-cover transition duration-[900ms] ease-out group-hover:scale-[1.04]"
            />
          ) : null}
          {offLabel || tag ? (
            <div className="absolute left-3 top-3 flex flex-col items-start gap-1">
              {offLabel ? (
                <span className="bg-sale px-2.5 py-1 text-[9px] tracking-[0.18em] text-white uppercase">
                  {offLabel}
                </span>
              ) : null}
              {tag ? (
                <span className="border border-ivory/40 bg-ivory/90 px-2.5 py-1 text-[9px] tracking-[0.18em] text-mocha-deep uppercase backdrop-blur-sm">
                  {tag}
                </span>
              ) : null}
            </div>
          ) : null}
          {soldOut ? (
            <span className="absolute right-3 top-3 bg-mocha-deep/85 px-2.5 py-1 text-[9px] tracking-[0.18em] text-ivory uppercase">
              Sold out
            </span>
          ) : null}
        </div>
        <div className="mt-3">
          <h3 className="font-serif text-[1.35rem] leading-snug text-mocha-deep">{product.name}</h3>
          {spec ? <p className="mt-1 text-[12px] tracking-[0.04em] text-mocha/50">{spec}</p> : null}
          <p className="mt-2 flex flex-wrap items-baseline gap-2 text-sm">
            <span className="text-mocha-deep">{formatPkr(product.price)}</span>
            {product.compare_at_price > product.price ? (
              <span className="text-[12px] text-mocha/35 line-through">{formatPkr(product.compare_at_price)}</span>
            ) : null}
          </p>
        </div>
      </a>
    </article>
  );
}
