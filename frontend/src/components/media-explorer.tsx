"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ClipboardPaste,
  Copy,
  Download,
  FileImage,
  FileText,
  FileVideo,
  Folder,
  FolderPlus,
  ImagePlus,
  Loader2,
  Pencil,
  Play,
  Scissors,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { API_URL, apiFetch } from "@/lib/api";

export type MediaFolder = {
  id: string;
  parent_id?: string | null;
  name: string;
  cover_file_id?: string | null;
  cover_url?: string;
};

export type MediaFile = {
  id: string;
  folder_id?: string;
  name: string;
  url: string;
  provider?: "cloudinary" | "drive";
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

type ClipboardItem = {
  action: "copy" | "cut";
  item_type: "file" | "folder";
  id: string;
  name: string;
};

const CLIPBOARD_KEY = "mocha_media_clipboard";

function readClipboard(): ClipboardItem | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CLIPBOARD_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ClipboardItem;
    if (!parsed?.id || !["copy", "cut"].includes(parsed.action) || !["file", "folder"].includes(parsed.item_type)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeClipboard(item: ClipboardItem | null) {
  if (typeof window === "undefined") return;
  try {
    if (!item) sessionStorage.removeItem(CLIPBOARD_KEY);
    else sessionStorage.setItem(CLIPBOARD_KEY, JSON.stringify(item));
  } catch {
    /* ignore */
  }
}

function formatBytes(bytes?: number) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageFile(file: MediaFile) {
  return file.resource_type === "image" || String(file.mime || "").startsWith("image/");
}

function isVideoFile(file: MediaFile) {
  return file.resource_type === "video" || String(file.mime || "").startsWith("video/");
}

function MediaPreview({ src, className }: { src: string; className?: string }) {
  const [blobUrl, setBlobUrl] = useState("");
  const privatePreview = src.startsWith("/api/");
  useEffect(() => {
    if (!privatePreview) return;
    const controller = new AbortController();
    let objectUrl = "";
    void apiFetch(API_URL + src, { signal: controller.signal }, 0).then(async response => {
      if (!response.ok) return;
      objectUrl = URL.createObjectURL(await response.blob());
      if (controller.signal.aborted) URL.revokeObjectURL(objectUrl);
      else setBlobUrl(objectUrl);
    }).catch(() => {});
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [src, privatePreview]);
  if (privatePreview && !blobUrl) return <span className={className} aria-label="Preview unavailable"><FileImage size={18} /></span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={privatePreview ? blobUrl : src} alt="" className={className} loading="lazy" />;
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

type PlayingState = {
  file: MediaFile;
  src: string | null;
  error?: string;
};

function MediaVideoPlayer({
  playing,
  onClose,
  onDownload,
  onRetry,
}: {
  playing: PlayingState;
  onClose: () => void;
  onDownload: () => void;
  onRetry: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mounted, setMounted] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setBuffering(true);
    setReady(false);
  }, [playing.src, playing.file.id]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const showSpinner = !playing.error && (!playing.src || buffering || !ready);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-black"
      role="dialog"
      aria-modal="true"
      aria-label={playing.file.name}
    >
      <div
        className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5"
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight text-white">{playing.file.name}</p>
          <p className="mt-0.5 text-[11px] text-white/55">
            {formatBytes(playing.file.bytes)}
            {playing.src && ready && !buffering ? " · Playing" : playing.error ? " · Failed" : " · Loading stream…"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onDownload}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/10"
          >
            <Download size={13} />
            <span className="hidden sm:inline">Download</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/15 bg-white/5 p-2 text-white transition hover:bg-white/10"
            aria-label="Close player"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 bg-black pb-[env(safe-area-inset-bottom)]">
        {playing.file.url ? (
          <div className={`pointer-events-none absolute inset-0 transition-opacity ${ready ? "opacity-0" : "opacity-100"}`}>
            <MediaPreview src={playing.file.url} className="h-full w-full object-cover opacity-35" />
          </div>
        ) : null}

        {playing.src ? (
          <video
            ref={videoRef}
            key={playing.src}
            src={playing.src}
            controls
            autoPlay
            playsInline
            preload="auto"
            className="absolute inset-0 h-full w-full bg-black object-contain"
            onLoadStart={() => {
              setBuffering(true);
              setReady(false);
            }}
            onWaiting={() => setBuffering(true)}
            onPlaying={() => {
              setBuffering(false);
              setReady(true);
            }}
            onCanPlay={() => {
              setBuffering(false);
              setReady(true);
            }}
            onError={() => setBuffering(false)}
          />
        ) : null}

        {showSpinner ? (
          <div className="absolute inset-0 z-[1] grid place-items-center p-6">
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-black/55 px-6 py-5 text-center ring-1 ring-white/10">
              <Loader2 size={28} className="animate-spin text-white" />
              <p className="text-sm font-medium text-white">Starting video…</p>
              <p className="max-w-[16rem] text-[11px] leading-relaxed text-white/60">
                Fetching a private stream. Large files may take a moment on the first play.
              </p>
            </div>
          </div>
        ) : null}

        {playing.error ? (
          <div className="absolute inset-0 z-[2] grid place-items-center p-6">
            <div className="flex max-w-sm flex-col items-center gap-3 rounded-2xl bg-black/55 px-6 py-5 text-center ring-1 ring-white/10">
              <p className="text-sm font-medium text-white">{playing.error}</p>
              <button
                type="button"
                onClick={onRetry}
                className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-100"
              >
                Try again
              </button>
            </div>
          </div>
        ) : null}

        {ready && buffering && !playing.error ? (
          <div className="pointer-events-none absolute inset-0 z-[1] grid place-items-center">
            <Loader2 size={32} className="animate-spin text-white drop-shadow" />
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

export function MediaExplorer({
  mode,
  apiBase,
}: {
  mode: "admin" | "reseller";
  apiBase: string;
}) {
  const canEdit = mode === "admin";
  const [driveStatus, setDriveStatus] = useState<{ configured: boolean; connected: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [folderId, setFolderId] = useState("");
  const [data, setData] = useState<BrowsePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [clipboard, setClipboard] = useState<ClipboardItem | null>(null);
  const [playing, setPlaying] = useState<PlayingState | null>(null);
  const streamTicketCache = useRef(new Map<string, { url: string; expires: number; inflight?: Promise<string> }>());

  useEffect(() => {
    // Hydrate browser-only clipboard state after server rendering.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setClipboard(readClipboard());
  }, []);

  useEffect(() => {
    if (!playing) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setPlaying(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing]);

  useEffect(() => {
    if (canEdit) void apiFetch(API_URL + "/api/admin/media/drive/status").then(r => r.json()).then(setDriveStatus).catch(() => {});
  }, [canEdit]);

  async function connectDrive() {
    try {
      const res = await apiFetch(API_URL + "/api/admin/media/drive/connect", { method: "POST" }, 0);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Could not connect Drive");
      window.location.assign(API_URL + json.url);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not connect Drive"); }
  }

  async function downloadOriginal(file: MediaFile) {
    try {
      if (file.provider === "drive") {
        const res = await apiFetch(API_URL + apiBase + "/files/" + encodeURIComponent(file.id) + "/download-ticket", { method: "POST" }, 0);
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Could not download file");
        const link = document.createElement("a");
        link.href = API_URL + json.url;
        link.referrerPolicy = "no-referrer";
        document.body.appendChild(link);
        link.click();
        link.remove();
        return;
      }
      const link = document.createElement("a");
      link.href = file.url;
      link.download = file.name;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not download file");
    }
  }

  async function resolveStreamUrl(file: MediaFile) {
    if (file.provider !== "drive") return file.url;
    const cache = streamTicketCache.current;
    const hit = cache.get(file.id);
    if (hit?.url && hit.expires > Date.now() + 30000) return hit.url;
    if (hit?.inflight) return hit.inflight;

    const inflight = (async () => {
      const res = await apiFetch(
        API_URL + apiBase + "/files/" + encodeURIComponent(file.id) + "/stream-ticket",
        { method: "POST" },
        0,
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Could not play video");
      const url = API_URL + json.url;
      cache.set(file.id, { url, expires: Date.now() + 12 * 60 * 1000 });
      return url;
    })().catch((err) => {
      cache.delete(file.id);
      throw err;
    });

    cache.set(file.id, { url: hit?.url || "", expires: hit?.expires || 0, inflight });
    return inflight;
  }

  function prefetchVideo(file: MediaFile) {
    if (!isVideoFile(file) || file.provider !== "drive") return;
    void resolveStreamUrl(file).catch(() => {});
  }

  async function playVideo(file: MediaFile) {
    if (!isVideoFile(file)) return;
    setError("");
    setPlaying({ file, src: null });
    try {
      const src = await resolveStreamUrl(file);
      setPlaying((current) => (current?.file.id === file.id ? { file, src } : current));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not play video";
      setPlaying((current) => (current?.file.id === file.id ? { file, src: null, error: message } : current));
    }
  }

  function closePlayer() {
    setPlaying(null);
  }

  function setClip(item: ClipboardItem | null) {
    writeClipboard(item);
    setClipboard(item);
  }

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
    // The API base changes when switching between admin and reseller sessions.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase]);

  const counts = useMemo(() => {
    if (!data) return { folders: 0, files: 0 };
    return { folders: data.folders.length, files: data.files.length };
  }, [data]);

  const currentCoverId = data?.folder?.cover_file_id || null;
  const canSetCover = canEdit && Boolean(folderId);

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
      setMessage("Folder renamed");
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
      let completed = 0;
      for (const file of Array.from(fileList)) {
        if (!file.size || file.size > 1024 * 1024 * 1024) throw new Error("Files must be between 1 byte and 1 GB.");
        setMessage("Uploading " + file.name + " (" + (completed + 1) + "/" + fileList.length + ")…");
        const body = new FormData();
        body.append("folder_id", folderId || "");
        body.append("files", file);
        const res = await apiFetch(API_URL + "/api/admin/media/files", { method: "POST", credentials: "include", body }, 0);
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Upload failed");
        completed += 1;
      }
      setMessage(completed + " file(s) uploaded");
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
      setMessage("File renamed");
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

  async function setCover(file: MediaFile) {
    if (!canSetCover || !isImageFile(file) || busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await apiFetch(`${API_URL}/api/admin/media/folders/${encodeURIComponent(folderId)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cover_file_id: file.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Could not set folder cover");
      setMessage(`Cover set from "${file.name}"`);
      await load(folderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not set folder cover");
    } finally {
      setBusy(false);
    }
  }

  async function clearCover() {
    if (!canSetCover || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await apiFetch(`${API_URL}/api/admin/media/folders/${encodeURIComponent(folderId)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cover_file_id: null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Could not clear cover");
      setMessage("Folder cover cleared");
      await load(folderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not clear cover");
    } finally {
      setBusy(false);
    }
  }

  function copyItem(item_type: "file" | "folder", id: string, name: string) {
    if (!canEdit) return;
    setClip({ action: "copy", item_type, id, name });
    setMessage(`Copied "${name}"`);
  }

  function cutItem(item_type: "file" | "folder", id: string, name: string) {
    if (!canEdit) return;
    setClip({ action: "cut", item_type, id, name });
    setMessage(`Cut "${name}" — open a folder and paste to move`);
  }

  async function pasteClipboard() {
    if (!canEdit || !clipboard || busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await apiFetch(`${API_URL}/api/admin/media/paste`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: clipboard.action === "cut" ? "move" : "copy",
          item_type: clipboard.item_type,
          id: clipboard.id,
          target_folder_id: folderId || "",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Paste failed");
      if (clipboard.action === "cut") setClip(null);
      setMessage(
        clipboard.action === "cut"
          ? `Moved "${clipboard.name}" here`
          : `Pasted copy of "${clipboard.name}"`,
      );
      await load(folderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Paste failed");
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
          {canSetCover && currentCoverId ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void clearCover()}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              Clear cover
            </button>
          ) : null}
          {clipboard ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => void pasteClipboard()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
              >
                <ClipboardPaste size={14} />
                Paste {clipboard.action === "cut" ? "(move)" : "(copy)"}: {clipboard.name}
              </button>
              <button
                type="button"
                onClick={() => {
                  setClip(null);
                  setMessage("Clipboard cleared");
                }}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600"
              >
                Clear clipboard
              </button>
            </>
          ) : null}
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
        {canEdit && driveStatus && <div className="text-sm text-slate-600">
          {driveStatus.connected ? "Google Drive connected · originals stored privately" : driveStatus.configured ? "Connect Google Drive to upload originals." : "Google Drive needs server configuration before new uploads."}
          {driveStatus.configured && <button type="button" onClick={() => void connectDrive()} className="ml-3 rounded border px-3 py-1">{driveStatus.connected ? "Reconnect Google Drive" : "Connect Google Drive"}</button>}
        </div>}

      {canSetCover ? (
        <p className="text-xs text-slate-500">
          Click an image thumbnail or use <span className="font-medium text-slate-700">Set cover</span> to choose
          this folder&apos;s cover.
        </p>
      ) : null}

      {loading ? (
        <div className="grid place-items-center border border-dashed border-slate-200 bg-white py-16 text-sm text-slate-500">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : !data || (!data.folders.length && !data.files.length) ? (
        <div className="border border-dashed border-slate-200 bg-white px-4 py-16 text-center text-sm text-slate-500">
          This folder is empty.
        </div>
      ) : (
        <div className="space-y-2">
          {data.folders.map((folder) => (
            <div
              key={folder.id}
              role="button"
              tabIndex={0}
              onClick={() => void load(folder.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  void load(folder.id);
                }
              }}
              className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-amber-300 hover:bg-amber-50/40 active:bg-amber-50 sm:p-4"
            >
              {folder.cover_url ? (
                <MediaPreview
                  src={folder.cover_url}
                  className="h-14 w-14 shrink-0 rounded-lg object-cover ring-1 ring-slate-200 sm:h-12 sm:w-12"
                />
              ) : (
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-amber-50 sm:h-12 sm:w-12">
                  <Folder size={22} className="text-amber-500" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-slate-900 sm:text-sm">{folder.name}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Folder{folder.cover_url ? " · Has cover" : ""} · Tap to open
                </p>
              </div>
              {canEdit ? (
                <div
                  className="flex shrink-0 flex-wrap justify-end gap-1"
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => copyItem("folder", folder.id, folder.name)}
                    className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-white"
                    title="Copy"
                    aria-label="Copy folder"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => cutItem("folder", folder.id, folder.name)}
                    className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-white"
                    title="Cut"
                    aria-label="Cut folder"
                  >
                    <Scissors size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void renameFolder(folder)}
                    className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-white"
                    title="Rename"
                    aria-label="Rename folder"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeFolder(folder)}
                    className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
                    title="Delete"
                    aria-label="Delete folder"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : null}
            </div>
          ))}

          {data.files.map((file) => {
            const image = isImageFile(file);
            const video = isVideoFile(file);
            const isCover = currentCoverId === file.id;
            return (
              <div
                key={file.id}
                className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4"
                onPointerEnter={video ? () => prefetchVideo(file) : undefined}
              >
                <div className="flex items-start gap-3">
                  {video ? (
                    <button
                      type="button"
                      onClick={() => void playVideo(file)}
                      className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-900 text-white sm:h-14 sm:w-14"
                      title="Play video"
                      aria-label={`Play ${file.name}`}
                    >
                      {file.provider === "drive" || file.url ? (
                        <MediaPreview src={file.url} className="absolute inset-0 h-full w-full object-cover opacity-70" />
                      ) : null}
                      <span className="relative z-[1] grid h-8 w-8 place-items-center rounded-full bg-black/55">
                        <Play size={14} className="ml-0.5 fill-current" />
                      </span>
                    </button>
                  ) : image ? (
                    <button
                      type="button"
                      disabled={!canSetCover || busy}
                      title={canSetCover ? "Click to set as folder cover" : undefined}
                      onClick={() => {
                        if (canSetCover) void setCover(file);
                      }}
                      className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg sm:h-14 sm:w-14 ${
                        canSetCover ? "ring-offset-2 hover:ring-2 hover:ring-sky-400" : ""
                      } ${isCover ? "ring-2 ring-emerald-500" : ""}`}
                    >
                      <MediaPreview src={file.url} className="h-full w-full object-cover" />
                      {isCover ? (
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded bg-emerald-600 px-1 text-[8px] font-semibold uppercase text-white">
                          Cover
                        </span>
                      ) : null}
                    </button>
                  ) : (
                    <span className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-slate-100 sm:h-14 sm:w-14">
                      <FileIcon file={file} />
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    {video ? (
                      <button
                        type="button"
                        onClick={() => void playVideo(file)}
                        className="block w-full truncate text-left text-base font-semibold text-slate-900 hover:text-violet-700 sm:text-sm"
                      >
                        {file.name}
                      </button>
                    ) : (
                      <p className="truncate text-base font-semibold text-slate-900 sm:text-sm">{file.name}</p>
                    )}
                    <p className="mt-0.5 text-xs capitalize text-slate-500">
                      {file.resource_type || "file"} · {formatBytes(file.bytes)}
                      {video ? " · Tap to play" : ""}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {video ? (
                        <>
                          <button
                            type="button"
                            onClick={() => void playVideo(file)}
                            className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-[11px] font-medium uppercase text-violet-700 hover:bg-violet-100"
                          >
                            <Play size={12} />
                            Play
                          </button>
                          <button
                            type="button"
                            onClick={() => void downloadOriginal(file)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium uppercase text-slate-700 hover:bg-slate-50"
                          >
                            <Download size={12} />
                            Download
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void downloadOriginal(file)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium uppercase text-slate-700 hover:bg-slate-50"
                        >
                          <Download size={12} />
                          {file.provider === "drive" ? "Download" : "Open"}
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={file.provider === "drive"}
                        title={file.provider === "drive" ? "Private Drive files require a website login" : undefined}
                        onClick={() => void copyUrl(file.url)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium uppercase text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        <Copy size={12} />
                        Copy link
                      </button>
                      {canEdit ? (
                        <>
                          {canSetCover && image ? (
                            <button
                              type="button"
                              disabled={busy || isCover}
                              onClick={() => void setCover(file)}
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2.5 py-1.5 text-[11px] font-medium uppercase text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                            >
                              <ImagePlus size={12} />
                              {isCover ? "Cover" : "Set cover"}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => copyItem("file", file.id, file.name)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium uppercase text-slate-700 hover:bg-slate-50"
                          >
                            <Copy size={12} />
                            Copy
                          </button>
                          <button
                            type="button"
                            onClick={() => cutItem("file", file.id, file.name)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium uppercase text-slate-700 hover:bg-slate-50"
                          >
                            <Scissors size={12} />
                            Cut
                          </button>
                          <button
                            type="button"
                            onClick={() => void renameFile(file)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium uppercase text-slate-700 hover:bg-slate-50"
                          >
                            <Pencil size={12} />
                            Rename
                          </button>
                          <button
                            type="button"
                            onClick={() => void removeFile(file)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-[11px] font-medium uppercase text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={12} />
                            Delete
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {playing ? (
        <MediaVideoPlayer
          playing={playing}
          onClose={closePlayer}
          onDownload={() => void downloadOriginal(playing.file)}
          onRetry={() => void playVideo(playing.file)}
        />
      ) : null}
    </div>
  );
}
