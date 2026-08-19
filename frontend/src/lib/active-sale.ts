"use client";

import { useEffect, useState } from "react";
import { API_URL, apiFetch } from "@/lib/api";

export type ActiveSale = {
  id: string;
  name: string;
  headline: string;
  badge: string;
  discount_label: string;
  ends_at: string;
  product_ids?: string[];
  collection_ids?: string[];
};

export type SaleTimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  done: boolean;
};

let cached: Promise<ActiveSale | null> | null = null;

export function fetchActiveSale() {
  if (!cached) {
    cached = apiFetch(`${API_URL}/api/sales/active`)
      .then((res) => res.json())
      .then((data) => (data.sale as ActiveSale) || null)
      .catch(() => {
        cached = null;
        return null;
      });
  }
  return cached;
}

export function useActiveSale() {
  const [sale, setSale] = useState<ActiveSale | null>(null);

  useEffect(() => {
    let live = true;
    fetchActiveSale().then((next) => {
      if (live) setSale(next);
    });
    return () => {
      live = false;
    };
  }, []);

  return sale;
}

export function useSaleCountdown(endsAt?: string | null): SaleTimeLeft {
  const [left, setLeft] = useState<SaleTimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    done: true,
  });

  useEffect(() => {
    if (!endsAt) {
      setLeft((current) => ({ ...current, done: true }));
      return;
    }
    const tick = () => {
      const diff = Math.max(0, new Date(endsAt).getTime() - Date.now());
      setLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff / 3600000) % 24),
        minutes: Math.floor((diff / 60000) % 60),
        seconds: Math.floor((diff / 1000) % 60),
        done: diff <= 0,
      });
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [endsAt]);

  return left;
}

export function padTime(n: number) {
  return String(n).padStart(2, "0");
}

export function saleOffLabel(sale?: { discount_label?: string; badge?: string } | null) {
  if (!sale) return "";
  return String(sale.discount_label || "").trim();
}

export function productInActiveSale(
  product: { id: string },
  sale?: { product_ids?: string[] } | null,
) {
  if (!sale?.product_ids?.length) return false;
  return sale.product_ids.includes(product.id);
}
