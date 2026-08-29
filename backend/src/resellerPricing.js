const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createDocumentStore } = require("./cloudStore");
const settings = require("./settings");
const resellers = require("./resellers");
const resellerPrices = require("./resellerPrices");
const products = require("./products");

const DATA_DIR = path.join(__dirname, "..", "data");
const CLICK_FILE = path.join(DATA_DIR, "reseller_clicks.json");
const REFERRAL_COOKIE = "mw_r";
const REFERRAL_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

function readClickFile() {
  try {
    if (!fs.existsSync(CLICK_FILE)) return { clicks: [] };
    return JSON.parse(fs.readFileSync(CLICK_FILE, "utf8"));
  } catch {
    return { clicks: [] };
  }
}

const clickStore = createDocumentStore("reseller_clicks", {
  empty: { clicks: [] },
  readFile: readClickFile,
  writeFile(data) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(CLICK_FILE, JSON.stringify(data, null, 2));
  },
});

function parseCookies(req) {
  const header = req.headers.cookie || "";
  const cookies = {};
  for (const part of header.split(";")) {
    if (!part.trim()) continue;
    const [key, ...rest] = part.trim().split("=");
    cookies[key] = decodeURIComponent(rest.join("="));
  }
  return cookies;
}

function cookieOptions() {
  // Frontend (Vercel/localhost:3000) and API (Railway/localhost:5000) are cross-origin.
  // Always use SameSite=None; Secure in production. In local HTTP, Lax works for localhost.
  const crossSite =
    process.env.NODE_ENV === "production" ||
    Boolean(process.env.RAILWAY_ENVIRONMENT) ||
    Boolean(process.env.CLIENT_URL && !/localhost|127\.0\.0\.1/i.test(process.env.CLIENT_URL));
  return {
    httpOnly: true,
    sameSite: crossSite ? "none" : "lax",
    secure: crossSite,
    maxAge: REFERRAL_MAX_AGE,
    path: "/",
  };
}

async function getGlobalResellerSettings() {
  const s = await settings.getAdmin();
  const minPercent = Number(s.reseller_min_percent) || 10;
  const maxPercent = Number(s.reseller_max_percent) || 40;
  const returnWindowDays = Number(s.reseller_return_window_days) || 7;
  const minPayout = Number(s.reseller_min_payout) || 2000;
  return {
    minPercent,
    maxPercent,
    returnWindowDays,
    minPayout,
    reseller_min_percent: minPercent,
    reseller_max_percent: maxPercent,
    reseller_return_window_days: returnWindowDays,
    reseller_min_payout: minPayout,
  };
}

function priceBounds(wholesale, minPercent, maxPercent) {
  const base = Math.max(0, Number(wholesale) || 0);
  const minP = Math.max(0, Number(minPercent) || 0);
  const maxP = Math.max(minP, Number(maxPercent) || minP);
  if (base <= 0) {
    return { minPrice: 0, maxPrice: 0, ready: false };
  }
  return {
    minPrice: Math.round(base * (1 + minP / 100)),
    maxPrice: Math.round(base * (1 + maxP / 100)),
    ready: true,
  };
}

async function resolveMarkupLimits(reseller) {
  const global = await getGlobalResellerSettings();
  return {
    minPercent:
      reseller?.commission_min_percent == null ? global.minPercent : Number(reseller.commission_min_percent),
    maxPercent:
      reseller?.commission_max_percent == null ? global.maxPercent : Number(reseller.commission_max_percent),
  };
}

async function approvedFromReq(req) {
  const cookies = parseCookies(req);
  const headerCode = String(req.headers["x-reseller-code"] || "")
    .trim()
    .toLowerCase();
  const code = String(cookies[REFERRAL_COOKIE] || headerCode || "")
    .trim()
    .toLowerCase();
  if (!code) return null;
  const reseller = await resellers.getByCode(code);
  if (!reseller || reseller.status !== "approved") return null;
  return reseller;
}

async function applyResellerPricing(product, req) {
  if (!product) return product;
  const retail = product.price;
  const base = { ...product, retail_price: retail, price_source: "default" };
  if (!product.reseller_enabled) return base;
  const reseller = await approvedFromReq(req);
  if (!reseller) return base;
  const priceRow = await resellerPrices.getActive(reseller.id, product.id);
  if (!priceRow) return base;
  return {
    ...base,
    price: priceRow.custom_price,
    price_source: "reseller",
    reseller_code: reseller.code,
  };
}

async function applyResellerPricingToList(productList, req) {
  const items = Array.isArray(productList) ? productList : [];
  return Promise.all(items.map((item) => applyResellerPricing(item, req)));
}

