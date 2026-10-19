/** Serve the saved source unchanged, preserving admin crops and original quality. */
export function optimizeMediaUrl(
  src: string,
  // Kept for compatibility with existing callers; no delivery resizing is applied.
  _options?: { width?: number; height?: number; crop?: "fill" | "limit" | "fit" },
) {
  return String(src || "").trim();
}
