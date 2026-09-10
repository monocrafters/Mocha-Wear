const crypto = require("node:crypto");
const { Readable } = require("node:stream");
const { pipeline } = require("node:stream/promises");
const drive = require("./googleDrive");
const library = require("./mediaLibrary");
const pending = new Map();
const tickets = new Map();
function prune(map) { for (const [key, value] of map) if (value.expires < Date.now()) map.delete(key); }
function safe(handler) { return async (req, res) => { try { await handler(req, res); } catch (e) { if (!res.headersSent) library.sendError(res, e); else res.destroy(); } }; }
function publicBrowse(payload, base) {
  const url = id => `${base}/files/${encodeURIComponent(id)}/preview`;
  return { ...payload, folders: payload.folders.map(f => ({ ...f, cover_url: f.cover_url?.startsWith("drive:") ? url(f.cover_file_id) : f.cover_url })),
    files: payload.files.map(f => { const { drive_id, ...item } = f; return { ...item, url: f.provider === "drive" ? url(f.id) : f.url }; }) };
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
    app.get(`${base}/files/:id/preview`, auth, safe(async (req, res) => stream(req, res, true)));
    app.post(`${base}/files/:id/download-ticket`, auth, safe(async (req, res) => {
      await library.getFile(req.params.id);
      prune(tickets);
      if (tickets.size >= 1000) throw Object.assign(new Error("Too many download requests. Retry shortly."), { status: 429 });
      const ticket = crypto.randomBytes(32).toString("hex");
      tickets.set(ticket, { id: req.params.id, role, authorization: req.headers.authorization, cookie: req.headers.cookie, expires: Date.now() + 60000 });
      res.json({ url: `${base}/files/${encodeURIComponent(req.params.id)}/download?ticket=${ticket}` });
    }));
    app.get(`${base}/files/:id/download`, (req, res, next) => {
      const key = String(req.query.ticket || "");
      const t = tickets.get(key);
      if (t && t.expires > Date.now() && t.id === req.params.id && t.role === role) {
        tickets.delete(key);
        // Recheck the originating login, including current reseller suspension status.
        req.headers.authorization = t.authorization;
        req.headers.cookie = t.cookie;
      }
      auth(req, res, next);
    }, safe(async (req, res) => stream(req, res, false)));
  }
}
async function stream(req, res, preview) {
  const file = await library.getFile(req.params.id);
  if (file.provider !== "drive") return res.redirect(file.url);
  const controller = new AbortController();
  res.on("close", () => controller.abort());
  const range = req.headers.range;
  if (range && !/^bytes=\d*-\d*$/.test(range)) throw Object.assign(new Error("Invalid byte range"), { status: 416 });
  const upstream = preview ? await drive.thumbnail(file.drive_id, controller.signal) : await drive.content(file.drive_id, range, controller.signal);
  res.status(upstream.status);
  res.set({ "Cache-Control": "private, no-store, no-transform", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "Content-Security-Policy": "default-src 'none'; sandbox", "Content-Type": preview ? "image/jpeg" : "application/octet-stream" });
  for (const header of ["content-length", "content-range", "accept-ranges"]) if (upstream.headers.has(header)) res.set(header, upstream.headers.get(header));
  if (!preview) { res.attachment(file.name.replace(/[\r\n\x00-\x1f]/g, "_")); res.type("application/octet-stream"); }
  await pipeline(Readable.fromWeb(upstream.body), res);
}
module.exports = { register, publicBrowse };
