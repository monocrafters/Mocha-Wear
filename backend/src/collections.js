const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { getSupabase } = require("./db");

const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "collections.json");
const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "collections");

const SETUP_SQL = `create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  subtitle text not null default '',
  description text not null default '',
  cover_image text not null default '',
  cover_image_desktop text not null default '',
  banner_image text not null default '',
  banner_image_desktop text not null default '',
  link_url text not null default '',
  sale_label text not null default '',
  is_on_sale boolean not null default false,
  is_published boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.collections enable row level security;`;

function codeify(text) {
  return (
    String(text || "")
      .toUpperCase()
      .trim()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "COLLECTION"
  );
}

function slugify(text) {
  return codeify(text).toLowerCase();
}

function ensureDirs() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

ensureDirs();

function readFileStore() {
  ensureDirs();
  if (!fs.existsSync(DATA_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return [];
  }
}

function writeFileStore(items) {
  ensureDirs();
  fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2));
}

function isMissingTable(error) {
  const code = error?.code || "";
  const message = error?.message || "";
  return (
    code === "PGRST205" ||
    code === "42P01" ||
    /could not find the table/i.test(message) ||
    /schema cache/i.test(message) ||
    /does not exist/i.test(message)
  );
}

function shape(row) {
  return {
    id: row.id,
    name: row.name || "",
    slug: row.slug || slugify(row.code || row.name),
    code: codeify(row.code || row.slug || row.name),
    subtitle: row.subtitle || "",
    description: row.description || "",
    cover_image: row.cover_image || "",
    cover_image_desktop: row.cover_image_desktop || "",
    banner_image: row.banner_image || row.cover_image || "",
    banner_image_desktop: row.banner_image_desktop || "",
    sale_label: row.sale_label || "",
    is_on_sale: Boolean(row.is_on_sale),
    is_published: row.is_published !== false,
    sort_order: Number(row.sort_order) || 0,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
  };
}

function coerce(body = {}) {
  const next = { ...body };
  if (typeof next.is_on_sale === "string") {
    next.is_on_sale = next.is_on_sale === "true" || next.is_on_sale === "on" || next.is_on_sale === "1";
  }
  if (typeof next.is_published === "string") {
    next.is_published = next.is_published === "true" || next.is_published === "on" || next.is_published === "1";
  }
  if (typeof next.sort_order === "string") {
    next.sort_order = Number(next.sort_order);
  }
  return next;
}

function payloadFromBody(body, existing = {}) {
  body = coerce(body);
  const name = String(body.name ?? existing.name ?? "").trim();
  if (!name) {
    const err = new Error("Name is required");
    err.status = 400;
    throw err;
  }
  const code = codeify(body.code || existing.code || body.slug || existing.slug || name);
  const slug = slugify(code);
  return {
    name,
    slug,
    code,
    subtitle: String(body.subtitle ?? existing.subtitle ?? "").trim(),
    description: String(body.description ?? existing.description ?? "").trim(),
    cover_image: String(body.cover_image ?? existing.cover_image ?? "").trim(),
    cover_image_desktop: String(body.cover_image_desktop ?? existing.cover_image_desktop ?? "").trim(),
    banner_image: String(body.banner_image ?? existing.banner_image ?? existing.cover_image ?? "").trim(),
    banner_image_desktop: String(body.banner_image_desktop ?? existing.banner_image_desktop ?? "").trim(),
    sale_label: String(body.sale_label ?? existing.sale_label ?? "").trim(),
    is_on_sale: Boolean(body.is_on_sale ?? existing.is_on_sale),
    is_published: body.is_published !== undefined ? Boolean(body.is_published) : existing.is_published !== false,
    sort_order: Number(body.sort_order ?? existing.sort_order ?? 0) || 0,
    updated_at: new Date().toISOString(),
  };
}

async function withStore(runSupabase, runFile) {
  const fileItems = readFileStore();
  if (fileItems.length) {
    return runFile();
  }
  try {
    const supabase = getSupabase();
    return await runSupabase(supabase);
  } catch {
    return runFile();
  }
}

async function listAll() {
  return withStore(
    async (supabase) => {
      const { data, error } = await supabase
        .from("collections")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return { items: (data || []).map(shape), source: "supabase", needsSetup: false };
    },
    async () => {
      const items = readFileStore();
      return { items: items.map(shape), source: "file" };
    },
  );
}

async function listPublished() {
  const { items } = await listAll();
  return items
    .filter((item) => item.is_published)
    .sort((a, b) => a.sort_order - b.sort_order);
}

