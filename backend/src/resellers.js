const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createDocumentStore } = require("./cloudStore");

const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "resellers.json");
const CODE_CHARS = "23456789abcdefghjkmnpqrstuvwxyz";
const SCRYPT_OPTS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

function readFileStore() {
  try {
    if (!fs.existsSync(DATA_FILE)) return { resellers: [] };
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return { resellers: [] };
  }
}

const store = createDocumentStore("resellers", {
  empty: { resellers: [] },
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

function asNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function nullablePercent(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, 64, SCRYPT_OPTS).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, stored) {
  const parts = String(stored || "").split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, expected] = parts;
  const hash = crypto.scryptSync(String(password), salt, 64, SCRYPT_OPTS).toString("hex");
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function generateCode(length = 7) {
  let out = "";
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i += 1) {
    out += CODE_CHARS[bytes[i] % CODE_CHARS.length];
  }
  return out;
}

function shapeDnsRecords(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((row) => ({
      type: String(row?.type || "").toUpperCase(),
      name: String(row?.name || "@").trim() || "@",
      value: String(row?.value || "").trim(),
    }))
    .filter((row) => row.type && row.value);
}

function shapeDomainStatus(value) {
  const status = String(value || "none").trim().toLowerCase();
  return ["none", "pending_dns", "live", "error", "suspended"].includes(status) ? status : "none";
}

function shape(row = {}, index = 0) {
  const created = row.created_at || new Date().toISOString();
  const previous = Array.isArray(row.previous_codes)
    ? row.previous_codes.map((c) => String(c || "").trim().toLowerCase()).filter(Boolean)
    : [];
  return {
    id: row.id || crypto.randomUUID(),
    name: String(row.name || "").trim() || `Reseller ${index + 1}`,
    email: String(row.email || "").trim(),
    phone: String(row.phone || "").trim(),
    social_handle: String(row.social_handle || "").trim(),
    username: String(row.username || "").trim().toLowerCase(),
    password_hash: String(row.password_hash || ""),
    code: String(row.code || "").trim().toLowerCase(),
    previous_codes: [...new Set(previous)].slice(-10),
    custom_domain: String(row.custom_domain || "")
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "")
      .replace(/^www\./, ""),
    custom_domain_status: shapeDomainStatus(
      row.custom_domain ? row.custom_domain_status || "pending_dns" : "none",
    ),
    custom_domain_dns: shapeDnsRecords(row.custom_domain_dns),
    custom_domain_error: String(row.custom_domain_error || "").trim(),
    custom_domain_verified_at: String(row.custom_domain_verified_at || "").trim(),
    status: row.status === "suspended" ? "suspended" : "approved",
    commission_min_percent: nullablePercent(row.commission_min_percent),
    commission_max_percent: nullablePercent(row.commission_max_percent),
    wallet_pending: Math.max(0, asNumber(row.wallet_pending, 0)),
    wallet_cleared: Math.max(0, asNumber(row.wallet_cleared, 0)),
    created_at: created,
    updated_at: row.updated_at || created,
  };
}

function normalize(data = {}) {
  const resellers = Array.isArray(data.resellers) ? data.resellers : [];
  return { resellers: resellers.map((row, index) => shape(row, index)) };
}

function publicSafe(reseller) {
  if (!reseller) return null;
  const { password_hash, ...rest } = reseller;
  return rest;
}

