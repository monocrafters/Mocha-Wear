"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Product } from "@/components/admin-products";
import {
  cartCount,
  cartLineId,
  cartSubtotal,
  lineFromProduct,
  readCart,
  writeCart,
  type CartLine,
} from "@/lib/cart";
import { API_URL, apiFetch } from "@/lib/api";

type CartContextValue = {
  items: CartLine[];
  count: number;
  subtotal: number;
  delivery: number;
  total: number;
  ready: boolean;
  addProduct: (product: Product, qty?: number, size?: string) => void;
  setQty: (productId: string, qty: number, size?: string) => void;
  remove: (productId: string, size?: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setItems(readCart());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    writeCart(items);
  }, [items, ready]);

  useEffect(() => {
    if (!ready || !items.length) return;
    const ids = [...new Set(items.map((line) => line.productId).filter(Boolean))];
    if (!ids.length) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch(`${API_URL}/api/pricing?ids=${ids.join(",")}`, {
          credentials: "include",
        });
        if (!res.ok) return;
        const data = await res.json();
        const map = new Map(
          (data.items || []).map((item: { id: string; price: number }) => [item.id, item.price]),
        );
        if (cancelled || !map.size) return;
        setItems((prev) =>
          prev.map((line) => {
            const nextPrice = map.get(line.productId);
            return nextPrice == null || nextPrice === line.price ? line : { ...line, price: nextPrice };
          }),
        );
      } catch {
        /* soft fail */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready]);

  const addProduct = useCallback((product: Product, qty = 1, size = "") => {
    const picked = size.trim();
    setItems((prev) => {
      const key = cartLineId({ productId: product.id, size: picked });
      const existing = prev.find((line) => cartLineId(line) === key);
      if (existing) {
        const maxQty = existing.maxQty || 10;
        return prev.map((line) =>
          cartLineId(line) === key ? { ...line, qty: Math.min(maxQty, line.qty + qty) } : line,
        );
      }
      const next = lineFromProduct(product, qty, picked);
      if ((product.stock ?? 1) <= 0) return prev;
      return [...prev, next];
    });
  }, []);

  const setQty = useCallback((productId: string, qty: number, size = "") => {
    const key = cartLineId({ productId, size });
    setItems((prev) => {
      if (qty < 1) return prev.filter((line) => cartLineId(line) !== key);
      return prev.map((line) =>
        cartLineId(line) === key ? { ...line, qty: Math.min(line.maxQty || 10, qty) } : line,
      );
    });
  }, []);

  const remove = useCallback((productId: string, size = "") => {
    const key = cartLineId({ productId, size });
    setItems((prev) => prev.filter((line) => cartLineId(line) !== key));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(() => {
    const subtotal = cartSubtotal(items);
    return {
      items,
      count: cartCount(items),
      subtotal,
      delivery: 0,
      total: subtotal,
      ready,
      addProduct,
      setQty,
      remove,
      clear,
    };
  }, [items, ready, addProduct, setQty, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
