import { API_URL, apiFetch } from "@/lib/api";
import { getReferralCode } from "@/lib/referral";

type CacheEntry<T> = {
  data: T;
  at: number;
};

const memory = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

/** Soft stale window — show cache, refresh in background. */
export const SOFT_TTL_MS = 3 * 60 * 1000;
/** Hard expiry for memory + localStorage. */
export const HARD_TTL_MS = 45 * 60 * 1000;

const STORAGE_KEY = "mocha-api-cache-v1";
const MAX_STORAGE_ENTRIES = 24;

/** Only these paths are written to localStorage (lists / small payloads). */
const PERSIST_SUFFIXES = [
  "/api/products",
  "/api/collections",
  "/api/hero",
  "/api/reviews",
  "/api/help",
  "/api/settings",
  "/api/sales/active",
];

function cacheKey(path: string) {
  return path.startsWith("http") ? path : `${API_URL}${path}`;
}

function pathOf(key: string) {
  try {
    return new URL(key).pathname + new URL(key).search;
  } catch {
    return key;
  }
}

function shouldPersist(key: string) {
  const path = pathOf(key);
  return PERSIST_SUFFIXES.some((suffix) => path === suffix || path.startsWith(`${suffix}?`));
}

function canUseStorage() {
  return typeof window !== "undefined";
}

function readStorage(): Record<string, CacheEntry<unknown>> {
  if (!canUseStorage()) return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, CacheEntry<unknown>>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStorage(entries: Record<string, CacheEntry<unknown>>) {
  if (!canUseStorage()) return;
  try {
    const keys = Object.keys(entries);
    if (keys.length > MAX_STORAGE_ENTRIES) {
      const sorted = keys.sort((a, b) => (entries[a]?.at || 0) - (entries[b]?.at || 0));
      for (const key of sorted.slice(0, keys.length - MAX_STORAGE_ENTRIES)) {
        delete entries[key];
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* quota / private mode */
  }
}

function persistEntry(key: string, entry: CacheEntry<unknown>, memoryOnly = false) {
  memory.set(key, entry);
  if (memoryOnly || !shouldPersist(key) || !canUseStorage()) return;
  const all = readStorage();
  all[key] = entry;
  writeStorage(all);
}

function readEntry<T>(key: string, hardTtlMs: number): CacheEntry<T> | undefined {
  const mem = memory.get(key) as CacheEntry<T> | undefined;
  if (mem && Date.now() - mem.at < hardTtlMs) return mem;

  if (!canUseStorage() || !shouldPersist(key)) return undefined;
  try {
    const all = readStorage();
    const hit = all[key] as CacheEntry<T> | undefined;
    if (!hit) return undefined;
    if (Date.now() - hit.at >= hardTtlMs) {
      delete all[key];
      writeStorage(all);
      return undefined;
    }
    memory.set(key, hit);
    return hit;
  } catch {
    return undefined;
  }
}

export function hydrateApiCacheFromStorage() {
  if (!canUseStorage()) return;
  const all = readStorage();
  const now = Date.now();
  let changed = false;
  for (const [key, entry] of Object.entries(all)) {
    if (!entry || typeof entry.at !== "number" || !shouldPersist(key)) {
      delete all[key];
      changed = true;
      continue;
    }
    if (now - entry.at >= HARD_TTL_MS) {
      delete all[key];
      changed = true;
      continue;
    }
    if (!memory.has(key)) memory.set(key, entry);
  }
  if (changed) writeStorage(all);
}

export function peekApiCache<T>(path: string, hardTtlMs = HARD_TTL_MS): T | undefined {
  const key = cacheKey(path);
  const mem = memory.get(key) as CacheEntry<T> | undefined;
  if (mem && Date.now() - mem.at < hardTtlMs) return mem.data;
  return undefined;
}

export function peekApiCacheAge(path: string): number | null {
  const key = cacheKey(path);
  const mem = memory.get(key);
  if (!mem) return null;
  return Date.now() - mem.at;
}

export function isApiCacheSoftStale(path: string, softTtlMs = SOFT_TTL_MS): boolean {
  const age = peekApiCacheAge(path);
  return age === null || age >= softTtlMs;
}

/** Seed memory (and optionally localStorage for allowlisted paths). */
export function primeApiCache<T>(path: string, data: T, options?: { memoryOnly?: boolean }) {
  persistEntry(cacheKey(path), { data, at: Date.now() }, options?.memoryOnly === true);
}

export function invalidateApiCache(match?: string | RegExp) {
  if (!match) {
    memory.clear();
    inflight.clear();
    if (canUseStorage()) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
    return;
  }
  for (const key of [...memory.keys()]) {
    if (typeof match === "string" ? key.includes(match) : match.test(key)) {
      memory.delete(key);
    }
  }
  for (const key of [...inflight.keys()]) {
    if (typeof match === "string" ? key.includes(match) : match.test(key)) {
      inflight.delete(key);
    }
  }
  if (canUseStorage()) {
    const all = readStorage();
    let changed = false;
    for (const key of Object.keys(all)) {
      if (typeof match === "string" ? key.includes(match) : match.test(key)) {
        delete all[key];
        changed = true;
      }
    }
    if (changed) writeStorage(all);
  }
}

export async function apiJson<T>(
  path: string,
  options?: {
    ttlMs?: number;
    softTtlMs?: number;
    init?: RequestInit;
    noCache?: boolean;
    /** Force network even if soft-fresh; still updates cache. */
    force?: boolean;
    /** Return stale data immediately when soft-stale and refresh in background. */
    staleWhileRevalidate?: boolean;
    onUpdate?: (data: T) => void;
  },
): Promise<T> {
  const method = (options?.init?.method || "GET").toUpperCase();
  const useCache = !options?.noCache && method === "GET";
  const key = cacheKey(path);
  const hardTtl = options?.ttlMs ?? HARD_TTL_MS;
  const softTtl = options?.softTtlMs ?? SOFT_TTL_MS;

  if (useCache && !options?.force) {
    const hit = readEntry<T>(key, hardTtl);
    if (hit) {
      const age = Date.now() - hit.at;
      if (age < softTtl) return hit.data;

      if (options?.staleWhileRevalidate !== false) {
        const pending = inflight.get(key) as Promise<T> | undefined;
        if (!pending) {
          const refresh = fetchAndStore<T>(key, options?.init, true);
          inflight.set(key, refresh);
          refresh
            .then((data) => options?.onUpdate?.(data))
            .catch(() => undefined)
            .finally(() => inflight.delete(key));
        }
        return hit.data;
      }
    }

    const pending = inflight.get(key) as Promise<T> | undefined;
    if (pending) return pending;
  }

  const request = fetchAndStore<T>(key, options?.init, useCache);
  if (useCache) {
    inflight.set(key, request);
    try {
      return await request;
    } finally {
      inflight.delete(key);
    }
  }
  return request;
}

async function fetchAndStore<T>(key: string, init: RequestInit | undefined, useCache: boolean) {
  const headers = new Headers(init?.headers);
  const code = getReferralCode();
  if (code && !headers.has("X-Reseller-Code")) {
    headers.set("X-Reseller-Code", code);
  }
  const res = await apiFetch(key, { ...init, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Request failed (${res.status})`);
  }
  const data = (await res.json()) as T;
  if (useCache) {
    // Never persist personalized reseller-priced catalogs to localStorage.
    const personalized = Boolean(code);
    persistEntry(key, { data, at: Date.now() }, personalized || !shouldPersist(key));
  }
  return data;
}
