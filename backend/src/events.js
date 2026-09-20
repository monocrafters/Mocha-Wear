const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createDocumentStore } = require("./cloudStore");

const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "events.json");
const MAX_EVENTS = 8000;
const geoCache = new Map();
const recentHits = new Map();

function readFileStore() {
  try {
    if (!fs.existsSync(DATA_FILE)) return { events: [] };
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return { events: [] };
  }
}

const store = createDocumentStore("events", {
  empty: { events: [] },
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

function shape(row = {}) {
  return {
    id: row.id || crypto.randomUUID(),
    type: row.type === "click" ? "click" : "page_view",
    path: String(row.path || "/").trim() || "/",
    label: String(row.label || "").trim().slice(0, 160),
    href: String(row.href || "").trim().slice(0, 400),
    referrer: String(row.referrer || "").trim().slice(0, 400),
    city: String(row.city || "").trim().slice(0, 80),
    region: String(row.region || "").trim().slice(0, 80),
    country: String(row.country || "").trim().slice(0, 80),
    country_code: String(row.country_code || "").trim().slice(0, 8).toUpperCase(),
    ip: String(row.ip || "").trim().slice(0, 64),
    device: String(row.device || "").trim().slice(0, 40),
    created_at: row.created_at || new Date().toISOString(),
  };
}

function normalize(data = {}) {
  const events = Array.isArray(data.events) ? data.events.map((row) => shape(row)) : [];
  return { events: events.slice(0, MAX_EVENTS) };
}

function clientIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "")
    .split(",")[0]
    .trim();
  const real = String(req.headers["x-real-ip"] || "").trim();
  const raw = forwarded || real || req.ip || req.socket?.remoteAddress || "";
  return String(raw).replace(/^::ffff:/, "").trim();
}

function detectDevice(ua = "") {
  const value = String(ua || "").toLowerCase();
  if (!value) return "unknown";
  if (/ipad|tablet/.test(value)) return "tablet";
  if (/mobi|iphone|android/.test(value)) return "mobile";
  return "desktop";
}

function throttleKey(ip, type, path) {
  return `${ip}|${type}|${path}`;
}

function shouldThrottle(ip, type, path) {
  const key = throttleKey(ip, type, path);
  const now = Date.now();
  const last = recentHits.get(key) || 0;
  const windowMs = type === "page_view" ? 20_000 : 4_000;
  if (now - last < windowMs) return true;
  recentHits.set(key, now);
  if (recentHits.size > 20_000) {
    for (const [entry, ts] of recentHits) {
      if (now - ts > 60_000) recentHits.delete(entry);
    }
  }
  return false;
}

async function lookupGeo(ip, hints = {}) {
  if (hints.city || hints.country) {
    return {
      city: String(hints.city || "").trim(),
      region: String(hints.region || "").trim(),
      country: String(hints.country || "").trim(),
      country_code: String(hints.country_code || "").trim().toUpperCase(),
    };
  }

  const safeIp = String(ip || "").trim();
  if (!safeIp || safeIp === "127.0.0.1" || safeIp === "::1" || safeIp.startsWith("192.168.") || safeIp.startsWith("10.")) {
    return { city: "Local", region: "", country: "Local", country_code: "" };
  }

  const cached = geoCache.get(safeIp);
  if (cached && Date.now() - cached.at < 24 * 60 * 60 * 1000) return cached.value;

  try {
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(safeIp)}?fields=status,country,countryCode,regionName,city`,
      { signal: AbortSignal.timeout(2500) },
    );
    const json = await res.json();
    if (json?.status === "success") {
      const value = {
        city: String(json.city || "").trim(),
        region: String(json.regionName || "").trim(),
        country: String(json.country || "").trim(),
        country_code: String(json.countryCode || "").trim().toUpperCase(),
      };
      geoCache.set(safeIp, { at: Date.now(), value });
      return value;
    }
  } catch {
    /* ignore geo failures */
  }

  return { city: "", region: "", country: "Unknown", country_code: "" };
}

function locationLabel(event) {
  const parts = [event.city, event.region, event.country].filter(Boolean);
  return parts.join(", ") || "Unknown";
}

async function track(body = {}, req) {
  const type = body.type === "click" ? "click" : "page_view";
  const pathName = String(body.path || "/").trim() || "/";
  if (pathName.startsWith("/admin") || pathName.startsWith("/reseller") || pathName.startsWith("/Admin") || pathName.startsWith("/Reseller")) {
    return null;
  }

  const ip = clientIp(req);
  if (shouldThrottle(ip, type, pathName)) return null;

  const geo = await lookupGeo(ip, {
    city: body.city,
    region: body.region,
    country: body.country,
    country_code: body.country_code,
  });

  const event = shape({
    type,
    path: pathName.slice(0, 300),
    label: body.label,
    href: body.href,
    referrer: body.referrer,
    city: geo.city,
    region: geo.region,
    country: geo.country,
    country_code: geo.country_code,
    ip,
    device: body.device || detectDevice(req.headers["user-agent"]),
    created_at: new Date().toISOString(),
  });

  const data = await readStore();
  data.events.unshift(event);
  if (data.events.length > MAX_EVENTS) data.events.length = MAX_EVENTS;
  await writeStore(data);
  return event;
}

function withinDays(iso, days) {
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts <= days * 24 * 60 * 60 * 1000;
}

function bump(map, key, amount = 1) {
  const id = String(key || "Unknown").trim() || "Unknown";
  map.set(id, (map.get(id) || 0) + amount);
}

function topEntries(map, limit = 20) {
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit);
}

async function summary({ days = 7 } = {}) {
  const windowDays = Math.min(90, Math.max(1, Number(days) || 7));
  const data = await readStore();
  const items = data.events.filter((event) => withinDays(event.created_at, windowDays));

  const pages = new Map();
  const locations = new Map();
  const pageLocations = new Map();
  const devices = new Map();
  let pageViews = 0;
  let clicks = 0;

  for (const event of items) {
    if (event.type === "click") clicks += 1;
    else pageViews += 1;

    bump(pages, event.path);
    const loc = locationLabel(event);
    bump(locations, loc);
    bump(devices, event.device || "unknown");
    bump(pageLocations, `${event.path}|||${loc}`);
  }

  return {
    days: windowDays,
    totals: {
      events: items.length,
      page_views: pageViews,
      clicks,
      pages: pages.size,
      locations: locations.size,
    },
    pages: topEntries(pages, 40),
    locations: topEntries(locations, 40),
    devices: topEntries(devices, 10),
    page_locations: topEntries(pageLocations, 60).map((row) => {
      const [page, location] = row.name.split("|||");
      return { page, location, count: row.count };
    }),
    recent: items.slice(0, 80).map((event) => ({
      ...event,
      location: locationLabel(event),
    })),
  };
}

function sendError(res, error) {
  const status = error.status || 500;
  console.error("Events error:", error.message);
  res.status(status).json({ message: error.message || "Could not save event" });
}

module.exports = {
  track,
  summary,
  sendError,
};
