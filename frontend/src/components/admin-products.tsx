"use client";

import { DragEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, GripVertical } from "lucide-react";
import { API_URL, apiFetch } from "@/lib/api";
import { formatPkr } from "@/lib/money";
import { PRODUCT_BADGES, PRODUCT_SIZE_PRESETS, productSizes } from "@/lib/product";
import type { Collection } from "@/components/admin-collections";
import { CollectionPicker } from "@/components/collection-picker";
import { AdminConfirm } from "@/components/admin-confirm";
import { AdminProductGridSkeleton } from "@/components/skeletons";

export type ProductImage = {
  id: string;
  url: string;
  alt: string;
  sort_order: number;
};

export type ProductLabel = {
  id: string;
  label: string;
  value: string;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  code?: string;
  collection_id: string;
  description: string;
  fabric: string;
  pieces: string;
  color: string;
  stock?: number;
  sizes?: string[];
  price: number;
  compare_at_price: number;
  badge: string;
  video_url?: string;
  labels?: ProductLabel[];
  images: ProductImage[];
  is_on_sale: boolean;
  is_published: boolean;
  sort_order: number;
  created_at?: string;
};

type SortId = "newest" | "name" | "price-asc" | "price-desc" | "stock";

const SORTS: { id: SortId; label: string }[] = [
  { id: "newest", label: "Newest" },
  { id: "name", label: "Name A–Z" },
  { id: "price-asc", label: "Price: low" },
  { id: "price-desc", label: "Price: high" },
  { id: "stock", label: "Low stock" },
];

type ImageDraft = {
  id: string;
  url: string;
  file?: File;
};

const emptyForm = {
  name: "",
  code: "",
  collection_id: "",
  description: "",
  fabric: "",
  pieces: "",
  color: "",
  stock: "1",
  price: "",
  compare_at_price: "",
  badge: "",
  video_url: "",
  is_on_sale: true,
  is_published: true,
  sort_order: 0,
};

function toCode(text: string) {
  return text
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function newLabel(): ProductLabel {
  return { id: crypto.randomUUID(), label: "", value: "" };
}

function addSizeValue(list: string[], raw: string) {
  const value = raw.trim().replace(/\s+/g, " ");
  if (!value) return list;
  if (list.some((size) => size.toLowerCase() === value.toLowerCase())) return list;
  return [...list, value];
}

function coverOf(item: Product) {
  return item.images?.[0]?.url || "";
}

function sortProducts(list: Product[], sort: SortId) {
  const next = [...list];
  next.sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "price-asc") return a.price - b.price;
    if (sort === "price-desc") return b.price - a.price;
    if (sort === "stock") return (a.stock ?? 0) - (b.stock ?? 0);
    const aTime = a.created_at || "";
    const bTime = b.created_at || "";
    if (aTime !== bTime) return bTime.localeCompare(aTime);
    return b.sort_order - a.sort_order;
  });
  return next;
}

