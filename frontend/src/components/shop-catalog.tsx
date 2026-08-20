"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ProductCard, productGridClass } from "@/components/product-card";
import { useCatalog } from "@/components/catalog-provider";
import { useSiteSettings } from "@/components/site-settings";

export function ShopCatalog() {
  const { products, collections, ready } = useCatalog();
  const [active, setActive] = useState("all");
  const settings = useSiteSettings();
  const loading = !ready && !products.length;

  const items = useMemo(() => {
    if (active === "all") return products;
    return products.filter((product) => product.collection_id === active);
  }, [products, active]);

  return (
    <section className="mx-auto max-w-[1440px] px-4 py-10 sm:px-8 sm:py-14">
      <p className="text-[10px] tracking-[0.18em] text-mocha/40 uppercase">
        <Link href="/" className="hover:text-mocha-deep">
          Home
        </Link>
        <span className="mx-2">/</span>
        <span className="text-mocha-deep">Shop</span>
      </p>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.28em] text-sale uppercase">{settings.shop_kicker}</p>
          <h1 className="font-serif mt-2 text-4xl tracking-[-0.03em] text-mocha-deep sm:text-5xl">{settings.shop_heading}</h1>
        </div>
        <p className="text-[12px] tracking-[0.16em] text-mocha/45 uppercase">
          {loading ? "Loading" : `${items.length} piece${items.length === 1 ? "" : "s"}`}
        </p>
      </div>

      {collections.length ? (
        <div className="hide-scrollbar mt-8 flex gap-2 overflow-x-auto overscroll-x-contain">
          <FilterChip label="All" active={active === "all"} onClick={() => setActive("all")} />
          {collections.map((collection) => (
            <FilterChip
              key={collection.id}
              label={collection.name}
              active={active === collection.id}
              onClick={() => setActive(collection.id)}
            />
          ))}
        </div>
      ) : null}

      {loading ? (
        <p className="mt-16 text-center text-sm tracking-[0.16em] text-mocha/45 uppercase">Loading suits…</p>
      ) : items.length ? (
        <div className={`mt-8 ${productGridClass}`}>
          {items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <p className="mt-16 text-center text-sm text-mocha/50">No suits in this collection yet.</p>
      )}
    </section>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 px-3.5 py-2 text-[10px] font-semibold tracking-[0.16em] uppercase transition-colors ${
        active ? "bg-mocha-deep text-ivory" : "border border-mocha/15 text-mocha-deep hover:border-mocha-deep"
      }`}
    >
      {label}
    </button>
  );
}
