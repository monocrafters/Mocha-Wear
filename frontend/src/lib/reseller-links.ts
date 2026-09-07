/** Customer-facing product URL that attributes sales to one reseller. */
export function resellerProductPath(code: string, slug: string) {
  const c = encodeURIComponent(String(code || "").trim().toLowerCase());
  const s = encodeURIComponent(String(slug || "").trim());
  return `/products/${s}?r=${c}`;
}

export function resellerProductUrl(origin: string, code: string, slug: string) {
  const base = String(origin || "").replace(/\/$/, "");
  return `${base}${resellerProductPath(code, slug)}`;
}
