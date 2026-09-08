const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createDocumentStore } = require("./cloudStore");
const cloudinary = require("./cloudinary");

const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "media_library.json");
const ROOT_ID = "";

function emptyStore() {
  return { folders: [], files: [] };
}

function readFileStore() {
  try {
    if (!fs.existsSync(DATA_FILE)) return emptyStore();
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return emptyStore();
  }
}

const store = createDocumentStore("media_library", {
  empty: emptyStore,
  readFile: readFileStore,
  writeFile(data) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  },
});

function shapeFolder(row = {}) {
  return {
    id: row.id || crypto.randomUUID(),
    parent_id: row.parent_id == null || row.parent_id === undefined ? ROOT_ID : String(row.parent_id),
    name: String(row.name || "Untitled").trim() || "Untitled",
    cover_file_id: row.cover_file_id ? String(row.cover_file_id) : null,
    cover_url: String(row.cover_url || "").trim(),
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || row.created_at || new Date().toISOString(),
  };
}

function shapeFile(row = {}) {
  return {
    id: row.id || crypto.randomUUID(),
    folder_id: row.folder_id == null || row.folder_id === undefined ? ROOT_ID : String(row.folder_id),
    name: String(row.name || "file").trim() || "file",
    url: String(row.url || "").trim(),
    public_id: String(row.public_id || "").trim(),
    resource_type: ["image", "video", "raw"].includes(row.resource_type) ? row.resource_type : "image",
    mime: String(row.mime || "").trim(),
    bytes: Math.max(0, Math.round(Number(row.bytes) || 0)),
    created_at: row.created_at || new Date().toISOString(),
  };
}

function normalize(data = {}) {
  return {
    folders: (Array.isArray(data.folders) ? data.folders : []).map(shapeFolder),
    files: (Array.isArray(data.files) ? data.files : []).map(shapeFile),
  };
}

async function readStore() {
  return normalize(await store.read());
}

async function writeStore(data) {
  await store.write(normalize(data));
}

function folderExists(data, folderId) {
  const id = String(folderId || ROOT_ID);
  if (id === ROOT_ID) return true;
  return data.folders.some((folder) => folder.id === id);
}

function breadcrumbsFor(data, folderId) {
  const crumbs = [];
  let current = String(folderId || ROOT_ID);
  const guard = new Set();
  while (current && current !== ROOT_ID) {
    if (guard.has(current)) break;
    guard.add(current);
    const folder = data.folders.find((row) => row.id === current);
    if (!folder) break;
    crumbs.unshift({ id: folder.id, name: folder.name });
    current = folder.parent_id || ROOT_ID;
  }
  return [{ id: ROOT_ID, name: "Media" }, ...crumbs];
}

function listChildren(data, folderId) {
  const id = String(folderId || ROOT_ID);
  const folders = data.folders
    .filter((folder) => (folder.parent_id || ROOT_ID) === id)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((folder) => {
      if (!folder.cover_file_id) return { ...folder, cover_url: "" };
      const cover = data.files.find((file) => file.id === folder.cover_file_id);
      if (!cover || !isImageFile(cover) || !cover.url) {
        return { ...folder, cover_file_id: null, cover_url: "" };
      }
      return { ...folder, cover_url: cover.url };
    });
  const files = data.files
    .filter((file) => (file.folder_id || ROOT_ID) === id)
    .sort((a, b) => a.name.localeCompare(b.name));
  return { folders, files };
}

async function browse(folderId = ROOT_ID) {
  const data = await readStore();
  const id = String(folderId || ROOT_ID);
  if (!folderExists(data, id)) {
    const err = new Error("Folder not found");
    err.status = 404;
    throw err;
  }
  const current =
    id === ROOT_ID
      ? { id: ROOT_ID, parent_id: null, name: "Media" }
      : data.folders.find((folder) => folder.id === id);
  const { folders, files } = listChildren(data, id);
  return {
    folder: current,
    breadcrumbs: breadcrumbsFor(data, id),
    folders,
    files,
  };
}

async function createFolder({ name, parent_id } = {}) {
  const data = await readStore();
  const parentId = String(parent_id || ROOT_ID);
  if (!folderExists(data, parentId)) {
    const err = new Error("Parent folder not found");
    err.status = 404;
    throw err;
  }
  const folderName = String(name || "").trim();
  if (!folderName) {
    const err = new Error("Folder name is required");
    err.status = 400;
    throw err;
  }
  if (folderName.length > 80) {
    const err = new Error("Folder name is too long");
    err.status = 400;
    throw err;
  }
  const clash = data.folders.find(
    (folder) =>
      (folder.parent_id || ROOT_ID) === parentId &&
      folder.name.toLowerCase() === folderName.toLowerCase(),
  );
  if (clash) {
    const err = new Error("A folder with this name already exists here");
    err.status = 409;
    throw err;
  }
  const folder = shapeFolder({
    id: crypto.randomUUID(),
    parent_id: parentId,
    name: folderName,
    created_at: new Date().toISOString(),
  });
  data.folders.push(folder);
  await writeStore(data);
  return folder;
}

