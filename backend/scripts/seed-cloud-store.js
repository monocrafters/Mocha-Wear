require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const fs = require("fs");
const path = require("path");
const { writeDocument } = require("../src/cloudStore");

const DATA_DIR = path.join(__dirname, "..", "data");
const FILES = {
  products: "products.json",
  collections: "collections.json",
  sales: "sales.json",
  hero: "hero.json",
  reviews: "reviews.json",
  help: "help.json",
  settings: "settings.json",
};

function summarize(kind, value) {
  if (Array.isArray(value)) return `${value.length} items`;
  if (Array.isArray(value?.products)) return `${value.products.length} products`;
  if (Array.isArray(value?.sales)) return `${value.sales.length} sales`;
  if (Array.isArray(value?.slides)) return `${value.slides.length} slides`;
  if (Array.isArray(value?.reviews)) return `${value.reviews.length} reviews`;
  return "ok";
}

(async () => {
  for (const [kind, file] of Object.entries(FILES)) {
    const full = path.join(DATA_DIR, file);
    if (!fs.existsSync(full)) {
      console.log("skip missing", kind);
      continue;
    }
    const value = JSON.parse(fs.readFileSync(full, "utf8"));
    await writeDocument(kind, value);
    console.log("seeded", kind, summarize(kind, value));
  }
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
