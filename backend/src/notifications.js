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

async function add(entry = {}) {
  const data = await readStore();
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

async function markRead(id, role) {
  const data = await readStore();
  const item = data.items.find((row) => row.id === id && (!role || row.role === role));
  if (!item) return null;
  item.read = true;
  await writeStore(data);
  return item;
}

async function markAllRead(role) {
  const data = await readStore();
  data.items = data.items.map((item) => (item.role === role ? { ...item, read: true } : item));
  await writeStore(data);
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
  markRead,
  markAllRead,
  unreadCount,
  notifyNewProduct,
  notifyNewOrder,
  notifyCancel,
  notifyOrderStatus,
  sendError,
};