async function renameFolder(id, { name } = {}) {
  const data = await readStore();
  const index = data.folders.findIndex((folder) => folder.id === id);
  if (index < 0) {
    const err = new Error("Folder not found");
    err.status = 404;
    throw err;
  }
  const folderName = String(name || "").trim();
  if (!folderName) {
    const err = new Error("Folder name is required");
    err.status = 400;
    throw err;
  }
  const parentId = data.folders[index].parent_id || ROOT_ID;
  const clash = data.folders.find(
    (folder) =>
      folder.id !== id &&
      (folder.parent_id || ROOT_ID) === parentId &&
      folder.name.toLowerCase() === folderName.toLowerCase(),
  );
  if (clash) {
    const err = new Error("A folder with this name already exists here");
    err.status = 409;
    throw err;
  }
  data.folders[index].name = folderName;
  data.folders[index].updated_at = new Date().toISOString();
  await writeStore(data);
  return data.folders[index];
}

function isImageFile(file) {
  return file.resource_type === "image" || String(file.mime || "").startsWith("image/");
}

function clearCoverRefs(data, fileId) {
  for (const folder of data.folders) {
    if (folder.cover_file_id === fileId) {
      folder.cover_file_id = null;
      folder.cover_url = "";
      folder.updated_at = new Date().toISOString();
    }
  }
}

async function setFolderCover(folderId, coverFileId) {
  const data = await readStore();
  const id = String(folderId || "");
  if (!id || id === ROOT_ID) {
    const err = new Error("Cannot set cover on the root Media folder");
    err.status = 400;
    throw err;
  }
  const index = data.folders.findIndex((folder) => folder.id === id);
  if (index < 0) {
    const err = new Error("Folder not found");
    err.status = 404;
    throw err;
  }

  if (coverFileId == null || coverFileId === "") {
    data.folders[index].cover_file_id = null;
    data.folders[index].cover_url = "";
    data.folders[index].updated_at = new Date().toISOString();
    await writeStore(data);
    return data.folders[index];
  }

  const file = data.files.find((row) => row.id === String(coverFileId));
  if (!file) {
    const err = new Error("Image not found");
    err.status = 404;
    throw err;
  }
  if (String(file.folder_id || ROOT_ID) !== id) {
    const err = new Error("Cover image must be inside this folder");
    err.status = 400;
    throw err;
  }
  if (!isImageFile(file)) {
    const err = new Error("Only images can be used as folder cover");
    err.status = 400;
    throw err;
  }
  if (!file.url) {
    const err = new Error("Image has no URL");
    err.status = 400;
    throw err;
  }

  data.folders[index].cover_file_id = file.id;
  data.folders[index].cover_url = file.url;
  data.folders[index].updated_at = new Date().toISOString();
  await writeStore(data);
  return data.folders[index];
}

function collectDescendantFolderIds(data, folderId) {
  const ids = new Set([folderId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const folder of data.folders) {
      if (ids.has(folder.parent_id) && !ids.has(folder.id)) {
        ids.add(folder.id);
        grew = true;
      }
    }
  }
  return ids;
}

async function deleteFolder(id) {
  const data = await readStore();
  if (!data.folders.some((folder) => folder.id === id)) {
    const err = new Error("Folder not found");
    err.status = 404;
    throw err;
  }
  const removeIds = collectDescendantFolderIds(data, id);
  const filesToDelete = data.files.filter((file) => removeIds.has(String(file.folder_id || ROOT_ID)));
  for (const file of filesToDelete) {
    await cloudinary.destroyMedia(file.public_id, file.resource_type);
  }
  data.files = data.files.filter((file) => !removeIds.has(String(file.folder_id || ROOT_ID)));
  data.folders = data.folders.filter((folder) => !removeIds.has(folder.id));
  await writeStore(data);
  return { ok: true };
}

async function uploadFiles(folderId, files = []) {
  const data = await readStore();
  const parentId = String(folderId || ROOT_ID);
  if (!folderExists(data, parentId)) {
    const err = new Error("Folder not found");
    err.status = 404;
    throw err;
  }
  if (!files.length) {
    const err = new Error("Select at least one file");
    err.status = 400;
    throw err;
  }

  const created = [];
  for (const file of files) {
    const folderPath =
      parentId === ROOT_ID ? "mocha-wear/media" : `mocha-wear/media/${parentId}`;
    const uploaded = await cloudinary.uploadMedia(file, folderPath);
    const original = String(file.originalname || "file").trim() || "file";
    const item = shapeFile({
      id: crypto.randomUUID(),
      folder_id: parentId,
      name: original,
      url: uploaded.url,
      public_id: uploaded.publicId,
      resource_type: uploaded.resourceType || "image",
      mime: file.mimetype || "",
      bytes: uploaded.bytes || file.size || 0,
      created_at: new Date().toISOString(),
    });
    data.files.unshift(item);
    created.push(item);
  }
  await writeStore(data);
  return created;
}

