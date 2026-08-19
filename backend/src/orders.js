const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "orders.json");

const STATUSES = ["processing", "packed", "shipped", "delivered", "cancelled"];

function ensureFile() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    writeStore({ orders: [] });
  }
}

function readStore() {
  ensureFile();
  try {
    return normalize(JSON.parse(fs.readFileSync(DATA_FILE, "utf8")));
  } catch {
    const fallback = { orders: [] };
    writeStore(fallback);
    return fallback;
  }
}

function writeStore(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(normalize(data), null, 2));
}

function digits(value) {
  return String(value || "").replace(/\D/g, "");
}

function nextId(orders) {
  const nums = orders
    .map((order) => Number(String(order.id || "").replace(/\D/g, "")))
    .filter((n) => Number.isFinite(n) && n > 0);
  const max = nums.length ? Math.max(...nums) : 1000;
  return `MW-${max + 1}`;
}

function normalizeItem(item = {}) {
  const qty = Math.max(1, Math.min(10, Number(item.qty) || 1));
  const price = Math.max(0, Number(item.price) || 0);
  return {
    product_id: String(item.product_id || item.productId || "").trim(),
    name: String(item.name || "Suit").trim() || "Suit",
    spec: String(item.spec || "").trim(),
    size: String(item.size || "").trim(),
    qty,
    price,
    image: String(item.image || "").trim(),
    slug: String(item.slug || "").trim(),
  };
}

function normalizeCustomer(customer = {}, fallbackCity = "") {
  return {
    name: String(customer.name || "").trim(),
    phone: digits(customer.phone),
    whatsapp: digits(customer.whatsapp || customer.phone),
    city: String(customer.city || fallbackCity || "").trim(),
    area: String(customer.area || "").trim(),
    address: String(customer.address || "").trim(),
    landmark: String(customer.landmark || "").trim(),
  };
}

function normalizeStatus(value) {
  const status = String(value || "processing").trim().toLowerCase();
  return STATUSES.includes(status) ? status : "processing";
}

function normalizeOrder(order = {}, index = 0) {
  const items = Array.isArray(order.items) ? order.items.map(normalizeItem).filter((item) => item.name) : [];
  const customer = normalizeCustomer(order.customer, order.city);
  const delivery = Math.max(0, Number(order.delivery) || 0);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const created = order.created_at || order.placedAt || new Date().toISOString();
  return {
    id: order.id || `MW-${1001 + index}`,
    created_at: created,
    updated_at: order.updated_at || created,
    status: normalizeStatus(order.status),
    payment: String(order.payment || "Cash on delivery").trim() || "Cash on delivery",
    delivery,
    subtotal,
    total: subtotal + delivery,
    city: String(order.city || customer.city || "").trim(),
    note: String(order.note || "").trim(),
    cancel_reason: String(order.cancel_reason || "").trim(),
    cancel_detail: String(order.cancel_detail || "").trim(),
    cancelled_by: String(order.cancelled_by || "").trim(),
    cancelled_at: String(order.cancelled_at || "").trim(),
    customer_id: String(order.customer_id || "").trim(),
    customer,
    items,
  };
}

function normalize(data = {}) {
  const orders = Array.isArray(data.orders) ? data.orders : [];
  return {
    orders: orders.map((order, index) => normalizeOrder(order, index)),
  };
}

function validateCreate(body = {}) {
  const customer = normalizeCustomer(body.customer, body.city);
  const items = Array.isArray(body.items) ? body.items.map(normalizeItem).filter((item) => item.name) : [];
  const err = (message) => {
    const error = new Error(message);
    error.status = 400;
    return error;
  };

  if (!customer.name || !customer.phone || !customer.city || !customer.area || !customer.address) {
    throw err("Full name, mobile, city, area, and complete address are required.");
  }
  if (customer.phone.length !== 11 || !customer.phone.startsWith("03")) {
    throw err("Enter an 11-digit mobile number starting with 03.");
  }
  if (customer.whatsapp && (customer.whatsapp.length !== 11 || !customer.whatsapp.startsWith("03"))) {
    throw err("Enter an 11-digit WhatsApp number starting with 03.");
  }
  if (!items.length) throw err("Your bag is empty.");
  return { customer, items };
}

