const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "reviews.json");

function ensureFile() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    writeStore({ reviews: [] });
  }
}

function readStore() {
  ensureFile();
  try {
    return normalize(JSON.parse(fs.readFileSync(DATA_FILE, "utf8")));
  } catch {
    const fallback = normalize({ reviews: [] });
    writeStore(fallback);
    return fallback;
  }
}

function writeStore(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(normalize(data), null, 2));
}

function asBool(value, fallback = true) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  return value === "true" || value === "on" || value === "1";
}

function asRating(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 5;
  return Math.min(5, Math.max(1, Math.round(n)));
}

function shape(row = {}, index = 0) {
  return {
    id: row.id || crypto.randomUUID(),
    name: String(row.name || "").trim() || `Customer ${index + 1}`,
    city: String(row.city || "").trim(),
    quote: String(row.quote || "").trim(),
    rating: asRating(row.rating),
    product_id: String(row.product_id || "").trim(),
    is_published: row.is_published !== false && row.is_published !== "false",
    sort_order: Number(row.sort_order) || index + 1,
    created_at: row.created_at || new Date().toISOString(),
  };
}

function normalize(data = {}) {
  const reviews = Array.isArray(data.reviews) ? data.reviews : [];
  return { reviews: reviews.map((item, index) => shape(item, index)) };
}

function listAll() {
  return readStore().reviews.sort((a, b) => a.sort_order - b.sort_order);
}

function listPublished() {
  return listAll().filter((item) => item.is_published);
}

function createOne(fields) {
  const data = readStore();
  const review = shape({
    ...fields,
    is_published: asBool(fields.is_published, true),
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    sort_order: Number(fields.sort_order) || data.reviews.length + 1,
  });
  if (!review.quote) {
    const err = new Error("Review text is required");
    err.status = 400;
    throw err;
  }
  data.reviews.push(review);
  writeStore(data);
  return review;
}

function updateOne(id, fields) {
  const data = readStore();
  const index = data.reviews.findIndex((item) => item.id === id);
  if (index < 0) {
    const err = new Error("Review not found");
    err.status = 404;
    throw err;
  }
  const next = shape({
    ...data.reviews[index],
    ...fields,
    is_published: fields.is_published !== undefined ? asBool(fields.is_published, true) : data.reviews[index].is_published,
    id,
    created_at: data.reviews[index].created_at,
  });
  if (!next.quote) {
    const err = new Error("Review text is required");
    err.status = 400;
    throw err;
  }
  data.reviews[index] = next;
  writeStore(data);
  return next;
}

function removeOne(id) {
  const data = readStore();
  if (!data.reviews.some((item) => item.id === id)) {
    const err = new Error("Review not found");
    err.status = 404;
    throw err;
  }
  writeStore({ reviews: data.reviews.filter((item) => item.id !== id) });
  return { ok: true };
}

function sendError(res, error) {
  const status = error.status || 500;
  console.error("Review error:", error.message);
  res.status(status).json({ message: error.message || "Could not save review" });
}

module.exports = {
  listAll,
  listPublished,
  createOne,
  updateOne,
  removeOne,
  sendError,
};
