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

export async function apiFetch(input: string, init?: RequestInit, retries = 4, cookieRetry = false) {
  const headers = new Headers(init?.headers);
  const path = typeof input === "string" ? input : "";
  const isReseller = path.includes("/api/reseller");
  const isAdmin = path.includes("/api/admin");

  if (typeof window !== "undefined") {
    const token = localStorage.getItem(isReseller ? RESELLER_TOKEN_KEY : ADMIN_TOKEN_KEY);
    if (token && !headers.has("Authorization") && !cookieRetry) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    try {
      const referral = sessionStorage.getItem("mw_r");
      if (referral && !headers.has("X-Reseller-Code") && !isAdmin && !isReseller) {
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
      const res = await fetch(input, nextInit);

      // Expired localStorage bearer can block a still-valid cookie — clear and retry once.
      if (
        typeof window !== "undefined" &&
        isReseller &&
        res.status === 401 &&
        !cookieRetry &&
        headers.has("Authorization")
      ) {
        clearResellerToken();
        const retryHeaders = new Headers(init?.headers);
        retryHeaders.delete("Authorization");
        return apiFetch(input, { ...init, headers: retryHeaders }, 0, true);
      }

      return res;
    } catch (error) {
      lastError = error;
      if (!isNetworkError(error) || attempt === retries) break;
      await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
    }
  }
  throw toApiError(lastError);
}
