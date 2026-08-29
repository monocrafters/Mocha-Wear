const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createDocumentStore } = require("./cloudStore");

const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "reseller_product_prices.json");

function readFileStore() {
  try {
    if (!fs.existsSync(DATA_FILE)) return { prices: [] };
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return { prices: [] };
  }
}

const store = createDocumentStore("reseller_product_prices", {
  empty: { prices: [] },
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

function shapePrice(row = {}) {
  return {
    id: row.id || crypto.randomUUID(),
    reseller_id: String(row.reseller_id || "").trim(),
    product_id: String(row.product_id || "").trim(),
    custom_price: Math.round(Number(row.custom_price) || 0),
    is_active: row.is_active !== false && row.is_active !== "false",
    updated_at: row.updated_at || new Date().toISOString(),
  };
}

function normalize(data = {}) {
  const prices = Array.isArray(data.prices) ? data.prices : [];
  return { prices: prices.map(shapePrice) };
}

async function listByReseller(resellerId) {
  const data = await readStore();
  return data.prices.filter((p) => p.reseller_id === resellerId);
}

async function getActive(resellerId, productId) {
  const data = await readStore();
  return (
    data.prices.find(
      (p) =>
        p.reseller_id === resellerId &&
        p.product_id === productId &&
        p.is_active &&
        Number(p.custom_price) > 0,
    ) || null
  );
}

async function upsertPrice(resellerId, productId, { custom_price, is_active }, bounds = {}) {
  const { minPrice, maxPrice, ready } = bounds;
  if (ready === false || !(Number(minPrice) > 0) || !(Number(maxPrice) > 0)) {
    const err = new Error("Wholesale price is not set for this product. Ask admin to set it first.");
    err.status = 400;
    throw err;
  }

  if (custom_price === null || custom_price === undefined || custom_price === "") {
    const err = new Error("Enter your selling price");
    err.status = 400;
    throw err;
  }

  const price = Math.round(Number(custom_price));
  if (!Number.isFinite(price) || price <= 0) {
    const err = new Error("Enter a valid selling price");
    err.status = 400;
    throw err;
  }

  if (price < minPrice || price > maxPrice) {
    const err = new Error(`Price must be between PKR ${minPrice} and PKR ${maxPrice}`);
    err.status = 400;
    throw err;
  }

  const data = await readStore();
  const index = data.prices.findIndex(
    (p) => p.reseller_id === resellerId && p.product_id === productId,
  );

  const row = shapePrice({
    id: index >= 0 ? data.prices[index].id : crypto.randomUUID(),
    reseller_id: resellerId,
    product_id: productId,
    custom_price: price,
    is_active: is_active !== undefined ? is_active : true,
    updated_at: new Date().toISOString(),
  });

  if (index >= 0) {
    data.prices[index] = row;
  } else {
    data.prices.push(row);
  }

  await writeStore(data);
  return row;
}

function sendError(res, error) {
  const status = error.status || 500;
  console.error("Reseller price error:", error.message);
  res.status(status).json({ message: error.message || "Could not process price request" });
}

module.exports = {
  listByReseller,
  getActive,
  upsertPrice,
  sendError,
};
