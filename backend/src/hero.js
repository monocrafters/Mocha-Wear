const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createDocumentStore } = require("./cloudStore");

const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "hero.json");

const EMPTY_COPY = {
  kicker: "",
  heading: "",
  heading_accent: "",
  description: "",
  primary_cta_label: "Shop now",
  primary_cta_link: "#shop",
  secondary_cta_label: "Browse collections",
  secondary_cta_link: "#collections",
  sale_tag_label: "Sale",
  sale_tag_value: "",
  sale_tag_visible: false,
};

const EMPTY_IMAGE_COPY = {
  kicker: "",
  heading: "",
  heading_accent: "",
  description: "",
  primary_cta_label: "",
  primary_cta_link: "",
  secondary_cta_label: "",
  secondary_cta_link: "",
  sale_tag_label: "Sale",
  sale_tag_value: "",
  sale_tag_visible: false,
  sale_badge_enabled: false,
  sale_badge_text: "SALE",
  sale_id: "",
  product_id: "",
};

function readFileStore() {
  try {
    if (!fs.existsSync(DATA_FILE)) return { slides: [] };
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return { slides: [] };
  }
}

const store = createDocumentStore("hero", {
  empty: { slides: [] },
  readFile: readFileStore,
  writeFile(data) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  },
});

async function readHero() {
  return normalize(await store.read());
}

async function writeHero(data) {
  await store.write(normalize(data));
}

function isAccentValue(value = "") {
  return /%|rs\.?|pkr|\$/i.test(String(value));
}

function normalizeLabel(item = {}, index = 0) {
  const label = String(item.label || "").trim();
  const value = String(item.value || "").trim();
  return {
    id: item.id || crypto.randomUUID(),
    label,
    value,
    accent:
      item.accent === true || item.accent === "true"
        ? true
        : item.accent === false || item.accent === "false"
          ? false
          : isAccentValue(value),
    strike:
      item.strike === true || item.strike === "true"
        ? true
        : item.strike === false || item.strike === "false"
          ? false
          : /^was$/i.test(label),
    sort_order: Number(item.sort_order) || index + 1,
  };
}

function labelsFromLegacy(source = {}) {
  return [1, 2, 3]
    .map((n) => ({
      label: source[`stat_${n}_label`] || "",
      value: source[`stat_${n}_value`] || "",
    }))
    .filter((item) => item.label || item.value)
    .map((item, index) => normalizeLabel(item, index));
}

function normalizeLabels(source = {}) {
  if (typeof source.labels === "string") {
    try {
      source = { ...source, labels: JSON.parse(source.labels) };
    } catch {
      source = { ...source, labels: [] };
    }
  }
  if (Array.isArray(source.labels)) {
    return source.labels
      .map((item, index) => normalizeLabel(item, index))
      .filter((item) => item.label || item.value)
      .sort((a, b) => a.sort_order - b.sort_order);
  }
  const legacy = labelsFromLegacy(source);
  if (legacy.length) return legacy;
  return [];
}

function copyFrom(source = {}, fallback = EMPTY_COPY) {
  return {
    kicker: source.kicker ?? fallback.kicker ?? "",
    heading: source.heading ?? fallback.heading ?? "",
    heading_accent: source.heading_accent ?? fallback.heading_accent ?? "",
    description: source.description ?? fallback.description ?? "",
    primary_cta_label: source.primary_cta_label ?? fallback.primary_cta_label ?? "",
    primary_cta_link: source.primary_cta_link ?? fallback.primary_cta_link ?? "#shop",
    secondary_cta_label: source.secondary_cta_label ?? fallback.secondary_cta_label ?? "",
    secondary_cta_link: source.secondary_cta_link ?? fallback.secondary_cta_link ?? "#collections",
    labels: normalizeLabels(source),
    sale_tag_label: source.sale_tag_label ?? fallback.sale_tag_label ?? "Sale",
    sale_tag_value: source.sale_tag_value ?? fallback.sale_tag_value ?? "",
    sale_tag_visible: source.sale_tag_visible !== false,
    sale_badge_enabled: source.sale_badge_enabled === true || source.sale_badge_enabled === "true",
    sale_badge_text: source.sale_badge_text ?? "SALE",
    sale_id: source.sale_id ?? "",
    product_id: String(source.product_id || "").trim(),
  };
}

function normalizeSlide(slide = {}, index = 0, legacy = {}) {
  const kind = slide.kind === "image" ? "image" : "slide";
  const hasOwnCopy = Boolean(slide.heading || slide.kicker || (Array.isArray(slide.labels) && slide.labels.length));
  const source = hasOwnCopy ? slide : { ...legacy, ...slide };
  const copy = copyFrom(source, kind === "image" ? EMPTY_IMAGE_COPY : EMPTY_COPY);
  return {
    id: slide.id || crypto.randomUUID(),
    kind,
    image: slide.image || "",
    video: kind === "image" ? "" : slide.video || "",
    alt: slide.alt || "",
    sort_order: Number(slide.sort_order) || index + 1,
    is_published: slide.is_published !== false,
    ...(kind === "image"
      ? {
          ...copy,
          kicker: "",
          heading: "",
          heading_accent: "",
          description: "",
          primary_cta_label: "",
          primary_cta_link: "",
          secondary_cta_label: "",
          secondary_cta_link: "",
          labels: [],
          sale_tag_visible: false,
          sale_badge_enabled: false,
          product_id: "",
          sale_id: "",
        }
      : copy),
  };
}

