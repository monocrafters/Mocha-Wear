"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { API_URL, apiFetch } from "@/lib/api";
import type { Collection } from "@/components/admin-collections";
import type { HeroSlide } from "@/components/admin-hero";
import type { Product } from "@/components/admin-products";
import type { Review } from "@/components/admin-reviews";
import { DEFAULT_HELP, type HelpContent } from "@/lib/support";

export type Catalog = {
  products: Product[];
  collections: Collection[];
  heroSlides: HeroSlide[];
  reviews: Review[];
  help: HelpContent;
  ready: boolean;
};

const empty: Catalog = {
  products: [],
  collections: [],
  heroSlides: [],
  reviews: [],
  help: DEFAULT_HELP,
  ready: false,
};

const STORAGE_KEY = "mocha-catalog-v1";
const CatalogContext = createContext<Catalog>(empty);
let pending: Promise<Catalog> | null = null;

function readSession(): Catalog {
  if (typeof window === "undefined") return empty;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const data = JSON.parse(raw) as Catalog;
    return {
      products: data.products || [],
      collections: data.collections || [],
      heroSlides: data.heroSlides || [],
      reviews: data.reviews || [],
      help: { ...DEFAULT_HELP, ...(data.help || {}) },
      ready: true,
    };
  } catch {
    return empty;
  }
}

function writeSession(catalog: Catalog) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(catalog));
  } catch {
    /* ignore quota */
  }
}

function loadCatalog() {
  if (!pending) {
    pending = Promise.all([
      apiFetch(`${API_URL}/api/products`).then((res) => res.json()).catch(() => ({ items: [] })),
      apiFetch(`${API_URL}/api/collections`).then((res) => res.json()).catch(() => ({ items: [] })),
      apiFetch(`${API_URL}/api/hero`).then((res) => res.json()).catch(() => ({ hero: { slides: [] } })),
      apiFetch(`${API_URL}/api/reviews`).then((res) => res.json()).catch(() => ({ items: [] })),
      apiFetch(`${API_URL}/api/help`).then((res) => res.json()).catch(() => ({ help: null })),
    ]).then(([products, collections, hero, reviews, help]) => {
      const catalog: Catalog = {
        products: products.items || [],
        collections: collections.items || [],
        heroSlides: hero.hero?.slides || [],
        reviews: reviews.items || [],
        help: { ...DEFAULT_HELP, ...(help.help || {}) },
        ready: true,
      };
      writeSession(catalog);
      return catalog;
    });
  }
  return pending;
}

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<Catalog>(empty);

  useEffect(() => {
    const cached = readSession();
    if (cached.ready) setCatalog(cached);
    loadCatalog().then(setCatalog);
  }, []);

  return <CatalogContext.Provider value={catalog}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  return useContext(CatalogContext);
}
