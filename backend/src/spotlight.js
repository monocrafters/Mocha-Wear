const fs = require("fs");
const path = require("path");
const { createDocumentStore } = require("./cloudStore");
const defaults = require("./spotlight-defaults.json");

const file = path.join(__dirname, "../data/spotlight.json");
const store = createDocumentStore("collection_spotlight", {
  empty: defaults,
  readFile: () =>
    fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : defaults,
  writeFile: (data) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  },
});

function fail(message) {
  throw Object.assign(new Error(message), { status: 400 });
}

function imageUrl(value) {
  const url = String(value || "").trim();
  if (!url) return "";
  if (/^\/images\/collections\/[a-z0-9-]+\.(png|webp|jpg)$/i.test(url)) return url;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" && parsed.hostname === "res.cloudinary.com") {
      return url;
    }
  } catch {}
  return fail("Use an uploaded Cloudinary image or a bundled collection image.");
}

function validate(body, collections) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    fail("Collection hero settings are required.");
  }
  if (typeof body.enabled !== "boolean" || typeof body.autoplay !== "boolean") {
    fail("Enabled and autoplay must be boolean.");
  }
  if (!Number.isInteger(body.interval) || body.interval < 4000 || body.interval > 15000) {
    fail("Rotation must be between 4 and 15 seconds.");
  }
  if (!Array.isArray(body.items) || body.items.length > 30) {
    fail("Use at most 30 collection entries.");
  }

  const collectionIds = new Set(collections.map((collection) => collection.id));
  const seen = new Set();
  const items = body.items.map((item) => {
    if (!item || typeof item !== "object" || !collectionIds.has(item.collection_id)) {
      fail("Select an existing collection.");
    }
    if (seen.has(item.collection_id)) fail("Each collection can appear once.");
    seen.add(item.collection_id);
    if (typeof item.enabled !== "boolean") fail("Publication must be boolean.");
    const title = String(item.title || "").trim().slice(0, 100);
    if (!title) fail("A title is required.");
    const image = imageUrl(item.image);
    if (item.enabled && !image) {
      fail(`Add collection artwork before publishing ${title}.`);
    }

    return {
      id: item.collection_id,
      collection_id: item.collection_id,
      title,
      description: String(item.description || "").trim().slice(0, 350),
      image,
      background: imageUrl(item.background),
      enabled: item.enabled,
    };
  });

  return { enabled: body.enabled, autoplay: body.autoplay, interval: body.interval, items };
}

async function getAdmin() {
  return store.read();
}

async function save(body) {
  const { items } = await require("./collections").listAll();
  const data = validate(body, items);
  await store.write(data);
  return data;
}

async function getPublic() {
  const config = await getAdmin();
  const publishedIds = new Set(
    (await require("./collections").listPublished()).map((collection) => collection.id),
  );
  return {
    ...config,
    items: config.items.filter((item) => item.enabled && publishedIds.has(item.collection_id)),
  };
}

module.exports = { getAdmin, getPublic, save, validate };