async function renameFile(id, { name } = {}) {
  const data = await readStore();
  const index = data.files.findIndex((file) => file.id === id);
  if (index < 0) {
    const err = new Error("File not found");
    err.status = 404;
    throw err;
  }
  const nextName = String(name || "").trim();
  if (!nextName) {
    const err = new Error("File name is required");
    err.status = 400;
    throw err;
  }
  data.files[index].name = nextName;
  await writeStore(data);
  return data.files[index];
}

async function deleteFile(id) {
  const data = await readStore();
  const index = data.files.findIndex((file) => file.id === id);
  if (index < 0) {
    const err = new Error("File not found");
    err.status = 404;
    throw err;
  }
  const file = data.files[index];
  const shared = data.files.filter((row) => row.public_id && row.public_id === file.public_id).length > 1;
  if (!shared) {
    await cloudinary.destroyMedia(file.public_id, file.resource_type);
  }
  data.files.splice(index, 1);
  clearCoverRefs(data, file.id);
  await writeStore(data);
  return { ok: true };
}

function uniqueChildName(data, parentId, baseName, kind) {
  const names = new Set(
    kind === "folder"
      ? data.folders
          .filter((folder) => (folder.parent_id || ROOT_ID) === parentId)
          .map((folder) => folder.name.toLowerCase())
      : data.files
          .filter((file) => (file.folder_id || ROOT_ID) === parentId)
          .map((file) => file.name.toLowerCase()),
  );
  if (!names.has(baseName.toLowerCase())) return baseName;
  let i = 2;
  while (names.has(`${baseName} (${i})`.toLowerCase())) i += 1;
  return `${baseName} (${i})`;
}

async function moveFile(id, targetFolderId) {
  const data = await readStore();
  const index = data.files.findIndex((file) => file.id === id);
  if (index < 0) {
    const err = new Error("File not found");
    err.status = 404;
    throw err;
  }
  const targetId = String(targetFolderId || ROOT_ID);
  if (!folderExists(data, targetId)) {
    const err = new Error("Target folder not found");
    err.status = 404;
    throw err;
  }
  const currentId = String(data.files[index].folder_id || ROOT_ID);
  if (currentId === targetId) {
    return data.files[index];
  }
  data.files[index].folder_id = targetId;
  data.files[index].name = uniqueChildName(data, targetId, data.files[index].name, "file");
  if (currentId && currentId !== ROOT_ID) {
    const parent = data.folders.find((folder) => folder.id === currentId);
    if (parent?.cover_file_id === id) {
      parent.cover_file_id = null;
      parent.cover_url = "";
      parent.updated_at = new Date().toISOString();
    }
  }
  await writeStore(data);
  return data.files[index];
}

async function moveFolder(id, targetFolderId) {
  const data = await readStore();
  const index = data.folders.findIndex((folder) => folder.id === id);
  if (index < 0) {
    const err = new Error("Folder not found");
    err.status = 404;
    throw err;
  }
  const targetId = String(targetFolderId || ROOT_ID);
  if (!folderExists(data, targetId)) {
    const err = new Error("Target folder not found");
    err.status = 404;
    throw err;
  }
  if (targetId === id) {
    const err = new Error("Cannot move a folder into itself");
    err.status = 400;
    throw err;
  }
  const descendants = collectDescendantFolderIds(data, id);
  if (descendants.has(targetId)) {
    const err = new Error("Cannot move a folder into one of its subfolders");
    err.status = 400;
    throw err;
  }
  const currentParent = String(data.folders[index].parent_id || ROOT_ID);
  if (currentParent === targetId) {
    return data.folders[index];
  }
  data.folders[index].parent_id = targetId;
  data.folders[index].name = uniqueChildName(data, targetId, data.folders[index].name, "folder");
  data.folders[index].updated_at = new Date().toISOString();
  await writeStore(data);
  return data.folders[index];
}

