"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  apiJson,
  hydrateApiCacheFromStorage,
  invalidateApiCache,
  peekApiCache,
  primeApiCache,
  SOFT_TTL_MS,
  isApiCacheSoftStale,
} from "@/lib/api-cache";
import type { Collection } from "@/components/admin-collections";
import type { Product } from "@/components/admin-products";
import { setSharedActiveSale, type ActiveSale } from "@/lib/active-sale";
import { getReferralCode, RESELLER_ACTIVATED_EVENT } from "@/lib/referral";
import { fetchCatalogVersion, syncCatalogIfStale, writeCatalogVersion } from "@/lib/catalog-meta";

type CatalogState = {
  products: Product[];
  collections: Collection[];
  sale: ActiveSale | null;
  loading: boolean;
  error: string | null;
  revalidate: () => Promise<void>;
};

const CatalogContext = createContext<CatalogState>({
  products: [],
  collections: [],
  sale: null,
  loading: true,
  error: null,
  revalidate: async () => undefined,
});

function seedDetailCaches(products: Product[], collections: Collection[]) {
  for (const product of products) {
    if (!product?.slug) continue;
    primeApiCache(`/api/products/${product.slug}`, { item: product }, { memoryOnly: true });
  }
  for (const collection of collections) {
    if (!collection?.slug) continue;
    primeApiCache(`/api/collections/${collection.slug}`, { item: collection }, { memoryOnly: true });
    const items = products.filter((product) => product.collection_id === collection.id);
    primeApiCache(`/api/products?collection=${collection.slug}`, { items }, { memoryOnly: true });
    primeApiCache(`/api/products?collection=${collection.id}`, { items }, { memoryOnly: true });
  }
}

function readWarmCatalog(): {
  products: Product[];
  collections: Collection[];
  sale: ActiveSale | null;
  warm: boolean;
} {
  hydrateApiCacheFromStorage();
  const products = peekApiCache<{ items?: Product[] }>("/api/products");
  const collections = peekApiCache<{ items?: Collection[] }>("/api/collections");
  const sale = peekApiCache<{ sale?: ActiveSale }>("/api/sales/active")?.sale || null;
  if (products && collections) {
    const nextProducts = products.items || [];
    const nextCollections = collections.items || [];
    seedDetailCaches(nextProducts, nextCollections);
    return {
      products: nextProducts,
      collections: nextCollections,
      sale,
      warm: true,
    };
  }
  return {
    products: products?.items || [],
    collections: collections?.items || [],
    sale,
    warm: false,
  };
}

