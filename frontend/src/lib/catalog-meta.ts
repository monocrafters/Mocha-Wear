import { API_URL, apiFetch } from "@/lib/api";
import { invalidateApiCache } from "@/lib/api-cache";

const VERSION_KEY = "mocha_catalog_v";

export function readCatalogVersion(): number {
  if (typeof window === "undefined") return 0;
  try {
    return Number(sessionStorage.getItem(VERSION_KEY)) || 0;
  } catch {
    return 0;
  }
}

export function writeCatalogVersion(version: number) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(VERSION_KEY, String(version));
  } catch {
    /* ignore */
  }
}

export function invalidateCatalogCaches() {
  invalidateApiCache("/api/products");
  invalidateApiCache("/api/collections");
  invalidateApiCache("/api/sales/active");
}

export async function fetchCatalogVersion(): Promise<number> {
  const res = await apiFetch(`${API_URL}/api/catalog-meta`, { credentials: "omit" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Could not read catalog version");
  return Number(data.v) || 0;
}

/** Admin: apply server bump immediately on this browser. */
export function applyCatalogVersion(version: number) {
  writeCatalogVersion(version);
  invalidateCatalogCaches();
}

/**
 * Lightweight check (~few bytes). Returns true when catalog was stale and caller should refresh.
 */
export async function syncCatalogIfStale(): Promise<boolean> {
  try {
    const remote = await fetchCatalogVersion();
    const local = readCatalogVersion();
    if (remote <= local) {
      if (remote > 0 && local === 0) writeCatalogVersion(remote);
      return false;
    }
    writeCatalogVersion(remote);
    invalidateCatalogCaches();
    return true;
  } catch {
    return false;
  }
}
