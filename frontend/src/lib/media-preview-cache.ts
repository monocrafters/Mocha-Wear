import { API_URL, apiFetch } from "@/lib/api";

/** Shared blob: URLs for private media previews so folder back/forward does not re-download. */

type Entry = {
  url: string;
  refs: number;
  inflight?: Promise<string>;
  revokeTimer?: ReturnType<typeof setTimeout>;
};

const cache = new Map<string, Entry>();
const GRACE_MS = 60_000;

function normalizeKey(src: string) {
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  return API_URL + src;
}

export async function acquireMediaPreview(src: string, signal?: AbortSignal): Promise<string> {
  const key = normalizeKey(src);
  const existing = cache.get(key);

  if (existing?.revokeTimer) {
    clearTimeout(existing.revokeTimer);
    existing.revokeTimer = undefined;
  }

  if (existing?.url) {
    existing.refs += 1;
    return existing.url;
  }

  if (existing?.inflight) {
    const url = await existing.inflight;
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const entry = cache.get(key);
    if (entry) entry.refs += 1;
    return url;
  }

  // Do not attach a component AbortSignal to the shared fetch — one unmount must not
  // cancel previews still needed by other cards.
  const inflight = (async () => {
    const response = await apiFetch(key, {}, 0);
    if (!response.ok) throw new Error("Preview unavailable");
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  })();

  cache.set(key, { url: "", refs: 0, inflight });

  try {
    const url = await inflight;
    const entry = cache.get(key) || { url: "", refs: 0 };
    entry.url = url;
    entry.inflight = undefined;
    cache.set(key, entry);

    if (signal?.aborted) {
      scheduleRevoke(key);
      throw new DOMException("Aborted", "AbortError");
    }

    entry.refs += 1;
    return url;
  } catch (error) {
    const entry = cache.get(key);
    if (entry && !entry.url) cache.delete(key);
    throw error;
  }
}

function scheduleRevoke(key: string) {
  const entry = cache.get(key);
  if (!entry || entry.refs > 0 || entry.inflight) return;
  if (entry.revokeTimer) clearTimeout(entry.revokeTimer);
  entry.revokeTimer = setTimeout(() => {
    const current = cache.get(key);
    if (!current || current.refs > 0 || current.inflight) return;
    if (current.url) URL.revokeObjectURL(current.url);
    cache.delete(key);
  }, GRACE_MS);
}

export function releaseMediaPreview(src: string) {
  const key = normalizeKey(src);
  const entry = cache.get(key);
  if (!entry) return;
  entry.refs = Math.max(0, entry.refs - 1);
  if (entry.refs > 0 || entry.inflight) return;
  scheduleRevoke(key);
}
