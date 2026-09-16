const crypto = require("node:crypto");
const { Readable } = require("node:stream");
const { pipeline } = require("node:stream/promises");
const archiver = require("archiver");
const drive = require("./googleDrive");
const library = require("./mediaLibrary");
const pending = new Map();
const tickets = new Map();
function prune(map) { for (const [key, value] of map) if (value.expires < Date.now()) map.delete(key); }
function safe(handler) { return async (req, res) => { try { await handler(req, res); } catch (e) { if (!res.headersSent) library.sendError(res, e); else res.destroy(); } }; }
function isImage(file) {
  return file.resource_type === "image" || String(file.mime || "").startsWith("image/");
}
function isVideo(file) {
  return file.resource_type === "video" || String(file.mime || "").startsWith("video/");
}
function uniqueZipName(name, used) {
  const base = String(name || "file").replace(/[\\/:*?"<>|\x00-\x1f]/g, "_") || "file";
  if (!used.has(base.toLowerCase())) {
    used.add(base.toLowerCase());
    return base;
  }
  const dot = base.lastIndexOf(".");
  const stem = dot > 0 ? base.slice(0, dot) : base;
  const ext = dot > 0 ? base.slice(dot) : "";
  let i = 2;
  let next = `${stem}-${i}${ext}`;
  while (used.has(next.toLowerCase())) {
    i += 1;
    next = `${stem}-${i}${ext}`;
  }
  used.add(next.toLowerCase());
  return next;
}
function publicBrowse(payload, base) {
  const url = id => `${base}/files/${encodeURIComponent(id)}/preview`;
  return { ...payload, folders: payload.folders.map(f => ({ ...f, cover_url: f.cover_url?.startsWith("drive:") ? url(f.cover_file_id) : f.cover_url })),
    files: payload.files.map(f => { const { drive_id, ...item } = f; return { ...item, url: f.provider === "drive" ? url(f.id) : f.url }; }) };
}
async function zipFolder(req, res, kind) {
  const folderId = String(req.query.folder_id || "");
  const browse = await library.browse(folderId);
  const files = browse.files.filter((file) => (kind === "video" ? isVideo(file) : isImage(file)));
  if (!files.length) throw Object.assign(new Error(kind === "video" ? "No videos in this folder" : "No images in this folder"), { status: 404 });
  const folderName = String(browse.folder?.name || "media").replace(/[\\/:*?"<>|\x00-\x1f]+/g, "-") || "media";
  const estimate = files.reduce((sum, file) => sum + (Number(file.bytes) || 0), 0);
  res.status(200);
  res.set({
    "Content-Type": "application/zip",
    "Content-Disposition": `attachment; filename="${folderName}-${kind}s.zip"`,
    "Cache-Control": "private, no-store, no-transform",
    "X-Content-Type-Options": "nosniff",
    "X-Accel-Buffering": "no",
    "X-Media-File-Count": String(files.length),
    "X-Media-Bytes-Estimate": String(estimate),
  });
  if (typeof res.flushHeaders === "function") res.flushHeaders();

  const archive = archiver("zip", { zlib: { level: 0 }, store: true });
  const used = new Set();
  archive.on("error", (error) => {
    if (!res.headersSent) library.sendError(res, error);
    else res.destroy(error);
  });
  archive.pipe(res);

  for (const file of files) {
    const entryName = uniqueZipName(file.name, used);
    if (file.provider === "drive") {
      const controller = new AbortController();
      res.on("close", () => controller.abort());
      const upstream = await drive.content(file.drive_id, undefined, controller.signal);
      if (!upstream.ok && upstream.status !== 206) {
        throw Object.assign(new Error(`Could not read ${file.name}`), { status: 502 });
      }
      archive.append(Readable.fromWeb(upstream.body), { name: entryName, store: true });
    } else {
      const upstream = await fetch(file.url, { signal: AbortSignal.timeout(120000) });
      if (!upstream.ok || !upstream.body) throw Object.assign(new Error(`Could not read ${file.name}`), { status: 502 });
      archive.append(Readable.fromWeb(upstream.body), { name: entryName, store: true });
    }
  }
  await archive.finalize();
}
function register(app, adminAuth, resellerAuth) {
  app.get("/api/admin/media/drive/status", adminAuth.requireAdmin, safe(async (_req, res) => res.json(await drive.status())));
  app.post("/api/admin/media/drive/connect", adminAuth.requireAdmin, safe(async (_req, res) => {
    prune(pending);
    if (pending.size > 100) throw Object.assign(new Error("Please retry shortly."), { status: 429 });
    const state = crypto.randomBytes(32).toString("hex");
    const binding = crypto.randomBytes(32).toString("hex");
    drive.authorize(state); // Validate configuration before issuing a browser handoff.
    pending.set(state, { binding, verifier: crypto.randomBytes(32).toString("base64url"), expires: Date.now() + 600000, started: false });
    res.json({ url: `/api/admin/media/drive/authorize?state=${state}` });
  }));
  app.get("/api/admin/media/drive/authorize", safe(async (req, res) => {
    const state = String(req.query.state || "");
    const entry = pending.get(state);
    if (!entry || entry.started || entry.expires < Date.now()) throw Object.assign(new Error("Start again from Admin Media."), { status: 400 });
    entry.started = true;
    const binding = entry.binding;
    res.cookie("media_drive_oauth", binding, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/admin/media/drive", maxAge: 600000 });
    res.set("Referrer-Policy", "no-referrer").redirect(drive.authorize(state, entry.verifier));
  }));
  app.get("/api/admin/media/drive/callback", safe(async (req, res) => {
    const state = String(req.query.state || "");
    const entry = pending.get(state);
    const binding = String(req.headers.cookie || "").split(";").map(x => x.trim()).find(x => x.startsWith("media_drive_oauth="))?.slice("media_drive_oauth=".length);
    if (!entry || entry.expires < Date.now() || binding !== entry.binding) throw Object.assign(new Error("Authorization session expired. Start again from Admin Media."), { status: 400 });
    pending.delete(state);
    res.clearCookie("media_drive_oauth", { path: "/api/admin/media/drive" });
    if (req.query.error || typeof req.query.code !== "string") throw Object.assign(new Error("Google authorization was cancelled."), { status: 400 });
    await drive.connect(req.query.code, entry.verifier);
    res.set("Content-Security-Policy", "default-src 'none'").type("text").send("Google Drive connected. Return to Admin Media and refresh.");
  }));
  for (const [role, auth] of [["admin", adminAuth.requireAdmin], ["reseller", resellerAuth.requireReseller]]) {
    const base = `/api/${role}/media`;
    app.get(`${base}/files/:id/preview`, auth, safe(async (req, res) => stream(req, res, "preview")));
    app.post(`${base}/files/:id/download-ticket`, auth, safe(async (req, res) => {
      await library.getFile(req.params.id);
      prune(tickets);
      if (tickets.size >= 1000) throw Object.assign(new Error("Too many download requests. Retry shortly."), { status: 429 });
      const ticket = crypto.randomBytes(32).toString("hex");
      tickets.set(ticket, { id: req.params.id, role, mode: "download", authorization: req.headers.authorization, cookie: req.headers.cookie, expires: Date.now() + 60000 });
      res.json({ url: `${base}/files/${encodeURIComponent(req.params.id)}/download?ticket=${ticket}` });
    }));
    app.post(`${base}/files/:id/stream-ticket`, auth, safe(async (req, res) => {
      const file = await library.getFile(req.params.id);
      const mime = String(file.mime || "");
      const isMedia =
        file.resource_type === "video" ||
        file.resource_type === "image" ||
        mime.startsWith("video/") ||
        mime.startsWith("image/");
      if (!isMedia) throw Object.assign(new Error("Only images and videos can be streamed"), { status: 400 });
      prune(tickets);
      if (tickets.size >= 1000) throw Object.assign(new Error("Too many stream requests. Retry shortly."), { status: 429 });
      // Warm Drive OAuth before the browser hits /stream so the first Range request is faster.
      if (file.provider === "drive") await drive.warm();
      const ticket = crypto.randomBytes(32).toString("hex");
      tickets.set(ticket, { id: req.params.id, role, mode: "stream", authorization: req.headers.authorization, cookie: req.headers.cookie, expires: Date.now() + 15 * 60000 });
      res.json({ url: `${base}/files/${encodeURIComponent(req.params.id)}/stream?ticket=${ticket}` });
    }));
    app.get(`${base}/files/:id/download`, (req, res, next) => {
      const key = String(req.query.ticket || "");
      const t = tickets.get(key);
      if (t && t.expires > Date.now() && t.id === req.params.id && t.role === role && t.mode === "download") {
        tickets.delete(key);
        req.headers.authorization = t.authorization;
        req.headers.cookie = t.cookie;
      }
      auth(req, res, next);
    }, safe(async (req, res) => stream(req, res, "download")));
    app.get(`${base}/files/:id/stream`, (req, res, next) => {
      const key = String(req.query.ticket || "");
      const t = tickets.get(key);
      if (t && t.expires > Date.now() && t.id === req.params.id && t.role === role && t.mode === "stream") {
        // Keep ticket for Range seeks during playback.
        req.headers.authorization = t.authorization;
        req.headers.cookie = t.cookie;
      }
      auth(req, res, next);
    }, safe(async (req, res) => stream(req, res, "stream")));
    app.get(`${base}/download-zip`, auth, safe(async (req, res) => {
      const kind = req.query.kind === "video" ? "video" : "image";
      await zipFolder(req, res, kind);
    }));
  }
}
async function stream(req, res, mode) {
  const file = await library.getFile(req.params.id);
  if (file.provider !== "drive") return res.redirect(file.url);
  const controller = new AbortController();
  res.on("close", () => controller.abort());
  const range = req.headers.range;
  if (range && !/^bytes=\d*-\d*$/.test(range)) throw Object.assign(new Error("Invalid byte range"), { status: 416 });
  const preview = mode === "preview";
  const upstream = preview
    ? await drive.thumbnail(file.drive_id, controller.signal)
    : await drive.content(file.drive_id, range, controller.signal);
  res.status(upstream.status);
  const mime =
    preview
      ? "image/jpeg"
      : mode === "stream"
        ? String(file.mime || upstream.headers.get("content-type") || (file.resource_type === "image" ? "image/jpeg" : "video/mp4"))
        : "application/octet-stream";
  res.set({
    "Cache-Control": "private, no-store, no-transform",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy":
      mode === "stream"
        ? "default-src 'none'; img-src 'self' blob: data:; media-src 'self'"
        : "default-src 'none'; sandbox",
    "Content-Type": mime,
  });
  for (const header of ["content-length", "content-range", "accept-ranges"]) {
    if (upstream.headers.has(header)) res.set(header, upstream.headers.get(header));
  }
  if (mode === "stream") {
    res.set("Accept-Ranges", "bytes");
    res.set("X-Accel-Buffering", "no");
  }
  if (mode === "download") {
    res.attachment(file.name.replace(/[\r\n\x00-\x1f]/g, "_"));
    res.type("application/octet-stream");
  }
  if (typeof res.flushHeaders === "function") res.flushHeaders();
  await pipeline(Readable.fromWeb(upstream.body), res);
}
module.exports = { register, publicBrowse };
