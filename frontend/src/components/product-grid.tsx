"use client";

import { useEffect, useState } from "react";
import { API_URL, apiFetch } from "@/lib/api";
import type { Product } from "@/components/admin-products";
import { ProductCard, productGridClass } from "@/components/product-card";
import { useSiteSettings } from "@/components/site-settings";

export function ProductGrid() {
  const [items, setItems] = useState<Product[]>([]);
  const settings = useSiteSettings();

  useEffect(() => {
    apiFetch(`${API_URL}/api/products`)
      .then((res) => res.json())
      .then((data) => setItems(data.items || []))
      .catch(() => setItems([]));
  }, []);

  if (!items.length) return null;

  return (
    <section id="shop" className="bg-cream/70">
      <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-8 sm:py-10">
        <div className="mb-5 max-w-xl sm:mb-6">
          <p className="text-[11px] font-semibold tracking-[0.28em] text-sale uppercase">{settings.products_kicker}</p>
          <h2 className="font-serif mt-2 text-4xl tracking-[-0.03em] text-mocha-deep">{settings.products_heading}</h2>
          {settings.products_copy ? (
            <p className="mt-3 text-[15px] leading-7 text-mocha/65">{settings.products_copy}</p>
          ) : null}
        </div>

        <div className={productGridClass}>
          {items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
