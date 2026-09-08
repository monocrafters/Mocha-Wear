"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Copy,
  Download,
  FileImage,
  FileText,
  FileVideo,
  Folder,
  FolderPlus,
  Loader2,
  Pencil,
  Trash2,
  Upload,
} from "lucide-react";
import { API_URL, apiFetch } from "@/lib/api";

export type MediaFolder = {
  id: string;
  parent_id?: string | null;
  name: string;
};

export type MediaFile = {
  id: string;
  folder_id?: string;
  name: string;
  url: string;
  resource_type?: string;
  mime?: string;
  bytes?: number;
  created_at?: string;
};

type Breadcrumb = { id: string; name: string };

type BrowsePayload = {
  folder: MediaFolder;
  breadcrumbs: Breadcrumb[];
  folders: MediaFolder[];
  files: MediaFile[];
};

function formatBytes(bytes?: number) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ file }: { file: MediaFile }) {
  if (file.resource_type === "video" || String(file.mime || "").startsWith("video/")) {
    return <FileVideo size={18} className="text-violet-600" />;
  }
  if (file.resource_type === "raw" || String(file.mime || "").includes("pdf")) {
    return <FileText size={18} className="text-rose-600" />;
  }
  return <FileImage size={18} className="text-sky-600" />;
}

export function MediaExplorer({
  mode,
  apiBase,
}: {
  mode: "admin" | "reseller";
  apiBase: string;
}) {
  const canEdit = mode === "admin";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [folderId, setFolderId] = useState("");
  const [data, setData] = useState<BrowsePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);

  async function load(nextFolderId = folderId) {
    setLoading(true);
    setError("");
    try {
      const query = nextFolderId ? `?folder_id=${encodeURIComponent(nextFolderId)}` : "";
      const res = await apiFetch(`${API_URL}${apiBase}${query}`, { credentials: "include" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Could not load media");
      setData(json);
      setFolderId(String(json.folder?.id || ""));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load media");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase]);

  const counts = useMemo(() => {
    if (!data) return { folders: 0, files: 0 };
    return { folders: data.folders.length, files: data.files.length };
  }, [data]);

  async function createFolder() {
    if (!canEdit || !newFolderName.trim() || busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await apiFetch(`${API_URL}/api/admin/media/folders`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFolderName.trim(), parent_id: folderId || "" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Could not create folder");
      setNewFolderName("");
      setCreatingFolder(false);
      setMessage("Folder created");
      await load(folderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create folder");
    } finally {
      setBusy(false);
    }
  }

  async function renameFolder(folder: MediaFolder) {
    if (!canEdit) return;
    const next = window.prompt("Rename folder", folder.name);
    if (next == null || !next.trim() || next.trim() === folder.name) return;
    setBusy(true);
    setError("");
    try {
      const res = await apiFetch(`${API_URL}/api/admin/media/folders/${encodeURIComponent(folder.id)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: next.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Could not rename folder");
      await load(folderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not rename folder");
    } finally {
      setBusy(false);
    }
  }

  async function removeFolder(folder: MediaFolder) {
    if (!canEdit) return;
    if (!window.confirm(`Delete folder "${folder.name}" and everything inside it?`)) return;
    setBusy(true);
    setError("");
    try {
      const res = await apiFetch(`${API_URL}/api/admin/media/folders/${encodeURIComponent(folder.id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Could not delete folder");
      await load(folderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete folder");
    } finally {
      setBusy(false);
    }
  }

  async function uploadFiles(fileList: FileList | null) {
    if (!canEdit || !fileList?.length || busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const body = new FormData();
      body.append("folder_id", folderId || "");
      Array.from(fileList).forEach((file) => body.append("files", file));
      const res = await apiFetch(`${API_URL}/api/admin/media/files`, {
        method: "POST",
        credentials: "include",
        body,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Upload failed");
      setMessage(`${(json.items || []).length} file(s) uploaded`);
      await load(folderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function renameFile(file: MediaFile) {
    if (!canEdit) return;
    const next = window.prompt("Rename file", file.name);
    if (next == null || !next.trim() || next.trim() === file.name) return;
    setBusy(true);
    setError("");
    try {
      const res = await apiFetch(`${API_URL}/api/admin/media/files/${encodeURIComponent(file.id)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: next.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Could not rename file");
      await load(folderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not rename file");
    } finally {
      setBusy(false);
    }
  }

  async function removeFile(file: MediaFile) {
    if (!canEdit) return;
    if (!window.confirm(`Delete "${file.name}"?`)) return;
    setBusy(true);
    setError("");
    try {
      const res = await apiFetch(`${API_URL}/api/admin/media/files/${encodeURIComponent(file.id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Could not delete file");
      await load(folderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete file");
    } finally {
      setBusy(false);
    }
  }

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Link copied");
      setTimeout(() => setMessage(""), 1600);
    } catch {
      setError("Could not copy link");
    }
  }

  return (
    <div className="mt-6 space-y-4">
      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {message ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex min-w-0 flex-wrap items-center gap-1 text-sm">
          {(data?.breadcrumbs || [{ id: "", name: "Media" }]).map((crumb, index, list) => (
            <span key={`${crumb.id}-${index}`} className="flex items-center gap-1">
              {index > 0 ? <span className="text-slate-300">/</span> : null}
              <button
                type="button"
                onClick={() => void load(crumb.id)}
                className={`truncate ${
                  index === list.length - 1
                    ? "font-semibold text-slate-900"
                    : "text-blue-600 hover:underline"
                }`}
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </nav>
        <p className="text-xs text-slate-500">
          {counts.folders} folder{counts.folders === 1 ? "" : "s"} · {counts.files} file
          {counts.files === 1 ? "" : "s"}
        </p>
      </div>

      {canEdit ? (
        <div className="flex flex-wrap items-center gap-2">
          {creatingFolder ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                onKeyDown={(e) => {
                  if (e.key === "Enter") void createFolder();
                }}
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => void createFolder()}
                className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white disabled:opacity-60"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreatingFolder(false);
                  setNewFolderName("");
                }}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCreatingFolder(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <FolderPlus size={14} />
              New folder
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white disabled:opacity-60"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            Upload files
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,application/pdf"
            className="hidden"
            onChange={(e) => void uploadFiles(e.target.files)}
          />
        </div>
      ) : (
        <p className="text-sm text-slate-500">Browse and download media shared by admin.</p>
      )}

      {loading ? (
        <div className="grid place-items-center border border-dashed border-slate-200 bg-white py-16 text-sm text-slate-500">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : !data || (!data.folders.length && !data.files.length) ? (
        <div className="border border-dashed border-slate-200 bg-white px-4 py-16 text-center text-sm text-slate-500">
          This folder is empty.
        </div>
      ) : (
        <div className="overflow-hidden border border-slate-200 bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Size</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.folders.map((folder) => (
                <tr key={folder.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => void load(folder.id)}
                      className="inline-flex items-center gap-2 font-medium text-slate-900 hover:text-blue-600"
                    >
                      <Folder size={18} className="text-amber-500" />
                      {folder.name}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-slate-500">Folder</td>
                  <td className="px-4 py-3 text-slate-500">—</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => void load(folder.id)}
                        className="rounded border border-slate-200 px-2 py-1 text-[10px] uppercase hover:bg-white"
                      >
                        Open
                      </button>
                      {canEdit ? (
                        <>
                          <button
                            type="button"
                            onClick={() => void renameFolder(folder)}
                            className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-[10px] uppercase hover:bg-white"
                          >
                            <Pencil size={11} />
                            Rename
                          </button>
                          <button
                            type="button"
                            onClick={() => void removeFolder(folder)}
                            className="inline-flex items-center gap-1 rounded border border-red-200 px-2 py-1 text-[10px] uppercase text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={11} />
                            Delete
                          </button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {data.files.map((file) => (
                <tr key={file.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {file.resource_type === "image" || String(file.mime || "").startsWith("image/") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={file.url} alt="" className="h-9 w-9 rounded object-cover" />
                      ) : (
                        <span className="grid h-9 w-9 place-items-center rounded bg-slate-100">
                          <FileIcon file={file} />
                        </span>
                      )}
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-w-0 truncate font-medium text-slate-900 hover:text-blue-600"
                      >
                        {file.name}
                      </a>
                    </div>
                  </td>
                  <td className="px-4 py-3 capitalize text-slate-500">{file.resource_type || "file"}</td>
                  <td className="px-4 py-3 text-slate-500">{formatBytes(file.bytes)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={file.name}
                        className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-[10px] uppercase hover:bg-white"
                      >
                        <Download size={11} />
                        Open
                      </a>
                      <button
                        type="button"
                        onClick={() => void copyUrl(file.url)}
                        className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-[10px] uppercase hover:bg-white"
                      >
                        <Copy size={11} />
                        Copy link
                      </button>
                      {canEdit ? (
                        <>
                          <button
                            type="button"
                            onClick={() => void renameFile(file)}
                            className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-[10px] uppercase hover:bg-white"
                          >
                            <Pencil size={11} />
                            Rename
                          </button>
                          <button
                            type="button"
                            onClick={() => void removeFile(file)}
                            className="inline-flex items-center gap-1 rounded border border-red-200 px-2 py-1 text-[10px] uppercase text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={11} />
                            Delete
                          </button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
