"use client";

import { DragEvent, FormEvent, useEffect, useRef, useState } from "react";
import { GripVertical } from "lucide-react";
import { API_URL, apiFetch } from "@/lib/api";
import { ImageCropperModal } from "@/components/image-cropper-modal";
import { AdminConfirm } from "@/components/admin-confirm";
import { AdminListSkeleton } from "@/components/skeletons";

export type Collection = {
  id: string;
  name: string;
  slug: string;
  code: string;
  subtitle: string;
  description: string;
  cover_image: string;
  cover_image_desktop?: string;
  banner_image: string;
  banner_image_desktop?: string;
  sale_label: string;
  is_on_sale: boolean;
  is_published: boolean;
  sort_order: number;
};

type CropKind = "cover" | "coverDesktop" | "banner" | "bannerDesktop";

const CROP = {
  cover: {
    aspect: 4 / 5,
    title: "Card · phone",
    hint: "4:5 for phones and the homepage. Fill the frame with the suit.",
    box: "aspect-[4/5] max-h-56",
    field: "cover_image" as const,
    fileName: "cover",
    label: "Card image · phone",
    help: "Portrait crop for collection cards on phones.",
  },
  coverDesktop: {
    aspect: 21 / 9,
    title: "Card · desktop",
    hint: "This frame is the same 21:9 as the live desktop card. A 21:9 poster should fill it at zoom 1 — drag only if you need a tighter crop.",
    box: "aspect-[21/9]",
    field: "cover_image_desktop" as const,
    fileName: "cover_desktop",
    label: "Card image · desktop",
    help: "Landscape crop so wide desktop cards do not cut the head.",
  },
  banner: {
    aspect: 2 / 1,
    title: "Page cover · phone",
    hint: "2:1 for the collection page banner on phones.",
    box: "aspect-[2/1]",
    field: "banner_image" as const,
    fileName: "banner",
    label: "Page cover · phone",
    help: "Shorter banner on the collection page on phones.",
  },
  bannerDesktop: {
    aspect: 3 / 1,
    title: "Page cover · desktop",
    hint: "This frame is the same 3:1 as the live desktop banner. An ultra-wide poster should fill it at zoom 1.",
    box: "aspect-[3/1]",
    field: "banner_image_desktop" as const,
    fileName: "banner_desktop",
    label: "Page cover · desktop",
    help: "Wide crop for the collection page banner on desktop.",
  },
} as const;

const emptyForm = {
  name: "",
  code: "",
  subtitle: "",
  description: "",
  cover_image: "",
  cover_image_desktop: "",
  banner_image: "",
  banner_image_desktop: "",
  sale_label: "",
  is_on_sale: false,
  is_published: true,
  sort_order: 0,
};

const emptyFiles: Partial<Record<CropKind, File>> = {};
const emptyPreviews: Record<CropKind, string> = {
  cover: "",
  coverDesktop: "",
  banner: "",
  bannerDesktop: "",
};

