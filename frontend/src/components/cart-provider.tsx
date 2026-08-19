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

  const addProduct = useCallback((product: Product, qty = 1, size = "") => {
    const picked = size.trim();
    setItems((prev) => {
      const key = cartLineId({ productId: product.id, size: picked });
      const existing = prev.find((line) => cartLineId(line) === key);
      if (existing) {
        return prev.map((line) =>
          cartLineId(line) === key ? { ...line, qty: Math.min(10, line.qty + qty) } : line,
        );
      }
      return [...prev, lineFromProduct(product, Math.min(10, qty), picked)];
    });
  }, []);

  const setQty = useCallback((productId: string, qty: number, size = "") => {
    const key = cartLineId({ productId, size });
    setItems((prev) => {
      if (qty < 1) return prev.filter((line) => cartLineId(line) !== key);
      return prev.map((line) =>
        cartLineId(line) === key ? { ...line, qty: Math.min(10, qty) } : line,
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