async function resolveOrderItems(rawItems, req) {
  const reseller = await approvedFromReq(req);
  let priceMap = new Map();
  if (reseller) {
    const prices = await resellerPrices.listByReseller(reseller.id);
    prices.forEach((row) => {
      if (row.is_active && Number(row.custom_price) > 0) {
        priceMap.set(row.product_id, row.custom_price);
      }
    });
  }

  let commission_total = 0;
  let attributed = false;
  const items = [];

  for (const raw of Array.isArray(rawItems) ? rawItems : []) {
    const productId = String(raw.product_id || raw.productId || "").trim();
    const product = productId ? await products.getById(productId) : null;
    const qty = Math.max(1, Math.min(10, Number(raw.qty) || 1));
    let sold = product ? product.price : Math.max(0, Number(raw.price) || 0);
    let wholesale = 0;
    let commission = 0;

    if (reseller && product?.reseller_enabled && priceMap.has(productId)) {
      const soldPrice = Number(priceMap.get(productId)) || 0;
      if (soldPrice > 0) {
        sold = soldPrice;
        wholesale = Math.max(0, Number(product.wholesale_price) || 0);
        commission = Math.max(0, Math.round((sold - wholesale) * qty));
        attributed = true;
      }
    } else if (product) {
      sold = product.price;
    }

    commission_total += commission;
    items.push({
      product_id: productId,
      name: String(raw.name || product?.name || "Suit").trim() || "Suit",
      spec: String(raw.spec || "").trim(),
      size: String(raw.size || "").trim(),
      qty,
      price: sold,
      image: String(raw.image || product?.images?.[0]?.url || "").trim(),
      slug: String(raw.slug || product?.slug || "").trim(),
      wholesale_price_snapshot: wholesale,
      sold_price_snapshot: sold,
      commission_amount: commission,
    });
  }

  return {
    items,
    reseller_id: attributed ? reseller.id : "",
    reseller_code: attributed ? reseller.code : "",
    commission_total: attributed ? commission_total : 0,
    attributed,
  };
}

async function activateReferral(code, res, pathName = "/") {
  const reseller = await resellers.getByCode(code);
  if (!reseller || reseller.status !== "approved") {
    res.clearCookie(REFERRAL_COOKIE, { ...cookieOptions(), maxAge: 0 });
    const err = new Error("Invalid or inactive referral code");
    err.status = 404;
    throw err;
  }
  res.cookie(REFERRAL_COOKIE, reseller.code, cookieOptions());
  await recordClick(reseller.code, pathName);
  return resellers.publicSafe(reseller);
}

async function recordClick(code, urlPath) {
  try {
    const reseller = await resellers.getByCode(code);
    if (!reseller) return;
    const data = await clickStore.read();
    const clicks = Array.isArray(data.clicks) ? data.clicks : [];
    clicks.unshift({
      id: crypto.randomUUID(),
      code: reseller.code,
      reseller_id: reseller.id,
      at: new Date().toISOString(),
      path: String(urlPath || "/").trim(),
    });
    await clickStore.write({ clicks: clicks.slice(0, 5000) });
  } catch {
    /* soft fail */
  }
}

async function clickStats(resellerId) {
  const data = await clickStore.read();
  const clicks = (Array.isArray(data.clicks) ? data.clicks : []).filter(
    (row) => row.reseller_id === resellerId,
  );
  return { clicks: clicks.length, total: clicks.length, recent: clicks.slice(0, 50) };
}

async function pricingForIds(ids, req) {
  const list = [];
  for (const id of ids) {
    const product = await products.getById(id);
    if (product?.is_published) list.push(await applyResellerPricing(product, req));
  }
  return list;
}

function absoluteShareUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw.startsWith("http://") ? `https://${raw.slice(7)}` : raw;
  const env = String(process.env.CLIENT_URL || process.env.PUBLIC_SITE_URL || "").trim();
  const parts = env
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const base = (parts.find((part) => part.startsWith("https://")) || parts[0] || "").replace(/\/$/, "");
  if (!base) return raw;
  return `${base}${raw.startsWith("/") ? raw : `/${raw}`}`;
}

function shareOgImage(url) {
  const absolute = absoluteShareUrl(url);
  if (!absolute) return "";
  if (!/res\.cloudinary\.com/i.test(absolute) || !absolute.includes("/upload/")) {
    return absolute;
  }
  if (/c_fill,w_1200,h_630/.test(absolute)) return absolute;
  return absolute.replace("/upload/", "/upload/c_fill,w_1200,h_630,f_jpg,q_auto:good/");
}

async function sharePreview(code, slug) {
  const reseller = await resellers.getByCode(String(code || "").trim().toLowerCase());
  if (!reseller || reseller.status !== "approved") {
    const err = new Error("Invalid or inactive referral code");
    err.status = 404;
    throw err;
  }
  const product = await products.getBySlug(String(slug || "").trim());
  if (!product || !product.is_published) {
    const err = new Error("Product not found");
    err.status = 404;
    throw err;
  }

  const adminSettings = await settings.getAdmin();
  const siteName = String(adminSettings.site_title || "Mocha Wear").trim();
  const priceRow = await resellerPrices.getActive(reseller.id, product.id);
  const imageRaw = product.images?.[0]?.url || product.image || adminSettings.og_image || "";
  const image = shareOgImage(imageRaw);
  const sellPrice = priceRow ? Number(priceRow.custom_price) : Number(product.price) || 0;
  const priceLabel = sellPrice > 0 ? `Rs. ${sellPrice.toLocaleString("en-PK")}` : "";
  const blurb = String(product.description || product.fabric || product.name || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);
  const description = [priceLabel, blurb].filter(Boolean).join(" · ");

  return {
    title: `${product.name} — ${siteName}`,
    description: description || product.name,
    image,
    image_width: 1200,
    image_height: 630,
    image_type: "image/jpeg",
    product_name: product.name,
    price: sellPrice,
    code: reseller.code,
    slug: product.slug,
    path: `/r/${reseller.code}/p/${product.slug}`,
  };
}

module.exports = {
  getGlobalResellerSettings,
  priceBounds,
  resolveMarkupLimits,
  applyResellerPricing,
  applyResellerPricingToList,
  resolveOrderItems,
  activateReferral,
  recordClick,
  clickStats,
  pricingForIds,
  sharePreview,
  parseCookies,
  REFERRAL_COOKIE,
};
