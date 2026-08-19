export const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://mocha-wear-production.up.railway.app";

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
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fetch(input, init);
    } catch (error) {
      lastError = error;
      if (!isNetworkError(error) || attempt === retries) break;
      await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
    }
  }
  throw toApiError(lastError);
}
