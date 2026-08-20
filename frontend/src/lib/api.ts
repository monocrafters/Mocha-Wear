export const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://mocha-wear-production.up.railway.app";

const ADMIN_TOKEN_KEY = "mocha_admin_token";
const GET_TTL_MS = 2 * 60 * 1000;

type CachedGet = {
  expires: number;
  status: number;
  statusText: string;
  headers: [string, string][];
  body: string;
};

const getCache = new Map<string, CachedGet>();
const getInflight = new Map<string, Promise<CachedGet>>();

export function setAdminToken(token: string) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token);
  else localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export function clearAdminToken() {
  setAdminToken("");
}

export function clearApiGetCache() {
  getCache.clear();
  getInflight.clear();
}

function isNetworkError(error: unknown) {
  return error instanceof TypeError && /fetch|network|failed/i.test(error.message);
}

function toApiError(error: unknown) {
  if (isNetworkError(error)) {
    return new Error("Could not reach the server. Make sure the API is running, then refresh.");
  }
  return error instanceof Error ? error : new Error("Request failed");
}

function shouldCacheGet(url: string, method: string) {
  if (method !== "GET" || typeof window === "undefined") return false;
  try {
    const path = new URL(url, window.location.origin).pathname;
    if (path.startsWith("/api/admin")) return false;
    if (path.startsWith("/api/orders")) return false;
    if (path.startsWith("/api/notifications")) return false;
    if (path.startsWith("/api/customers")) return false;
    return path.startsWith("/api/");
  } catch {
    return false;
  }
}

function replay(entry: CachedGet) {
  return new Response(entry.body, {
    status: entry.status,
    statusText: entry.statusText,
    headers: entry.headers,
  });
}

export async function apiFetch(input: string, init?: RequestInit, retries = 4) {
  const headers = new Headers(init?.headers);
  if (typeof window !== "undefined") {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }
  const nextInit: RequestInit = {
    ...init,
    headers,
    credentials: init?.credentials ?? "include",
  };
  const method = String(nextInit.method || "GET").toUpperCase();
  const cacheable = shouldCacheGet(input, method);

  if (cacheable) {
    const hit = getCache.get(input);
    if (hit && hit.expires > Date.now()) return replay(hit);
    const pending = getInflight.get(input);
    if (pending) return replay(await pending);
  }

  async function send() {
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        return await fetch(input, nextInit);
      } catch (error) {
        lastError = error;
        if (!isNetworkError(error) || attempt === retries) break;
        await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
      }
    }
    throw toApiError(lastError);
  }

  if (!cacheable) return send();

  const store = (async () => {
    const res = await send();
    const body = await res.text();
    const entry: CachedGet = {
      expires: Date.now() + GET_TTL_MS,
      status: res.status,
      statusText: res.statusText,
      headers: [...res.headers.entries()],
      body,
    };
    if (res.ok) getCache.set(input, entry);
    return entry;
  })();

  getInflight.set(input, store);
  try {
    return replay(await store);
  } finally {
    getInflight.delete(input);
  }
}