async function loadCatalogBundle(force = false) {
  const [productData, collectionData, saleData] = await Promise.all([
    apiJson<{ items?: Product[] }>("/api/products", { force, staleWhileRevalidate: !force }),
    apiJson<{ items?: Collection[] }>("/api/collections", { force, staleWhileRevalidate: !force }),
    apiJson<{ sale?: ActiveSale }>("/api/sales/active", {
      force,
      softTtlMs: 30_000,
      staleWhileRevalidate: !force,
    }),
  ]);
  void Promise.allSettled([
    apiJson("/api/hero", { staleWhileRevalidate: true }),
    apiJson("/api/reviews", { staleWhileRevalidate: true }),
    apiJson("/api/help", { staleWhileRevalidate: true }),
  ]);
  const products = productData.items || [];
  const collections = collectionData.items || [];
  seedDetailCaches(products, collections);
  return {
    products,
    collections,
    sale: saleData.sale || null,
  };
}

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Omit<CatalogState, "revalidate">>({
    products: [],
    collections: [],
    sale: null,
    loading: true,
    error: null,
  });

  const applyBundle = useCallback((bundle: Awaited<ReturnType<typeof loadCatalogBundle>>) => {
    setSharedActiveSale(bundle.sale);
    setState({
      products: bundle.products,
      collections: bundle.collections,
      sale: bundle.sale,
      loading: false,
      error: null,
    });
  }, []);

  const revalidate = useCallback(async () => {
    try {
      const bundle = await loadCatalogBundle(true);
      applyBundle(bundle);
    } catch {
      /* keep current */
    }
  }, [applyBundle]);

  useEffect(() => {
    let live = true;
    const referral = getReferralCode();
    if (referral) {
      invalidateApiCache("/api/products");
      loadCatalogBundle(true)
        .then((bundle) => {
          if (live) applyBundle(bundle);
        })
        .catch((error) => {
          if (!live) return;
          setState((prev) => ({
            ...prev,
            loading: false,
            error: error instanceof Error ? error.message : "Could not load catalog",
          }));
        });
      return () => {
        live = false;
      };
    }

    const warm = readWarmCatalog();
    if (warm.warm) {
      setSharedActiveSale(warm.sale);
      setState({
        products: warm.products,
        collections: warm.collections,
        sale: warm.sale,
        loading: false,
        error: null,
      });
      const needsRefresh =
        isApiCacheSoftStale("/api/products", SOFT_TTL_MS) ||
        isApiCacheSoftStale("/api/collections", SOFT_TTL_MS) ||
        isApiCacheSoftStale("/api/sales/active", 30_000);
      void (async () => {
        const staleByVersion = await syncCatalogIfStale();
        if (!live) return;
        if (staleByVersion) {
          loadCatalogBundle(true)
            .then((bundle) => {
              if (live) applyBundle(bundle);
            })
            .catch(() => undefined);
        } else if (needsRefresh) {
          loadCatalogBundle(false)
            .then((bundle) => {
              if (live) applyBundle(bundle);
            })
            .catch(() => undefined);
        }
      })();
      void fetchCatalogVersion()
        .then((v) => {
          if (live && v > 0) writeCatalogVersion(v);
        })
        .catch(() => undefined);
      return () => {
        live = false;
      };
    }

    void fetchCatalogVersion()
      .then((v) => {
        if (live && v > 0) writeCatalogVersion(v);
      })
      .catch(() => undefined);

    loadCatalogBundle(true)
      .then((bundle) => {
        if (live) applyBundle(bundle);
      })
      .catch((error) => {
        if (!live) return;
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : "Could not load catalog",
        }));
      });

    return () => {
      live = false;
    };
  }, [applyBundle]);

  useEffect(() => {
    function onActivated() {
      invalidateApiCache("/api/products");
      void revalidate();
    }
    window.addEventListener(RESELLER_ACTIVATED_EVENT, onActivated);
    return () => window.removeEventListener(RESELLER_ACTIVATED_EVENT, onActivated);
  }, [revalidate]);

  useEffect(() => {
    let last = 0;
    async function onFocus() {
      const now = Date.now();
      if (now - last < 20_000) return;
      last = now;
      const staleByVersion = await syncCatalogIfStale();
      const softStale =
        isApiCacheSoftStale("/api/products", SOFT_TTL_MS) ||
        isApiCacheSoftStale("/api/collections", SOFT_TTL_MS);
      if (staleByVersion || softStale) {
        void revalidate();
      }
    }
    function onVisibility() {
      if (document.visibilityState === "visible") void onFocus();
    }
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [revalidate]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void (async () => {
        const stale = await syncCatalogIfStale();
        if (stale) void revalidate();
      })();
    }, 90_000);
    return () => window.clearInterval(timer);
  }, [revalidate]);

  const value = useMemo<CatalogState>(
    () => ({
      ...state,
      revalidate,
    }),
    [state, revalidate],
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  return useContext(CatalogContext);
}

export function useCatalogProduct(slug?: string) {
  const { products, collections, loading } = useCatalog();
  const product = useMemo(
    () => (slug ? products.find((item) => item.slug === slug) || null : null),
    [products, slug],
  );
  const collection = useMemo(
    () =>
      product?.collection_id
        ? collections.find((item) => item.id === product.collection_id) || null
        : null,
    [collections, product],
  );
  const related = useMemo(() => {
    if (!product?.collection_id) return [];
    return products.filter((item) => item.collection_id === product.collection_id && item.id !== product.id).slice(0, 6);
  }, [products, product]);

  return { product, collection, related, catalogLoading: loading };
}

export function useCatalogCollection(slug?: string) {
  const { products, collections, loading } = useCatalog();
  const collection = useMemo(
    () => (slug ? collections.find((item) => item.slug === slug) || null : null),
    [collections, slug],
  );
  const items = useMemo(() => {
    if (!collection) return [];
    return products.filter((product) => product.collection_id === collection.id);
  }, [products, collection]);

  return { collection, products: items, catalogLoading: loading };
}
