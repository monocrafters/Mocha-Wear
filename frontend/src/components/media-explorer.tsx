"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ClipboardPaste,
  Copy,
  ChevronLeft,
  ChevronRight,
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
  RotateCcw,
  Scissors,
  Trash2,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { API_URL, apiFetch } from "@/lib/api";

export type MediaFolder = {
  product_id?: string;
  product_slug?: string;
  product_published?: boolean;
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
  const [failed, setFailed] = useState(false);
  const privatePreview = src.startsWith("/api/");
  useEffect(() => {
    if (!privatePreview) return;
    const controller = new AbortController();
    let objectUrl = "";
    setBlobUrl("");
    setFailed(false);
    void apiFetch(API_URL + src, { signal: controller.signal }, 0)
      .then(async (response) => {
        if (!response.ok) {
          setFailed(true);
          return;
        }
        objectUrl = URL.createObjectURL(await response.blob());
        if (controller.signal.aborted) URL.revokeObjectURL(objectUrl);
        else setBlobUrl(objectUrl);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, privatePreview]);

  if (privatePreview && !blobUrl) {
    if (failed) {
      return <span className={`block bg-slate-100 ${className || ""}`} aria-label="Preview unavailable" />;
    }
    return (
      <span
        className={`skeleton skeleton-admin block ${className || ""}`}
        aria-hidden
        aria-label="Loading preview"
      />
    );
  }

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

function MediaImageViewer({
  file,
  files,
  onClose,
  onDownload,
  onSelect,
  loadOriginal,
}: {
  file: MediaFile;
  files: MediaFile[];
  onClose: () => void;
  onDownload: () => void;
  onSelect: (file: MediaFile) => void;
  loadOriginal: (file: MediaFile) => Promise<string>;
}) {
  const [mounted, setMounted] = useState(false);
  const [originalUrl, setOriginalUrl] = useState("");
  const [loadingOriginal, setLoadingOriginal] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const index = files.findIndex((row) => row.id === file.id);
  const hasPrev = index > 0;
  const hasNext = index >= 0 && index < files.length - 1;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setLoadError("");
    setLoadingOriginal(true);
    setOriginalUrl("");
    let cancelled = false;
    void loadOriginal(file)
      .then((url) => {
        if (cancelled) return;
        setOriginalUrl(url);
        setLoadingOriginal(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : "Could not load image");
        setLoadingOriginal(false);
      });
    return () => {
      cancelled = true;
    };
  }, [file, loadOriginal]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && hasPrev) onSelect(files[index - 1]);
      if (event.key === "ArrowRight" && hasNext) onSelect(files[index + 1]);
      if (event.key === "+" || event.key === "=") setScale((value) => Math.min(5, Number((value + 0.25).toFixed(2))));
      if (event.key === "-" || event.key === "_") {
        setScale((value) => {
          const next = Math.max(1, Number((value - 0.25).toFixed(2)));
          if (next === 1) setOffset({ x: 0, y: 0 });
          return next;
        });
      }
      if (event.key === "0") {
        setScale(1);
        setOffset({ x: 0, y: 0 });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [files, hasNext, hasPrev, index, onClose, onSelect]);

  function zoomBy(delta: number) {
    setScale((value) => {
      const next = Math.min(4, Math.max(1, Math.round((value + delta) * 100) / 100));
      if (next <= 1) setOffset({ x: 0, y: 0 });
      return next;
    });
  }

  function resetView() {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }

  function isChromeControl(target: EventTarget | null) {
    return target instanceof Element && Boolean(target.closest("[data-media-chrome]"));
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (scale <= 1 || isChromeControl(event.target)) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragRef.current || scale <= 1) return;
    setOffset({
      x: dragRef.current.ox + (event.clientX - dragRef.current.x),
      y: dragRef.current.oy + (event.clientY - dragRef.current.y),
    });
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
  }

  function onWheel(event: ReactWheelEvent<HTMLDivElement>) {
    if (isChromeControl(event.target)) return;
    event.preventDefault();
    zoomBy(event.deltaY < 0 ? 0.25 : -0.25);
  }

  if (!mounted) return null;

  const imageStyle = {
    maxWidth: "100%",
    maxHeight: "100%",
    width: "auto",
    height: "auto",
    objectFit: "contain" as const,
    transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
    transformOrigin: "center center",
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex flex-col bg-[#07080c]" role="dialog" aria-modal="true" aria-label={file.name}>
      <div
        data-media-chrome
        className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-black/70 px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md sm:px-5"
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight text-white">{file.name}</p>
          <p className="mt-0.5 text-[11px] text-white/55">
            {formatBytes(file.bytes)}
            {files.length > 1 ? ` · ${index + 1} / ${files.length}` : ""}
            {loadingOriginal ? " · Loading original…" : loadError ? " · Preview fallback" : " · Full quality"}
            {` · ${Math.round(scale * 100)}%`}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              zoomBy(-0.25);
            }}
            className="rounded-full border border-white/15 bg-white/5 p-2 text-white hover:bg-white/10"
            aria-label="Zoom out"
            title="Zoom out"
          >
            <ZoomOut size={16} />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              zoomBy(0.25);
            }}
            className="rounded-full border border-white/15 bg-white/5 p-2 text-white hover:bg-white/10"
            aria-label="Zoom in"
            title="Zoom in"
          >
            <ZoomIn size={16} />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              resetView();
            }}
            className="rounded-full border border-white/15 bg-white/5 p-2 text-white hover:bg-white/10"
            aria-label="Reset zoom"
            title="Fit image"
          >
            <RotateCcw size={16} />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDownload();
            }}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-100"
          >
            <Download size={14} />
            Download
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onClose();
            }}
            className="rounded-full border border-white/15 bg-white/5 p-2 text-white hover:bg-white/10"
            aria-label="Close viewer"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div
        className={`relative min-h-0 flex-1 overflow-hidden bg-black pb-[env(safe-area-inset-bottom)] ${scale > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        onDoubleClick={(event) => {
          if (isChromeControl(event.target)) return;
          if (scale > 1) resetView();
          else setScale(2);
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center bg-black p-3 sm:p-8">
          {originalUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={originalUrl}
              alt={file.name}
              draggable={false}
              className="block select-none will-change-transform"
              style={{
                ...imageStyle,
                imageRendering: "auto",
              }}
            />
          ) : null}
        </div>

        {loadingOriginal ? (
          <div className="pointer-events-none absolute inset-0 z-[1] grid place-items-center">
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-black/55 px-6 py-5 text-center ring-1 ring-white/10">
              <Loader2 size={26} className="animate-spin text-white" />
              <p className="text-sm font-medium text-white">Loading clear original…</p>
            </div>
          </div>
        ) : null}

        {loadError && !originalUrl ? (
          <div className="absolute inset-x-0 bottom-20 z-[2] flex justify-center px-4">
            <p className="rounded-full bg-black/70 px-4 py-2 text-xs text-amber-200 ring-1 ring-white/10">{loadError}</p>
          </div>
        ) : null}

        {hasPrev ? (
          <button
            type="button"
            data-media-chrome
            onClick={() => onSelect(files[index - 1])}
            className="absolute left-2 top-1/2 z-[2] -translate-y-1/2 rounded-full border border-white/15 bg-black/55 p-2.5 text-white hover:bg-black/75 sm:left-4"
            aria-label="Previous image"
          >
            <ChevronLeft size={20} />
          </button>
        ) : null}
        {hasNext ? (
          <button
            type="button"
            data-media-chrome
            onClick={() => onSelect(files[index + 1])}
            className="absolute right-2 top-1/2 z-[2] -translate-y-1/2 rounded-full border border-white/15 bg-black/55 p-2.5 text-white hover:bg-black/75 sm:right-4"
            aria-label="Next image"
          >
            <ChevronRight size={20} />
          </button>
        ) : null}

        <div data-media-chrome className="absolute inset-x-0 bottom-3 z-[2] flex justify-center px-3 sm:bottom-5">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/70 px-2 py-1.5 backdrop-blur-md">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                zoomBy(-0.25);
              }}
              className="rounded-full p-2 text-white hover:bg-white/10"
              aria-label="Zoom out"
            >
              <ZoomOut size={15} />
            </button>
            <span className="min-w-12 text-center text-[11px] font-medium tabular-nums text-white/80">
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                zoomBy(0.25);
              }}
              className="rounded-full p-2 text-white hover:bg-white/10"
              aria-label="Zoom in"
            >
              <ZoomIn size={15} />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onDownload();
              }}
              className="ml-1 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-900"
            >
              <Download size={13} />
              Download
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

const MEDIA_GRID_CLASS = "grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-8";

export function MediaExplorer({
  mode,
  apiBase,
}: {
  mode: "admin" | "reseller";
  apiBase: string;
}) {
  return (
    <Suspense
      fallback={
        <div className="mt-6 grid place-items-center border border-dashed border-slate-200 bg-white py-16 text-sm text-slate-500">
          <Loader2 size={18} className="animate-spin" />
        </div>
      }
    >
      <MediaExplorerInner mode={mode} apiBase={apiBase} />
    </Suspense>
  );
}

function MediaExplorerInner({
  mode,
  apiBase,
}: {
  mode: "admin" | "reseller";
  apiBase: string;
}) {
  const canEdit = mode === "admin";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const folderParam = searchParams.get("f") || "";
  const folderTitleParam = searchParams.get("folder") || "";
  const videoParam = searchParams.get("v") || "";
  const videoTitleParam = searchParams.get("video") || "";
  const [driveStatus, setDriveStatus] = useState<{ configured: boolean; connected: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [folderId, setFolderId] = useState(folderParam);
  const [data, setData] = useState<BrowsePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [clipboard, setClipboard] = useState<ClipboardItem | null>(null);
  const [playing, setPlaying] = useState<PlayingState | null>(null);
  const [viewing, setViewing] = useState<MediaFile | null>(null);
  const [bulkBusy, setBulkBusy] = useState<"image" | "video" | null>(null);
  const [bulkProgress, setBulkProgress] = useState<{
    kind: "image" | "video";
    percent: number;
    label: string;
    received: number;
    total: number;
  } | null>(null);
  const streamTicketCache = useRef(new Map<string, { url: string; expires: number; inflight?: Promise<string> }>());
  const imageOriginalCache = useRef(new Map<string, string>());
  const videoHistoryPushedRef = useRef(false);
  const playbackRequestRef = useRef(0);

  function buildMediaHref(opts: {
    folderId?: string;
    folderTitle?: string;
    videoId?: string;
    videoTitle?: string;
  }) {
    const params = new URLSearchParams();
    if (opts.folderId) {
      params.set("f", opts.folderId);
      if (opts.folderTitle) params.set("folder", opts.folderTitle);
    }
    if (opts.videoId) {
      params.set("v", opts.videoId);
      if (opts.videoTitle) params.set("video", opts.videoTitle);
    }
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  function navigateToFolder(folder: { id: string; name: string }) {
    router.push(buildMediaHref({ folderId: folder.id, folderTitle: folder.name }));
  }

  function navigateToCrumb(crumb: Breadcrumb) {
    if (!crumb.id) {
      router.push(pathname);
      return;
    }
    router.push(buildMediaHref({ folderId: crumb.id, folderTitle: crumb.name }));
  }

  useEffect(() => {
    // Hydrate browser-only clipboard state after server rendering.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setClipboard(readClipboard());
  }, []);

  useEffect(() => {
    if (!playing && !viewing) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (playing) closePlayer();
      else setViewing(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, viewing, videoParam]);

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
      await startChromeDownload(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not download file");
    }
  }

  async function startChromeDownload(file: MediaFile) {
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
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async function downloadAllInFolder(kind: "image" | "video") {
    if (!data || bulkBusy) return;
    const files = data.files.filter((file) => (kind === "image" ? isImageFile(file) : isVideoFile(file)));
    if (!files.length) {
      setMessage(kind === "image" ? "No images in this folder" : "No videos in this folder");
      return;
    }

    const estimate = Math.max(
      1,
      files.reduce((sum, file) => sum + (Number(file.bytes) || 0), 0),
    );
    const folderLabel = String(data.folder?.name || "media").replace(/[\\/:*?"<>|]+/g, "-") || "media";
    const query = `?kind=${kind}${folderId ? `&folder_id=${encodeURIComponent(folderId)}` : ""}`;

    setBulkBusy(kind);
    setError("");
    setMessage("");
    setBulkProgress({
      kind,
      percent: 1,
      label: `Preparing ${files.length} ${kind}${files.length === 1 ? "" : "s"}…`,
      received: 0,
      total: estimate,
    });

    try {
      const res = await apiFetch(`${API_URL}${apiBase}/download-zip${query}`, {}, 0);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json as { message?: string }).message || "Could not download zip");
      }
      if (!res.body) throw new Error("Could not download zip");

      const headerEstimate = Number(res.headers.get("X-Media-Bytes-Estimate")) || estimate;
      const total = Math.max(1, headerEstimate);

      type SavePickerWindow = Window & {
        showSaveFilePicker?: (options: {
          suggestedName?: string;
          types?: Array<{ description: string; accept: Record<string, string[]> }>;
        }) => Promise<{ createWritable: () => Promise<{ write: (chunk: Uint8Array) => Promise<void>; close: () => Promise<void> }> }>;
      };

      let writable: { write: (chunk: Uint8Array) => Promise<void>; close: () => Promise<void> } | null = null;
      const picker = window as SavePickerWindow;
      if (typeof picker.showSaveFilePicker === "function") {
        try {
          const handle = await picker.showSaveFilePicker({
            suggestedName: `${folderLabel}-${kind}s.zip`,
            types: [{ description: "ZIP archive", accept: { "application/zip": [".zip"] } }],
          });
          writable = await handle.createWritable();
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") {
            setMessage("Download cancelled");
            return;
          }
        }
      }

      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
        if (writable) await writable.write(value);
        else chunks.push(value);
        setBulkProgress({
          kind,
          percent: Math.min(99, Math.round((received / total) * 100)),
          label: writable ? "Saving zip to your computer…" : "Downloading zip…",
          received,
          total,
        });
      }

      if (writable) {
        await writable.close();
      } else {
        const blob = new Blob(chunks as BlobPart[], { type: "application/zip" });
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = `${folderLabel}-${kind}s.zip`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
      }

      setBulkProgress({
        kind,
        percent: 100,
        label: "Download complete",
        received,
        total: Math.max(total, received),
      });
      setMessage(`Downloaded all ${files.length} ${kind}${files.length === 1 ? "" : "s"} as a zip.`);
      window.setTimeout(() => setBulkProgress(null), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not download zip");
      setBulkProgress(null);
    } finally {
      setBulkBusy(null);
    }
  }

  function openImage(file: MediaFile) {
    if (!isImageFile(file)) return;
    setViewing(file);
  }

  const resolveImageOriginal = useCallback(async (nextFile: MediaFile) => {
    const cached = imageOriginalCache.current.get(nextFile.id);
    if (cached) return cached;
    // Public Cloudinary URLs can render directly at full quality.
    if (nextFile.provider !== "drive" && nextFile.url && !nextFile.url.startsWith("/api/")) {
      imageOriginalCache.current.set(nextFile.id, nextFile.url);
      return nextFile.url;
    }
    if (nextFile.provider === "drive") {
      // Stream with the real image Content-Type — download tickets force octet-stream and look blocky/gridy when scaled.
      const ticketRes = await apiFetch(
        API_URL + apiBase + "/files/" + encodeURIComponent(nextFile.id) + "/stream-ticket",
        { method: "POST" },
        0,
      );
      const ticketJson = await ticketRes.json();
      if (!ticketRes.ok) throw new Error(ticketJson.message || "Could not load original image");
      const url = API_URL + ticketJson.url;
      imageOriginalCache.current.set(nextFile.id, url);
      return url;
    }
    const fileRes = await fetch(nextFile.url);
    if (!fileRes.ok) throw new Error("Could not load original image");
    const blob = await fileRes.blob();
    const mime = nextFile.mime && nextFile.mime.startsWith("image/") ? nextFile.mime : blob.type || "image/jpeg";
    const typed = mime && mime !== blob.type ? new Blob([await blob.arrayBuffer()], { type: mime }) : blob;
    const objectUrl = URL.createObjectURL(typed);
    imageOriginalCache.current.set(nextFile.id, objectUrl);
    return objectUrl;
  }, [apiBase]);

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

  async function startPlayback(file: MediaFile) {
    if (!isVideoFile(file)) return;
    const requestId = ++playbackRequestRef.current;
    setError("");
    setPlaying({ file, src: null });
    try {
      const src = await resolveStreamUrl(file);
      if (playbackRequestRef.current !== requestId) return;
      setPlaying((current) => (current?.file.id === file.id ? { file, src } : current));
    } catch (err) {
      if (playbackRequestRef.current !== requestId) return;
      const message = err instanceof Error ? err.message : "Could not play video";
      setPlaying((current) => (current?.file.id === file.id ? { file, src: null, error: message } : current));
    }
  }

  function playVideo(file: MediaFile) {
    if (!isVideoFile(file)) return;
    const folderTitle = data?.folder?.name || folderTitleParam || undefined;
    const href = buildMediaHref({
      folderId: folderId || folderParam || undefined,
      folderTitle,
      videoId: file.id,
      videoTitle: file.name,
    });
    void startPlayback(file);
    if (videoParam !== file.id) {
      videoHistoryPushedRef.current = true;
      router.push(href);
    }
  }

  function closePlayer() {
    if (videoParam) {
      if (videoHistoryPushedRef.current) {
        videoHistoryPushedRef.current = false;
        router.back();
        return;
      }
      router.replace(
        buildMediaHref({
          folderId: folderId || folderParam || undefined,
          folderTitle: data?.folder?.name || folderTitleParam || undefined,
        }),
      );
      setPlaying(null);
      return;
    }
    setPlaying(null);
  }

  function setClip(item: ClipboardItem | null) {
    writeClipboard(item);
    setClipboard(item);
  }

  async function load(nextFolderId = folderId, options: { syncUrl?: boolean } = {}) {
    const syncUrl = options.syncUrl === true;
    setLoading(true);
    setError("");
    try {
      const query = nextFolderId ? `?folder_id=${encodeURIComponent(nextFolderId)}` : "";
      const res = await apiFetch(`${API_URL}${apiBase}${query}`, { credentials: "include" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Could not load media");
      setData(json);
      const nextId = String(json.folder?.id || "");
      setFolderId(nextId);
      if (!syncUrl) return;
      const nextTitle = String(json.folder?.name || "");
      // Keep the readable folder name in the URL in sync with the live folder.
      if (nextId && (folderParam !== nextId || (nextTitle && folderTitleParam !== nextTitle))) {
        router.replace(
          buildMediaHref({
            folderId: nextId,
            folderTitle: nextTitle || undefined,
            videoId: videoParam || undefined,
            videoTitle: videoTitleParam || undefined,
          }),
        );
      } else if (!nextId && folderParam) {
        router.replace(
          buildMediaHref({
            videoId: videoParam || undefined,
            videoTitle: videoTitleParam || undefined,
          }),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load media");
      if (syncUrl && folderParam) router.replace(pathname);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // URL folder id is the source of truth for browser back/forward.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(folderParam, { syncUrl: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase, folderParam]);

  useEffect(() => {
    if (!videoParam) {
      videoHistoryPushedRef.current = false;
      setPlaying(null);
      return;
    }
    if (playing?.file.id === videoParam) return;
    if (loading) return;
    const file = data?.files.find((row) => row.id === videoParam);
    if (file && isVideoFile(file)) {
      void startPlayback(file);
      return;
    }
    if (!data) return;
    // Invalid/stale video deep-link — drop it without leaving the folder.
    router.replace(
      buildMediaHref({
        folderId: folderId || folderParam || undefined,
        folderTitle: data.folder?.name || folderTitleParam || undefined,
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoParam, data, loading, folderId, folderParam]);

  const counts = useMemo(() => {
    if (!data) return { folders: 0, files: 0, images: 0, videos: 0 };
    return {
      folders: data.folders.length,
      files: data.files.length,
      images: data.files.filter(isImageFile).length,
      videos: data.files.filter(isVideoFile).length,
    };
  }, [data]);

  const imageFiles = useMemo(() => (data?.files || []).filter(isImageFile), [data]);

  const currentCoverId = data?.folder?.cover_file_id || null;
  const canSetCover = canEdit && !data?.folder.product_id && Boolean(folderId);

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

  return (
    <div className="mt-6 space-y-4">
      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {bulkProgress ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between gap-3 text-sm text-slate-800">
            <p className="min-w-0 truncate font-medium">{bulkProgress.label}</p>
            <p className="shrink-0 tabular-nums text-slate-500">{bulkProgress.percent}%</p>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-600 transition-[width] duration-200 ease-out"
              style={{ width: `${Math.max(2, bulkProgress.percent)}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] tabular-nums text-slate-500">
            {formatBytes(bulkProgress.received)} / {formatBytes(bulkProgress.total)}
          </p>
        </div>
      ) : message ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex min-w-0 flex-wrap items-center gap-1 text-sm">
          {(data?.breadcrumbs || [{ id: "", name: "Media" }]).map((crumb, index, list) => (
            <span key={`${crumb.id}-${index}`} className="flex items-center gap-1">
              {index > 0 ? <span className="text-slate-300">/</span> : null}
              <button
                type="button"
                onClick={() => navigateToCrumb(crumb)}
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

      {(counts.images > 0 || counts.videos > 0) && !loading ? (
        <div className="flex flex-wrap gap-2">
          {counts.images > 0 ? (
            <button
              type="button"
              disabled={Boolean(bulkBusy)}
              onClick={() => void downloadAllInFolder("image")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-800 hover:bg-sky-100 disabled:opacity-60"
            >
              {bulkBusy === "image" ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Download all images ({counts.images})
            </button>
          ) : null}
          {counts.videos > 0 ? (
            <button
              type="button"
              disabled={Boolean(bulkBusy)}
              onClick={() => void downloadAllInFolder("video")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-medium text-violet-800 hover:bg-violet-100 disabled:opacity-60"
            >
              {bulkBusy === "video" ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Download all videos ({counts.videos})
            </button>
          ) : null}
        </div>
      ) : null}
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
          Tap an image to view it. Use the cover icon on a card to set this folder&apos;s cover.
        </p>
      ) : (
        <p className="text-xs text-slate-500">Tap an image to view · tap a video to play.</p>
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
        <div className="space-y-4">
          {data.folders.length ? (
            <div className={MEDIA_GRID_CLASS}>
              {data.folders.map((folder) => {
                const productFolder = Boolean(folder.product_id && canEdit);
                return (
                  <div
                    key={folder.id}
                    className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                  >
                    <button
                      type="button"
                      onClick={() => navigateToFolder(folder)}
                      className="relative block w-full overflow-hidden bg-amber-50/60"
                      aria-label={`Open ${folder.name}`}
                    >
                      {folder.cover_url ? (
                        <MediaPreview src={folder.cover_url} className="aspect-square w-full object-cover transition group-hover:scale-[1.02]" />
                      ) : (
                        <span className="grid aspect-square w-full place-items-center">
                          <Folder size={28} className="text-amber-500" />
                        </span>
                      )}
                    </button>
                    <div className="space-y-2 p-2">
                      <p className="truncate text-[12px] font-semibold text-slate-900" title={folder.name}>
                        {folder.name}
                      </p>
                      {productFolder ? (
                        <div className="flex gap-1">
                          <Link
                            href={
                              folder.product_published
                                ? `/products/${encodeURIComponent(folder.product_slug || "")}`
                                : `/admin/products?product=${encodeURIComponent(folder.product_id || "")}`
                            }
                            className="flex-1 rounded-md border border-slate-200 px-2 py-1.5 text-center text-[10px] font-medium uppercase tracking-wide text-slate-700"
                          >
                            View
                          </Link>
                          <button
                            type="button"
                            onClick={() => navigateToFolder(folder)}
                            className="flex-1 rounded-md bg-slate-900 px-2 py-1.5 text-[10px] font-medium uppercase tracking-wide text-white"
                          >
                            Add
                          </button>
                        </div>
                      ) : canEdit ? (
                        <div className="flex flex-wrap gap-1" onClick={(event) => event.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => copyItem("folder", folder.id, folder.name)}
                            className="rounded border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
                            title="Copy"
                            aria-label="Copy folder"
                          >
                            <Copy size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => cutItem("folder", folder.id, folder.name)}
                            className="rounded border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
                            title="Cut"
                            aria-label="Cut folder"
                          >
                            <Scissors size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => void renameFolder(folder)}
                            className="rounded border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
                            title="Rename"
                            aria-label="Rename folder"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => void removeFolder(folder)}
                            className="rounded border border-red-200 p-1.5 text-red-600 hover:bg-red-50"
                            title="Delete"
                            aria-label="Delete folder"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-500">Tap to open</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {data.files.length ? (
            <div className={MEDIA_GRID_CLASS}>
              {data.files.map((file) => {
                const image = isImageFile(file);
                const video = isVideoFile(file);
                const isCover = currentCoverId === file.id;
                return (
                  <div
                    key={file.id}
                    className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                    onPointerEnter={video ? () => prefetchVideo(file) : undefined}
                  >
                    {video ? (
                      <button
                        type="button"
                        onClick={() => void playVideo(file)}
                        className="relative block w-full overflow-hidden bg-slate-900"
                        aria-label={`Play ${file.name}`}
                      >
                        <MediaPreview src={file.url} className="aspect-square w-full object-cover opacity-80" />
                        <span className="absolute inset-0 grid place-items-center">
                          <span className="grid h-10 w-10 place-items-center rounded-full bg-black/55 text-white">
                            <Play size={16} className="ml-0.5 fill-current" />
                          </span>
                        </span>
                      </button>
                    ) : image ? (
                      <button
                        type="button"
                        onClick={() => openImage(file)}
                        className={`relative block w-full overflow-hidden bg-slate-100 ${isCover ? "ring-2 ring-inset ring-emerald-500" : ""}`}
                        aria-label={`View ${file.name}`}
                      >
                        <MediaPreview src={file.url} className="aspect-square w-full object-cover transition group-hover:scale-[1.02]" />
                        {isCover ? (
                          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded bg-emerald-600 px-1.5 text-[8px] font-semibold uppercase text-white">
                            Cover
                          </span>
                        ) : null}
                      </button>
                    ) : (
                      <div className="grid aspect-square w-full place-items-center bg-slate-100">
                        <FileIcon file={file} />
                      </div>
                    )}

                    <div className="space-y-2 p-2">
                      <p className="truncate text-[12px] font-semibold text-slate-900" title={file.name}>
                        {file.name}
                      </p>
                      <p className="text-[10px] capitalize text-slate-500">
                        {file.resource_type || "file"} · {formatBytes(file.bytes)}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {video ? (
                          <button
                            type="button"
                            onClick={() => void playVideo(file)}
                            className="rounded border border-violet-200 bg-violet-50 p-1.5 text-violet-700"
                            title="Play"
                            aria-label="Play video"
                          >
                            <Play size={12} />
                          </button>
                        ) : null}
                        {image ? (
                          <button
                            type="button"
                            onClick={() => openImage(file)}
                            className="rounded border border-sky-200 bg-sky-50 p-1.5 text-sky-700"
                            title="View"
                            aria-label="View image"
                          >
                            <FileImage size={12} />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => void downloadOriginal(file)}
                          className="rounded border border-slate-200 p-1.5 text-slate-700 hover:bg-slate-50"
                          title="Download"
                          aria-label="Download"
                        >
                          <Download size={12} />
                        </button>
                        {canEdit ? (
                          <>
                            {canSetCover && image ? (
                              <button
                                type="button"
                                disabled={busy || isCover}
                                onClick={() => void setCover(file)}
                                className="rounded border border-emerald-200 p-1.5 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                                title={isCover ? "Cover" : "Set cover"}
                                aria-label="Set cover"
                              >
                                <ImagePlus size={12} />
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => copyItem("file", file.id, file.name)}
                              className="rounded border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
                              title="Copy"
                              aria-label="Copy file"
                            >
                              <Copy size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => cutItem("file", file.id, file.name)}
                              className="rounded border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
                              title="Cut"
                              aria-label="Cut file"
                            >
                              <Scissors size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => void renameFile(file)}
                              className="rounded border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
                              title="Rename"
                              aria-label="Rename file"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => void removeFile(file)}
                              className="rounded border border-red-200 p-1.5 text-red-600 hover:bg-red-50"
                              title="Delete"
                              aria-label="Delete file"
                            >
                              <Trash2 size={12} />
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      )}

      {playing ? (
        <MediaVideoPlayer
          playing={playing}
          onClose={closePlayer}
          onDownload={() => void downloadOriginal(playing.file)}
          onRetry={() => void startPlayback(playing.file)}
        />
      ) : null}

      {viewing ? (
        <MediaImageViewer
          file={viewing}
          files={imageFiles}
          onClose={() => setViewing(null)}
          onDownload={() => void downloadOriginal(viewing)}
          onSelect={setViewing}
          loadOriginal={resolveImageOriginal}
        />
      ) : null}
    </div>
  );
}
