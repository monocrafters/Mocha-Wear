const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createDocumentStore } = require("./cloudStore");

const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "products.json");

function readFileStore() {
  try {
    if (!fs.existsSync(DATA_FILE)) return { products: [] };
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return { products: [] };
  }
}

const store = createDocumentStore("products", {
  empty: { products: [] },
  readFile: readFileStore,
  writeFile(data) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  },
});

async function readStore() {
  return normalize(await store.read());
}

async function writeStore(data) {
  await store.write(normalize(data));
}

function codeify(text) {
  return (
    String(text || "")
      .toUpperCase()
      .trim()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "PRODUCT"
  );
}

function slugify(text) {
  return codeify(text).toLowerCase();
}

function asBool(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  return value === "true" || value === "on" || value === "1";
}

function asNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseJson(value, fallback) {
  if (value == null || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function shapeLabels(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => ({
      id: item?.id || crypto.randomUUID(),
      label: String(item?.label || item?.name || "").trim(),
      value: String(item?.value || "").trim(),
    }))
    .filter((item) => item.label || item.value);
}

function shapeSizes(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const sizes = [];
  list.forEach((item) => {
    const value = String(typeof item === "string" ? item : item?.label || item?.value || item?.size || "")
      .trim()
      .replace(/\s+/g, " ");
    if (!value) return;
    const key = value.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    sizes.push(value);
  });
  return sizes;
}

function sameCode(a, b) {
  return codeify(a) === codeify(b);
}

function shapeImage(image, index = 0) {
  if (typeof image === "string") {
    return { id: crypto.randomUUID(), url: image, alt: "", sort_order: index };
  }
  return {
    id: image?.id || crypto.randomUUID(),
    url: String(image?.url || "").trim(),
    alt: String(image?.alt || "").trim(),
    sort_order: Number.isFinite(Number(image?.sort_order)) ? Number(image.sort_order) : index,
  };
}

function mergeImages(body = {}, existing = []) {
  const uploaded = Array.isArray(body.uploaded_images) ? body.uploaded_images : [];
  const order = parseJson(body.image_order, null);

  if (Array.isArray(order) && order.length) {
    let newIndex = 0;
    return order
      .map((slot, index) => {
        if (slot === "new" || slot?.type === "new") {
          const url = uploaded[newIndex++];
          return url ? shapeImage(url, index) : null;
        }
        const url = typeof slot === "string" ? slot : slot?.url;
        return url ? shapeImage(typeof slot === "string" ? slot : slot, index) : null;
      })
      .filter(Boolean)
      .map((item, index) => ({ ...item, sort_order: index }));
  }

  const kept = parseJson(body.existing_images, null);
  const base = Array.isArray(kept) ? kept : existing;
  return [...base.map(shapeImage).filter((item) => item.url), ...uploaded.map((url) => shapeImage(url))].map(
    (item, index) => ({ ...item, sort_order: index }),
  );
}

function shape(row = {}, index = 0) {
  const images = Array.isArray(row.images) ? row.images.map(shapeImage).filter((item) => item.url) : [];
  images.sort((a, b) => a.sort_order - b.sort_order);
  const code = codeify(row.code || row.slug || row.name || `product-${index + 1}`);
  return {
    id: row.id || crypto.randomUUID(),
    name: String(row.name || "").trim() || `Product ${index + 1}`,
    code,
    slug: slugify(code),
    collection_id: String(row.collection_id || "").trim(),
    description: String(row.description || "").trim(),
    fabric: String(row.fabric || "").trim(),
    pieces: String(row.pieces || "").trim(),
    color: String(row.color || "").trim(),
    stock:
      row.stock === undefined || row.stock === null || row.stock === ""
        ? 10
        : Math.max(0, asNumber(row.stock, 0)),
    price: asNumber(row.price, 0),
    compare_at_price: asNumber(row.compare_at_price, 0),
    wholesale_price: asNumber(row.wholesale_price, 0),
    reseller_enabled: asBool(row.reseller_enabled, false),
    badge: String(row.badge || "").trim(),
    video_url: String(row.video_url || "").trim(),
    sizes: shapeSizes(row.sizes),
    labels: shapeLabels(row.labels),
    images: images.map((item, i) => ({ ...item, sort_order: i })),
    wholesale_price: asNumber(row.wholesale_price, 0),
    reseller_enabled: asBool(row.reseller_enabled, false),
    is_on_sale: asBool(row.is_on_sale, false),
    is_published: row.is_published !== false && row.is_published !== "false",
    sort_order: asNumber(row.sort_order, index + 1),
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || row.created_at || new Date().toISOString(),
  };
}

function normalize(data = {}) {
  const products = Array.isArray(data.products) ? data.products : [];
  return { products: products.map((item, index) => shape(item, index)) };
}

function payloadFromBody(body = {}, existing = {}) {
  const name = String(body.name ?? existing.name ?? "").trim();
  if (!name) {
    const err = new Error("Name is required");
    err.status = 400;
    throw err;
  }
  const images = mergeImages(body, existing.images || []);
  const code = codeify(body.code || existing.code || body.slug || existing.slug || name);
  const clearVideo = asBool(body.clear_video, false);
  return shape({
    ...existing,
    name,
    code,
    slug: slugify(code),
    collection_id: body.collection_id ?? existing.collection_id,
    description: body.description ?? existing.description,
    fabric: body.fabric ?? existing.fabric,
    pieces: body.pieces ?? existing.pieces,
    color: body.color ?? existing.color,
    stock: body.stock ?? existing.stock,
    price: body.price ?? existing.price,
    compare_at_price: body.compare_at_price ?? existing.compare_at_price,
    wholesale_price: body.wholesale_price ?? existing.wholesale_price,
    reseller_enabled: body.reseller_enabled !== undefined ? body.reseller_enabled : existing.reseller_enabled,
    badge: body.badge ?? existing.badge,
    video_url: clearVideo ? "" : body.video_url ?? existing.video_url,
    sizes: parseJson(body.sizes, existing.sizes || []),
    labels: parseJson(body.labels, existing.labels || []),
    images,
    wholesale_price: body.wholesale_price ?? existing.wholesale_price,
    reseller_enabled: body.reseller_enabled !== undefined ? body.reseller_enabled : existing.reseller_enabled,
    is_on_sale: body.is_on_sale !== undefined ? body.is_on_sale : existing.is_on_sale,
    is_published: body.is_published !== undefined ? body.is_published : existing.is_published,
    sort_order: body.sort_order ?? existing.sort_order,
    created_at: existing.created_at,
    updated_at: new Date().toISOString(),
    id: existing.id,
  });
}

async function listAll() {
  return (await readStore()).products.sort((a, b) => a.sort_order - b.sort_order);
}

async function listPublished(filter = {}) {
  const collection = String(filter.collection || "").trim();
  return (await listAll()).filter((item) => {
    if (!item.is_published) return false;
    if (!collection) return true;
    return item.collection_id === collection;
  });
}

async function getBySlug(slug) {
  const key = String(slug || "").trim().toLowerCase();
  if (!key) return null;
  return (
    (await listAll()).find(
      (item) =>
        item.is_published &&
        (String(item.slug || "").toLowerCase() === key || String(item.code || "").toLowerCase() === key),
    ) || null
  );
}

async function getById(id) {
  return (await listAll()).find((item) => item.id === id) || null;
}

function assertResellerPricing(product) {
  if (product.reseller_enabled && !(Number(product.wholesale_price) > 0)) {
    const err = new Error("Set a wholesale price before enabling this product for resellers");
    err.status = 400;
    throw err;
  }
}

async function createOne(body) {
  const data = await readStore();
  const product = payloadFromBody(body, {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    is_published: true,
    sort_order: data.products.length + 1,
  });
  assertResellerPricing(product);
  if (data.products.some((item) => sameCode(item.code || item.slug, product.code))) {
    const err = new Error("Product code already exists");
    err.status = 409;
    throw err;
  }
  data.products.push(product);
  await writeStore(data);
  return product;
}

async function updateOne(id, body) {
  const data = await readStore();
  const index = data.products.findIndex((item) => item.id === id);
  if (index < 0) {
    const err = new Error("Product not found");
    err.status = 404;
    throw err;
  }
  const product = payloadFromBody(body, data.products[index]);
  assertResellerPricing(product);
  if (data.products.some((item) => sameCode(item.code || item.slug, product.code) && item.id !== id)) {
    const err = new Error("Product code already exists");
    err.status = 409;
    throw err;
  }
  data.products[index] = { ...product, id };
  await writeStore(data);
  return data.products[index];
}

async function removeOne(id) {
  const data = await readStore();
  if (!data.products.some((item) => item.id === id)) {
    const err = new Error("Product not found");
    err.status = 404;
    throw err;
  }
  await writeStore({ products: data.products.filter((item) => item.id !== id) });
  return { ok: true };
}

async function markSaleFlags(ids = [], on = true) {
  const set = new Set((ids || []).map(String).filter(Boolean));
  if (!set.size) return;
  const data = await readStore();
  data.products = data.products.map((item) =>
    set.has(item.id)
      ? { ...item, is_on_sale: Boolean(on), updated_at: new Date().toISOString() }
      : item,
  );
  await writeStore(data);
}

async function resolveSaleProductIds(productIds = [], collectionIds = []) {
  const ids = new Set((productIds || []).map(String).filter(Boolean));
  const collections = new Set((collectionIds || []).map(String).filter(Boolean));
  if (collections.size) {
    (await listAll()).forEach((item) => {
      if (collections.has(item.collection_id)) ids.add(item.id);
    });
  }
  return [...ids];
}

async function syncSaleProducts(previousIds = [], nextIds = []) {
  const prev = new Set((previousIds || []).map(String));
  const next = new Set((nextIds || []).map(String));
  await markSaleFlags([...next], true);
  await markSaleFlags([...prev].filter((id) => !next.has(id)), false);
}

function sendError(res, error) {
  const status = error.status || 500;
  console.error("Product error:", error.message);
  res.status(status).json({ message: error.message || "Could not save product" });
}

module.exports = {
  listAll,
  listPublished,
  getBySlug,
  getById,
  createOne,
  updateOne,
  removeOne,
  resolveSaleProductIds,
  syncSaleProducts,
  sendError,
};
