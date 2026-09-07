const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createDocumentStore } = require("./cloudStore");

const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "notifications.json");
const LIMIT = 200;

function readFileStore() {
  try {
    if (!fs.existsSync(DATA_FILE)) return { items: [] };
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return { items: [] };
  }
}

const store = createDocumentStore("notifications", {
  empty: { items: [] },
  readFile: readFileStore,
  writeFile(data) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  },
});

async function readStore() {
  const data = await store.read();
  return { items: Array.isArray(data?.items) ? data.items : [] };
}

async function writeStore(data) {
  await store.write({ items: data.items || [] });
}

function digits(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeRole(role) {
  if (role === "admin") return "admin";
  if (role === "reseller") return "reseller";
  return "user";
}

async function add(entry = {}) {
  const data = await readStore();
  const item = {
    id: crypto.randomUUID(),
    role: normalizeRole(entry.role),
    phone: digits(entry.phone),
    reseller_id: String(entry.reseller_id || "").trim(),
    type: String(entry.type || "info"),
    title: String(entry.title || "Update").trim() || "Update",
    message: String(entry.message || "").trim(),
    href: String(entry.href || "").trim(),
    read: false,
    created_at: new Date().toISOString(),
  };
  data.items.unshift(item);
  data.items = data.items.slice(0, LIMIT);
  await writeStore(data);
  return item;
}

async function listAdmin() {
  return (await readStore()).items.filter((item) => item.role === "admin");
}

async function listUser(phone) {
  const mobile = digits(phone);
  return (await readStore()).items.filter((item) => {
    if (item.role !== "user") return false;
    if (!item.phone) return true;
    return Boolean(mobile) && item.phone === mobile;
  });
}

async function listReseller(resellerId) {
  const id = String(resellerId || "").trim();
  return (await readStore()).items.filter((item) => {
    if (item.role !== "reseller") return false;
    const target = String(item.reseller_id || "").trim();
    return target === id;
  });
}

async function markRead(id, role, resellerId = "") {
  const data = await readStore();
  const item = data.items.find((row) => row.id === id && (!role || row.role === role));
  if (!item) return null;
  if (role === "reseller") {
    const owner = String(resellerId || "").trim();
    if (!owner || String(item.reseller_id || "").trim() !== owner) return null;
  }
  item.read = true;
  await writeStore(data);
  return item;
}

async function markAllRead(role, resellerId = "") {
  const data = await readStore();
  const owner = String(resellerId || "").trim();
  data.items = data.items.map((item) => {
    if (item.role !== role) return item;
    if (role === "reseller" && owner && String(item.reseller_id || "").trim() !== owner) return item;
    return { ...item, read: true };
  });
  await writeStore(data);
  return { ok: true };
}

async function markResellerReadByType(resellerId, type) {
  const id = String(resellerId || "").trim();
  const kind = String(type || "").trim();
  if (!id || !kind) return { ok: true };
  const data = await readStore();
  let changed = false;
  data.items = data.items.map((item) => {
    if (item.role === "reseller" && String(item.reseller_id || "").trim() === id && item.type === kind && !item.read) {
      changed = true;
      return { ...item, read: true };
    }
    return item;
  });
  if (changed) await writeStore(data);
  return { ok: true };
}

function unreadCount(items) {
  return items.filter((item) => !item.read).length;
}

async function notifyNewProduct(product = {}) {
  if (!product.is_published) return;
  await add({
    role: "user",
    phone: "",
    type: "new_product",
    title: "New suit in",
    message: product.name || "A new suit is live.",
    href: `/products/${product.code || product.slug || ""}`,
  });
}

async function notifyResellerNewProduct(product = {}) {
  if (!product.is_published || !product.reseller_enabled) return;
  const resellers = require("./resellers");
  const list = (await resellers.listAll()).filter((row) => row.status === "approved");
  for (const reseller of list) {
    await add({
      role: "reseller",
      reseller_id: reseller.id,
      type: "new_product",
      title: "New product available",
      message: product.name || "Set your price and start selling.",
      href: "/reseller/products",
    });
  }
}

async function notifyNewOrder(order = {}) {
  const name = order.customer?.name || "Customer";
  await add({
    role: "admin",
    type: "new_order",
    title: `New order ${order.id}`,
    message: `${name}${order.city ? ` · ${order.city}` : ""}`,
    href: "/admin/orders",
  });
}

async function notifyResellerOrder(order = {}, reseller = {}) {
  if (!order.reseller_id || !(Number(order.commission_total) > 0)) return;
  const name = order.customer?.name || "Customer";
  await add({
    role: "reseller",
    reseller_id: order.reseller_id,
    type: "new_order",
    title: `New order via your link`,
    message: `${name} · ${formatPkr(order.commission_total)} profit`,
    href: `/reseller/orders/${order.id}`,
  });
}

async function notifyCancel(order = {}) {
  const reason = [order.cancel_reason, order.cancel_detail].filter(Boolean).join(" — ");
  if (order.cancelled_by === "customer") {
    await add({
      role: "admin",
      type: "order_cancel",
      title: `${order.id} cancelled by customer`,
      message: reason || "The customer cancelled this order.",
      href: "/admin/orders",
    });
    return;
  }
  await add({
    role: "user",
    phone: order.customer?.phone,
    type: "order_cancel",
    title: `Order ${order.id} cancelled`,
    message: reason || "Your order was cancelled.",
    href: "/orders",
  });
}

async function notifyPayoutRequest(payout = {}, reseller = {}) {
  const name = reseller.name || reseller.code || "Reseller";
  const method = payout.payment?.method || payout.method || "payment";
  await add({
    role: "admin",
    type: "payout_request",
    title: `Withdrawal request · ${formatPkr(payout.amount)}`,
    message: `${name} · ${method}`,
    href: `/admin/payouts/${payout.id}`,
  });
}

async function notifyResellerPayout(payout = {}, reseller = {}, status = "") {
  const next = String(status || payout.status || "").trim();
  if (!["completed", "rejected", "processing"].includes(next)) return;
  const title =
    next === "completed"
      ? `Withdrawal processed · ${formatPkr(payout.amount)}`
      : next === "rejected"
        ? `Withdrawal rejected · ${formatPkr(payout.amount)}`
        : `Withdrawal processing · ${formatPkr(payout.amount)}`;
  const message =
    next === "rejected" && payout.note
      ? String(payout.note).trim()
      : reseller.name || reseller.code || "Your withdrawal request was updated.";
  await add({
    role: "reseller",
    reseller_id: reseller.id || payout.reseller_id || "",
    type: "payout_status",
    title,
    message,
    href: "/reseller/withdraw",
  });
}

async function notifyLinkRequest(request = {}, reseller = {}) {
  const name = reseller.name || reseller.username || reseller.code || "Reseller";
  const from = request.current_code ? `/r/${request.current_code}` : "—";
  const to = request.requested_code
    ? `/r/${request.requested_code}`
    : request.requested_domain || "—";
  const note = String(request.note || "").trim();
  await add({
    role: "admin",
    type: "link_request",
    title: "New link change request",
    message: note ? `${name}: ${from} → ${to} · ${note}` : `${name}: ${from} → ${to}`,
    href: "/admin/link-requests",
  });
}

async function notifyPrRequest(request = {}, reseller = {}) {
  const name = reseller.name || reseller.username || reseller.code || "Reseller";
  const delivered = Math.max(0, Math.round(Number(request.delivered_at_request) || 0));
  const note = String(request.note || "").trim();
  await add({
    role: "admin",
    type: "pr_request",
    title: "New PR package request",
    message: note
      ? `${name} requested a PR package after ${delivered} delivered orders · ${note}`
      : `${name} requested a PR package after ${delivered} delivered orders`,
    href: "/admin/pr-requests",
  });
}

async function notifyResellerLinkReviewed(request = {}, reseller = {}, status = "") {
  const next = String(status || request.status || "").trim();
  if (!["approved", "rejected"].includes(next)) return;
  const slug = request.requested_code ? `/r/${request.requested_code}` : "";
  await add({
    role: "reseller",
    reseller_id: reseller.id || request.reseller_id || "",
    type: "link_review",
    title: next === "approved" ? "Link request approved" : "Link request rejected",
    message:
      next === "approved"
        ? slug
          ? `Your new link ${slug} is live.`
          : "Your link change is now live."
        : request.admin_note || "Admin rejected your link change request.",
    href: "/reseller/link",
  });
}

async function notifyResellerPrReviewed(request = {}, reseller = {}, status = "") {
  const next = String(status || request.status || "").trim();
  if (!["approved", "rejected"].includes(next)) return;
  await add({
    role: "reseller",
    reseller_id: reseller.id || request.reseller_id || "",
    type: "pr_review",
    title: next === "approved" ? "PR package approved" : "PR request rejected",
    message:
      next === "approved"
        ? "Your PR package request was approved. We will arrange it soon."
        : request.admin_note || "Admin rejected your PR package request.",
    href: "/reseller/orders",
  });
}

function formatPkr(amount) {
  return `Rs. ${Math.max(0, Math.round(Number(amount) || 0)).toLocaleString("en-PK")}`;
}

async function notifyOrderStatus(order = {}) {
  const labels = {
    packed: "packed",
    shipped: "on the way",
    delivered: "delivered",
  };
  const label = labels[order.status];
  if (!label || !order.customer?.phone) return;
  await add({
    role: "user",
    phone: order.customer.phone,
    type: "order_status",
    title: `Order ${order.id} is ${label}`,
    message: "Open Orders to track it.",
    href: "/orders",
  });
}

function sendError(res, error) {
  const status = error.status || 500;
  console.error("Notification error:", error.message);
  res.status(status).json({ message: error.message || "Could not load notifications" });
}

module.exports = {
  add,
  listAdmin,
  listUser,
  listReseller,
  markRead,
  markAllRead,
  markResellerReadByType,
  unreadCount,
  notifyNewProduct,
  notifyResellerNewProduct,
  notifyNewOrder,
  notifyResellerOrder,
  notifyCancel,
  notifyPayoutRequest,
  notifyResellerPayout,
  notifyLinkRequest,
  notifyResellerLinkReviewed,
  notifyPrRequest,
  notifyResellerPrReviewed,
  notifyOrderStatus,
  sendError,
};
