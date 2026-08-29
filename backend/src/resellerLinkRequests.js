const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createDocumentStore } = require("./cloudStore");
const resellers = require("./resellers");
const resellerDomains = require("./resellerDomains");

const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "reseller_link_requests.json");

const RESERVED_CODES = new Set([
  "admin",
  "api",
  "www",
  "app",
  "shop",
  "store",
  "reseller",
  "login",
  "cart",
  "help",
  "mocha",
  "mochawear",
]);

function readFileStore() {
  try {
    if (!fs.existsSync(DATA_FILE)) return { requests: [] };
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return { requests: [] };
  }
}

const store = createDocumentStore("reseller_link_requests", {
  empty: { requests: [] },
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

function normalizeCode(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeDomain(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")
    .replace(/^www\./, "");
}

function shape(row = {}) {
  return {
    id: row.id || crypto.randomUUID(),
    reseller_id: String(row.reseller_id || "").trim(),
    type: row.type === "domain" ? "domain" : row.type === "both" ? "both" : "code",
    current_code: String(row.current_code || "").trim().toLowerCase(),
    requested_code: row.requested_code ? normalizeCode(row.requested_code) : "",
    requested_domain: row.requested_domain ? normalizeDomain(row.requested_domain) : "",
    status: ["pending", "approved", "rejected"].includes(row.status) ? row.status : "pending",
    note: String(row.note || "").trim(),
    admin_note: String(row.admin_note || "").trim(),
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || row.created_at || new Date().toISOString(),
    reviewed_at: row.reviewed_at || "",
  };
}

function normalize(data = {}) {
  const requests = Array.isArray(data.requests) ? data.requests : [];
  return { requests: requests.map(shape) };
}

function validateCodeFormat(code) {
  const value = normalizeCode(code);
  if (!value || value.length < 4 || value.length > 24) {
    const err = new Error("Link slug must be 4–24 characters (letters, numbers, hyphen)");
    err.status = 400;
    throw err;
  }
  if (RESERVED_CODES.has(value)) {
    const err = new Error("This link slug is reserved");
    err.status = 400;
    throw err;
  }
  if (/^\d+$/.test(value)) {
    const err = new Error("Link slug cannot be only numbers");
    err.status = 400;
    throw err;
  }
  return value;
}

function validateDomainFormat(domain) {
  const value = normalizeDomain(domain);
  if (!value || value.length < 4 || value.length > 120) {
    const err = new Error("Enter a valid domain (e.g. shop.yourbrand.com)");
    err.status = 400;
    throw err;
  }
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(value)) {
    const err = new Error("Enter a valid domain (e.g. shop.yourbrand.com)");
    err.status = 400;
    throw err;
  }
  if (value.includes("localhost") || value.includes("mochawear.vercel.app") || value.endsWith(".vercel.app")) {
    const err = new Error("Choose your own domain, not the Mocha Wear store domain");
    err.status = 400;
    throw err;
  }
  return value;
}

async function isCodeAvailable(code, excludeResellerId = "") {
  const value = validateCodeFormat(code);
  const owner = await resellers.getByCode(value);
  if (owner && owner.id !== excludeResellerId) return { available: false, code: value, reason: "taken" };
  const pending = (await readStore()).requests.find(
    (row) =>
      row.status === "pending" &&
      row.requested_code === value &&
      row.reseller_id !== excludeResellerId,
  );
  if (pending) return { available: false, code: value, reason: "pending" };
  return { available: true, code: value };
}

async function isDomainAvailable(domain, excludeResellerId = "") {
  const value = validateDomainFormat(domain);
  const owner = await resellers.getByCustomDomainAny(value);
  if (owner && owner.id !== excludeResellerId) return { available: false, domain: value, reason: "taken" };
  const pending = (await readStore()).requests.find(
    (row) =>
      row.status === "pending" &&
      row.requested_domain === value &&
      row.reseller_id !== excludeResellerId,
  );
  if (pending) return { available: false, domain: value, reason: "pending" };
  return { available: true, domain: value };
}

async function listAll() {
  return (await readStore()).requests.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

async function listByReseller(resellerId) {
  return (await listAll()).filter((row) => row.reseller_id === resellerId);
}

async function getPendingForReseller(resellerId) {
  return (await listByReseller(resellerId)).find((row) => row.status === "pending") || null;
}

async function createRequest(reseller, body = {}) {
  const requestedCode = body.requested_code ? validateCodeFormat(body.requested_code) : "";
  let requestedDomain = body.requested_domain ? validateDomainFormat(body.requested_domain) : "";
  if (requestedDomain && !requestedCode) {
    const err = new Error("Use Custom domain in My link to connect your domain (self-service)");
    err.status = 400;
    throw err;
  }
  if (requestedDomain && requestedCode) {
    requestedDomain = "";
  }

  if (!requestedCode) {
    const err = new Error("Request a new link slug");
    err.status = 400;
    throw err;
  }
  if (requestedCode && requestedCode === reseller.code && !requestedDomain) {
    const err = new Error("That is already your current link");
    err.status = 400;
    throw err;
  }
  if (requestedDomain && requestedDomain === normalizeDomain(reseller.custom_domain || "") && !requestedCode) {
    const err = new Error("That domain is already linked to your account");
    err.status = 400;
    throw err;
  }

  const existingPending = await getPendingForReseller(reseller.id);
  if (existingPending) {
    const err = new Error("You already have a pending request. Wait for admin review.");
    err.status = 409;
    throw err;
  }

  if (requestedCode) {
    const check = await isCodeAvailable(requestedCode, reseller.id);
    if (!check.available) {
      const err = new Error(
        check.reason === "pending" ? "This link is already requested by someone else" : "This link is already taken",
      );
      err.status = 409;
      throw err;
    }
  }
  if (requestedDomain) {
    const check = await isDomainAvailable(requestedDomain, reseller.id);
    if (!check.available) {
      const err = new Error(
        check.reason === "pending" ? "This domain is already requested by someone else" : "This domain is already taken",
      );
      err.status = 409;
      throw err;
    }
  }

  let type = "code";
  if (requestedCode && requestedDomain) type = "both";
  else if (requestedDomain) type = "domain";

  const now = new Date().toISOString();
  const row = shape({
    id: crypto.randomUUID(),
    reseller_id: reseller.id,
    type,
    current_code: reseller.code,
    requested_code: requestedCode,
    requested_domain: requestedDomain,
    status: "pending",
    note: body.note,
    created_at: now,
    updated_at: now,
  });

  const data = await readStore();
  data.requests.unshift(row);
  await writeStore(data);
  return row;
}

async function reviewRequest(id, { status, admin_note } = {}) {
  if (!["approved", "rejected"].includes(status)) {
    const err = new Error("Status must be approved or rejected");
    err.status = 400;
    throw err;
  }
  const data = await readStore();
  const index = data.requests.findIndex((row) => row.id === id);
  if (index < 0) {
    const err = new Error("Request not found");
    err.status = 404;
    throw err;
  }
  const row = data.requests[index];
  if (row.status !== "pending") {
    const err = new Error("Request was already reviewed");
    err.status = 409;
    throw err;
  }

  const reseller = await resellers.getById(row.reseller_id);
  if (!reseller) {
    const err = new Error("Reseller not found");
    err.status = 404;
    throw err;
  }

  if (status === "approved") {
    if (row.requested_domain) {
      const check = await isDomainAvailable(row.requested_domain, reseller.id);
      if (!check.available) {
        const err = new Error("Requested domain is no longer available");
        err.status = 409;
        throw err;
      }
      await resellerDomains.addDomain(reseller, row.requested_domain);
    }
    if (row.requested_code) {
      const check = await isCodeAvailable(row.requested_code, reseller.id);
      if (!check.available) {
        const err = new Error("Requested link is no longer available");
        err.status = 409;
        throw err;
      }
      await resellers.updateOne(reseller.id, {
        code: row.requested_code,
        previous_codes: [...new Set([...(reseller.previous_codes || []), reseller.code])].slice(-10),
      });
    }
  }

  const now = new Date().toISOString();
  data.requests[index] = shape({
    ...row,
    status,
    admin_note: admin_note != null ? admin_note : row.admin_note,
    updated_at: now,
    reviewed_at: now,
  });
  await writeStore(data);
  return {
    request: data.requests[index],
    reseller: await resellers.getById(reseller.id).then(resellers.publicSafe),
  };
}

function sendError(res, error) {
  const status = error.status || 500;
  console.error("Link request error:", error.message);
  res.status(status).json({ message: error.message || "Could not process link request" });
}

module.exports = {
  normalizeCode,
  normalizeDomain,
  isCodeAvailable,
  isDomainAvailable,
  listAll,
  listByReseller,
  getPendingForReseller,
  createRequest,
  reviewRequest,
  sendError,
};
