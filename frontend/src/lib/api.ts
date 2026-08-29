export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const ADMIN_TOKEN_KEY = "mocha_admin_token";
const RESELLER_TOKEN_KEY = "mocha_reseller_token";

export function setAdminToken(token: string) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token);
  else localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export function clearAdminToken() {
  setAdminToken("");
}

export function setResellerToken(token: string) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(RESELLER_TOKEN_KEY, token);
  else localStorage.removeItem(RESELLER_TOKEN_KEY);
}

export function clearResellerToken() {
  setResellerToken("");
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

export async function apiFetch(input: string, init?: RequestInit, retries = 4) {
  const headers = new Headers(init?.headers);
  if (typeof window !== "undefined") {
    const path = typeof input === "string" ? input : "";
    const isReseller = path.includes("/api/reseller");
    const token = localStorage.getItem(isReseller ? RESELLER_TOKEN_KEY : ADMIN_TOKEN_KEY);
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    try {
      const referral = sessionStorage.getItem("mw_r");
      if (referral && !headers.has("X-Reseller-Code") && !path.includes("/api/admin") && !path.includes("/api/reseller")) {
        headers.set("X-Reseller-Code", referral);
      }
    } catch {
      /* ignore */
    }
  }
  const nextInit: RequestInit = {
    ...init,
    headers,
    credentials: init?.credentials ?? "include",
  };

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
