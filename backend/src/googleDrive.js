const crypto = require("node:crypto");
const fs = require("node:fs");
const { readDocument, writeDocument } = require("./cloudStore");
const API = "https://www.googleapis.com/drive/v3/files";
const SCOPE = "https://www.googleapis.com/auth/drive.file";
let access = null;
let refreshing = null;
function fail(message, status = 503) { return Object.assign(new Error(message), { status }); }
function config() {
  const c = { client_id: process.env.GOOGLE_DRIVE_CLIENT_ID, client_secret: process.env.GOOGLE_DRIVE_CLIENT_SECRET,
    redirect_uri: process.env.GOOGLE_DRIVE_REDIRECT_URI };
  if (!c.client_id || !c.client_secret || !c.redirect_uri || !/^[a-f0-9]{64}$/i.test(process.env.GOOGLE_DRIVE_TOKEN_KEY || "")) {
    throw fail("Google Drive server configuration is incomplete. Contact the administrator.");
  }
  return c;
}
function encrypt(value) {
  config();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", Buffer.from(process.env.GOOGLE_DRIVE_TOKEN_KEY, "hex"), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
  return { iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), data: data.toString("base64") };
}
async function connection() {
  config();
  const row = await readDocument("google_drive_credentials");
  if (!row) return null;
  const decipher = crypto.createDecipheriv("aes-256-gcm", Buffer.from(process.env.GOOGLE_DRIVE_TOKEN_KEY, "hex"), Buffer.from(row.iv, "base64"));
  decipher.setAuthTag(Buffer.from(row.tag, "base64"));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(row.data, "base64")), decipher.final()]).toString());
}
async function tokenRequest(params) {
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body: new URLSearchParams({ ...config(), ...params }), signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw fail("Google Drive authorization expired or was denied. Reconnect Drive from Admin Media.");
  return response.json();
}
async function token() {
  if (access && access.until > Date.now()) return access.value;
  if (!refreshing) refreshing = (async () => {
    const saved = await connection();
    if (!saved?.refresh_token) throw fail("Connect Google Drive from Admin Media before uploading.");
    const t = await tokenRequest({ grant_type: "refresh_token", refresh_token: saved.refresh_token });
    access = { value: t.access_token, until: Date.now() + (t.expires_in - 60) * 1000 };
    return access.value;
  })().finally(() => { refreshing = null; });
  return refreshing;
}
async function request(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { Authorization: `Bearer ${await token()}`, ...options.headers }, signal: options.signal || AbortSignal.timeout(120000) });
  if (response.ok || response.status === 308) return response;
  if (response.status === 401) { access = null; throw fail("Google Drive authorization expired. Reconnect Drive."); }
  if (response.status === 404) throw fail("This Drive file is no longer available.", 404);
  if (response.status === 416) throw fail("Requested file range is unavailable.", 416);
  if ([403, 429].includes(response.status)) throw fail("Google Drive denied the request or reached a storage/download limit. Check Drive capacity and retry later.", 429);
  throw fail("Google Drive is temporarily unavailable. Please retry.", 502);
}
async function status() {
  try { const saved = await connection(); return { configured: true, connected: Boolean(saved?.refresh_token), folder_id: saved?.folder_id || null }; }
  catch { return { configured: false, connected: false }; }
}
function authorize(state, verifier) {
  const { client_id, redirect_uri } = config();
  return "https://accounts.google.com/o/oauth2/v2/auth?" + new URLSearchParams({ client_id, redirect_uri, response_type: "code", scope: SCOPE, access_type: "offline", prompt: "consent select_account", state,
    ...(verifier ? { code_challenge: crypto.createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: "S256" } : {}) });
}
async function connect(code, verifier) {
  const existing = await connection();
  const t = await tokenRequest({ code, grant_type: "authorization_code", ...(verifier ? { code_verifier: verifier } : {}) });
  if (!t.refresh_token || !String(t.scope || "").split(" ").includes(SCOPE)) throw fail("Drive permission was not granted. Please reconnect.");
  const about = await fetch("https://www.googleapis.com/drive/v3/about?fields=user(permissionId)", { headers: { Authorization: `Bearer ${t.access_token}` }, signal: AbortSignal.timeout(30000) });
  if (!about.ok) throw fail("Could not verify the Google Drive owner.");
  const owner = (await about.json()).user?.permissionId;
  if (!owner || (existing && existing.owner !== owner)) throw fail("Use the same Google account that originally connected this Media library.", 409);
  if (existing) {
    await writeDocument("google_drive_credentials", encrypt({ ...existing, refresh_token: t.refresh_token }));
    access = null;
    return;
  }
  const response = await fetch(API + "?fields=id", { method: "POST", headers: { Authorization: `Bearer ${t.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ name: "Mocha Wear Media", mimeType: "application/vnd.google-apps.folder" }), signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw fail("Could not create the private Drive media folder.");
  const folder = await response.json();
  await writeDocument("google_drive_credentials", encrypt({ refresh_token: t.refresh_token, folder_id: folder.id, owner }));
  access = null;
}
async function upload(file) {
  if (!file.size) throw fail("Empty files cannot be uploaded.", 400);
  const saved = await connection();
  if (!saved?.folder_id) throw fail("Connect Google Drive from Admin Media before uploading.");
  const start = await request("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,size", {
    method: "POST", headers: { "Content-Type": "application/json", "X-Upload-Content-Type": file.mimetype, "X-Upload-Content-Length": String(file.size) },
    body: JSON.stringify({ name: file.originalname, parents: [saved.folder_id] }) });
  const location = start.headers.get("location");
  if (!location || new URL(location).origin !== "https://www.googleapis.com") throw fail("Invalid Drive upload session.");
  const handle = await fs.promises.open(file.path, "r");
  try {
    let offset = 0;
    while (offset < file.size) {
      const length = Math.min(8 * 1024 * 1024, file.size - offset);
      const buffer = Buffer.alloc(length);
      const { bytesRead } = await handle.read(buffer, 0, length, offset);
      if (bytesRead !== length) throw fail("The staged upload is incomplete. Please retry.", 400);
      let response;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          response = await request(location, { method: "PUT", headers: { "Content-Type": file.mimetype, "Content-Range": `bytes ${offset}-${offset + length - 1}/${file.size}` }, body: buffer });
          break;
        } catch (error) {
          if (error.status && ![502, 503, 429].includes(error.status)) throw error;
          // A lost response can mean the bytes were accepted. Probe before retrying.
          try {
            response = await request(location, { method: "PUT", headers: { "Content-Range": `bytes */${file.size}`, "Content-Length": "0" } });
            if (response.status !== 308 || Number(response.headers.get("range")?.split("-")[1]) + 1 > offset) break;
          } catch { /* bounded retry of this chunk */ }
          if (attempt === 2) throw fail("Drive upload interrupted. Please retry.");
          await new Promise(resolve => setTimeout(resolve, 500 * 2 ** attempt));
        }
      }
      if (response.status !== 308) return { ...(await response.json()), bytes: file.size };
      const range = response.headers.get("range");
      const next = range ? Number(range.split("-")[1]) + 1 : 0;
      if (next <= offset) throw fail("Drive upload interrupted. Please retry.");
      offset = next;
    }
    throw fail("Drive upload did not complete.");
  } finally { await handle.close(); }
}
async function remove(id) {
  try { await request(`${API}/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trashed: true }) }); }
  catch (error) { if (error.status !== 404) throw error; }
}
async function copy(id) {
  const saved = await connection();
  const r = await request(`${API}/${encodeURIComponent(id)}/copy?fields=id,size`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ parents: [saved.folder_id] }) });
  return r.json();
}
async function content(id, range, signal) {
  return request(`${API}/${encodeURIComponent(id)}?alt=media`, { headers: range ? { Range: range } : {}, signal });
}
async function thumbnail(id, signal) {
  const r = await request(`${API}/${encodeURIComponent(id)}?fields=thumbnailLink`, { signal });
  const { thumbnailLink } = await r.json();
  if (!thumbnailLink) throw fail("Preview is still processing. Download the original to view it.", 404);
  const url = new URL(thumbnailLink);
  if (url.protocol !== "https:" || !(url.hostname.endsWith(".googleusercontent.com") || url.hostname.endsWith(".google.com"))) throw fail("Invalid Drive preview.");
  // Thumbnail links are short lived and are never returned to the browser.
  const result = await fetch(url, { signal, redirect: "error" });
  if (!result.ok) throw fail("Preview is not available yet.", 404);
  return result;
}
async function warm() {
  await token();
}

module.exports = { status, authorize, connect, upload, remove, copy, content, thumbnail, warm };
