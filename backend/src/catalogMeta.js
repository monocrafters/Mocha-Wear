const fs = require("fs");
const path = require("path");
const { createDocumentStore } = require("./cloudStore");

const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "catalog_meta.json");

function readFileStore() {
  try {
    if (!fs.existsSync(DATA_FILE)) return { version: 1, updated_at: new Date().toISOString() };
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return { version: 1, updated_at: new Date().toISOString() };
  }
}

const store = createDocumentStore("catalog_meta", {
  empty: { version: 1, updated_at: new Date().toISOString() },
  readFile: readFileStore,
  writeFile(data) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  },
});

async function readStore() {
  const data = await store.read();
  return {
    version: Math.max(1, Number(data?.version) || 1),
    updated_at: data?.updated_at || new Date().toISOString(),
  };
}

async function getVersion() {
  return (await readStore()).version;
}

async function bump() {
  const data = await readStore();
  data.version += 1;
  data.updated_at = new Date().toISOString();
  await store.write(data);
  return data.version;
}

module.exports = {
  getVersion,
  bump,
};