function normalize(data = {}) {
  const slides = Array.isArray(data.slides) ? data.slides : [];
  return {
    slides: slides.map((slide, index) => normalizeSlide(slide, index, data)).sort((a, b) => a.sort_order - b.sort_order),
  };
}

function coerce(body = {}) {
  const next = { ...body };
  ["sale_tag_visible", "is_published", "sale_badge_enabled"].forEach((key) => {
    if (typeof next[key] === "string") {
      next[key] = next[key] === "true" || next[key] === "on" || next[key] === "1";
    }
  });
  if (typeof next.sort_order === "string") next.sort_order = Number(next.sort_order);
  if (typeof next.labels === "string") {
    try {
      next.labels = JSON.parse(next.labels);
    } catch {
      next.labels = [];
    }
  }
  return next;
}

function productHref(product) {
  const code = String(product.code || product.slug || "").trim();
  return code ? `/products/${code}` : "/shop";
}

function collectionHref(collection) {
  const code = String(collection.code || collection.slug || "").trim();
  return code ? `/collections/${code}` : "/collections";
}

async function getPublic() {
  const hero = await readHero();
  const sales = require("./sales");
  const products = require("./products");
  const collections = require("./collections");
  const [{ items: collectionItems }, productItems, saleItems] = await Promise.all([
    collections.listAll(),
    products.listAll(),
    sales.listAll(),
  ]);
  const collectionById = new Map(collectionItems.map((item) => [item.id, item]));
  const productById = new Map(productItems.map((item) => [item.id, item]));
  const saleById = new Map(saleItems.map((item) => [item.id, item]));

  const slides = [];
  for (const slide of hero.slides.filter((item) => item.is_published && (item.image || item.video))) {
    const sale = slide.sale_id ? saleById.get(slide.sale_id) || null : null;
    const product = slide.product_id ? productById.get(slide.product_id) || null : null;
    const liveProduct = product && product.is_published ? product : null;
    const collection = liveProduct?.collection_id ? collectionById.get(liveProduct.collection_id) : null;
    slides.push({
      ...slide,
      primary_cta_link: liveProduct ? productHref(liveProduct) : slide.primary_cta_link || "#shop",
      secondary_cta_link: collection
        ? collectionHref(collection)
        : slide.secondary_cta_link || "#collections",
      sale: sale && sale.is_published ? sale : null,
      product: liveProduct
        ? {
            id: liveProduct.id,
            name: liveProduct.name,
            code: liveProduct.code || liveProduct.slug || "",
            collection_id: liveProduct.collection_id || "",
          }
        : null,
    });
  }
  return { slides };
}

async function getAdmin() {
  return readHero();
}

async function addSlide(fields) {
  fields = coerce(fields);
  const hero = await readHero();
  const kind = fields.kind === "image" ? "image" : "slide";
  const slide = normalizeSlide(
    {
      ...(kind === "image" ? EMPTY_IMAGE_COPY : EMPTY_COPY),
      ...fields,
      kind,
      id: crypto.randomUUID(),
      sort_order: Number(fields.sort_order) || hero.slides.length + 1,
      is_published: fields.is_published !== false,
    },
    hero.slides.length,
  );
  hero.slides.push(slide);
  await writeHero(hero);
  return slide;
}

async function updateSlide(id, fields) {
  const hero = await readHero();
  const index = hero.slides.findIndex((slide) => slide.id === id);
  if (index < 0) {
    const err = new Error("Slide not found");
    err.status = 404;
    throw err;
  }
  const next = coerce(fields);
  hero.slides[index] = normalizeSlide({ ...hero.slides[index], ...next, id }, index);
  await writeHero(hero);
  return hero.slides[index];
}

async function removeSlide(id) {
  const hero = await readHero();
  await writeHero({
    slides: hero.slides.filter((slide) => slide.id !== id).map((slide, index) => ({
      ...slide,
      sort_order: index + 1,
    })),
  });
  return { ok: true };
}

async function reorderSlides(ids = []) {
  if (!Array.isArray(ids) || !ids.length) {
    const err = new Error("Slide order is required");
    err.status = 400;
    throw err;
  }
  const hero = await readHero();
  const map = new Map(hero.slides.map((slide) => [slide.id, slide]));
  const ordered = [];
  ids.forEach((id) => {
    const slide = map.get(id);
    if (slide) {
      ordered.push(slide);
      map.delete(id);
    }
  });
  map.forEach((slide) => ordered.push(slide));
  await writeHero({
    slides: ordered.map((slide, index) => ({ ...slide, sort_order: index + 1 })),
  });
  return (await readHero()).slides;
}

function sendError(res, error) {
  const status = error.status || 500;
  console.error("Hero error:", error.message);
  res.status(status).json({ message: error.message || "Could not save hero" });
}

module.exports = {
  getPublic,
  getAdmin,
  addSlide,
  updateSlide,
  removeSlide,
  reorderSlides,
  sendError,
};
