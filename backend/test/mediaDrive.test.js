const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const express = require("express");
let data = { folders: [], files: [] };
let credentials = null;
const cloudCalls = [];
require.cache[require.resolve("../src/cloudStore")] = { exports: {
  createDocumentStore: () => ({ read: async () => structuredClone(data), write: async value => { data = structuredClone(value); } }),
  readDocument: async () => credentials,
  writeDocument: async (key, value) => { if (key === "media_library") data = structuredClone(value); else credentials = value; },
} };
require.cache[require.resolve("../src/cloudinary")] = { exports: {
  destroyMedia: async id => cloudCalls.push(id),
  duplicateMedia: async () => ({ url: "https://res.cloudinary.com/legacy-copy", publicId: "copy" }),
} };
process.env.GOOGLE_DRIVE_CLIENT_ID = "test";
process.env.GOOGLE_DRIVE_CLIENT_SECRET = "test-secret";
process.env.GOOGLE_DRIVE_REDIRECT_URI = "http://localhost/api/admin/media/drive/callback";
process.env.GOOGLE_DRIVE_TOKEN_KEY = "ab".repeat(32);
const nativeFetch = global.fetch;
let uploaded = 0;
let owner = "owner-one";
global.fetch = async (url, options = {}) => {
  url = String(url);
  if (url.startsWith("http://127.0.0.1:")) return nativeFetch(url, options);
  if (url.includes("oauth2.googleapis.com/token")) return Response.json({ refresh_token: "private-refresh", access_token: "private-access", expires_in: 3600, scope: "https://www.googleapis.com/auth/drive.file" });
  if (url.includes("/about?")) return Response.json({ user: { permissionId: owner } });
  if (url.includes("uploadType=resumable")) return new Response(null, { headers: { location: "https://www.googleapis.com/upload/session" } });
  if (url.includes("/upload/session")) {
    uploaded += options.body.length;
    return Response.json({ id: "drive-original", size: String(uploaded) });
  }
  if (url.includes("alt=media")) return new Response("original-bytes", { status: options.headers.Range ? 206 : 200, headers: { "content-length": "14", "content-range": "bytes 0-13/14" } });
  if (url.includes("thumbnailLink")) return Response.json({ thumbnailLink: "https://lh3.googleusercontent.com/thumbnail" });
  if (url.includes("googleusercontent")) return new Response("preview");
  if (url.includes("/copy?")) return Response.json({ id: "drive-copy", size: "14" });
  if (options.method === "PATCH") return Response.json({ trashed: true });
  return Response.json({ id: "private-folder" });
};
const drive = require("../src/googleDrive");
const library = require("../src/mediaLibrary");
const routes = require("../src/mediaDriveRoutes");
let server, base;
let suspended = false;
const auth = role => (req, res, next) => {
  if (req.headers.authorization !== `Bearer ${role}` || (role === "reseller" && suspended)) return res.status(401).json({ message: "Unauthorized" });
  next();
};
before(async () => {
  const app = express(); app.use(express.json());
  routes.register(app, { requireAdmin: auth("admin") }, { requireReseller: auth("reseller") });
  server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { await new Promise(resolve => server.close(resolve)); global.fetch = nativeFetch; });
test("Drive OAuth state is one-use and bound to the browser", async () => {
  assert.equal((await fetch(base + "/api/admin/media/drive/connect", { method: "POST" })).status, 401);
  const start = await fetch(base + "/api/admin/media/drive/connect", { method: "POST", headers: { authorization: "Bearer admin" } });
  const { url } = await start.json();
  const hop = await fetch(base + url, { redirect: "manual" });
  const state = new URL(hop.headers.get("location")).searchParams.get("state");
  const cookie = hop.headers.get("set-cookie").split(";")[0];
  const callback = base + "/api/admin/media/drive/callback?state=" + state + "&code=code";
  assert.equal((await fetch(callback)).status, 400);
  assert.equal((await fetch(callback, { headers: { cookie } })).status, 200);
  assert.equal((await fetch(callback, { headers: { cookie } })).status, 400);
  assert.ok(credentials.data);
  assert.ok(!JSON.stringify(credentials).includes("private-refresh"));
});
test("Reconnect rejects a different Drive owner and preserves credentials", async () => {
  const previous = structuredClone(credentials);
  owner = "other-owner";
  await assert.rejects(drive.connect("code"), /same Google account/);
  assert.deepEqual(credentials, previous);
  owner = "owner-one";
  await drive.connect("code");
});
test("Uploads retain original bytes and provider metadata", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "media-test-"));
  const file = path.join(dir, "original");
  await fs.writeFile(file, "original-bytes");
  try {
    const [item] = await library.uploadFiles("", [{ path: file, originalname: "photo.jpg", mimetype: "image/jpeg", size: 14 }]);
    assert.equal(item.provider, "drive"); assert.equal(item.drive_id, "drive-original"); assert.equal(item.bytes, 14); assert.equal(uploaded, 14);
  } finally { await fs.rm(dir, { recursive: true }); }
});
test("Mixed browsing retains legacy links and hides Drive IDs", async () => {
  data.files.push({ id: "legacy", url: "https://res.cloudinary.com/legacy", public_id: "legacy", name: "old.jpg" });
  const result = routes.publicBrowse(await library.browse(""), "/api/reseller/media");
  assert.equal(result.files.find(f => f.id === "legacy").url, "https://res.cloudinary.com/legacy");
  const item = result.files.find(f => f.provider === "drive");
  assert.ok(item.url.startsWith("/api/reseller/media/")); assert.equal(item.drive_id, undefined);
});
test("Preview and download reject anonymous requests", async () => {
  const id = data.files.find(f => f.provider === "drive").id;
  for (const endpoint of ["preview", "download"]) assert.equal((await fetch(base + `/api/reseller/media/files/${id}/${endpoint}`)).status, 401);
  const preview = await fetch(base + `/api/reseller/media/files/${id}/preview`, { headers: { authorization: "Bearer reseller" } });
  assert.equal(preview.status, 200); assert.equal(await preview.text(), "preview");
});
test("Download tickets are scoped, single-use and stream originals", async () => {
  const id = data.files.find(f => f.provider === "drive").id;
  const ticket = await fetch(base + `/api/reseller/media/files/${id}/download-ticket`, { method: "POST", headers: { authorization: "Bearer reseller" } });
  const { url } = await ticket.json();
  assert.equal((await fetch(base + url.replace("/reseller/", "/admin/"))).status, 401);
  const download = await fetch(base + url);
  assert.equal(download.status, 200); assert.equal(await download.text(), "original-bytes");
  assert.match(download.headers.get("content-disposition"), /attachment/);
  assert.match(download.headers.get("cache-control"), /no-store/);
  assert.equal((await fetch(base + url)).status, 401);
});
test("Stream tickets play videos inline without attachment", async () => {
  const file = data.files.find(f => f.provider === "drive");
  file.resource_type = "video";
  file.mime = "video/mp4";
  assert.equal((await fetch(base + `/api/reseller/media/files/${file.id}/stream-ticket`, { method: "POST" })).status, 401);
  const notVideo = await fetch(base + `/api/reseller/media/files/legacy/stream-ticket`, {
    method: "POST",
    headers: { authorization: "Bearer reseller" },
  });
  assert.equal(notVideo.status, 400);
  const ticket = await fetch(base + `/api/reseller/media/files/${file.id}/stream-ticket`, {
    method: "POST",
    headers: { authorization: "Bearer reseller" },
  });
  assert.equal(ticket.status, 200);
  const { url } = await ticket.json();
  const first = await fetch(base + url, { headers: { Range: "bytes=0-5" } });
  assert.equal(first.status, 206);
  assert.equal(first.headers.get("content-type"), "video/mp4");
  assert.equal(first.headers.get("content-disposition"), null);
  assert.equal(await first.text(), "original-bytes");
  const second = await fetch(base + url);
  assert.equal(second.status, 200);
  assert.equal(second.headers.get("content-type"), "video/mp4");
});
test("Suspending a reseller invalidates already issued download tickets", async () => {
  const id = data.files.find(f => f.provider === "drive").id;
  const { url } = await (await fetch(base + `/api/reseller/media/files/${id}/download-ticket`, { method: "POST", headers: { authorization: "Bearer reseller" } })).json();
  suspended = true;
  assert.equal((await fetch(base + url)).status, 401);
  suspended = false;
});
test("Drive copies and deletes do not call Cloudinary", async () => {
  const item = data.files.find(f => f.provider === "drive");
  const result = await library.pasteItem({ action: "copy", item_type: "file", id: item.id });
  assert.equal(result.item.drive_id, "drive-copy");
  await library.deleteFile(result.item.id); assert.deepEqual(cloudCalls, []);
  await library.deleteFile("legacy"); assert.deepEqual(cloudCalls, ["legacy"]);
});
test("Concurrent folder changes do not lose metadata", async () => {
  await Promise.all([library.createFolder({ name: "One" }), library.createFolder({ name: "Two" })]);
  assert.equal(data.folders.length, 2);
});
