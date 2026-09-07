const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createDocumentStore } = require("./cloudStore");
const orders = require("./orders");
const notifications = require("./notifications");

const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "reseller_pr_requests.json");
const PR_ORDER_TARGET = 100;

function readFileStore() {
  try {
    if (!fs.existsSync(DATA_FILE)) return { requests: [] };
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return { requests: [] };
  }
}

const store = createDocumentStore("reseller_pr_requests", {
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

function shape(row = {}) {
  return {
    id: row.id || crypto.randomUUID(),
    reseller_id: String(row.reseller_id || "").trim(),
    status: ["pending", "approved", "rejected"].includes(row.status) ? row.status : "pending",
    note: String(row.note || "").trim(),
    admin_note: String(row.admin_note || "").trim(),
    delivered_at_request: Math.max(0, Math.round(Number(row.delivered_at_request) || 0)),
    milestone: Math.max(1, Math.round(Number(row.milestone) || 1)),
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || row.created_at || new Date().toISOString(),
    reviewed_at: row.reviewed_at || "",
  };
}

function normalize(data = {}) {
  const requests = Array.isArray(data.requests) ? data.requests : [];
  return { requests: requests.map(shape) };
}

async function countDeliveredOrders(resellerId) {
  const id = String(resellerId || "").trim();
  if (!id) return 0;
  const list = await orders.listAll();
  return list.filter((order) => order.reseller_id === id && order.status === "delivered").length;
}

async function listByReseller(resellerId) {
  const id = String(resellerId || "").trim();
  return (await readStore()).requests
    .filter((row) => row.reseller_id === id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

async function listAll() {
  return (await readStore()).requests.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

async function getById(id) {
  return (await readStore()).requests.find((row) => row.id === id) || null;
}

function buildProgress(delivered, requests = []) {
  const used = requests.filter((row) => row.status === "pending" || row.status === "approved").length;
  const earned = Math.floor(delivered / PR_ORDER_TARGET);
  const pending = requests.find((row) => row.status === "pending") || null;
  const canRequest = earned > used && !pending;
  const towardNext = delivered % PR_ORDER_TARGET;
  const current = canRequest || pending ? PR_ORDER_TARGET : towardNext;
  const nextMilestone = (used + 1) * PR_ORDER_TARGET;

  return {
    target: PR_ORDER_TARGET,
    delivered,
    current,
    percent: Math.min(100, Math.round((current / PR_ORDER_TARGET) * 100)),
    earned,
    used,
    next_milestone: nextMilestone,
    can_request: canRequest,
    unlocked: delivered >= PR_ORDER_TARGET,
    pending_request: pending,
  };
}

async function getProgress(resellerId) {
  const delivered = await countDeliveredOrders(resellerId);
  const requests = await listByReseller(resellerId);
  return {
    ...buildProgress(delivered, requests),
    requests,
  };
}

async function createRequest(resellerId, { note } = {}, reseller = {}) {
  const progress = await getProgress(resellerId);
  if (!progress.can_request) {
    const err = new Error(
      progress.pending_request
        ? "You already have a pending PR request."
        : `Reach ${progress.next_milestone} successful (delivered) orders to request a PR package.`,
    );
    err.status = 400;
    throw err;
  }

  const data = await readStore();
  const row = shape({
    id: crypto.randomUUID(),
    reseller_id: resellerId,
    status: "pending",
    note: String(note || "").trim(),
    delivered_at_request: progress.delivered,
    milestone: progress.used + 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  data.requests.unshift(row);
  await writeStore(data);

  try {
    await notifications.notifyPrRequest(row, reseller);
  } catch (error) {
    console.error("PR request notification failed:", error.message);
  }

  return row;
}

async function reviewRequest(id, { status, admin_note } = {}, reseller = {}) {
  const next = String(status || "").trim();
  if (!["approved", "rejected"].includes(next)) {
    const err = new Error("Status must be approved or rejected");
    err.status = 400;
    throw err;
  }

  const data = await readStore();
  const index = data.requests.findIndex((row) => row.id === id);
  if (index < 0) {
    const err = new Error("PR request not found");
    err.status = 404;
    throw err;
  }

  const current = data.requests[index];
  if (current.status !== "pending") {
    const err = new Error("This PR request was already reviewed");
    err.status = 400;
    throw err;
  }

  current.status = next;
  current.admin_note = String(admin_note || "").trim();
  current.reviewed_at = new Date().toISOString();
  current.updated_at = current.reviewed_at;
  data.requests[index] = shape(current);
  await writeStore(data);

  try {
    await notifications.notifyResellerPrReviewed(data.requests[index], reseller, next);
  } catch (error) {
    console.error("PR review notification failed:", error.message);
  }

  return data.requests[index];
}

function sendError(res, error) {
  const status = error.status || 500;
  console.error("PR request error:", error.message);
  res.status(status).json({ message: error.message || "Could not process PR request" });
}

module.exports = {
  PR_ORDER_TARGET,
  countDeliveredOrders,
  listByReseller,
  listAll,
  getById,
  getProgress,
  createRequest,
  reviewRequest,
  sendError,
};
