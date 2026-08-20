"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { API_URL, apiFetch } from "@/lib/api";
import type { Product } from "@/components/admin-products";
import { ProductCard, productGridClass } from "@/components/product-card";
import { SearchBar } from "@/components/search-bar";
import { SearchPanel } from "@/components/search-panel";
import { pushRecentSearch, searchProducts } from "@/lib/search";

export function SearchResults() {
  const router = useRouter();
  const params = useSearchParams();
  const q = params.get("q") || "";
  const [value, setValue] = useState(q);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setValue(q);
  }, [q]);

  useEffect(() => {
    apiFetch(`${API_URL}/api/products`)
      .then((res) => res.json())
      .then((data) => setProducts(data.items || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const items = useMemo(() => searchProducts(products, q), [products, q]);

  function closeSearch() {
    if (window.history.length > 1) router.back();
    else router.push("/");
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next = value.trim();
    if (!next) return;
    pushRecentSearch(next);
    router.push(`/search?q=${encodeURIComponent(next)}`);
  }

  if (!q) {
    return <SearchPanel onClose={closeSearch} />;
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <SearchBar
        value={value}
        onChange={setValue}
        onSubmit={onSubmit}
        onClose={closeSearch}
        onClear={() => setValue("")}
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-4 lg:mx-auto lg:w-full lg:max-w-[1440px] lg:px-8">
        <p className="mb-4 text-[12px] text-mocha/45">
          {loading ? "Searching…" : `${items.length} result${items.length === 1 ? "" : "s"}`}
        </p>
        {loading ? (
          <p className="py-16 text-center text-sm tracking-[0.16em] text-mocha/45 uppercase">Searching…</p>
        ) : items.length ? (
          <div className={productGridClass}>
            {items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <p className="py-16 text-center text-sm text-mocha/50">No suits found for “{q}”.</p>
        )}
      </div>
    </section>
  );
}
