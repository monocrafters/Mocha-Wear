import type { Collection } from "@/components/admin-collections";
import type { Product } from "@/components/admin-products";

export const RECENT_SEARCHES_KEY = "mocha-wear-recent-searches";

export function normalizeQuery(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function haystack(product: Product) {
  return [
    product.name,
    product.code,
    product.slug,
    product.fabric,
    product.color,
    product.pieces,
    product.badge,
    product.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function searchProducts(products: Product[], query: string) {
  const q = normalizeQuery(query).toLowerCase();
  if (!q) return [];
  return products.filter((product) => haystack(product).includes(q));
}

export function searchCollections(collections: Collection[], query: string) {
  const q = normalizeQuery(query).toLowerCase();
  if (!q) return [];
  return collections.filter((item) =>
    [item.name, item.code, item.slug, item.subtitle, item.description, item.sale_label]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q),
  );
}

export function readRecentSearches() {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw.map(String).filter(Boolean).slice(0, 6);
  } catch {
    return [];
  }
}

export function pushRecentSearch(query: string) {
  const q = normalizeQuery(query);
  if (!q) return;
  const next = [q, ...readRecentSearches().filter((item) => item.toLowerCase() !== q.toLowerCase())].slice(0, 6);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
}

export function clearRecentSearches() {
  localStorage.removeItem(RECENT_SEARCHES_KEY);
}
