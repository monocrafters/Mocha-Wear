const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

let document;
let collectionIds;
let publishedIds;
let defaultDocument;
let writes;

require.cache[require.resolve("../src/cloudStore")] = {
  exports: {
    createDocumentStore: (_name, { empty }) => {
      defaultDocument = empty;
      return {
        read: async () => document || defaultDocument,
        write: async (data) => { document = structuredClone(data); writes += 1; },
      };
    },
  },
};
require.cache[require.resolve("../src/collections")] = {
  exports: {
    listAll: async () => ({ items: collectionIds.map((id) => ({ id })) }),
    listPublished: async () => publishedIds.map((id) => ({ id })),
  },
};
const api = require("../src/spotlight");

function config() {
  return {
    enabled: true,
    autoplay: true,
    interval: 5000,
    items: [
      { id: "a", collection_id: "a", title: "Cotton", description: "The complete cotton edit.", image: "/images/collections/cotton-lawn.webp", background: "", enabled: true },
      { id: "b", collection_id: "b", title: "Winter", description: "Winter collection.", image: "https://res.cloudinary.com/shop/image/upload/collection.jpg", background: "", enabled: true },
    ],
  };
}

beforeEach(() => {
  document = undefined;
  writes = 0;
  collectionIds = ["a", "b"];
  publishedIds = ["a"];
});

test("a new installation automatically rotates collections every five seconds", async () => {
  const settings = await api.getAdmin();
  assert.equal(settings.enabled, true);
  assert.equal(settings.autoplay, true);
  assert.equal(settings.interval, 5000);
  assert.equal(writes, 0);
});

test("save preserves artwork, order and rotation settings; public hides unpublished collections", async () => {
  const settings = config();
  settings.interval = 8000;
  settings.items.reverse();
  settings.items[1].background = "/images/collections/cotton-lawn.png";
  await api.save(settings);
  assert.deepEqual(await api.getAdmin(), settings);
  const visible = await api.getPublic();
  assert.equal(visible.interval, 8000);
  assert.deepEqual(visible.items, [settings.items[1]]);
});

test("a future collection can be saved as a draft and later published with its full artwork", async () => {
  collectionIds.push("new-collection");
  publishedIds.push("new-collection");
  const settings = config();
  settings.items.push({
    id: "new-collection", collection_id: "new-collection", title: "New edit",
    description: "", image: "", background: "", enabled: false,
  });
  await api.save(settings);
  assert.equal((await api.getAdmin()).items.length, 3);
  assert.equal((await api.getPublic()).items.length, 1);
  settings.items[2].image = "https://res.cloudinary.com/shop/image/upload/full-collection.webp";
  settings.items[2].enabled = true;
  await api.save(settings);
  assert.deepEqual((await api.getPublic()).items.map((item) => item.id), ["a", "new-collection"]);
});

test("disabling an entry or unpublishing its collection immediately removes it from public results", async () => {
  publishedIds = ["a", "b"];
  const settings = config();
  settings.items[0].enabled = false;
  await api.save(settings);
  assert.deepEqual((await api.getPublic()).items.map((item) => item.id), ["b"]);
  publishedIds = [];
  assert.deepEqual((await api.getPublic()).items, []);
  assert.equal((await api.getAdmin()).items.length, 2);
});

test("publishing an entry without collection artwork is rejected and preserves the saved draft", async () => {
  const settings = config();
  settings.items[1].enabled = false;
  settings.items[1].image = "";
  settings.items[1].background = "/images/collections/winter-background.webp";
  await api.save(settings);
  const saved = structuredClone(await api.getAdmin());

  for (const image of ["", "   ", undefined]) {
    const candidate = structuredClone(settings);
    candidate.items[1].enabled = true;
    candidate.items[1].image = image;
    await assert.rejects(api.save(candidate), {
      status: 400,
      message: "Add collection artwork before publishing Winter.",
    });
  }

  assert.deepEqual(await api.getAdmin(), saved);
  assert.equal(writes, 1);
  assert.deepEqual((await api.getPublic()).items.map((item) => item.id), ["a"]);
});

test("invalid settings are rejected without overwriting saved configuration", async () => {
  await api.save(config());
  const saved = structuredClone(await api.getAdmin());
  for (const patch of [
    { interval: 100 }, { interval: 16000 }, { interval: 5000.5 },
    { autoplay: "true" }, { enabled: null }, { items: "invalid" },
  ]) {
    await assert.rejects(api.save({ ...config(), ...patch }), { status: 400 });
  }
  for (const payload of [null, [], undefined, { ...config(), items: [null] }]) {
    await assert.rejects(api.save(payload), { status: 400 });
  }
  assert.deepEqual(await api.getAdmin(), saved);
  assert.equal(writes, 1);
});

test("invalid image locations are rejected for both artwork fields", async () => {
  for (const field of ["image", "background"]) {
    for (const url of ["javascript:alert(1)", "http://res.cloudinary.com/image.png", "https://res.cloudinary.com.evil.test/image.png", "/images/collections/../secret.png"]) {
      const settings = config();
      settings.items[0][field] = url;
      await assert.rejects(api.save(settings), { status: 400 });
    }
  }
  assert.equal(writes, 0);
});

test("unknown and duplicate collections cannot be published", async () => {
  const settings = config();
  settings.items[1].collection_id = "a";
  await assert.rejects(api.save(settings), { status: 400 });
  settings.items[1].collection_id = "missing";
  await assert.rejects(api.save(settings), { status: 400 });
  assert.equal(writes, 0);
});

test("switching off the hero and automatic rotation persists independently of its entries", async () => {
  const settings = { ...config(), enabled: false, autoplay: false };
  await api.save(settings);
  assert.equal((await api.getPublic()).enabled, false);
  assert.equal((await api.getPublic()).autoplay, false);
  assert.equal((await api.getAdmin()).items.length, 2);
});
