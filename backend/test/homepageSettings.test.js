const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

let document;
let writes;
require.cache[require.resolve("../src/cloudStore")] = {
  exports: {
    createDocumentStore: (_key, { empty }) => ({
      read: async () => structuredClone(document ?? empty()),
      write: async (value) => {
        document = structuredClone(value);
        writes += 1;
      },
    }),
  },
};
const settings = require("../src/settings");

beforeEach(() => {
  document = { brand_name: "Existing brand", email: "existing@example.com" };
  writes = 0;
});

test("old stores receive campaign defaults without a migration or write", async () => {
  const value = await settings.getPublic();
  assert.equal(value.brand_name, "Existing brand");
  assert.equal(value.homepage_hero_heading, "Everyday,");
  assert.equal(value.homepage_hero_accent, "beautifully.");
  assert.equal(value.homepage_hero_copy, "Considered pieces. Effortless days.");
  assert.equal(value.homepage_hero_cta_label, "Explore the collection");
  assert.equal(value.homepage_hero_cta_link, "/shop");
  assert.equal(writes, 0);
});

test("campaign changes persist and appear publicly without losing other settings", async () => {
  const campaign = {
    homepage_hero_heading: "The summer edit",
    homepage_hero_accent: "made for you.",
    homepage_hero_copy: "Light layers for warm days.",
    homepage_hero_cta_label: "Shop summer",
    homepage_hero_cta_link: "/collections/summer?sort=new",
  };
  await settings.updateSettings(campaign);
  await settings.updateSettings({ cities: "Lahore" });
  const value = await settings.getPublic();
  for (const [key, expected] of Object.entries(campaign)) {
    assert.equal(value[key], expected);
    assert.equal(document[key], expected);
  }
  assert.equal(value.brand_name, "Existing brand");
  assert.equal(value.cities, "Lahore");
});

test("overlong or invalid campaign text is rejected before any write", async () => {
  for (const [key, limit] of Object.entries({
    homepage_hero_heading: 60,
    homepage_hero_accent: 60,
    homepage_hero_copy: 120,
    homepage_hero_cta_label: 35,
  })) {
    for (const value of ["x".repeat(limit + 1), null, 123, {}]) {
      await assert.rejects(settings.updateSettings({ [key]: value }), { status: 400 });
    }
  }
  for (const key of ["homepage_hero_heading", "homepage_hero_cta_label"]) {
    await assert.rejects(settings.updateSettings({ [key]: "  " }), { status: 400 });
  }
  assert.equal(writes, 0);
});

test("optional copy can be cleared and text is trimmed at the allowed boundaries", async () => {
  await settings.updateSettings({
    homepage_hero_heading: ` ${"x".repeat(60)} `,
    homepage_hero_accent: "",
    homepage_hero_copy: "",
    homepage_hero_cta_label: "x".repeat(35),
  });
  const value = await settings.getPublic();
  assert.equal(value.homepage_hero_heading.length, 60);
  assert.equal(value.homepage_hero_accent, "");
  assert.equal(value.homepage_hero_copy, "");
  assert.equal(value.homepage_hero_cta_label.length, 35);
});

test("button links accept store paths, anchors, and HTTP(S) but reject unsafe input", async () => {
  for (const link of ["/shop", "/collections/summer?sort=new", "#collections", "https://example.com/shop", "http://example.com/shop"]) {
    await settings.updateSettings({ homepage_hero_cta_link: link });
    assert.equal((await settings.getPublic()).homepage_hero_cta_link, link);
  }
  const saved = await settings.getPublic();
  const writesBefore = writes;
  for (const link of ["javascript:alert(1)", "data:text/html,test", "//example.com", "/\\example.com", "https:example.com", "https://user:password@example.com", "https://exa mple.com", "java\nscript:alert(1)", "", "shop", null, {}]) {
    await assert.rejects(settings.updateSettings({ homepage_hero_cta_link: link }), { status: 400 });
  }
  assert.equal(writes, writesBefore);
  assert.equal((await settings.getPublic()).homepage_hero_cta_link, saved.homepage_hero_cta_link);
});

test("invalid stored links never reach the public homepage", async () => {
  document.homepage_hero_cta_link = "javascript:alert(1)";
  assert.equal((await settings.getPublic()).homepage_hero_cta_link, "/shop");
});