export function AdminProducts() {
  const [items, setItems] = useState<Product[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [pendingDelete, setPendingDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [images, setImages] = useState<ImageDraft[]>([]);
  const [labels, setLabels] = useState<ProductLabel[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [sizeDraft, setSizeDraft] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState("");
  const [clearVideo, setClearVideo] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState<SortId>("newest");
  const dragIdRef = useRef<string | null>(null);

  const open = creating || Boolean(editing);
  const hasUnassigned = items.some((item) => !item.collection_id);
  const visible = useMemo(() => {
    const filtered =
      filter === "all"
        ? items
        : filter === "unassigned"
          ? items.filter((item) => !item.collection_id)
          : items.filter((item) => item.collection_id === filter);
    return sortProducts(filtered, sort);
  }, [items, filter, sort]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [productsRes, collectionsRes] = await Promise.all([
        apiFetch(`${API_URL}/api/admin/products`, { credentials: "include" }),
        apiFetch(`${API_URL}/api/admin/collections`, { credentials: "include" }),
      ]);
      const productsData = await productsRes.json();
      const collectionsData = await collectionsRes.json();
      if (!productsRes.ok) throw new Error(productsData.message || "Could not load products");
      setItems(productsData.items || []);
      setCollections(collectionsData.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load products");
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
    setImages([]);
    setLabels([]);
    setSizes([]);
    setSizeDraft("");
    setVideoFile(null);
    setVideoPreview("");
    setClearVideo(false);
    setError("");
  }

  function startEdit(item: Product) {
    setCreating(false);
    setEditing(item);
    setForm({
      name: item.name,
      code: item.code || toCode(item.slug || item.name),
      collection_id: item.collection_id,
      description: item.description,
      fabric: item.fabric,
      pieces: item.pieces,
      color: item.color,
      stock: String(item.stock ?? 0),
      price: item.price ? String(item.price) : "",
      compare_at_price: item.compare_at_price ? String(item.compare_at_price) : "",
      badge: item.badge,
      video_url: item.video_url || "",
      is_on_sale: item.is_on_sale,
      is_published: item.is_published,
      sort_order: item.sort_order,
    });
    setImages((item.images || []).map((image) => ({ id: image.id, url: image.url })));
    setLabels((item.labels || []).map((row) => ({ ...row })));
    setSizes(productSizes(item));
    setSizeDraft("");
    setVideoFile(null);
    setVideoPreview(item.video_url || "");
    setClearVideo(false);
    setError("");
  }

  function closeForm() {
    setCreating(false);
    setEditing(null);
    setImages([]);
    setLabels([]);
    setSizes([]);
    setSizeDraft("");
    setVideoFile(null);
    setVideoPreview("");
    setClearVideo(false);
  }

  function addImages(files?: FileList | null) {
    if (!files?.length) return;
    const next = Array.from(files).slice(0, Math.max(0, 12 - images.length)).map((file) => ({
      id: crypto.randomUUID(),
      url: URL.createObjectURL(file),
      file,
    }));
    setImages((current) => [...current, ...next]);
  }

  function removeImage(id: string) {
    setImages((current) => current.filter((image) => image.id !== id));
  }

  function onVideo(file?: File) {
    if (!file) return;
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    setClearVideo(false);
    setForm((current) => ({ ...current, video_url: "" }));
  }

  function removeVideo() {
    setVideoFile(null);
    setVideoPreview("");
    setClearVideo(true);
    setForm((current) => ({ ...current, video_url: "" }));
  }

  function moveImage(from: number, to: number) {
    setImages((current) => {
      if (to < 0 || to >= current.length || from === to) return current;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  function onImageDragStart(event: DragEvent, id: string) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
    dragIdRef.current = id;
    setDragId(id);
  }

  function onImageDragOver(event: DragEvent, id: string) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const movingId = dragIdRef.current;
    if (!movingId || movingId === id || overId === id) return;
    setOverId(id);
    setImages((current) => {
      const from = current.findIndex((image) => image.id === movingId);
      const to = current.findIndex((image) => image.id === id);
      if (from < 0 || to < 0) return current;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  function onImageDragEnd() {
    dragIdRef.current = null;
    setDragId(null);
    setOverId(null);
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
      body.append(
        "image_order",
        JSON.stringify(images.map((image) => (image.file ? "new" : { id: image.id, url: image.url }))),
      );
      body.append("labels", JSON.stringify(labels));
      body.append("sizes", JSON.stringify(productSizes({ sizes })));
      images.forEach((image) => {
        if (image.file) body.append("images", image.file);
      });
      if (videoFile) body.append("video", videoFile);
      if (clearVideo) body.append("clear_video", "true");

      const url = editing ? `${API_URL}/api/admin/products/${editing.id}` : `${API_URL}/api/admin/products`;
      const res = await apiFetch(url, {
        method: editing ? "PATCH" : "POST",
        credentials: "include",
        body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not save product");
      closeForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save product");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setError("");
    try {
      const res = await apiFetch(`${API_URL}/api/admin/products/${pendingDelete.id}`, {
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

  function collectionName(id: string) {
    return collections.find((item) => item.id === id)?.name || "Unassigned";
  }

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {visible.length === items.length
            ? `${items.length} product${items.length === 1 ? "" : "s"}`
            : `${visible.length} of ${items.length} products`}
        </p>
        <button
          type="button"
          onClick={startCreate}
          className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          Add product
        </button>
      </div>

      {error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      {!loading && items.length ? (
        <div className="mt-5 space-y-3">
          <div className="flex flex-wrap gap-2">
            <FilterBubble label="All" active={filter === "all"} onClick={() => setFilter("all")} />
            {collections.map((collection) => (
              <FilterBubble
                key={collection.id}
                label={collection.name}
                active={filter === collection.id}
                onClick={() => setFilter(collection.id)}
              />
            ))}
            {hasUnassigned ? (
              <FilterBubble
                label="Unassigned"
                active={filter === "unassigned"}
                onClick={() => setFilter("unassigned")}
              />
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Sort</span>
            {SORTS.map((item) => (
              <FilterBubble
                key={item.id}
                label={item.label}
                active={sort === item.id}
                onClick={() => setSort(item.id)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {loading ? (
        <AdminProductGridSkeleton />
      ) : items.length === 0 ? (
        <div className="mt-10 border border-dashed border-slate-200 bg-white px-6 py-16 text-center text-sm text-slate-500">
          No products yet. Add a cotton or lawn suit with multiple photos to start.
        </div>
      ) : visible.length === 0 ? (
        <div className="mt-10 border border-dashed border-slate-200 bg-white px-6 py-16 text-center text-sm text-slate-500">
          No products in this collection.
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {visible.map((item) => (
            <article key={item.id} className="overflow-hidden border border-slate-200 bg-white">
              <div className="relative aspect-[3/4] bg-sand">
                {coverOf(item) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverOf(item)} alt={item.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center text-[9px] text-slate-500 uppercase">
                    No photos
                  </div>
                )}
                {item.images.length > 1 ? (
                  <span className="absolute right-1.5 bottom-1.5 bg-white/90 px-1.5 py-0.5 text-[8px] font-semibold uppercase">
                    {item.images.length}
                  </span>
                ) : null}
                <div className="absolute left-1.5 top-1.5 flex flex-wrap gap-1">
                  {item.is_published ? (
                    <span className="bg-white/90 px-1.5 py-0.5 text-[8px] font-semibold uppercase">Live</span>
                  ) : (
                    <span className="bg-slate-900/80 px-1.5 py-0.5 text-[8px] font-semibold text-white uppercase">
                      Hidden
                    </span>
                  )}
                  {(item.stock ?? 0) <= 0 ? (
                    <span className="bg-red-600 px-1.5 py-0.5 text-[8px] font-semibold text-white uppercase">
                      Out
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="p-2">
                <p className="truncate text-[9px] text-slate-500 uppercase">
                  {collectionName(item.collection_id)} · {item.code || "No code"}
                </p>
                <h3 className="mt-0.5 truncate text-sm font-semibold text-slate-900">{item.name}</h3>
                <p className="mt-0.5 text-[11px] text-slate-700">
                  {item.price ? formatPkr(item.price) : "—"} · {item.stock ?? 0} in stock
                  {item.sizes?.length ? ` · ${item.sizes.join(" · ")}` : ""}
                </p>
                <div className="mt-2 flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => startEdit(item)}
                    className="border border-slate-200 px-2 py-1 text-[10px] uppercase hover:bg-slate-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(item)}
                    className="px-2 py-1 text-[10px] text-sale uppercase hover:underline"
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
              <h2 className="font-semibold text-2xl">{editing ? "Edit product" : "New product"}</h2>
              <button type="button" onClick={closeForm} className="text-sm text-slate-500">
                Close
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
              <div>
                <span className="text-sm font-medium text-slate-600">Photos</span>
                <p className="mt-1 text-xs text-slate-500">
                  Drag to reorder, or use arrows. First photo is the cover.
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {images.map((image, index) => (
                    <div
                      key={image.id}
                      onDragOver={(event) => onImageDragOver(event, image.id)}
                      className={`relative aspect-[3/4] overflow-hidden border bg-white ${
                        dragId === image.id ? "opacity-50" : "opacity-100"
                      } ${overId === image.id && dragId && dragId !== image.id ? "border-sale" : "border-slate-200"}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image.url} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        draggable
                        onDragStart={(event) => onImageDragStart(event, image.id)}
                        onDragEnd={onImageDragEnd}
                        aria-label={`Drag to reorder photo ${index + 1}`}
                        className="absolute left-1 top-1 grid h-7 w-7 cursor-grab place-items-center bg-white/90 text-slate-900 active:cursor-grabbing"
                      >
                        <GripVertical size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeImage(image.id)}
                        className="absolute right-1 top-1 bg-white/90 px-1.5 py-0.5 text-[8px] text-sale uppercase"
                      >
                        Remove
                      </button>
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-slate-900/70 px-1 py-1">
                        <button
                          type="button"
                          onClick={() => moveImage(index, index - 1)}
                          disabled={index === 0}
                          aria-label="Move photo left"
                          className="grid h-6 w-6 place-items-center text-white disabled:opacity-30"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <span className="text-[8px] font-semibold text-white uppercase">
                          {index === 0 ? "Cover" : index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => moveImage(index, index + 1)}
                          disabled={index === images.length - 1}
                          aria-label="Move photo right"
                          className="grid h-6 w-6 place-items-center text-white disabled:opacity-30"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {images.length < 12 ? (
                    <label className="flex aspect-[3/4] cursor-pointer flex-col items-center justify-center border border-dashed border-slate-300 bg-white text-center text-xs text-slate-500">
                      Add photos
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          addImages(e.target.files);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  ) : null}
                </div>
              </div>

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
                  className="mt-2 w-full border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-600">Product code</span>
                <input
                  required
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: toCode(e.target.value) })}
                  placeholder="ROSE-COTTON-01"
                  className="mt-2 w-full border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
                <p className="mt-1 text-xs text-slate-500">Used in the URL, e.g. /products/ROSE-COTTON-01</p>
              </label>

              <div>
                <span className="text-sm font-medium text-slate-600">Collection</span>
                <div className="mt-2">
                  <CollectionPicker
                    collections={collections}
                    value={form.collection_id}
                    onChange={(id) => setForm({ ...form, collection_id: id })}
                  />
                </div>
              </div>

              <div>
                <span className="text-sm font-medium text-slate-600">Product video</span>
                <p className="mt-1 text-xs text-slate-500">Optional studio clip shown on the product page.</p>
                <label className="mt-2 block cursor-pointer overflow-hidden border border-dashed border-slate-300 bg-white p-3">
                  {videoPreview || form.video_url ? (
                    <video
                      src={videoPreview || form.video_url}
                      className="max-h-48 w-full object-cover"
                      controls
                      muted
                    />
                  ) : (
                    <span className="block py-8 text-center text-sm text-slate-500">Upload a product video</span>
                  )}
                  <input
                    type="file"
                    accept="video/*"
                    className="mt-3 block w-full text-sm"
                    onChange={(e) => {
                      onVideo(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
                {videoPreview || form.video_url ? (
                  <button type="button" onClick={removeVideo} className="mt-2 text-sm font-medium text-red-600">
                    Remove video
                  </button>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm font-medium text-slate-600">Fabric</span>
                  <input
                    value={form.fabric}
                    onChange={(e) => setForm({ ...form, fabric: e.target.value })}
                    placeholder="Cotton"
                    className="mt-2 w-full border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-600">Pieces</span>
                  <input
                    value={form.pieces}
                    onChange={(e) => setForm({ ...form, pieces: e.target.value })}
                    placeholder="3 Piece"
                    className="mt-2 w-full border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm font-medium text-slate-600">Color</span>
                  <input
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="mt-2 w-full border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-600">Stock</span>
                  <input
                    required
                    type="number"
                    min="0"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    className="mt-2 w-full border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  />
                  <p className="mt-1 text-xs text-slate-500">How many pieces are available. 0 means sold out.</p>
                </label>
              </div>

              <div>
                <span className="text-sm font-medium text-slate-600">Sizes</span>
                <p className="mt-1 text-xs text-slate-500">
                  Customers must pick a size before add to bag or buy now. Tap a preset or type your own.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {PRODUCT_SIZE_PRESETS.map((preset) => {
                    const active = sizes.some((size) => size.toLowerCase() === preset.toLowerCase());
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() =>
                          setSizes((current) =>
                            active
                              ? current.filter((size) => size.toLowerCase() !== preset.toLowerCase())
                              : addSizeValue(current, preset),
                          )
                        }
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                          active
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        {preset}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex gap-2">
                  <input
                    value={sizeDraft}
                    onChange={(e) => setSizeDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      setSizes((current) => addSizeValue(current, sizeDraft));
                      setSizeDraft("");
                    }}
                    placeholder="Custom size, e.g. 32"
                    className="w-full border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSizes((current) => addSizeValue(current, sizeDraft));
                      setSizeDraft("");
                    }}
                    className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
                  >
                    Add
                  </button>
                </div>
                {sizes.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {sizes.map((size) => (
                      <span
                        key={size}
                        className="inline-flex items-center gap-1.5 border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-800"
                      >
                        {size}
                        <button
                          type="button"
                          onClick={() => setSizes((current) => current.filter((item) => item !== size))}
                          className="text-slate-400 hover:text-red-600"
                          aria-label={`Remove ${size}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-amber-700">No sizes yet. Shoppers will skip size selection.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm font-medium text-slate-600">Sale price</span>
                  <input
                    required
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="mt-2 w-full border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-600">Was price</span>
                  <input
                    type="number"
                    min="0"
                    value={form.compare_at_price}
                    onChange={(e) => setForm({ ...form, compare_at_price: e.target.value })}
                    className="mt-2 w-full border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-medium text-slate-600">Badge</span>
                <select
                  value={form.badge}
                  onChange={(e) => setForm({ ...form, badge: e.target.value })}
                  className="mt-2 w-full border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                >
                  <option value="">None</option>
                  {PRODUCT_BADGES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                  {form.badge && !PRODUCT_BADGES.includes(form.badge as (typeof PRODUCT_BADGES)[number]) ? (
                    <option value={form.badge}>{form.badge}</option>
                  ) : null}
                </select>
                <p className="mt-1.5 text-xs text-slate-500">Optional. Sale OFF badges come from the sale, not here.</p>
              </label>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Extra labels</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Fabric, set, color, and product code already show. Add more rows such as Dupatta, Length, or Care.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLabels((current) => [...current, newLabel()])}
                    className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700"
                  >
                    Add label
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  {labels.map((item, index) => (
                    <div key={item.id} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                      <input
                        value={item.label}
                        onChange={(e) =>
                          setLabels((current) =>
                            current.map((row, i) => (i === index ? { ...row, label: e.target.value } : row)),
                          )
                        }
                        placeholder="Label"
                        className="border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                      />
                      <input
                        value={item.value}
                        onChange={(e) =>
                          setLabels((current) =>
                            current.map((row, i) => (i === index ? { ...row, value: e.target.value } : row)),
                          )
                        }
                        placeholder="Value"
                        className="border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setLabels((current) => current.filter((_, i) => i !== index))}
                        className="px-2 text-sm text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="text-sm font-medium text-slate-600">Description</span>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="mt-2 w-full border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-600">Sort order</span>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                  className="mt-2 w-full border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
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
                  Published on storefront
                </label>
              </div>
            </div>

            <div className="border-t border-slate-200 px-6 py-4">
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white disabled:opacity-60"
              >
                {saving ? "Uploading & saving…" : "Save product"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <AdminConfirm
        open={Boolean(pendingDelete)}
        title="Delete this product?"
        message={pendingDelete ? `“${pendingDelete.name}” will be removed from the shop. This cannot be undone.` : ""}
        busy={deleting}
        onCancel={() => {
          if (!deleting) setPendingDelete(null);
        }}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function FilterBubble({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
        active ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"
      }`}
    >
      {label}
    </button>
  );
}
