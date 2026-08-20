const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createDocumentStore } = require("./cloudStore");

const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "customers.json");

function readFileStore() {
  try {
    if (!fs.existsSync(DATA_FILE)) return { customers: [] };
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return { customers: [] };
  }
}

const store = createDocumentStore("customers", {
  empty: { customers: [] },
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

async function upsertFromOrder(order = {}) {
  const details = order.customer || {};
  const phone = digits(details.phone);
  if (!phone) return null;

  const data = await readStore();
  const at = order.created_at || new Date().toISOString();
  const index = data.customers.findIndex((item) => item.phone === phone);
  if (index < 0) {
    const created = shape({
      ...details,
      phone,
      created_at: at,
      last_order_at: at,
    });
    data.customers.unshift(created);
    await writeStore(data);
    return created;
  }

  const current = data.customers[index];
  const newer = !current.last_order_at || new Date(at).getTime() >= new Date(current.last_order_at).getTime();
  const next = newer ? applyDetails(current, details, at) : current;
  data.customers[index] = next;
  await writeStore(data);
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

async function syncFromOrders(orderList = []) {
  const data = await readStore();
  const known = new Set(data.customers.map((item) => item.phone));
  let added = false;

  (Array.isArray(orderList) ? orderList : []).forEach((order) => {
    const phone = digits(order.customer?.phone);
    if (!phone || known.has(phone)) return;
    known.add(phone);
    data.customers.push(
      shape({
        ...order.customer,
        phone,
        created_at: order.created_at,
        last_order_at: order.created_at,
      }),
    );
    added = true;
  });

  if (added) await writeStore(data);

  return data.customers
    .map((item) => enrich(item, orderList))
    .sort((a, b) => String(b.last_order_at || "").localeCompare(String(a.last_order_at || "")));
}

async function getById(id, orderList = []) {
  const items = await syncFromOrders(orderList);
  const item = items.find((row) => row.id === id) || null;
  if (!item) return null;
  return {
    item,
    orders: ordersForCustomer(item, orderList),
  };
}

async function attachIds(orderList = []) {
  const people = await syncFromOrders(orderList);
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
