const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createDocumentStore } = require("./cloudStore");
const resellers = require("./resellers");

const DATA_DIR = path.join(__dirname, "..", "data");

function makeStore(kind, emptyKey) {
  const file = path.join(DATA_DIR, `${kind}.json`);
  const empty = { [emptyKey]: [] };
  function readFileStore() {
    try {
      if (!fs.existsSync(file)) return empty;
      return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
      return empty;
    }
  }
  return createDocumentStore(kind, {
    empty,
    readFile: readFileStore,
    writeFile(data) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(file, JSON.stringify(data, null, 2));
    },
  });
}

const txStore = makeStore("reseller_wallet_transactions", "transactions");
const payoutStore = makeStore("reseller_payouts", "payouts");

function shapeTx(row = {}) {
  return {
    id: row.id || crypto.randomUUID(),
    reseller_id: String(row.reseller_id || "").trim(),
    order_id: String(row.order_id || "").trim(),
    type: ["credit", "debit", "payout"].includes(row.type) ? row.type : "credit",
    amount: Math.max(0, Math.round(Number(row.amount) || 0)),
    status: ["pending", "cleared", "paid_out", "reversed"].includes(row.status) ? row.status : "pending",
    clears_at: String(row.clears_at || "").trim(),
    created_at: row.created_at || new Date().toISOString(),
  };
}

function shapePayout(row = {}) {
  return {
    id: row.id || crypto.randomUUID(),
    reseller_id: String(row.reseller_id || "").trim(),
    amount: Math.max(0, Math.round(Number(row.amount) || 0)),
    method: String(row.method || "bank transfer").trim() || "bank transfer",
    status: ["requested", "processing", "completed", "rejected"].includes(row.status)
      ? row.status
      : "requested",
    requested_at: row.requested_at || new Date().toISOString(),
    completed_at: String(row.completed_at || "").trim(),
    note: String(row.note || "").trim(),
  };
}

async function readTx() {
  const data = await txStore.read();
  return { transactions: (Array.isArray(data.transactions) ? data.transactions : []).map(shapeTx) };
}

async function writeTx(data) {
  await txStore.write({
    transactions: (data.transactions || []).map(shapeTx),
  });
}

async function readPayouts() {
  const data = await payoutStore.read();
  return { payouts: (Array.isArray(data.payouts) ? data.payouts : []).map(shapePayout) };
}

async function writePayouts(data) {
  await payoutStore.write({
    payouts: (data.payouts || []).map(shapePayout),
  });
}

async function adjustWallet(resellerId, { pendingDelta = 0, clearedDelta = 0 }) {
  const row = await resellers.getById(resellerId);
  if (!row) return null;
  return resellers.updateOne(resellerId, {
    wallet_pending: Math.max(0, Math.round(row.wallet_pending + pendingDelta)),
    wallet_cleared: Math.max(0, Math.round(row.wallet_cleared + clearedDelta)),
  });
}

async function creditPending({ reseller_id, order_id, amount }) {
  const value = Math.max(0, Math.round(Number(amount) || 0));
  if (!reseller_id || !value) return null;
  const data = await readTx();
  const existing = data.transactions.find(
    (row) => row.order_id === order_id && row.reseller_id === reseller_id && row.type === "credit" && row.status !== "reversed",
  );
  if (existing) return existing;
  const tx = shapeTx({
    id: crypto.randomUUID(),
    reseller_id,
    order_id,
    type: "credit",
    amount: value,
    status: "pending",
    clears_at: "",
    created_at: new Date().toISOString(),
  });
  data.transactions.unshift(tx);
  await writeTx(data);
  await adjustWallet(reseller_id, { pendingDelta: value });
  return tx;
}

async function onOrderDelivered(orderId, returnWindowDays = 7) {
  const days = Math.max(0, Number(returnWindowDays) || 7);
  const clearsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  const data = await readTx();
  let changed = false;
  data.transactions = data.transactions.map((row) => {
    if (row.order_id === orderId && row.type === "credit" && row.status === "pending") {
      changed = true;
      return { ...row, clears_at: clearsAt };
    }
    return row;
  });
  if (changed) await writeTx(data);
  return clearsAt;
}

async function onOrderCancelled(orderId) {
  const data = await readTx();
  const deltas = new Map();
  data.transactions = data.transactions.map((row) => {
    if (
      row.order_id === orderId &&
      row.type === "credit" &&
      (row.status === "pending" || row.status === "cleared")
    ) {
      const prev = row.status;
      if (prev === "pending") {
        deltas.set(row.reseller_id, {
          pendingDelta: (deltas.get(row.reseller_id)?.pendingDelta || 0) - row.amount,
          clearedDelta: deltas.get(row.reseller_id)?.clearedDelta || 0,
        });
      } else {
        deltas.set(row.reseller_id, {
          pendingDelta: deltas.get(row.reseller_id)?.pendingDelta || 0,
          clearedDelta: (deltas.get(row.reseller_id)?.clearedDelta || 0) - row.amount,
        });
      }
      return { ...row, status: "reversed" };
    }
    return row;
  });
  await writeTx(data);
  for (const [resellerId, delta] of deltas.entries()) {
    await adjustWallet(resellerId, delta);
  }
}

