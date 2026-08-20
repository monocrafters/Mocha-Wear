const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createDocumentStore } = require("./cloudStore");

const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "help.json");

const ICONS = [
  "ruler",
  "package",
  "map-pin",
  "refresh",
  "headset",
  "clock",
  "truck",
  "message",
  "shopping-bag",
  "tag",
];

const SETTING_KEYS = [
  "hours",
  "whatsapp_number",
  "reply_line",
  "cta_label",
  "cta_desktop_label",
  "default_message",
  "kicker",
  "title",
  "desktop_heading",
  "desktop_copy",
  "topics_heading",
  "notes_heading",
];

function emptyHelp() {
  return {
    hours: "",
    whatsapp_number: "",
    reply_line: "",
    cta_label: "Chat on WhatsApp",
    cta_desktop_label: "Open WhatsApp",
    default_message: "",
    kicker: "",
    title: "Help",
    desktop_heading: "",
    desktop_copy: "",
    topics_heading: "",
    notes_heading: "",
    topics: [],
    notes: [],
  };
}

function readFileStore() {
  try {
    if (!fs.existsSync(DATA_FILE)) return emptyHelp();
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return emptyHelp();
  }
}

const store = createDocumentStore("help", {
  empty: emptyHelp,
  readFile: readFileStore,
  writeFile(data) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  },
});

async function readHelp() {
  return normalize(await store.read());
}

async function writeHelp(data) {
  await store.write(normalize(data));
}

function normalizePhone(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 11) digits = `92${digits.slice(1)}`;
  return digits;
}

function displayPhone(e164) {
  const local = String(e164 || "").replace(/^92/, "0");
  if (local.length === 11) return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
  return local || String(e164 || "");
}

function normalizeIcon(value) {
  const icon = String(value || "message").trim().toLowerCase();
  return ICONS.includes(icon) ? icon : "message";
}

function toBool(value, fallback = true) {
  if (value === true || value === "true" || value === "on" || value === "1") return true;
  if (value === false || value === "false" || value === "off" || value === "0") return false;
  return fallback;
}

function normalizeTopic(topic = {}, index = 0) {
  return {
    id: topic.id || crypto.randomUUID(),
    title: String(topic.title || "").trim(),
    copy: String(topic.copy || "").trim(),
    message: String(topic.message || "").trim(),
    icon: normalizeIcon(topic.icon),
    is_published: toBool(topic.is_published, true),
    sort_order: Number(topic.sort_order) || index + 1,
  };
}

function normalizeNote(note = {}, index = 0) {
  return {
    id: note.id || crypto.randomUUID(),
    title: String(note.title || "").trim(),
    copy: String(note.copy || "").trim(),
    is_published: toBool(note.is_published, true),
    sort_order: Number(note.sort_order) || index + 1,
  };
}

function normalize(data = {}) {
  const topics = Array.isArray(data.topics) ? data.topics : [];
  const notes = Array.isArray(data.notes) ? data.notes : [];
  return {
    hours: String(data.hours || "").trim(),
    whatsapp_number: normalizePhone(data.whatsapp_number),
    reply_line: String(data.reply_line || "").trim(),
    cta_label: String(data.cta_label || "").trim() || "Chat on WhatsApp",
    cta_desktop_label: String(data.cta_desktop_label || "").trim() || "Open WhatsApp",
    default_message: String(data.default_message || "").trim(),
    kicker: String(data.kicker || "").trim(),
    title: String(data.title || "").trim() || "Help",
    desktop_heading: String(data.desktop_heading || "").trim(),
    desktop_copy: String(data.desktop_copy || "").trim(),
    topics_heading: String(data.topics_heading || "").trim(),
    notes_heading: String(data.notes_heading || "").trim(),
    topics: topics.map((topic, index) => normalizeTopic(topic, index)).sort((a, b) => a.sort_order - b.sort_order),
    notes: notes.map((note, index) => normalizeNote(note, index)).sort((a, b) => a.sort_order - b.sort_order),
  };
}

function withDisplay(help) {
  return {
    ...help,
    whatsapp_display: displayPhone(help.whatsapp_number),
    icons: ICONS,
  };
}

async function getPublic() {
  const help = await readHelp();
  return withDisplay({
    ...help,
    topics: help.topics.filter((topic) => topic.is_published),
    notes: help.notes.filter((note) => note.is_published),
  });
}

async function getAdmin() {
  return withDisplay(await readHelp());
}

async function updateSettings(fields = {}) {
  const help = await readHelp();
  SETTING_KEYS.forEach((key) => {
    if (fields[key] !== undefined) help[key] = fields[key];
  });
  await writeHelp(help);
  return getAdmin();
}

async function createTopic(fields = {}) {
  const help = await readHelp();
  const topic = normalizeTopic({ ...fields, id: crypto.randomUUID(), sort_order: help.topics.length + 1 }, help.topics.length);
  help.topics.push(topic);
  await writeHelp(help);
  return topic;
}

async function updateTopic(id, fields = {}) {
  const help = await readHelp();
  const index = help.topics.findIndex((topic) => topic.id === id);
  if (index < 0) {
    const err = new Error("Topic not found");
    err.status = 404;
    throw err;
  }
  help.topics[index] = normalizeTopic({ ...help.topics[index], ...fields, id }, index);
  await writeHelp(help);
  return help.topics[index];
}

async function removeTopic(id) {
  const help = await readHelp();
  await writeHelp({
    ...help,
    topics: help.topics.filter((topic) => topic.id !== id).map((topic, index) => ({
      ...topic,
      sort_order: index + 1,
    })),
  });
  return { ok: true };
}

async function createNote(fields = {}) {
  const help = await readHelp();
  const note = normalizeNote({ ...fields, id: crypto.randomUUID(), sort_order: help.notes.length + 1 }, help.notes.length);
  help.notes.push(note);
  await writeHelp(help);
  return note;
}

async function updateNote(id, fields = {}) {
  const help = await readHelp();
  const index = help.notes.findIndex((note) => note.id === id);
  if (index < 0) {
    const err = new Error("Note not found");
    err.status = 404;
    throw err;
  }
  help.notes[index] = normalizeNote({ ...help.notes[index], ...fields, id }, index);
  await writeHelp(help);
  return help.notes[index];
}

async function removeNote(id) {
  const help = await readHelp();
  await writeHelp({
    ...help,
    notes: help.notes.filter((note) => note.id !== id).map((note, index) => ({
      ...note,
      sort_order: index + 1,
    })),
  });
  return { ok: true };
}

function sendError(res, error) {
  const status = error.status || 500;
  console.error("Help error:", error.message);
  res.status(status).json({ message: error.message || "Could not save help" });
}

module.exports = {
  getPublic,
  getAdmin,
  updateSettings,
  createTopic,
  updateTopic,
  removeTopic,
  createNote,
  updateNote,
  removeNote,
  sendError,
};
