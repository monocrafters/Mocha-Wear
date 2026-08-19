const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "notifications.json");
const LIMIT = 200;

function ensureFile() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) writeStore({ items: [] });
}

function readStore() {
  ensureFile();
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    return { items: Array.isArray(data.items) ? data.items : [] };
  } catch {
    const fallback = { items: [] };
    writeStore(fallback);
    return fallback;
  }
}

function writeStore(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify({ items: data.items || [] }, null, 2));
}

function digits(value) {
  return String(value || "").replace(/\D/g, "");
}

function add(entry = {}) {
  const store = readStore();
  const item = {
    id: crypto.randomUUID(),
    role: entry.role === "admin" ? "admin" : "user",
    phone: digits(entry.phone),
    type: String(entry.type || "info"),
    title: String(entry.title || "Update").trim() || "Update",
    message: String(entry.message || "").trim(),
    href: String(entry.href || "").trim(),
    read: false,
    created_at: new Date().toISOString(),
  };
  store.items.unshift(item);
  store.items = store.items.slice(0, LIMIT);
  writeStore(store);
  return item;
}

function listAdmin() {
  return readStore().items.filter((item) => item.role === "admin");
}

function listUser(phone) {
  const mobile = digits(phone);
  return readStore().items.filter((item) => {
    if (item.role !== "user") return false;
    if (!item.phone) return true;
    return Boolean(mobile) && item.phone === mobile;
  });
}

function markRead(id, role) {
  const store = readStore();
  const item = store.items.find((row) => row.id === id && (!role || row.role === role));
  if (!item) return null;
  item.read = true;
  writeStore(store);
  return item;
}

function markAllRead(role) {
  const store = readStore();
  store.items = store.items.map((item) => (item.role === role ? { ...item, read: true } : item));
  writeStore(store);
  return { ok: true };
}

function unreadCount(items) {
  return items.filter((item) => !item.read).length;
}

function notifyNewProduct(product = {}) {
  if (!product.is_published) return;
  add({
    role: "user",
    phone: "",
    type: "new_product",
    title: "New suit in",
    message: product.name || "A new suit is live.",
    href: `/products/${product.code || product.slug || ""}`,
  });
}

function notifyNewOrder(order = {}) {
  const name = order.customer?.name || "Customer";
  add({
    role: "admin",
    type: "new_order",
    title: `New order ${order.id}`,
    message: `${name}${order.city ? ` · ${order.city}` : ""}`,
    href: "/admin/orders",
  });
}

function notifyCancel(order = {}) {
  const reason = [order.cancel_reason, order.cancel_detail].filter(Boolean).join(" — ");
  if (order.cancelled_by === "customer") {
    add({
      role: "admin",
      type: "order_cancel",
      title: `${order.id} cancelled by customer`,
      message: reason || "The customer cancelled this order.",
      href: "/admin/orders",
    });
    return;
  }
  add({
    role: "user",
    phone: order.customer?.phone,
    type: "order_cancel",
    title: `Order ${order.id} cancelled`,
    message: reason || "Your order was cancelled.",
    href: "/orders",
  });
}

function notifyOrderStatus(order = {}) {
  const labels = {
    packed: "packed",
    shipped: "on the way",
    delivered: "delivered",
  };
  const label = labels[order.status];
  if (!label || !order.customer?.phone) return;
  add({
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
  markRead,
  markAllRead,
  unreadCount,
  notifyNewProduct,
  notifyNewOrder,
  notifyCancel,
  notifyOrderStatus,
  sendError,
};