async function copyFile(id, targetFolderId) {
  const data = await readStore();
  const source = data.files.find((file) => file.id === id);
  if (!source) {
    const err = new Error("File not found");
    err.status = 404;
    throw err;
  }
  const targetId = String(targetFolderId || ROOT_ID);
  if (!folderExists(data, targetId)) {
    const err = new Error("Target folder not found");
    err.status = 404;
    throw err;
  }
  const folderPath = targetId === ROOT_ID ? "mocha-wear/media" : `mocha-wear/media/${targetId}`;
  const duplicated = await cloudinary.duplicateMedia(source.url, folderPath, source.resource_type || "image");
  const item = shapeFile({
    id: crypto.randomUUID(),
    folder_id: targetId,
    name: uniqueChildName(data, targetId, source.name, "file"),
    url: duplicated.url,
    public_id: duplicated.publicId,
    resource_type: duplicated.resourceType || source.resource_type,
    mime: source.mime,
    bytes: duplicated.bytes || source.bytes,
    created_at: new Date().toISOString(),
  });
  data.files.unshift(item);
  await writeStore(data);
  return item;
}

async function copyFolder(id, targetFolderId) {
  const data = await readStore();
  const source = data.folders.find((folder) => folder.id === id);
  if (!source) {
    const err = new Error("Folder not found");
    err.status = 404;
    throw err;
  }
  const targetId = String(targetFolderId || ROOT_ID);
  if (!folderExists(data, targetId)) {
    const err = new Error("Target folder not found");
    err.status = 404;
    throw err;
  }
  if (targetId === id || collectDescendantFolderIds(data, id).has(targetId)) {
    const err = new Error("Cannot copy a folder into itself");
    err.status = 400;
    throw err;
  }

  const idMap = new Map();
  const originalFolders = data.folders.slice();
  const queue = [{ sourceId: id, parentId: targetId, isRoot: true }];
  let rootCopy = null;

  while (queue.length) {
    const { sourceId, parentId, isRoot } = queue.shift();
    const original = originalFolders.find((folder) => folder.id === sourceId);
    if (!original) continue;
    const folder = shapeFolder({
      id: crypto.randomUUID(),
      parent_id: parentId,
      name: uniqueChildName(data, parentId, original.name, "folder"),
      created_at: new Date().toISOString(),
    });
    data.folders.push(folder);
    idMap.set(sourceId, folder.id);
    if (isRoot) rootCopy = folder;

    const childFolders = originalFolders.filter((row) => (row.parent_id || ROOT_ID) === sourceId);
    for (const child of childFolders) {
      if (!idMap.has(child.id)) {
        queue.push({ sourceId: child.id, parentId: folder.id, isRoot: false });
      }
    }
  }

  const sourceTree = collectDescendantFolderIds(data, id);
  const filesToCopy = data.files.filter((file) => sourceTree.has(String(file.folder_id || ROOT_ID)));
  for (const file of filesToCopy) {
    const mappedFolder = idMap.get(String(file.folder_id || ROOT_ID));
    if (!mappedFolder) continue;
    const folderPath = `mocha-wear/media/${mappedFolder}`;
    const duplicated = await cloudinary.duplicateMedia(file.url, folderPath, file.resource_type || "image");
    const item = shapeFile({
      id: crypto.randomUUID(),
      folder_id: mappedFolder,
      name: file.name,
      url: duplicated.url,
      public_id: duplicated.publicId,
      resource_type: duplicated.resourceType || file.resource_type,
      mime: file.mime,
      bytes: duplicated.bytes || file.bytes,
      created_at: new Date().toISOString(),
    });
    data.files.unshift(item);
    const mappedParent = data.folders.find((folder) => folder.id === mappedFolder);
    const sourceParent = data.folders.find((folder) => folder.id === String(file.folder_id || ROOT_ID));
    if (mappedParent && sourceParent?.cover_file_id === file.id) {
      mappedParent.cover_file_id = item.id;
      mappedParent.cover_url = item.url;
    }
  }

  await writeStore(data);
  return rootCopy;
}

async function pasteItem({ action, item_type, id, target_folder_id } = {}) {
  const act = String(action || "").toLowerCase();
  const type = String(item_type || "").toLowerCase();
  if (!["copy", "move"].includes(act)) {
    const err = new Error("Action must be copy or move");
    err.status = 400;
    throw err;
  }
  if (!["file", "folder"].includes(type)) {
    const err = new Error("Item type must be file or folder");
    err.status = 400;
    throw err;
  }
  if (!id) {
    const err = new Error("Item id is required");
    err.status = 400;
    throw err;
  }

  if (type === "file") {
    const item = act === "copy" ? await copyFile(id, target_folder_id) : await moveFile(id, target_folder_id);
    return { item, item_type: "file", action: act };
  }
  const item = act === "copy" ? await copyFolder(id, target_folder_id) : await moveFolder(id, target_folder_id);
  return { item, item_type: "folder", action: act };
}

function sendError(res, error) {
  const status = error.status || 500;
  console.error("Media library error:", error.message);
  res.status(status).json({ message: error.message || "Could not update media library" });
}

module.exports = {
  ROOT_ID,
  browse,
  createFolder,
  renameFolder,
  setFolderCover,
  deleteFolder,
  uploadFiles,
  renameFile,
  deleteFile,
  pasteItem,
  sendError,
};