async function getBySlug(slug) {
  const { items } = await listAll();
  const key = String(slug || "").trim().toLowerCase();
  if (!key) return null;
  return (
    items.find(
      (item) =>
        item.is_published &&
        (String(item.code || "").toLowerCase() === key || String(item.slug || "").toLowerCase() === key),
    ) || null
  );
}

function sameCode(a, b) {
  return codeify(a) === codeify(b);
}

async function createOne(body) {
  const row = {
    ...payloadFromBody(body),
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };
  return withStore(
    async (supabase) => {
      const { data, error } = await supabase.from("collections").insert(row).select("*").single();
      if (error) throw error;
      return shape(data);
    },
    async () => {
      const items = readFileStore();
      if (items.some((item) => sameCode(item.code || item.slug, row.code))) {
        const err = new Error("Collection code already exists");
        err.status = 409;
        throw err;
      }
      items.push(row);
      writeFileStore(items);
      return shape(row);
    },
  );
}

async function updateOne(id, body) {
  return withStore(
    async (supabase) => {
      const { data: existing, error: findError } = await supabase
        .from("collections")
        .select("*")
        .eq("id", id)
        .single();
      if (findError) throw findError;
      const next = payloadFromBody(body, existing);
      const { data, error } = await supabase.from("collections").update(next).eq("id", id).select("*").single();
      if (error) throw error;
      return shape(data);
    },
    async () => {
      const items = readFileStore();
      const index = items.findIndex((item) => item.id === id);
      if (index < 0) {
        const err = new Error("Collection not found");
        err.status = 404;
        throw err;
      }
      const next = { ...items[index], ...payloadFromBody(body, items[index]) };
      if (items.some((item) => sameCode(item.code || item.slug, next.code) && item.id !== id)) {
        const err = new Error("Collection code already exists");
        err.status = 409;
        throw err;
      }
      items[index] = next;
      writeFileStore(items);
      return shape(next);
    },
  );
}

async function removeOne(id) {
  return withStore(
    async (supabase) => {
      const { error } = await supabase.from("collections").delete().eq("id", id);
      if (error) throw error;
      return { ok: true };
    },
    async () => {
      const items = readFileStore();
      writeFileStore(items.filter((item) => item.id !== id));
      return { ok: true };
    },
  );
}

async function reorder(ids = []) {
  if (!Array.isArray(ids) || !ids.length) {
    const err = new Error("Collection order is required");
    err.status = 400;
    throw err;
  }
  return withStore(
    async (supabase) => {
      const { items } = await listAll();
      const map = new Map(items.map((item) => [item.id, item]));
      const ordered = [];
      ids.forEach((id) => {
        const item = map.get(id);
        if (item) {
          ordered.push(item);
          map.delete(id);
        }
      });
      map.forEach((item) => ordered.push(item));
      for (let index = 0; index < ordered.length; index += 1) {
        const sort_order = index + 1;
        const { error } = await supabase.from("collections").update({ sort_order }).eq("id", ordered[index].id);
        if (error) throw error;
      }
      const next = await listAll();
      return next.items;
    },
    async () => {
      const items = readFileStore().map(shape);
      const map = new Map(items.map((item) => [item.id, item]));
      const ordered = [];
      ids.forEach((id) => {
        const item = map.get(id);
        if (item) {
          ordered.push(item);
          map.delete(id);
        }
      });
      map.forEach((item) => ordered.push(item));
      const next = ordered.map((item, index) => ({ ...item, sort_order: index + 1 }));
      writeFileStore(next);
      return next.map(shape);
    },
  );
}

function publicUploadUrl(req, filename) {
  const base = process.env.PUBLIC_API_URL || `${req.protocol}://${req.get("host")}`;
  return `${base}/uploads/collections/${filename}`;
}

async function saveCover(id, req, file) {
  if (!file) {
    const err = new Error("Cover image is required");
    err.status = 400;
    throw err;
  }
  const url = publicUploadUrl(req, file.filename);
  return updateOne(id, { cover_image: url });
}

function sendError(res, error) {
  const status = error.status || (isMissingTable(error) ? 503 : 500);
  console.error("Collections error:", error.message);
  res.status(status).json({
    message: error.message || "Could not save collection",
    needsSetup: isMissingTable(error),
    setupSql: isMissingTable(error) ? SETUP_SQL : undefined,
  });
}

module.exports = {
  SETUP_SQL,
  UPLOAD_DIR,
  listAll,
  listPublished,
  getBySlug,
  createOne,
  updateOne,
  removeOne,
  reorder,
  saveCover,
  sendError,
};
