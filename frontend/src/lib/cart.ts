export type CartLine = {
  productId: string;
  slug: string;
  name: string;
  spec: string;
  size: string;
  price: number;
  compareAtPrice: number;
  image: string;
  qty: number;
  maxQty: number;
};

export function cartLineId(line: { productId: string; size?: string }) {
  return `${line.productId}::${line.size || ""}`;
}

export const CART_KEY = "mocha-wear-cart";
export const BUY_NOW_KEY = "mocha-wear-buy-now";

function lineMaxQty(row: { maxQty?: number; stock?: number }) {
  const cap = Number(row.maxQty ?? row.stock);
  if (Number.isFinite(cap) && cap > 0) return Math.min(10, Math.floor(cap));
  return 10;
}

function parseLines(raw: unknown): CartLine[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      const maxQty = lineMaxQty(row);
      return {
        productId: String(row.productId || ""),
        slug: String(row.slug || ""),
        name: String(row.name || "Suit"),
        spec: String(row.spec || ""),
        size: String(row.size || "").trim(),
        price: Number(row.price) || 0,
        compareAtPrice: Number(row.compareAtPrice) || 0,
        image: String(row.image || ""),
        maxQty,
        qty: Math.max(1, Math.min(maxQty, Number(row.qty) || 1)),
      };
    })
    .filter((row) => row.productId);
}

export function lineFromProduct(
  product: {
    id: string;
    code?: string;
    slug: string;
    name: string;
    fabric?: string;
    pieces?: string;
    color?: string;
    price: number;
    compare_at_price?: number;
    images?: { url: string }[];
    stock?: number;
  },
  qty: number,
  size = "",
): CartLine {
  const available = Math.max(0, Number(product.stock ?? 10));
  const cappedMax = Math.min(10, Math.max(1, available || 10));
  return {
    productId: product.id,
    slug: product.code || product.slug,
    name: product.name,
    spec: [product.fabric, product.pieces, product.color].filter(Boolean).join(" · "),
    size: size.trim(),
    price: product.price,
    compareAtPrice: product.compare_at_price || 0,
    image: product.images?.[0]?.url || "",
    maxQty: cappedMax,
    qty: Math.max(1, Math.min(cappedMax, qty)),
  };
}

export function readCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    return parseLines(JSON.parse(localStorage.getItem(CART_KEY) || "[]"));
  } catch {
    return [];
  }
}

export function writeCart(items: CartLine[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export function readBuyNow(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    return parseLines(JSON.parse(sessionStorage.getItem(BUY_NOW_KEY) || "[]"));
  } catch {
    return [];
  }
}

export function writeBuyNow(items: CartLine[]) {
  sessionStorage.setItem(BUY_NOW_KEY, JSON.stringify(items));
}

export function clearBuyNow() {
  sessionStorage.removeItem(BUY_NOW_KEY);
}

export function cartCount(items: CartLine[]) {
  return items.reduce((sum, line) => sum + line.qty, 0);
}

export function cartSubtotal(items: CartLine[]) {
  return items.reduce((sum, line) => sum + line.price * line.qty, 0);
}