function toCode(text: string) {
  return text
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function AdminCollections() {
  const [items, setItems] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Collection | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [files, setFiles] = useState<Partial<Record<CropKind, File>>>(emptyFiles);
  const [previews, setPreviews] = useState<Record<CropKind, string>>(emptyPreviews);
  const [cropSrc, setCropSrc] = useState("");
  const [cropKind, setCropKind] = useState<CropKind>("cover");
  const [pendingDelete, setPendingDelete] = useState<Collection | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const itemsRef = useRef(items);
  const dragIdRef = useRef<string | null>(null);
  const pickKindRef = useRef<CropKind>("cover");
  const imageInputRef = useRef<HTMLInputElement>(null);
  itemsRef.current = items;

  const open = creating || Boolean(editing);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch(`${API_URL}/api/admin/collections`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not load collections");
      setItems(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load collections");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function startCreate() {
    setEditing(null);
    setCreating(true);
    setForm({ ...emptyForm, sort_order: items.length + 1 });
    setFiles({});
    setPreviews({ ...emptyPreviews });
    setCropSrc("");
    setError("");
  }

  function startEdit(item: Collection) {
    setCreating(false);
    setEditing(item);
    setForm({
      name: item.name,
      code: item.code || toCode(item.slug || item.name),
      subtitle: item.subtitle,
      description: item.description,
      cover_image: item.cover_image,
      cover_image_desktop: item.cover_image_desktop || "",
      banner_image: item.banner_image || "",
      banner_image_desktop: item.banner_image_desktop || "",
      sale_label: item.sale_label,
      is_on_sale: item.is_on_sale,
      is_published: item.is_published,
      sort_order: item.sort_order,
    });
    setFiles({});
    setPreviews({
      cover: item.cover_image || "",
      coverDesktop: item.cover_image_desktop || "",
      banner: item.banner_image || "",
      bannerDesktop: item.banner_image_desktop || "",
    });
    setCropSrc("");
    setError("");
  }

  function closeForm() {
    setCreating(false);
    setEditing(null);
    setFiles({});
    setPreviews({ ...emptyPreviews });
    setCropSrc("");
  }

  function previewOf(kind: CropKind) {
    return previews[kind] || form[CROP[kind].field];
  }

  function pickImage(kind: CropKind) {
    pickKindRef.current = kind;
    imageInputRef.current?.click();
  }

  function onImagePicked(file?: File) {
    if (!file) return;
    setCropKind(pickKindRef.current);
    setCropSrc(URL.createObjectURL(file));
  }

  function recrop(kind: CropKind) {
    const fallback =
      kind === "coverDesktop" ? previewOf("cover") : kind === "bannerDesktop" ? previewOf("banner") : "";
    const src = previewOf(kind) || fallback;
    if (!src) return;
    setCropKind(kind);
    setCropSrc(src);
  }

  function onCropped(file: File, previewUrl: string) {
    setFiles((current) => ({ ...current, [cropKind]: file }));
    setPreviews((current) => ({ ...current, [cropKind]: previewUrl }));
    setCropSrc("");
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        body.append(key, String(value));
      });
      (Object.keys(CROP) as CropKind[]).forEach((kind) => {
        const file = files[kind];
        if (file) body.append(CROP[kind].fileName, file);
      });

      const url = editing
        ? `${API_URL}/api/admin/collections/${editing.id}`
        : `${API_URL}/api/admin/collections`;
      const res = await apiFetch(url, {
        method: editing ? "PATCH" : "POST",
        credentials: "include",
        body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not save collection");
      closeForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save collection");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setError("");
    try {
      const res = await apiFetch(`${API_URL}/api/admin/collections/${pendingDelete.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not delete");
      setPendingDelete(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete");
    } finally {
      setDeleting(false);
    }
  }

  function onDragStart(event: DragEvent, id: string) {
    dragIdRef.current = id;
    setDragId(id);
    event.dataTransfer.effectAllowed = "move";
  }

  function onDragOver(event: DragEvent, id: string) {
    event.preventDefault();
    const from = dragIdRef.current;
    if (!from || from === id) return;
    setOverId(id);
    const list = [...itemsRef.current];
    const fromIndex = list.findIndex((item) => item.id === from);
    const toIndex = list.findIndex((item) => item.id === id);
    if (fromIndex < 0 || toIndex < 0) return;
    const [moved] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, moved);
    itemsRef.current = list;
    setItems(list);
  }

  async function persistOrder() {
    if (!dragIdRef.current) return;
    dragIdRef.current = null;
    setDragId(null);
    setOverId(null);
    const ordered = itemsRef.current.map((item, index) => ({ ...item, sort_order: index + 1 }));
    const res = await apiFetch(`${API_URL}/api/admin/collections/reorder`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: ordered.map((item) => item.id) }),
    });
    if (!res.ok) {
      setError("Could not save collection order");
      await load();
    }
  }

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          Drag the list cards to set storefront order. First card shows largest on desktop.
        </p>
        <button
          type="button"
          onClick={startCreate}
          className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          Add collection
        </button>
      </div>

      {error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      {loading ? (
        <AdminListSkeleton />
      ) : items.length === 0 ? (
        <div className="mt-10 border border-dashed border-slate-200 bg-white px-6 py-16 text-center text-sm text-slate-500">
          No collections yet. Add Lawn, Formals, Pret, or Unstitched to start.
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {items.map((item, index) => (
            <article
              key={item.id}
              onDragOver={(event) => onDragOver(event, item.id)}
              onDrop={(event) => event.preventDefault()}
              onDragEnd={() => persistOrder()}
              className={`flex overflow-hidden border bg-white transition-all ${
                dragId === item.id ? "opacity-50" : "opacity-100"
              } ${overId === item.id && dragId && dragId !== item.id ? "border-blue-500" : "border-slate-200"}`}
            >
              <div
                draggable
                onDragStart={(event) => onDragStart(event, item.id)}
                className="flex cursor-grab items-center px-2 text-slate-400 hover:bg-slate-50 hover:text-slate-900 active:cursor-grabbing"
                aria-label={`Drag to reorder ${item.name}`}
              >
                <GripVertical size={18} />
              </div>
              <div className="relative h-[96px] w-[76px] shrink-0 bg-slate-100 sm:h-[112px] sm:w-[88px]">
                {item.cover_image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.cover_image} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center text-[10px] text-slate-400">No cover</div>
                )}
              </div>
              <div className="flex min-w-0 flex-1 items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">
                    {index + 1}. {item.code || item.slug || "No code"}
                    {item.is_published ? " · Live" : " · Hidden"}
                    {item.is_on_sale ? " · Sale" : ""}
                  </p>
                  <h3 className="mt-0.5 truncate text-base font-semibold text-slate-900">{item.name}</h3>
                  <p className="mt-0.5 truncate text-sm text-slate-500">{item.subtitle || item.description}</p>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(item)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(item)}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {open ? (
        <div className="fixed inset-0 z-[70] flex justify-end bg-slate-900/40" onClick={closeForm}>
          <form
            onSubmit={onSubmit}
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-xl font-semibold text-slate-900">
                {editing ? "Edit collection" : "New collection"}
              </h2>
              <button type="button" onClick={closeForm} className="text-sm text-slate-500">
                Close
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  onImagePicked(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />

              {(Object.keys(CROP) as CropKind[]).map((kind) => {
                const meta = CROP[kind];
                const src = previewOf(kind);
                const canRecrop =
                  Boolean(src) ||
                  (kind === "coverDesktop" && Boolean(previewOf("cover"))) ||
                  (kind === "bannerDesktop" && Boolean(previewOf("banner")));
                return (
                  <div key={kind}>
                    <span className="text-sm font-medium text-slate-600">{meta.label}</span>
                    <p className="mt-1 text-xs text-slate-500">{meta.help}</p>
                    <button
                      type="button"
                      onClick={() => pickImage(kind)}
                      className={`relative mt-2 flex w-full cursor-pointer items-center justify-center overflow-hidden border border-dashed border-slate-300 bg-white ${meta.box}`}
                    >
                      {src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={src} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="px-6 text-center text-sm text-slate-500">Upload, then crop to fit</span>
                      )}
                    </button>
                    <div className="mt-2 flex gap-3">
                      <button
                        type="button"
                        onClick={() => pickImage(kind)}
                        className="text-sm font-medium text-blue-600"
                      >
                        {src ? "Change image" : "Choose image"}
                      </button>
                      {canRecrop ? (
                        <button
                          type="button"
                          onClick={() => recrop(kind)}
                          className="text-sm font-medium text-blue-600"
                        >
                          Crop
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}

              <label className="block">
                <span className="text-sm font-medium text-slate-600">Name</span>
                <input
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e.target.value,
                      code: editing ? form.code : toCode(e.target.value),
                    })
                  }
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-600">Collection code</span>
                <input
                  required
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: toCode(e.target.value) })}
                  placeholder="LAWN-SUITS"
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
                <p className="mt-1 text-xs text-slate-500">Used in the URL, e.g. /collections/LAWN-SUITS</p>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-600">Subtitle</span>
                <input
                  value={form.subtitle}
                  onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                  placeholder="Evening & festive"
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-600">Sale label</span>
                <input
                  value={form.sale_label}
                  onChange={(e) => setForm({ ...form, sale_label: e.target.value })}
                  placeholder="Up to 50% off"
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-600">Description</span>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </label>

              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.is_on_sale}
                    onChange={(e) => setForm({ ...form, is_on_sale: e.target.checked })}
                  />
                  On sale
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.is_published}
                    onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                  />
                  Published
                </label>
              </div>
            </div>

            <div className="border-t border-slate-200 px-6 py-4">
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white disabled:opacity-60"
              >
                {saving ? "Uploading & saving…" : "Save collection"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {cropSrc ? (
        <ImageCropperModal
          key={`${cropKind}-${cropSrc}`}
          src={cropSrc}
          aspect={CROP[cropKind].aspect}
          title={CROP[cropKind].title}
          hint={CROP[cropKind].hint}
          onCancel={() => setCropSrc("")}
          onCropped={onCropped}
        />
      ) : null}

      <AdminConfirm
        open={Boolean(pendingDelete)}
        title="Delete this collection?"
        message={pendingDelete ? `“${pendingDelete.name}” will be removed. Products in it will stay unassigned.` : ""}
        busy={deleting}
        onCancel={() => {
          if (!deleting) setPendingDelete(null);
        }}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
