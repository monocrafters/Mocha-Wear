const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createDocumentStore } = require("./cloudStore");

const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "sales.json");

function readFileStore() {
  try {
    if (!fs.existsSync(DATA_FILE)) return { sales: [] };
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return { sales: [] };
  }
}

const store = createDocumentStore("sales", {
  empty: { sales: [] },
  readFile: readFileStore,
  writeFile(data) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  },
});

async function readSales() {
  return normalize(await store.read());
}

async function writeSales(data) {
  await store.write(normalize(data));
}

function toIso(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function asIds(value) {
  if (Array.isArray(value)) return [...new Set(value.map((item) => String(item || "").trim()).filter(Boolean))];
  if (typeof value === "string" && value.trim()) {
    try {
      return asIds(JSON.parse(value));
    } catch {
      return [value.trim()];
    }
  }
  return [];
}

function normalizeSale(sale = {}, index = 0) {
  return {
    id: sale.id || crypto.randomUUID(),
    name: String(sale.name || "").trim() || `Sale ${index + 1}`,
    headline: String(sale.headline || "").trim(),
    badge: String(sale.badge || "SALE").trim() || "SALE",
    discount_label: String(sale.discount_label || "").trim(),
    starts_at: toIso(sale.starts_at),
    ends_at: toIso(sale.ends_at),
    product_ids: asIds(sale.product_ids),
    collection_ids: asIds(sale.collection_ids),
    is_published: sale.is_published !== false,
    created_at: sale.created_at || new Date().toISOString(),
  };
}

function normalize(data = {}) {
  const sales = Array.isArray(data.sales) ? data.sales : [];
  return {
    sales: sales.map((sale, index) => normalizeSale(sale, index)),
  };
}

function coerce(body = {}) {
  const next = { ...body };
  if (typeof next.is_published === "string") {
    next.is_published = next.is_published === "true" || next.is_published === "on" || next.is_published === "1";
  }
  return next;
}

function isLive(sale, now = Date.now()) {
  if (!sale?.is_published || !sale.ends_at) return false;
  const end = new Date(sale.ends_at).getTime();
  if (Number.isNaN(end) || end <= now) return false;
  if (sale.starts_at) {
    const start = new Date(sale.starts_at).getTime();
    if (!Number.isNaN(start) && start > now) return false;
  }
  return true;
}

async function listAll() {
  return (await readSales()).sales;
}

async function listPublished() {
  return (await listAll()).filter((sale) => sale.is_published);
}

async function getById(id) {
  return (await listAll()).find((sale) => sale.id === id) || null;
}

async function getActive() {
  const sale =
    (await listPublished())
      .filter((item) => isLive(item))
      .sort((a, b) => new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime())[0] || null;
  if (!sale) return null;
  const products = require("./products");
  return {
    ...sale,
    product_ids: await products.resolveSaleProductIds(sale.product_ids, sale.collection_ids),
  };
}

async function createOne(fields) {
  const data = await readSales();
  const sale = normalizeSale({ ...coerce(fields), id: crypto.randomUUID(), created_at: new Date().toISOString() });
  data.sales.unshift(sale);
  await writeSales(data);
  return sale;
}

async function updateOne(id, fields) {
  const data = await readSales();
  const index = data.sales.findIndex((sale) => sale.id === id);
  if (index < 0) {
    const err = new Error("Sale not found");
    err.status = 404;
    throw err;
  }
  data.sales[index] = normalizeSale({ ...data.sales[index], ...coerce(fields), id });
  await writeSales(data);
  return data.sales[index];
}

async function removeOne(id) {
  const data = await readSales();
  await writeSales({ sales: data.sales.filter((sale) => sale.id !== id) });
  return { ok: true };
}

function sendError(res, error) {
  const status = error.status || 500;
  console.error("Sale error:", error.message);
  res.status(status).json({ message: error.message || "Could not save sale" });
}

module.exports = {
  listAll,
  listPublished,
  getById,
  getActive,
  isLive,
  createOne,
  updateOne,
  removeOne,
  sendError,
};
