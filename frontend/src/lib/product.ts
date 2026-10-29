import type { Product } from "@/components/admin-products";

type CollectionMembership = { collection_id?: string; collection_ids?: string[] };

export function productCollectionIds(item: CollectionMembership) {
  return item.collection_ids ?? (item.collection_id ? [item.collection_id] : []);
}

export function productInCollection(item: CollectionMembership, collectionId: string) {
  return productCollectionIds(item).includes(collectionId);
}

export function productCode(item: { code?: string; slug?: string }) {
  return String(item.code || item.slug || "").trim();
}

export function productHref(item: { code?: string; slug?: string; selected_collection_id?: string }) {
  const code = productCode(item);
  return code ? `/products/${code}${item.selected_collection_id ? `?collection=${encodeURIComponent(item.selected_collection_id)}` : ""}` : "/shop";
}

export const PRODUCT_BADGES = ["New in", "Bestseller", "Limited", "Exclusive", "Ready to wear"] as const;

export const PRODUCT_SIZE_PRESETS = ["XS", "S", "M", "L", "XL", "XXL", "Free size"] as const;

export function productSizes(item?: { sizes?: string[] | null }) {
  if (!Array.isArray(item?.sizes)) return [];
  const seen = new Set<string>();
  return item.sizes
    .map((size) => String(size || "").trim())
    .filter((size) => {
      const key = size.toLowerCase();
      if (!size || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}


/** Resolve a collection view without mutating the shared catalog product. */
export function productForCollection(item: Product, collectionId?: string): Product {
  if (!collectionId || !productInCollection(item, collectionId)) return item;
  const overrides = item.collection_overrides?.[collectionId] || {};
  return {
    ...item, ...overrides,
    price: item.price_source === "reseller" ? item.price : Number(overrides.price ?? item.price),
    compare_at_price: item.price_source === "reseller" ? item.compare_at_price : Number(overrides.compare_at_price ?? item.compare_at_price),
    collection_id: collectionId,
    selected_collection_id: collectionId,
  } as Product;
}