async function listAll() {
  return (await readStore()).resellers.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

async function getById(id) {
  return (await listAll()).find((row) => row.id === id) || null;
}

async function getByUsername(username) {
  const key = String(username || "").trim().toLowerCase();
  if (!key) return null;
  return (await listAll()).find((row) => row.username === key) || null;
}

async function getByCode(code) {
  const key = String(code || "").trim().toLowerCase();
  if (!key) return null;
  const list = await listAll();
  return (
    list.find((row) => row.code === key) ||
    list.find((row) => (row.previous_codes || []).includes(key)) ||
    null
  );
}

async function getByCustomDomainAny(domain) {
  const key = String(domain || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./, "");
  if (!key) return null;
  return (await listAll()).find((row) => row.custom_domain === key) || null;
}

async function getByCustomDomain(domain) {
  const row = await getByCustomDomainAny(domain);
  if (!row || row.custom_domain_status !== "live" || row.status !== "approved") return null;
  return row;
}

async function uniqueCode(preferred, excludeId = "") {
  const want = String(preferred || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (want && want.length >= 4 && want.length <= 24) {
    const owner = await getByCode(want);
    if (!owner || owner.id === excludeId) return want;
    const err = new Error("Referral code already in use");
    err.status = 409;
    throw err;
  }
  for (let i = 0; i < 20; i += 1) {
    const code = generateCode(7);
    if (!(await getByCode(code))) return code;
  }
  return generateCode(8) + generateCode(2);
}

async function createOne(body = {}) {
  const name = String(body.name || "").trim();
  const username = String(body.username || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!name || !username || !password) {
    const err = new Error("Name, username, and password are required");
    err.status = 400;
    throw err;
  }
  if (await getByUsername(username)) {
    const err = new Error("Username already exists");
    err.status = 409;
    throw err;
  }
  const data = await readStore();
  const now = new Date().toISOString();
  const reseller = shape({
    id: crypto.randomUUID(),
    name,
    email: body.email,
    phone: body.phone,
    social_handle: body.social_handle,
    username,
    password_hash: hashPassword(password),
    code: await uniqueCode(body.code),
    status: "approved",
    commission_min_percent: body.commission_min_percent,
    commission_max_percent: body.commission_max_percent,
    wallet_pending: 0,
    wallet_cleared: 0,
    created_at: now,
    updated_at: now,
  });
  data.resellers.push(reseller);
  await writeStore(data);
  return publicSafe(reseller);
}

async function updateOne(id, body = {}) {
  const data = await readStore();
  const index = data.resellers.findIndex((row) => row.id === id);
  if (index < 0) {
    const err = new Error("Reseller not found");
    err.status = 404;
    throw err;
  }
  const current = data.resellers[index];
  if (body.username !== undefined) {
    const username = String(body.username || "").trim().toLowerCase();
    if (!username) {
      const err = new Error("Username is required");
      err.status = 400;
      throw err;
    }
    const clash = data.resellers.find((row) => row.username === username && row.id !== id);
    if (clash) {
      const err = new Error("Username already exists");
      err.status = 409;
      throw err;
    }
    current.username = username;
  }
  if (body.code !== undefined && String(body.code).trim()) {
    const code = await uniqueCode(body.code, id);
    current.code = code;
  }
  if (body.previous_codes !== undefined) {
    const list = Array.isArray(body.previous_codes) ? body.previous_codes : [];
    current.previous_codes = [...new Set(list.map((c) => String(c || "").trim().toLowerCase()).filter(Boolean))].slice(
      -10,
    );
  }
  if (body.custom_domain !== undefined) {
    current.custom_domain = String(body.custom_domain || "")
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "")
      .replace(/^www\./, "");
    if (current.custom_domain) {
      const clash = data.resellers.find(
        (row) => row.custom_domain === current.custom_domain && row.id !== id,
      );
      if (clash) {
        const err = new Error("Custom domain already in use");
        err.status = 409;
        throw err;
      }
    } else {
      current.custom_domain_status = "none";
      current.custom_domain_dns = [];
      current.custom_domain_error = "";
      current.custom_domain_verified_at = "";
    }
  }
  if (body.custom_domain_status !== undefined) {
    current.custom_domain_status = shapeDomainStatus(body.custom_domain_status);
  }
  if (body.custom_domain_dns !== undefined) {
    current.custom_domain_dns = shapeDnsRecords(body.custom_domain_dns);
  }
  if (body.custom_domain_error !== undefined) {
    current.custom_domain_error = String(body.custom_domain_error || "").trim();
  }
  if (body.custom_domain_verified_at !== undefined) {
    current.custom_domain_verified_at = String(body.custom_domain_verified_at || "").trim();
  }
  if (body.name !== undefined) current.name = String(body.name || "").trim() || current.name;
  if (body.email !== undefined) current.email = String(body.email || "").trim();
  if (body.phone !== undefined) current.phone = String(body.phone || "").trim();
  if (body.social_handle !== undefined) current.social_handle = String(body.social_handle || "").trim();
  if (body.status !== undefined) current.status = body.status === "suspended" ? "suspended" : "approved";
  if (body.commission_min_percent !== undefined) {
    current.commission_min_percent = nullablePercent(body.commission_min_percent);
  }
  if (body.commission_max_percent !== undefined) {
    current.commission_max_percent = nullablePercent(body.commission_max_percent);
  }
  if (body.wallet_pending !== undefined) current.wallet_pending = Math.max(0, asNumber(body.wallet_pending, 0));
  if (body.wallet_cleared !== undefined) current.wallet_cleared = Math.max(0, asNumber(body.wallet_cleared, 0));
  if (body.password) current.password_hash = hashPassword(body.password);
  current.updated_at = new Date().toISOString();
  data.resellers[index] = shape(current, index);
  await writeStore(data);
  return publicSafe(data.resellers[index]);
}

function sendError(res, error) {
  const status = error.status || 500;
  console.error("Reseller error:", error.message);
  res.status(status).json({ message: error.message || "Could not save reseller" });
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateCode,
  publicSafe,
  listAll,
  getById,
  getByUsername,
  getByCode,
  getByCustomDomain,
  getByCustomDomainAny,
  createOne,
  updateOne,
  sendError,
};
