const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "settings.json");

const DEFAULT_NOTES = [
  { title: "Free delivery", copy: "On every order. 3–5 days, nationwide." },
  { title: "Easy exchange", copy: "7 days on unworn pieces, tags still on." },
  { title: "Cash on delivery", copy: "Pay at the door. Simple, no extra steps." },
  { title: "Need a size?", copy: "Message us on WhatsApp — we help you pick." },
];

function emptySettings() {
  return {
    brand_name: "Mocha",
    brand_suffix: "Wear",
    tagline:
      "A ladies-suit atelier for the modern wardrobe — warm palettes, considered embroidery, and sale drops worth dressing for.",
    site_title: "Mocha Wear — Ladies Suits Sale",
    site_description: "Mocha Wear mid-season sale. Lawn, pret, and formal ladies suits up to 50% off.",
    email: "hello@mochawear.com",
    phone: "",
    cities: "Karachi · Lahore · Islamabad",
    delivery_line: "Free nationwide delivery",
    mobile_line: "Free nationwide delivery · Cash on delivery",
    instagram: "@mochawear",
    instagram_url: "",
    floating_whatsapp_enabled: true,
    floating_whatsapp_number: "",
    floating_whatsapp_message: "Hi Mocha Wear, I have a question.",
    marquee: ["Sale", "Lawn", "Formals", "Pret", "Mocha Wear"],
    visit_heading: "Visit",
    atelier_heading: "Atelier",
    copyright: "© {year} Mocha Wear · All rights reserved",
    collections_kicker: "Shop by collection",
    collections_heading: "Collections",
    collections_all_label: "All collections",
    products_kicker: "Selected for her",
    products_heading: "Sale suits",
    products_copy: "2 & 3 piece lawn, pret, and formals — marked down for a limited season.",
    shop_kicker: "On sale",
    shop_heading: "Shop suits",
    reviews_kicker: "Loved by her",
    reviews_heading: "Real notes from the sale.",
    reviews_aside: "Pakistan",
    notes_kicker: "Before you buy",
    notes_heading: "Delivery, exchange, and a little help.",
    notes_cta: "Open support",
    notes: DEFAULT_NOTES,
    newsletter_enabled: true,
    newsletter_kicker: "Join the list",
    newsletter_heading: "First look at the next drop.",
    newsletter_placeholder: "Email address",
    newsletter_button: "Subscribe",
  };
}

function ensureFile() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    writeSettings(emptySettings());
  }
}

function readSettings() {
  ensureFile();
  try {
    return normalize(JSON.parse(fs.readFileSync(DATA_FILE, "utf8")));
  } catch {
    const fallback = normalize(emptySettings());
    writeSettings(fallback);
    return fallback;
  }
}

function writeSettings(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(normalize(data), null, 2));
}

function toBool(value, fallback = true) {
  if (value === true || value === "true" || value === "on" || value === "1") return true;
  if (value === false || value === "false" || value === "off" || value === "0") return false;
  return fallback;
}

function text(value, fallback = "") {
  if (value === undefined || value === null) return fallback;
  return String(value).trim();
}

function normalizeMarquee(value) {
  if (typeof value === "string") {
    return value
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }
  return [];
}

function normalizeNote(note = {}, index = 0) {
  return {
    id: note.id || crypto.randomUUID(),
    title: String(note.title || "").trim(),
    copy: String(note.copy || "").trim(),
    sort_order: Number(note.sort_order) || index + 1,
  };
}

function normalize(data = {}) {
  const fallback = emptySettings();
  const marquee = normalizeMarquee(data.marquee);
  const notes = Array.isArray(data.notes) ? data.notes : fallback.notes;
  return {
    brand_name: text(data.brand_name, fallback.brand_name),
    brand_suffix: text(data.brand_suffix, fallback.brand_suffix),
    tagline: text(data.tagline, fallback.tagline),
    site_title: text(data.site_title, fallback.site_title),
    site_description: text(data.site_description, fallback.site_description),
    email: text(data.email, fallback.email),
    phone: text(data.phone),
    cities: text(data.cities, fallback.cities),
    delivery_line: text(data.delivery_line, fallback.delivery_line),
    mobile_line: text(data.mobile_line, fallback.mobile_line),
    instagram: text(data.instagram, fallback.instagram),
    instagram_url: text(data.instagram_url),
    floating_whatsapp_enabled: toBool(data.floating_whatsapp_enabled, fallback.floating_whatsapp_enabled),
    floating_whatsapp_number: text(data.floating_whatsapp_number),
    floating_whatsapp_message: text(data.floating_whatsapp_message, fallback.floating_whatsapp_message),
    marquee: marquee.length ? marquee : fallback.marquee,
    visit_heading: text(data.visit_heading, fallback.visit_heading),
    atelier_heading: text(data.atelier_heading, fallback.atelier_heading),
    copyright: text(data.copyright, fallback.copyright),
    collections_kicker: text(data.collections_kicker, fallback.collections_kicker),
    collections_heading: text(data.collections_heading, fallback.collections_heading),
    collections_all_label: text(data.collections_all_label, fallback.collections_all_label),
    products_kicker: text(data.products_kicker, fallback.products_kicker),
    products_heading: text(data.products_heading, fallback.products_heading),
    products_copy: text(data.products_copy, fallback.products_copy),
    shop_kicker: text(data.shop_kicker, fallback.shop_kicker),
    shop_heading: text(data.shop_heading, fallback.shop_heading),
    reviews_kicker: text(data.reviews_kicker, fallback.reviews_kicker),
    reviews_heading: text(data.reviews_heading, fallback.reviews_heading),
    reviews_aside: text(data.reviews_aside, fallback.reviews_aside),
    notes_kicker: text(data.notes_kicker, fallback.notes_kicker),
    notes_heading: text(data.notes_heading, fallback.notes_heading),
    notes_cta: text(data.notes_cta, fallback.notes_cta),
    notes: notes
      .map((note, index) => normalizeNote(note, index))
      .filter((note) => note.title || note.copy)
      .sort((a, b) => a.sort_order - b.sort_order),
    newsletter_enabled: toBool(data.newsletter_enabled, fallback.newsletter_enabled),
    newsletter_kicker: text(data.newsletter_kicker, fallback.newsletter_kicker),
    newsletter_heading: text(data.newsletter_heading, fallback.newsletter_heading),
    newsletter_placeholder: text(data.newsletter_placeholder, fallback.newsletter_placeholder),
    newsletter_button: text(data.newsletter_button, fallback.newsletter_button),
  };
}

function getPublic() {
  return readSettings();
}

function getAdmin() {
  return readSettings();
}

function updateSettings(fields = {}) {
  const current = readSettings();
  const next = normalize({ ...current, ...fields });
  writeSettings(next);
  return next;
}

function sendError(res, error) {
  const status = error.status || 500;
  console.error("Settings error:", error.message);
  res.status(status).json({ message: error.message || "Could not save settings" });
}

module.exports = {
  getPublic,
  getAdmin,
  updateSettings,
  sendError,
};
