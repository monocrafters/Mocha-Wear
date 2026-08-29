export type ResellerProduct = {
  id: string;
  name: string;
  slug: string;
  image?: string;
  images?: { id: string; url: string; alt?: string }[];
  description?: string;
  fabric?: string;
  pieces?: string;
  color?: string;
  badge?: string;
  labels?: { id: string; label: string; value: string }[];
  wholesale_price: number;
  retail_price: number;
  compare_at_price?: number;
  min_price: number;
  max_price: number;
  custom_price: number | null;
  is_active: boolean;
  pricing_ready?: boolean;
  markup_min_percent?: number;
  markup_max_percent?: number;
  margin?: number;
};

export type ResellerProductLimits = {
  minPercent: number;
  maxPercent: number;
};

export function isActiveFlag(value: unknown) {
  return value !== false && value !== "false" && value !== 0;
}

export function hasResellerPrice(product: ResellerProduct) {
  return Number(product.custom_price) > 0;
}

/** Price set + Active on link */
export function isLiveProduct(product: ResellerProduct) {
  return hasResellerPrice(product) && isActiveFlag(product.is_active);
}

/** Reseller has not set a sell price yet */
export function needsPricing(product: ResellerProduct) {
  return !hasResellerPrice(product);
}

/** Price saved but turned off */
export function isInactiveListing(product: ResellerProduct) {
  return hasResellerPrice(product) && !isActiveFlag(product.is_active);
}

export function isPricingReady(product: ResellerProduct) {
  return product.pricing_ready !== false && product.wholesale_price > 0;
}

export function filterByPage(items: ResellerProduct[], page: "pending" | "active") {
  if (page === "active") return items.filter(hasResellerPrice);
  return items.filter(needsPricing);
}

export function productMargin(product: ResellerProduct) {
  if (!hasResellerPrice(product)) return 0;
  return Math.max(0, Number(product.custom_price) - product.wholesale_price);
}

export type ProductSort =
  | "default"
  | "name"
  | "wholesale_asc"
  | "wholesale_desc"
  | "price_asc"
  | "price_desc"
  | "margin_high"
  | "margin_low"
  | "potential_high";

export function sortProducts(items: ResellerProduct[], sort: ProductSort) {
  if (sort === "default") return items;
  const list = [...items];
  switch (sort) {
    case "name":
      return list.sort((a, b) => a.name.localeCompare(b.name));
    case "wholesale_asc":
      return list.sort((a, b) => a.wholesale_price - b.wholesale_price);
    case "wholesale_desc":
      return list.sort((a, b) => b.wholesale_price - a.wholesale_price);
    case "price_asc":
      return list.sort((a, b) => Number(a.custom_price || 0) - Number(b.custom_price || 0));
    case "price_desc":
      return list.sort((a, b) => Number(b.custom_price || 0) - Number(a.custom_price || 0));
    case "margin_high":
      return list.sort((a, b) => productMargin(b) - productMargin(a));
    case "margin_low":
      return list.sort((a, b) => productMargin(a) - productMargin(b));
    case "potential_high":
      return list.sort(
        (a, b) => b.max_price - b.wholesale_price - (a.max_price - a.wholesale_price),
      );
    default:
      return list;
  }
}