function listAll() {
  return readStore().orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

function getById(id) {
  return listAll().find((order) => order.id === id) || null;
}

function listByIds(ids = []) {
  const set = new Set((Array.isArray(ids) ? ids : []).map((id) => String(id).trim()).filter(Boolean));
  if (!set.size) return [];
  return listAll().filter((order) => set.has(order.id));
}

function listByPhone(phone) {
  const mobile = digits(phone);
  if (mobile.length !== 11) return [];
  return listAll().filter((order) => order.customer.phone === mobile || order.customer.whatsapp === mobile);
}

function lookup({ ids, phone } = {}) {
  const byId = listByIds(ids);
  const byPhone = listByPhone(phone);
  const map = new Map();
  [...byId, ...byPhone].forEach((order) => map.set(order.id, order));
  return [...map.values()].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

function createOne(body = {}) {
  const { customer, items } = validateCreate(body);
  const customers = require("./customers");
  const store = readStore();
  const order = normalizeOrder({
    id: nextId(store.orders),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    status: "processing",
    payment: "Cash on delivery",
    delivery: 0,
    city: customer.city,
    customer,
    items,
    note: "",
  });
  const record = customers.upsertFromOrder(order);
  if (record?.id) order.customer_id = record.id;
  store.orders.unshift(order);
  writeStore(store);
  return order;
}

function canCustomerCancel(status) {
  return status === "processing" || status === "packed";
}

function canAdminCancel(status) {
  return status !== "delivered" && status !== "cancelled";
}

function ownsOrder(order, body = {}) {
  const ids = new Set((Array.isArray(body.ids) ? body.ids : []).map((id) => String(id).trim()).filter(Boolean));
  if (ids.has(order.id)) return true;
  const mobile = digits(body.phone);
  if (!mobile) return false;
  return order.customer.phone === mobile || order.customer.whatsapp === mobile;
}

function cancelPayload(body = {}, by) {
  const reason = String(body.reason || "").trim();
  const detail = String(body.detail || body.note || "").trim();
  const err = (message) => {
    const error = new Error(message);
    error.status = 400;
    return error;
  };
  if (!reason) throw err("Choose a reason to cancel this order.");
  if (reason.toLowerCase() === "other" && !detail) throw err("Write a short reason in Other.");
  return {
    status: "cancelled",
    cancel_reason: reason,
    cancel_detail: detail,
    cancelled_by: by,
    cancelled_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function cancelOne(id, body = {}, by = "customer") {
  const store = readStore();
  const index = store.orders.findIndex((order) => order.id === id);
  if (index < 0) {
    const err = new Error("Order not found");
    err.status = 404;
    throw err;
  }
  const current = store.orders[index];
  if (current.status === "cancelled") {
    const err = new Error("This order is already cancelled.");
    err.status = 400;
    throw err;
  }
  if (by === "customer") {
    if (!ownsOrder(current, body)) {
      const err = new Error("Could not verify this order.");
      err.status = 403;
      throw err;
    }
    if (!canCustomerCancel(current.status)) {
      const err = new Error("This order can no longer be cancelled.");
      err.status = 400;
      throw err;
    }
  } else if (!canAdminCancel(current.status)) {
    const err = new Error("Delivered orders cannot be cancelled.");
    err.status = 400;
    throw err;
  }

  const cancelled = normalizeOrder({ ...current, ...cancelPayload(body, by) }, index);
  store.orders[index] = cancelled;
  writeStore(store);
  return cancelled;
}

function updateOne(id, fields = {}) {
  const store = readStore();
  const index = store.orders.findIndex((order) => order.id === id);
  if (index < 0) {
    const err = new Error("Order not found");
    err.status = 404;
    throw err;
  }
  const current = store.orders[index];
  const next = {
    ...current,
    status: fields.status !== undefined ? normalizeStatus(fields.status) : current.status,
    note: fields.note !== undefined ? String(fields.note || "").trim() : current.note,
    updated_at: new Date().toISOString(),
  };
  store.orders[index] = normalizeOrder(next, index);
  writeStore(store);
  return store.orders[index];
}

function stats(orders = listAll()) {
  const counts = {
    total: orders.length,
    processing: 0,
    packed: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
  };
  let revenue = 0;
  let pieces = 0;
  orders.forEach((order) => {
    if (counts[order.status] !== undefined) counts[order.status] += 1;
    if (order.status !== "cancelled") {
      revenue += order.total;
      pieces += order.items.reduce((sum, item) => sum + item.qty, 0);
    }
  });
  return { ...counts, revenue, pieces };
}

function sendError(res, error) {
  const status = error.status || 500;
  console.error("Order error:", error.message);
  res.status(status).json({ message: error.message || "Could not save order" });
}

module.exports = {
  STATUSES,
  listAll,
  getById,
  lookup,
  createOne,
  cancelOne,
  updateOne,
  stats,
  sendError,
};
