export function productCode(item: { code?: string; slug?: string }) {
  return String(item.code || item.slug || "").trim();
}

export function productHref(item: { code?: string; slug?: string }) {
  const code = productCode(item);
  return code ? `/products/${code}` : "/shop";
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

