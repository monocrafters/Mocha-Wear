const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

let document;
require.cache[require.resolve("../src/cloudStore")] = { exports: {
  createDocumentStore: () => ({
    read: async () => structuredClone(document),
    write: async (value) => { document = structuredClone(value); },
  }),
} };
const products = require("../src/products");

beforeEach(() => { document = { products: [] }; });

test("multiple collections persist, filter published products, and deduplicate sale selection", async () => {
  const product = await products.createOne({ name: "Dress", collection_ids: '["summer", "new", "summer", " "]' });
  await products.createOne({ name: "Hidden", collection_ids: ["new"], is_published: false });
  assert.deepEqual(product.collection_ids, ["summer", "new"]);
  assert.equal(product.collection_id, "summer");
  assert.deepEqual((await products.getById(product.id)).collection_ids, ["summer", "new"]);
  for (const collection of ["summer", "new"]) {
    assert.deepEqual((await products.listPublished({ collection })).map((p) => p.id), [product.id]);
  }
  assert.deepEqual(await products.listPublished({ collection: "other" }), []);
  const saleIds = await products.resolveSaleProductIds([product.id], ["summer", "new"]);
  assert.equal(saleIds.filter((id) => id === product.id).length, 1);
  assert.ok((await products.resolveSaleProductIds([], ["new"])).includes(product.id));
});

test("legacy assignments migrate on read and survive unrelated edits", async () => {
  document.products.push({ id: "legacy", name: "Legacy", collection_id: "old" });
  assert.deepEqual((await products.getById("legacy")).collection_ids, ["old"]);
  let product = await products.updateOne("legacy", { price: 2000 });
  assert.deepEqual(product.collection_ids, ["old"]);
  product = await products.updateOne("legacy", { collection_ids: ["old", "new"] });
  assert.deepEqual((await products.updateOne("legacy", { name: "Renamed" })).collection_ids, ["old", "new"]);
  product = await products.updateOne("legacy", { collection_ids: ["new"] });
  assert.equal(product.collection_id, "new");
  assert.deepEqual(await products.listPublished({ collection: "old" }), []);
  product = await products.updateOne("legacy", { collection_ids: "[]", collection_id: "stale" });
  assert.deepEqual(product.collection_ids, []);
  assert.equal(product.collection_id, "");
  product = await products.updateOne("legacy", { collection_id: "old-client" });
  assert.deepEqual(product.collection_ids, ["old-client"]);
});

test("malformed collection updates fail without erasing existing memberships", async () => {
  const product = await products.createOne({ name: "Dress", collection_ids: ["summer"] });
  for (const collection_ids of ["broken", '"summer"', null, [null], [{}]]) {
    await assert.rejects(products.updateOne(product.id, { collection_ids }), { status: 400 });
    assert.deepEqual((await products.getById(product.id)).collection_ids, ["summer"]);
  }
});
