"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import { API_URL, apiFetch } from "@/lib/api";
import { productHref } from "@/lib/product";
import type { Collection } from "@/components/admin-collections";
import type { Product } from "@/components/admin-products";
import { SearchBar } from "@/components/search-bar";
import { formatPkr } from "@/lib/money";
import { collectionHref } from "@/lib/collection";
import {
  clearRecentSearches,
  normalizeQuery,
  pushRecentSearch,
  readRecentSearches,
  searchCollections,
  searchProducts,
} from "@/lib/search";

type SearchPanelProps = {
  onClose?: () => void;
  initialQuery?: string;
};

export function SearchPanel({ onClose, initialQuery = "" }: SearchPanelProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(initialQuery);
  const [products, setProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    setRecent(readRecentSearches());
    const id = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, []);

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
      });
  }, []);

  const q = normalizeQuery(query);
  const productHits = useMemo(() => searchProducts(products, q).slice(0, 6), [products, q]);
  const collectionHits = useMemo(() => searchCollections(collections, q).slice(0, 4), [collections, q]);
  const totalHits = useMemo(() => searchProducts(products, q).length, [products, q]);

  function goToResults(value: string) {
    const next = normalizeQuery(value);
    if (!next) return;
    pushRecentSearch(next);
    setRecent(readRecentSearches());
    onClose?.();
    router.push(`/search?q=${encodeURIComponent(next)}`);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    goToResults(query);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-ivory">
      <SearchBar
        value={query}
        onChange={setQuery}
        onSubmit={onSubmit}
        onClose={() => onClose?.()}
        onClear={() => {
          setQuery("");
          inputRef.current?.focus();
        }}
        inputRef={inputRef}
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        {!q ? (
          <div className="space-y-6">
            {recent.length ? (
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[10px] font-semibold tracking-[0.18em] text-mocha/40 uppercase">Recent</p>
                  <button
                    type="button"
                    onClick={() => {
                      clearRecentSearches();
                      setRecent([]);
                    }}
                    className="text-[10px] tracking-[0.14em] text-mocha/40 uppercase"
                  >
                    Clear
                  </button>
                </div>
                <div className="space-y-1">
                  {recent.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => goToResults(item)}
                      className="flex w-full items-center gap-3 py-2.5 text-left text-sm text-mocha-deep"
                    >
                      <Clock size={15} strokeWidth={1.6} className="text-mocha/35" />
                      {item}
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            {collections.length ? (
              <section>
                <p className="mb-3 text-[10px] font-semibold tracking-[0.18em] text-mocha/40 uppercase">
                  Collections
                </p>
                <div className="flex flex-wrap gap-2">
                  {collections.map((item) => (
                    <a
                      key={item.id}
                      href={collectionHref(item)}
                      onClick={() => onClose?.()}
                      className="border border-mocha/15 px-3 py-2 text-[11px] tracking-[0.12em] text-mocha-deep uppercase"
                    >
                      {item.name}
                    </a>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        ) : (
          <div className="space-y-5">
            {collectionHits.length ? (
              <section>
                <p className="mb-2 text-[10px] font-semibold tracking-[0.18em] text-mocha/40 uppercase">
                  Collections
                </p>
                {collectionHits.map((item) => (
                  <a
                    key={item.id}
                    href={collectionHref(item)}
                    onClick={() => onClose?.()}
                    className="flex items-center justify-between py-2.5 text-sm text-mocha-deep"
                  >
                    <span>{item.name}</span>
                    <span className="text-[10px] tracking-[0.14em] text-mocha/40 uppercase">Collection</span>
                  </a>
                ))}
              </section>
            ) : null}

            {productHits.length ? (
              <section>
                <p className="mb-2 text-[10px] font-semibold tracking-[0.18em] text-mocha/40 uppercase">
                  Suggestions
                </p>
                <div className="space-y-1">
                  {productHits.map((product) => (
                    <a
                      key={product.id}
                      href={productHref(product)}
                      onClick={() => {
                        pushRecentSearch(q);
                        onClose?.();
                      }}
                      className="flex gap-3 py-2"
                    >
                      <span className="relative h-16 w-12 shrink-0 overflow-hidden bg-sand">
                        {product.images?.[0]?.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={product.images[0].url} alt="" className="h-full w-full object-cover" />
                        ) : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="font-serif block truncate text-[1.15rem] leading-tight text-mocha-deep">
                          {product.name}
                        </span>
                        <span className="mt-0.5 block text-[12px] text-mocha/45">
                          {[product.fabric, product.color].filter(Boolean).join(" · ")}
                        </span>
                        <span className="mt-1 block text-sm">{formatPkr(product.price)}</span>
                      </span>
                    </a>
                  ))}
                </div>
              </section>
            ) : (
              <p className="py-8 text-center text-sm text-mocha/50">No matches for “{q}”.</p>
            )}

            {totalHits > 0 ? (
              <button
                type="button"
                onClick={() => goToResults(q)}
                className="w-full bg-mocha-deep py-3 text-[11px] font-semibold tracking-[0.16em] text-ivory uppercase"
              >
                View all {totalHits} result{totalHits === 1 ? "" : "s"}
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
