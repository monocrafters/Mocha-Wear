const { getSupabase } = require("./db");

const BUCKET = "mocha-store";
const locks = new Map();
const memory = new Map();
let bucketReady = null;

function isMissing(error) {
  const message = String(error?.message || error?.error || "");
  const status = error?.statusCode || error?.status || "";
  return (
    status === 404 ||
    status === "404" ||
    /not found/i.test(message) ||
    /does not exist/i.test(message)
  );
}

function withLock(kind, fn) {
  const previous = locks.get(kind) || Promise.resolve();
  const next = previous.then(fn, fn);
  locks.set(
    kind,
    next.then(
      () => undefined,
      () => undefined,
    ),
  );
  return next;
}

async function ensureBucket() {
  if (!bucketReady) {
    bucketReady = (async () => {
      const supabase = getSupabase();
      const { data, error } = await supabase.storage.listBuckets();
      if (error) throw error;
      if (!(data || []).some((bucket) => bucket.name === BUCKET)) {
        const created = await supabase.storage.createBucket(BUCKET, {
          public: false,
          fileSizeLimit: "20MB",
        });
        if (created.error && !/already exists/i.test(created.error.message || "")) {
          throw created.error;
        }
      }
    })().catch((error) => {
      bucketReady = null;
      throw error;
    });
  }
  return bucketReady;
}

async function download(kind) {
  await ensureBucket();
  const supabase = getSupabase();
  const { data, error } = await supabase.storage.from(BUCKET).download(`${kind}.json`);
  if (error) {
    if (isMissing(error)) return null;
    throw error;
  }
  const text = await data.text();
  return text ? JSON.parse(text) : null;
}

async function upload(kind, value) {
  await ensureBucket();
  const supabase = getSupabase();
  const body = Buffer.from(JSON.stringify(value, null, 2));
  const { error } = await supabase.storage.from(BUCKET).upload(`${kind}.json`, body, {
    upsert: true,
    contentType: "application/json",
    cacheControl: "0",
  });
  if (error) throw error;
  memory.set(kind, value);
}

async function readDocument(kind) {
  if (memory.has(kind)) return memory.get(kind);
  const remote = await download(kind);
  if (remote != null) {
    memory.set(kind, remote);
    return remote;
  }
  return null;
}

async function writeDocument(kind, value) {
  return withLock(kind, () => upload(kind, value));
}

function createDocumentStore(kind, { readFile, writeFile, empty }) {
  async function read() {
    try {
      const remote = await readDocument(kind);
      if (remote != null) return remote;
    } catch (error) {
      console.error(`Supabase store read failed (${kind}):`, error.message);
      const local = readFile();
      if (local != null) return local;
      throw error;
    }
    if (process.env.CLOUD_STORE_SEED === "1") {
      const local = readFile();
      if (local != null) {
        try {
          await writeDocument(kind, local);
        } catch (error) {
          console.error(`Supabase store seed failed (${kind}):`, error.message);
        }
        return local;
      }
    }
    return typeof empty === "function" ? empty() : empty;
  }

  async function write(value) {
    memory.set(kind, value);
    try {
      await writeDocument(kind, value);
    } catch (error) {
      console.error(`Supabase store write failed (${kind}):`, error.message);
      if (typeof writeFile === "function") writeFile(value);
      throw error;
    }
  }

  return { read, write };
}

module.exports = {
  BUCKET,
  createDocumentStore,
  readDocument,
  writeDocument,
};
