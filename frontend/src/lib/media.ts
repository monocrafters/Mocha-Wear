/** Prefer Cloudinary auto format/quality when the URL allows it. */
export function optimizeMediaUrl(
  src: string,
  options?: { width?: number; height?: number; crop?: "fill" | "limit" | "fit" },
) {
  const url = String(src || "").trim();
  if (!url) return "";
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;
  if (/\/upload\/(?:[^/]+,)*f_auto/.test(url)) return url;

  const parts = ["f_auto", "q_auto"];
  if (options?.width) parts.push(`w_${Math.round(options.width)}`);
  if (options?.height) parts.push(`h_${Math.round(options.height)}`);
  if (options?.crop) parts.push(`c_${options.crop}`);

  return url.replace("/upload/", `/upload/${parts.join(",")}/`);
}
