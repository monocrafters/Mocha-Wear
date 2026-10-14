const { test } = require("node:test");
const assert = require("node:assert/strict");

let document = { prices: [] };
require.cache[require.resolve("../src/cloudStore")] = { exports: {
  createDocumentStore: () => ({
    read: async () => structuredClone(document),
    write: async (value) => { document = structuredClone(value); },
  }),
} };
const prices = require("../src/resellerPrices");
const bounds = { ready: true, minPrice: 1100, maxPrice: 2000 };

test("editing a live price replaces its listing, enforces bounds, and isolates resellers", async () => {
  const original = await prices.upsertPrice("reseller-a", "dress", { custom_price: 1200, is_active: true }, bounds);
  await prices.upsertPrice("reseller-b", "dress", { custom_price: 1300, is_active: true }, bounds);
  const updated = await prices.upsertPrice("reseller-a", "dress", { custom_price: 1500, is_active: true }, bounds);
  assert.equal(updated.id, original.id);
  assert.equal((await prices.listByReseller("reseller-a")).length, 1);
  assert.equal((await prices.getActive("reseller-a", "dress")).custom_price, 1500);
  assert.equal((await prices.getActive("reseller-b", "dress")).custom_price, 1300);
  for (const custom_price of [null, "", "invalid", 1099, 2001]) {
    await assert.rejects(prices.upsertPrice("reseller-a", "dress", { custom_price }, bounds), { status: 400 });
    assert.equal((await prices.getActive("reseller-a", "dress")).custom_price, 1500);
  }
  await prices.upsertPrice("reseller-a", "dress", { custom_price: 1600, is_active: false }, bounds);
  assert.equal(await prices.getActive("reseller-a", "dress"), null);
  assert.equal((await prices.listByReseller("reseller-a"))[0].custom_price, 1600);
});
