"use client";

import { useEffect, useMemo, useState } from "react";
import { API_URL, apiFetch } from "@/lib/api";
import type { Collection } from "@/components/admin-collections";
import type { Product } from "@/components/admin-products";
import { ProductCard, productGridClass } from "@/components/product-card";
import { ProductGridSkeleton, Skeleton } from "@/components/skeletons";
import { useSiteSettings } from "@/components/site-settings";

export function ShopCatalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [active, setActive] = useState("all");
  const [loading, setLoading] = useState(true);
  const settings = useSiteSettings();

  useEffect(() => {
    Promise.all([
      apiFetch(`${API_URL}/api/products`).then((res) => res.json()),
      apiFetch(`${API_URL}/api/collections`).then((res) => res.json()),
    ])
      .then(([productData, collectionData]) => {
        setProducts(productData.items || []);
        setCollections(collectionData.items || []);
      })
      .catch(() => {
        setProducts([]);
        setCollections([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const items = useMemo(() => {
    if (active === "all") return products;
    return products.filter((product) => product.collection_id === active);
  }, [products, active]);

  return (
    <section className="mx-auto max-w-[1440px] px-4 py-10 sm:px-8 sm:py-14">
      <p className="text-[10px] tracking-[0.18em] text-mocha/40 uppercase">
        <a href="/" className="hover:text-mocha-deep">
          Home
        </a>
        <span className="mx-2">/</span>
        <span className="text-mocha-deep">Shop</span>
      </p>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.28em] text-sale uppercase">{settings.shop_kicker}</p>
          <h1 className="font-serif mt-2 text-4xl tracking-[-0.03em] text-mocha-deep sm:text-5xl">{settings.shop_heading}</h1>
        </div>
        <p className="text-[12px] tracking-[0.16em] text-mocha/45 uppercase">
          {loading ? <Skeleton className="inline-block h-3 w-16 align-middle" /> : `${items.length} piece${items.length === 1 ? "" : "s"}`}
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
        <div className="mt-8">
          <ProductGridSkeleton />
        </div>
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
