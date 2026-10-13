const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

let documents;
let deliveredOrders;
require.cache[require.resolve("../src/cloudStore")] = { exports: {
  createDocumentStore: (key, options) => ({
    read: async () => structuredClone(documents[key] ?? (typeof options.empty === "function" ? options.empty() : options.empty)),
    write: async (value) => { documents[key] = structuredClone(value); },
  }),
} };
require.cache[require.resolve("../src/orders")] = { exports: { listAll: async () => deliveredOrders } };
const resellers = require("../src/resellers");
const pr = require("../src/resellerPrRequests");
const notifications = require("../src/notifications");

beforeEach(() => {
  documents = { resellers: { resellers: [{ id: "legacy", name: "Legacy", username: "legacy", code: "legacy" }] } };
  deliveredOrders = [{ reseller_id: "legacy", status: "delivered", items: [{ qty: 100 }] }];
});

test("new accounts default to PR off; explicit opt-in and legacy accounts retain access", async () => {
  const off = await resellers.createOne({ name: "New", username: "new", password: "test-only-password" });
  const on = await resellers.createOne({ name: "Enabled", username: "enabled", password: "test-only-password", pr_enabled: true });
  assert.equal(off.pr_enabled, false);
  assert.equal(on.pr_enabled, true);
  assert.equal((await resellers.getById("legacy")).pr_enabled, true);
  await resellers.updateOne(off.id, { name: "Edited" });
  assert.equal((await resellers.getById(off.id)).pr_enabled, false);
});

test("checkbox updates persist and reject non-boolean values", async () => {
  await resellers.updateOne("legacy", { pr_enabled: false });
  assert.equal((await resellers.getById("legacy")).pr_enabled, false);
  assert.equal(documents.resellers.resellers[0].pr_enabled, false);
  for (const value of ["false", "true", 0, 1, null]) {
    await assert.rejects(resellers.updateOne("legacy", { pr_enabled: value }), { status: 400 });
    await assert.rejects(resellers.createOne({ pr_enabled: value }), { status: 400 });
  }
  await resellers.updateOne("legacy", { pr_enabled: true });
  assert.equal((await resellers.getById("legacy")).pr_enabled, true);
});

test("disabled accounts expose no progress/history and cannot submit even with stale enabled identity", async () => {
  const stale = await resellers.getById("legacy");
  await resellers.updateOne("legacy", { pr_enabled: false });
  assert.deepEqual(await pr.getProgress("legacy"), { enabled: false });
  await assert.rejects(pr.createRequest("legacy", { note: "request" }, stale), { status: 403 });
  assert.equal(documents.reseller_pr_requests, undefined);
  assert.deepEqual(await pr.getProgress("missing"), { enabled: false });
});

test("enabled accounts keep the existing 100 delivered-product rule and pending protection", async () => {
  deliveredOrders[0].items[0].qty = 99;
  assert.equal((await pr.getProgress("legacy")).can_request, false);
  await assert.rejects(pr.createRequest("legacy"), { status: 400 });
  deliveredOrders[0].items[0].qty = 100;
  const progress = await pr.getProgress("legacy");
  assert.equal(progress.enabled, true);
  assert.equal(progress.can_request, true);
  const request = await pr.createRequest("legacy");
  assert.equal(request.delivered_at_request, 100);
  await assert.rejects(pr.createRequest("legacy"), { status: 400 });
});

test("disabling preserves history, hides PR notifications and blocks approval until re-enabled", async () => {
  const request = await pr.createRequest("legacy");
  await notifications.add({ role: "reseller", reseller_id: "legacy", type: "pr_review", title: "Old PR update" });
  await notifications.add({ role: "reseller", reseller_id: "legacy", type: "new_order", title: "Order update" });
  await resellers.updateOne("legacy", { pr_enabled: false });
  assert.deepEqual((await notifications.listReseller("legacy")).map(item => item.type), ["new_order"]);
  assert.equal((await pr.listByReseller("legacy")).length, 1);
  await assert.rejects(pr.reviewRequest(request.id, { status: "approved" }), { status: 403 });
  await resellers.updateOne("legacy", { pr_enabled: true });
  assert.equal((await pr.getProgress("legacy")).pending_request.id, request.id);
  assert.equal((await pr.reviewRequest(request.id, { status: "approved" })).status, "approved");
});

test("rejecting a historical request while PR is disabled sends no reseller PR notification", async () => {
  const request = await pr.createRequest("legacy");
  await resellers.updateOne("legacy", { pr_enabled: false });
  await pr.reviewRequest(request.id, { status: "rejected" });
  assert.equal(documents.notifications.items.some(item => item.role === "reseller" && item.type === "pr_review"), false);
});
