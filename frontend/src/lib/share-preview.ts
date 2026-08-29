import { API_URL } from "@/lib/api";

export type SharePreview = {
  title: string;
  description: string;
  image: string;
  product_name: string;
  price: number;
  code: string;
  slug: string;
  path: string;
};

export function siteOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configured) return configured;
  const vercel = process.env.VERCEL_URL?.replace(/\/$/, "");
  if (vercel) return vercel.startsWith("http") ? vercel : `https://${vercel}`;
  return "http://localhost:3000";
}

function ensureHttps(url: string) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  if (raw.startsWith("http://")) return `https://${raw.slice(7)}`;
  return raw;
}

/** 1200×630 JPEG — WhatsApp / Facebook / Instagram link previews */
export function shareOgImage(url: string) {
  const https = ensureHttps(url);
  if (!https) return "";
  if (!https.includes("res.cloudinary.com") || !https.includes("/upload/")) return https;
  if (/c_fill,w_1200,h_630/.test(https)) return https;
  return https.replace("/upload/", "/upload/c_fill,w_1200,h_630,f_jpg,q_auto:good/");
}

export async function fetchSharePreview(code: string, slug: string): Promise<SharePreview | null> {
  try {
    const res = await fetch(
      `${API_URL}/api/r/${encodeURIComponent(code)}/p/${encodeURIComponent(slug)}/share`,
      { next: { revalidate: 300 } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const item = data.item || {};
    const image = shareOgImage(String(item.image || ""));
    return {
      title: String(item.title || item.product_name || "Mocha Wear"),
      description: String(item.description || "Shop at Mocha Wear"),
      image,
      product_name: String(item.product_name || ""),
      price: Number(item.price) || 0,
      code: String(item.code || code),
      slug: String(item.slug || slug),
      path: String(item.path || `/r/${code}/p/${slug}`),
    };
  } catch {
    return null;
  }
}

export function sharePageUrl(origin: string, code: string, slug: string) {
  return `${origin}/r/${encodeURIComponent(code)}/p/${encodeURIComponent(slug)}`;
}
