/** In-memory browse cache for admin/reseller media folders (tab session). */

export const MEDIA_BROWSE_TTL_MS = 90_000;

type Entry<T> = {
  data: T;
  fetchedAt: number;
};

const cache = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

function cacheKey(apiBase: string, folderId: string) {
  return `${apiBase}::${folderId || "root"}`;
}

export function getMediaBrowse<T>(apiBase: string, folderId: string): T | undefined {
  const entry = cache.get(cacheKey(apiBase, folderId)) as Entry<T> | undefined;
  return entry?.data;
}

export function setMediaBrowse<T>(apiBase: string, folderId: string, data: T) {
  cache.set(cacheKey(apiBase, folderId), { data, fetchedAt: Date.now() });
}

export function isMediaBrowseStale(apiBase: string, folderId: string, ttlMs = MEDIA_BROWSE_TTL_MS) {
  const entry = cache.get(cacheKey(apiBase, folderId));
  if (!entry) return true;
  return Date.now() - entry.fetchedAt >= ttlMs;
}

export function invalidateMediaBrowse(apiBase: string, folderId?: string) {
  if (folderId !== undefined) {
    const key = cacheKey(apiBase, folderId);
    cache.delete(key);
    inflight.delete(key);
    return;
  }
  const prefix = `${apiBase}::`;
  for (const key of [...cache.keys()]) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
  for (const key of [...inflight.keys()]) {
    if (key.startsWith(prefix)) inflight.delete(key);
  }
}

export async function prefetchMediaBrowse<T>(
  apiBase: string,
  folderId: string,
  fetcher: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const key = cacheKey(apiBase, folderId);
  if (!isMediaBrowseStale(apiBase, folderId)) {
    return getMediaBrowse<T>(apiBase, folderId) as T;
  }

  const pending = inflight.get(key) as Promise<T> | undefined;
  if (pending) return pending;

  const controller = new AbortController();
  const request = fetcher(controller.signal)
    .then((data) => {
      setMediaBrowse(apiBase, folderId, data);
      return data;
    })
    .finally(() => {
      if (inflight.get(key) === request) inflight.delete(key);
    });

  inflight.set(key, request);
  return request;
}
