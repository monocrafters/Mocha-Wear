const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "customers.json");

function ensureFile() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    writeStore({ customers: [] });
  }
}

function readStore() {
  ensureFile();
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    return normalize(data);
  } catch {
    const fallback = { customers: [] };
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

function shape(row = {}) {
  const phone = digits(row.phone);
  const created = row.created_at || new Date().toISOString();
  return {
    id: row.id || crypto.randomUUID(),
    name: String(row.name || "").trim() || "Customer",
    phone,
    whatsapp: digits(row.whatsapp || row.phone),
    city: String(row.city || "").trim(),
    area: String(row.area || "").trim(),
    address: String(row.address || "").trim(),
    landmark: String(row.landmark || "").trim(),
    created_at: created,
    updated_at: row.updated_at || created,
    last_order_at: row.last_order_at || created,
  };
}

function normalize(data = {}) {
  const customers = Array.isArray(data.customers) ? data.customers : [];
  return { customers: customers.map(shape).filter((item) => item.phone) };
}

function applyDetails(row, details = {}, at) {
  return shape({
    ...row,
    name: details.name || row.name,
    phone: details.phone || row.phone,
    whatsapp: details.whatsapp || details.phone || row.whatsapp,
    city: details.city || row.city,
    area: details.area || row.area,
    address: details.address || row.address,
    landmark: details.landmark !== undefined ? details.landmark : row.landmark,
    created_at: row.created_at,
    last_order_at: at || row.last_order_at,
    updated_at: new Date().toISOString(),
    id: row.id,
  });
}

function upsertFromOrder(order = {}) {
  const details = order.customer || {};
  const phone = digits(details.phone);
  if (!phone) return null;

  const store = readStore();
  const at = order.created_at || new Date().toISOString();
  const index = store.customers.findIndex((item) => item.phone === phone);
  if (index < 0) {
    const created = shape({
      ...details,
      phone,
      created_at: at,
      last_order_at: at,
    });
    store.customers.unshift(created);
    writeStore(store);
    return created;
  }

  const current = store.customers[index];
  const newer = !current.last_order_at || new Date(at).getTime() >= new Date(current.last_order_at).getTime();
  const next = newer ? applyDetails(current, details, at) : current;
  store.customers[index] = next;
  writeStore(store);
  return next;
}

function ordersForCustomer(customer, orderList = []) {
  const phone = digits(customer.phone);
  return (Array.isArray(orderList) ? orderList : []).filter((order) => {
    if (order.customer_id && order.customer_id === customer.id) return true;
    return digits(order.customer?.phone) === phone || digits(order.customer?.whatsapp) === phone;
  });
}

function enrich(customer, orderList = []) {
  const theirs = ordersForCustomer(customer, orderList);
  const active = theirs.filter((order) => order.status !== "cancelled");
  return {
    ...customer,
    order_count: theirs.length,
    spent: active.reduce((sum, order) => sum + (Number(order.total) || 0), 0),
    pieces: active.reduce(
      (sum, order) => sum + (order.items || []).reduce((n, item) => n + (Number(item.qty) || 0), 0),
      0,
    ),
    last_order_id: theirs[0]?.id || "",
  };
}

function syncFromOrders(orderList = []) {
  const store = readStore();
  const known = new Set(store.customers.map((item) => item.phone));
  let added = false;

  (Array.isArray(orderList) ? orderList : []).forEach((order) => {
    const phone = digits(order.customer?.phone);
    if (!phone || known.has(phone)) return;
    known.add(phone);
    store.customers.push(
      shape({
        ...order.customer,
        phone,
        created_at: order.created_at,
        last_order_at: order.created_at,
      }),
    );
    added = true;
  });

  if (added) writeStore(store);

  return store.customers
    .map((item) => enrich(item, orderList))
    .sort((a, b) => String(b.last_order_at || "").localeCompare(String(a.last_order_at || "")));
}

function getById(id, orderList = []) {
  const items = syncFromOrders(orderList);
  const item = items.find((row) => row.id === id) || null;
  if (!item) return null;
  return {
    item,
    orders: ordersForCustomer(item, orderList),
  };
}

function attachIds(orderList = []) {
  const people = syncFromOrders(orderList);
  const byPhone = new Map(people.map((item) => [item.phone, item.id]));
  return (Array.isArray(orderList) ? orderList : []).map((order) => ({
    ...order,
    customer_id: order.customer_id || byPhone.get(digits(order.customer?.phone)) || "",
  }));
}

function stats(items = []) {
  return {
    total: items.length,
    orders: items.reduce((sum, item) => sum + (item.order_count || 0), 0),
    spent: items.reduce((sum, item) => sum + (item.spent || 0), 0),
  };
}

function sendError(res, error) {
  const status = error.status || 500;
  console.error("Customer error:", error.message);
  res.status(status).json({ message: error.message || "Could not load customers" });
}

module.exports = {
  upsertFromOrder,
  syncFromOrders,
  attachIds,
  getById,
  stats,
  sendError,
};
