const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createDocumentStore } = require("./cloudStore");

const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "reviews.json");

function readFileStore() {
  try {
    if (!fs.existsSync(DATA_FILE)) return { reviews: [] };
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return { reviews: [] };
  }
}

const store = createDocumentStore("reviews", {
  empty: { reviews: [] },
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

async function listAll() {
  return (await readStore()).reviews.sort((a, b) => a.sort_order - b.sort_order);
}

async function listPublished() {
  return (await listAll()).filter((item) => item.is_published);
}

async function createOne(fields) {
  const data = await readStore();
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
  await writeStore(data);
  return review;
}

async function updateOne(id, fields) {
  const data = await readStore();
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
  await writeStore(data);
  return next;
}

async function removeOne(id) {
  const data = await readStore();
  if (!data.reviews.some((item) => item.id === id)) {
    const err = new Error("Review not found");
    err.status = 404;
    throw err;
  }
  await writeStore({ reviews: data.reviews.filter((item) => item.id !== id) });
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