async function sweepCleared() {
  const now = Date.now();
  const data = await readTx();
  const deltas = new Map();
  let changed = false;
  data.transactions = data.transactions.map((row) => {
    if (row.status === "pending" && row.clears_at && new Date(row.clears_at).getTime() <= now) {
      changed = true;
      deltas.set(row.reseller_id, {
        pendingDelta: (deltas.get(row.reseller_id)?.pendingDelta || 0) - row.amount,
        clearedDelta: (deltas.get(row.reseller_id)?.clearedDelta || 0) + row.amount,
      });
      return { ...row, status: "cleared" };
    }
    return row;
  });
  if (changed) {
    await writeTx(data);
    for (const [resellerId, delta] of deltas.entries()) {
      await adjustWallet(resellerId, delta);
    }
  }
}

async function listByReseller(resellerId) {
  await sweepCleared();
  const id = String(resellerId || "").trim();
  return (await readTx()).transactions
    .filter((row) => row.reseller_id === id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

async function requestPayout(resellerId, { amount, method } = {}, minThreshold = 2000) {
  await sweepCleared();
  const value = Math.round(Number(amount) || 0);
  const min = Math.max(0, Math.round(Number(minThreshold) || 0));
  const row = await resellers.getById(resellerId);
  if (!row) {
    const err = new Error("Reseller not found");
    err.status = 404;
    throw err;
  }
  if (value < min) {
    const err = new Error(`Minimum payout is Rs ${min}`);
    err.status = 400;
    throw err;
  }
  if (value > row.wallet_cleared) {
    const err = new Error("Amount exceeds cleared balance");
    err.status = 400;
    throw err;
  }
  const payouts = await readPayouts();
  const payout = shapePayout({
    id: crypto.randomUUID(),
    reseller_id: resellerId,
    amount: value,
    method: method || "bank transfer",
    status: "requested",
    requested_at: new Date().toISOString(),
  });
  payouts.payouts.unshift(payout);
  await writePayouts(payouts);

  const txs = await readTx();
  txs.transactions.unshift(
    shapeTx({
      id: crypto.randomUUID(),
      reseller_id: resellerId,
      order_id: payout.id,
      type: "payout",
      amount: value,
      status: "pending",
      created_at: new Date().toISOString(),
    }),
  );
  await writeTx(txs);
  await adjustWallet(resellerId, { clearedDelta: -value });
  return payout;
}

async function listPayouts(resellerId) {
  const all = (await readPayouts()).payouts.sort(
    (a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime(),
  );
  if (!resellerId) return all;
  return all.filter((row) => row.reseller_id === resellerId);
}

async function updatePayout(id, fields = {}) {
  const data = await readPayouts();
  const index = data.payouts.findIndex((row) => row.id === id);
  if (index < 0) {
    const err = new Error("Payout not found");
    err.status = 404;
    throw err;
  }
  const current = data.payouts[index];
  const nextStatus = fields.status || current.status;
  if (fields.note !== undefined) current.note = String(fields.note || "").trim();

  if (nextStatus === "rejected" && current.status !== "rejected" && current.status !== "completed") {
    await adjustWallet(current.reseller_id, { clearedDelta: current.amount });
    const txs = await readTx();
    txs.transactions = txs.transactions.map((row) =>
      row.order_id === current.id && row.type === "payout" ? { ...row, status: "reversed" } : row,
    );
    await writeTx(txs);
    current.status = "rejected";
    current.completed_at = new Date().toISOString();
  } else if (nextStatus === "completed" && current.status !== "completed") {
    const txs = await readTx();
    txs.transactions = txs.transactions.map((row) =>
      row.order_id === current.id && row.type === "payout" ? { ...row, status: "paid_out" } : row,
    );
    await writeTx(txs);
    current.status = "completed";
    current.completed_at = new Date().toISOString();
  } else if (nextStatus === "processing") {
    current.status = "processing";
  } else {
    current.status = nextStatus;
  }

  data.payouts[index] = shapePayout(current);
  await writePayouts(data);
  return data.payouts[index];
}

function sendError(res, error) {
  const status = error.status || 500;
  console.error("Reseller wallet error:", error.message);
  res.status(status).json({ message: error.message || "Could not update wallet" });
}

module.exports = {
  creditPending,
  onOrderDelivered,
  onOrderCancelled,
  sweepCleared,
  listByReseller,
  requestPayout,
  listPayouts,
  updatePayout,
  sendError,
};
