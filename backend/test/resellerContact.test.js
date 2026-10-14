const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");

const documents = {};
require.cache[require.resolve("../src/cloudStore")] = { exports: {
  createDocumentStore: (key, { empty }) => ({
    read: async () => structuredClone(documents[key] ?? empty),
    write: async (value) => { documents[key] = structuredClone(value); },
  }),
} };
const resellers = require("../src/resellers");
const auth = require("../src/resellerAuth");
const routes = require("../src/resellerContactRoutes");
let server, base, reseller, other, token;

before(async () => {
  reseller = await resellers.createOne({ name: "Seller", username: "seller", password: "password", code: "seller-one", phone: "03001111111" });
  other = await resellers.createOne({ name: "Other", username: "other", password: "password", code: "seller-two" });
  const app = express();
  app.use(express.json());
  app.post("/login", auth.login);
  app.get("/me", auth.me);
  routes.register(app, auth);
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  const response = await fetch(`${base}/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "seller", password: "password" }),
  });
  assert.equal(response.status, 200);
  token = (await response.json()).token;
});
after(async () => { await new Promise((resolve) => server.close(resolve)); });

function save(body, authenticated = true) {
  return fetch(`${base}/api/reseller/settings`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(authenticated ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
}

async function contact(headers = {}) {
  const response = await fetch(`${base}/api/store-contact`, { headers });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  return response.json();
}

test("WhatsApp settings require login and only update the signed-in reseller's contact", async () => {
  assert.equal((await save({ whatsapp_number: "03001234567" }, false)).status, 401);
  assert.equal((await save({ whatsapp_number: "0300 123-4567", id: other.id, status: "suspended", phone: "changed", wallet_cleared: 9999 })).status, 200);
  const me = await (await fetch(`${base}/me`, { headers: { Authorization: `Bearer ${token}` } })).json();
  assert.equal(me.reseller.whatsapp_number, "923001234567");
  assert.equal(me.reseller.phone, "03001111111");
  assert.equal(me.reseller.status, "approved");
  assert.equal(me.reseller.wallet_cleared, 0);
  assert.equal((await resellers.getById(other.id)).whatsapp_number, "");
});

test("referral header, cookie and old codes resolve only the public WhatsApp contact", async () => {
  const expected = { whatsapp_number: "923001234567" };
  assert.deepEqual(await contact({ "X-Reseller-Code": reseller.code }), expected);
  assert.deepEqual(await contact({ Cookie: `mw_r=${reseller.code}` }), expected);
  await resellers.updateOne(reseller.id, { previous_codes: ["old-seller"] });
  assert.deepEqual(await contact({ "X-Reseller-Code": "old-seller" }), expected);
  assert.deepEqual(await contact({ "X-Reseller-Code": other.code }), { whatsapp_number: "" });
  assert.deepEqual(await contact(), { whatsapp_number: "" });
  assert.deepEqual(await contact({ "X-Reseller-Code": "missing" }), { whatsapp_number: "" });
});

test("number updates normalize international formats and reject invalid input without losing the saved contact", async () => {
  for (const input of ["+92 (300) 765-4321", "00923007654321", "923007654321"]) {
    const response = await save({ whatsapp_number: input });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { whatsapp_number: "923007654321" });
  }
  for (const input of ["abc", "123", "0300123", "9230012345678", "https://wa.me/923001234567", null, {}, 923001234567]) {
    assert.equal((await save({ whatsapp_number: input })).status, 400);
    assert.equal((await resellers.getById(reseller.id)).whatsapp_number, "923007654321");
  }
  assert.equal((await save({})).status, 400);
  assert.deepEqual(await contact({ "X-Reseller-Code": reseller.code }), { whatsapp_number: "923007654321" });
  assert.equal((await save({ whatsapp_number: "" })).status, 200);
  assert.deepEqual(await contact({ "X-Reseller-Code": reseller.code }), { whatsapp_number: "" });
});

test("suspended and deleted resellers cannot publish a WhatsApp contact", async () => {
  await save({ whatsapp_number: "+923001234567" });
  await resellers.updateOne(reseller.id, { status: "suspended" });
  assert.deepEqual(await contact({ "X-Reseller-Code": reseller.code }), { whatsapp_number: "" });
  assert.equal((await save({ whatsapp_number: "03007654321" })).status, 401);
  await resellers.updateOne(reseller.id, { status: "approved" });
  await resellers.removeOne(reseller.id);
  assert.deepEqual(await contact({ Cookie: `mw_r=${reseller.code}` }), { whatsapp_number: "" });
});
