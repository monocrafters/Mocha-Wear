const { test } = require("node:test");
const assert = require("node:assert/strict");
const documents = { products: { products: [] }, media_library: { folders: [], files: [] } };
require.cache[require.resolve("../src/cloudStore")] = { exports: {
  createDocumentStore: key => ({
    read: async () => structuredClone(documents[key]),
    write: async value => { documents[key] = structuredClone(value); },
  }),
  writeDocument: async (key, value) => { documents[key] = structuredClone(value); },
} };
require.cache[require.resolve("../src/googleDrive")] = { exports: {
  upload: async () => ({ id: "drive-asset", bytes: 12 }),
} };
const products = require("../src/products");
const media = require("../src/mediaLibrary");

test("Product Media opt-in persists, follows edits, and keeps nested assets across toggles", async () => {
  const manual = await media.createFolder({ name: "Manual" });
  const excluded = await products.createOne({ name: "Excluded" });
  assert.equal(excluded.media_enabled, false);
  const product = await products.createOne({ name: "Dress", media_enabled: "true", uploaded_images: ["https://example.com/cover.jpg"] });
  const id = `product:${product.id}`;
  let root = await media.browse();
  assert.equal(root.folders.length, 2);
  assert.equal(root.folders.find(f => f.id === id).cover_url, "https://example.com/cover.jpg");
  assert.equal((await media.browse(id)).files.length, 0);
  const child = await media.createFolder({ parent_id: id, name: "Campaign" });
  const grandchild = await media.createFolder({ parent_id: child.id, name: "Originals" });
  const [file] = await media.uploadFiles(grandchild.id, [{ originalname: "photo.jpg", mimetype: "image/jpeg", size: 12 }]);
  assert.equal(file.provider, "drive");
  assert.equal(documents.media_library.folders.some(f => f.id === id), false);
  await products.updateOne(product.id, { name: "Renamed", existing_images: ["https://example.com/new.jpg"] });
  root = await media.browse();
  assert.equal(root.folders.find(f => f.id === id).name, "Renamed");
  assert.equal(root.folders.find(f => f.id === id).cover_url, "https://example.com/new.jpg");
  for (let n = 0; n < 3; n++) {
    await products.updateOne(product.id, { media_enabled: "false" });
    assert.deepEqual((await media.browse()).folders.map(f => f.id), [manual.id]);
    await assert.rejects(media.browse(id), { status: 404 });
    await assert.rejects(media.browse(grandchild.id), { status: 404 });
    await assert.rejects(media.getFile(file.id), { status: 404 });
    assert.equal(documents.media_library.files.length, 1);
    await products.updateOne(product.id, { media_enabled: "true" });
    assert.equal((await media.browse()).folders.filter(f => f.product_id === product.id).length, 1);
    assert.equal((await media.browse(grandchild.id)).files[0].id, file.id);
  }
  for (const operation of [
    () => media.renameFolder(id, { name: "Wrong" }),
    () => media.setFolderCover(id, file.id),
    () => media.setFolderCover(id, null),
    () => media.deleteFolder(id),
    () => media.pasteItem({ action: "move", item_type: "folder", id, target_folder_id: manual.id }),
    () => media.pasteItem({ action: "copy", item_type: "folder", id, target_folder_id: manual.id }),
  ]) await assert.rejects(operation(), { status: 400 });
  await media.renameFolder(child.id, { name: "Updated campaign" });
  assert.equal((await media.browse(id)).folders[0].name, "Updated campaign");
  await products.updateOne(product.id, { existing_images: [] });
  assert.equal((await media.browse()).folders.find(f => f.id === id).cover_url, "");
  await products.removeOne(product.id);
  assert.deepEqual((await media.browse()).folders.map(f => f.id), [manual.id]);
  assert.equal(documents.media_library.files[0].id, file.id);
});
