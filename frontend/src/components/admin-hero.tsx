"use client";

import { DragEvent, FormEvent, useEffect, useRef, useState } from "react";
import { GripVertical } from "lucide-react";
import { API_URL, apiFetch } from "@/lib/api";
import { formatPkr } from "@/lib/money";
import { collectionHref } from "@/lib/collection";
import { productHref } from "@/lib/product";
import type { Collection } from "@/components/admin-collections";
import type { Product } from "@/components/admin-products";
import { ImageCropperModal } from "@/components/image-cropper-modal";
import { SaleProductPicker } from "@/components/sale-product-picker";
import { AdminConfirm } from "@/components/admin-confirm";
import { AdminListSkeleton } from "@/components/skeletons";

export type HeroLabel = {
  id: string;
  label: string;
  value: string;
  accent: boolean;
  strike: boolean;
  sort_order: number;
};

export type HeroSale = {
  id: string;
  name: string;
  headline: string;
  badge: string;
  discount_label: string;
  starts_at: string;
  ends_at: string;
  is_published: boolean;
};

export type HeroKind = "slide" | "image";

export type HeroSlide = {
  id: string;
  kind?: HeroKind;
  image: string;
  video: string;
  alt: string;
  sort_order: number;
  is_published: boolean;
  kicker: string;
  heading: string;
  heading_accent: string;
  description: string;
  primary_cta_label: string;
  primary_cta_link: string;
  secondary_cta_label: string;
  secondary_cta_link: string;
  labels: HeroLabel[];
  sale_tag_label: string;
  sale_tag_value: string;
  sale_tag_visible: boolean;
  sale_badge_enabled: boolean;
  sale_badge_text: string;
  sale_id: string;
  product_id: string;
  sale?: HeroSale | null;
};

function newLabel(overrides: Partial<HeroLabel> = {}): HeroLabel {
  return {
    id: crypto.randomUUID(),
    label: "",
    value: "",
    accent: false,
    strike: false,
    sort_order: 1,
    ...overrides,
  };
}

function isWasLabel(item: { label: string; strike?: boolean }) {
  return Boolean(item.strike) || /^was$/i.test(item.label);
}

function isPriceLabel(item: { label: string; accent?: boolean; strike?: boolean }) {
  return /^(price|now|current)$/i.test(item.label) || (Boolean(item.accent) && !isWasLabel(item));
}

function labelsFromProduct(product: Product, current: HeroLabel[]): HeroLabel[] {
  const priceValue = formatPkr(product.price);
  const wasValue = product.compare_at_price > product.price ? formatPkr(product.compare_at_price) : "";
  const labels = current.map((item) => ({ ...item }));
  const priceIdx = labels.findIndex((item) => isPriceLabel(item));
  const wasIdx = labels.findIndex((item) => isWasLabel(item));
  if (priceIdx >= 0) labels[priceIdx] = { ...labels[priceIdx], value: priceValue, accent: true };
  else labels.unshift(newLabel({ label: "Price", value: priceValue, accent: true, sort_order: 1 }));
  if (wasValue) {
    if (wasIdx >= 0) labels[wasIdx] = { ...labels[wasIdx], value: wasValue, strike: true };
    else labels.splice(priceIdx >= 0 ? priceIdx + 1 : 1, 0, newLabel({ label: "Was", value: wasValue, strike: true }));
  } else if (wasIdx >= 0) {
    labels.splice(wasIdx, 1);
  }
  return labels;
}

function slideKind(slide: { kind?: string }): HeroKind {
  return slide.kind === "image" ? "image" : "slide";
}

const emptySlide: Omit<HeroSlide, "id"> = {
  kind: "slide",
  image: "",
  video: "",
  alt: "",
  sort_order: 1,
  is_published: true,
  kicker: "",
  heading: "",
  heading_accent: "",
  description: "",
  primary_cta_label: "Shop now",
  primary_cta_link: "#shop",
  secondary_cta_label: "Browse collections",
  secondary_cta_link: "#collections",
  labels: [],
  sale_tag_label: "Sale",
  sale_tag_value: "",
  sale_tag_visible: false,
  sale_badge_enabled: false,
  sale_badge_text: "SALE",
  sale_id: "",
  product_id: "",
};

const emptyImageSlide: Omit<HeroSlide, "id"> = {
  ...emptySlide,
  kind: "image",
  primary_cta_label: "",
  primary_cta_link: "",
  secondary_cta_label: "",
  secondary_cta_link: "",
};

export function AdminHero() {
  const [tab, setTab] = useState<HeroKind>("slide");
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<HeroSlide | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptySlide);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [cropSrc, setCropSrc] = useState("");
  const [sales, setSales] = useState<{ id: string; name: string; ends_at: string; is_published: boolean }[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickedId, setPickedId] = useState("");
  const [pendingDelete, setPendingDelete] = useState<HeroSlide | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const slidesRef = useRef(slides);
  const dragIdRef = useRef<string | null>(null);
  slidesRef.current = slides;

  const open = creating || Boolean(editing);
  const visibleSlides = slides.filter((slide) => slideKind(slide) === tab);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch(`${API_URL}/api/admin/hero`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not load hero");
      setSlides(data.hero?.slides || []);
      const [salesRes, productsRes, collectionsRes] = await Promise.all([
        apiFetch(`${API_URL}/api/admin/sales`, { credentials: "include" }),
        apiFetch(`${API_URL}/api/admin/products`, { credentials: "include" }),
        apiFetch(`${API_URL}/api/admin/collections`, { credentials: "include" }),
      ]);
      const salesData = await salesRes.json();
      const productsData = await productsRes.json();
      const collectionsData = await collectionsRes.json();
      if (salesRes.ok) setSales(salesData.items || []);
      if (productsRes.ok) setProducts(productsData.items || []);
      if (collectionsRes.ok) setCollections(collectionsData.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load hero");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function startCreate(kind: HeroKind = tab) {
    setEditing(null);
    setCreating(true);
    setTab(kind);
    setForm({
      ...(kind === "image" ? emptyImageSlide : emptySlide),
      sort_order: slides.length + 1,
      labels: [],
    });
    setImageFile(null);
    setVideoFile(null);
    setPreview("");
    setCropSrc("");
    setPickedId("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setError("");
    if (kind === "image") fileInputRef.current?.click();
  }

  function startEdit(slide: HeroSlide) {
    const kind = slideKind(slide);
    setCreating(false);
    setEditing(slide);
    setTab(kind);
    setForm({
      ...(kind === "image" ? emptyImageSlide : emptySlide),
      ...slide,
      kind,
      product_id: kind === "image" ? "" : slide.product_id || "",
      labels: kind === "image" ? [] : slide.labels || [],
    });
    setImageFile(null);
    setVideoFile(null);
    setPreview(slide.image);
    setCropSrc("");
    setPickedId("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setError("");
  }

  function close() {
    setCreating(false);
    setEditing(null);
    setImageFile(null);
    setVideoFile(null);
    setPreview("");
    setCropSrc("");
    setPickerOpen(false);
    setPickedId("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function applyProduct(product: Product) {
    const collection = collections.find((item) => item.id === product.collection_id) || null;
    setForm((current) => ({
      ...current,
      product_id: product.id,
      heading: product.name || current.heading,
      alt: product.name || current.alt,
      primary_cta_link: productHref(product),
      secondary_cta_link: collection ? collectionHref(collection) : "/collections",
      labels: labelsFromProduct(product, current.labels || []),
    }));
  }

  function clearProduct() {
    setForm((current) => ({
      ...current,
      product_id: "",
      primary_cta_link: "#shop",
      secondary_cta_link: "#collections",
    }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (form.kind === "image" && !imageFile && !form.image) {
      setError("Crop and add a hero image first.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (key === "id" || key === "sort_order" || key === "sale" || key === "product") return;
        if (key === "labels") {
          body.append("labels", JSON.stringify(value));
          return;
        }
        if (typeof value === "object") return;
        body.append(key, String(value ?? ""));
      });
      if (imageFile) body.append("cover", imageFile);
      if (videoFile) body.append("video", videoFile);

      const url = editing
        ? `${API_URL}/api/admin/hero/slides/${editing.id}`
        : `${API_URL}/api/admin/hero/slides`;
      const res = await apiFetch(url, {
        method: editing ? "PATCH" : "POST",
        credentials: "include",
        body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not save slide");
      close();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save slide");
    } finally {
      setSaving(false);
    }
  }

  async function toggleSlide(slide: HeroSlide) {
    const body = new FormData();
    body.append("is_published", String(!slide.is_published));
    await apiFetch(`${API_URL}/api/admin/hero/slides/${slide.id}`, {
      method: "PATCH",
      credentials: "include",
      body,
    });
    await load();
  }

  function onDragStart(event: DragEvent, id: string) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
    dragIdRef.current = id;
    setDragId(id);
  }

  function onDragOver(event: DragEvent, id: string) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const movingId = dragIdRef.current;
    if (!movingId || movingId === id || overId === id) return;
    setOverId(id);
    setSlides((current) => {
      const kind = tab;
      const visible = current.filter((slide) => slideKind(slide) === kind);
      const from = visible.findIndex((slide) => slide.id === movingId);
      const to = visible.findIndex((slide) => slide.id === id);
      if (from < 0 || to < 0) return current;
      const nextVisible = [...visible];
      const [moved] = nextVisible.splice(from, 1);
      nextVisible.splice(to, 0, moved);
      let i = 0;
      return current
        .map((slide) => (slideKind(slide) === kind ? nextVisible[i++] : slide))
        .map((slide, index) => ({ ...slide, sort_order: index + 1 }));
    });
  }

  async function persistOrder() {
    if (!dragIdRef.current) return;
    dragIdRef.current = null;
    setDragId(null);
    setOverId(null);
    const ordered = slidesRef.current.map((slide, index) => ({ ...slide, sort_order: index + 1 }));
    const res = await apiFetch(`${API_URL}/api/admin/hero/reorder`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: ordered.map((slide) => slide.id) }),
    });
    if (!res.ok) {
      setError("Could not save slide order");
      await load();
    }
  }

  async function confirmDeleteSlide() {
    if (!pendingDelete) return;
    setDeleting(true);
    setError("");
    try {
      const res = await apiFetch(`${API_URL}/api/admin/hero/slides/${pendingDelete.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not delete slide");
      setPendingDelete(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete slide");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return <AdminListSkeleton rows={3} />;
  }

  return (
    <div className="mt-8">
      <div className="flex gap-1 border-b border-slate-200">
        {(
          [
            { id: "slide", label: "Slides" },
            { id: "image", label: "Hero image" },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`-mb-px px-4 py-2.5 text-sm font-medium ${
              tab === item.id
                ? "border-b-2 border-slate-900 text-slate-900"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {tab === "image"
            ? "Add a cropped image only — no copy, product, or buttons. It fills the homepage hero."
            : "Drag the list cards to set homepage order. Slide 1 plays first."}
        </p>
        <button
          type="button"
          onClick={() => startCreate(tab)}
          className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white"
        >
          {tab === "image" ? "Add image" : "Add slide"}
        </button>
      </div>

      {error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="mt-8 space-y-3">
        {visibleSlides.map((slide, index) => (
          <article
            key={slide.id}
            onDragOver={(event) => onDragOver(event, slide.id)}
            onDrop={(event) => event.preventDefault()}
            onDragEnd={() => persistOrder()}
            className={`flex overflow-hidden border bg-white transition-all ${
              dragId === slide.id ? "opacity-50" : "opacity-100"
            } ${overId === slide.id && dragId && dragId !== slide.id ? "border-sale" : "border-slate-200"}`}
          >
            <div
              draggable
              onDragStart={(event) => onDragStart(event, slide.id)}
              className="flex cursor-grab items-center px-2 text-slate-400 hover:bg-slate-50 hover:text-slate-900 active:cursor-grabbing"
              aria-label={`Drag to reorder ${tab === "image" ? "image" : "slide"} ${index + 1}`}
            >
              <GripVertical size={18} />
            </div>
            <div
              className={`relative shrink-0 bg-sand ${
                tab === "image"
                  ? "h-[88px] w-[160px] sm:h-[104px] sm:w-[184px]"
                  : "h-[112px] w-[84px] sm:h-[128px] sm:w-[96px]"
              }`}
            >
              {slide.video ? (
                <video src={slide.video} className="absolute inset-0 h-full w-full object-cover" muted />
              ) : slide.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={slide.image} alt={slide.alt} className="absolute inset-0 h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="flex min-w-0 flex-1 items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[10px] text-slate-500 uppercase">
                  {tab === "image" ? `Image ${index + 1}` : `Slide ${index + 1}`}
                  {slide.is_published ? " · Live" : " · Hidden"}
                </p>
                {tab === "image" ? (
                  <h3 className="mt-1 truncate text-lg font-semibold leading-tight text-slate-900">
                    {slide.alt || "Hero image"}
                  </h3>
                ) : (
                  <>
                    <h3 className="font-semibold mt-1 truncate text-xl leading-tight text-slate-900">
                      {slide.heading}{" "}
                      <em className="italic text-sale">{slide.heading_accent}</em>
                    </h3>
                    <p className="mt-1 truncate text-sm text-slate-500">
                      {products.find((item) => item.id === slide.product_id)?.name || slide.kicker || slide.description}
                    </p>
                  </>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(slide)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700"
                >
                  Edit
                </button>
                <button type="button" onClick={() => toggleSlide(slide)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700">
                  {slide.is_published ? "Hide" : "Show"}
                </button>
                <button type="button" onClick={() => setPendingDelete(slide)} className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600">
                  Delete
                </button>
              </div>
            </div>
          </article>
        ))}
        {!visibleSlides.length ? (
          <p className="border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
            {tab === "image"
              ? "No hero images yet. Add one, crop it to the hero frame, and publish."
              : "No slides yet. Add a slide to start the homepage hero."}
          </p>
        ) : null}
      </div>

      {open ? (
        <div className="fixed inset-0 z-[70] flex justify-end bg-slate-900/40" onClick={close}>
          <form
            onSubmit={onSubmit}
            onClick={(e) => e.stopPropagation()}
            className={`flex h-full w-full flex-col bg-white shadow-2xl ${
              form.kind === "image" ? "max-w-lg" : "max-w-xl"
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="font-semibold text-2xl">
                {form.kind === "image"
                  ? editing
                    ? "Edit hero image"
                    : "Add hero image"
                  : editing
                    ? "Edit slide"
                    : "New slide"}
              </h2>
              <button type="button" onClick={close} className="text-sm text-slate-500">
                Close
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
              <label className="block">
                <span className="text-sm font-medium text-slate-600">
                  {form.kind === "image" ? "Hero image · full frame crop" : "Image · 40% hero crop"}
                </span>
                <div className="mt-2">
                  <label
                    className={`relative flex cursor-pointer items-center justify-center overflow-hidden border border-dashed border-slate-300 bg-white ${
                      form.kind === "image" ? "aspect-[16/9]" : "aspect-[4/5]"
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {preview || form.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={preview || form.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="px-4 text-center text-sm text-slate-500">
                        {form.kind === "image"
                          ? "Upload a photo, then crop it to the homepage hero size"
                          : "Upload photo, then crop like Instagram"}
                      </span>
                    )}
                  </label>
                  <div className="mt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[11px] text-slate-900 uppercase underline underline-offset-4"
                    >
                      {preview || form.image ? "Change image" : "Choose image"}
                    </button>
                    {preview || form.image ? (
                      <button
                        type="button"
                        onClick={() => setCropSrc(preview || form.image)}
                        className="text-[11px] text-slate-900 uppercase underline underline-offset-4"
                      >
                        Recrop
                      </button>
                    ) : null}
                  </div>
                </div>
              </label>
              {form.kind === "image" ? (
                <Field
                  label="Alt text"
                  value={form.alt}
                  placeholder="Describe the hero image"
                  onChange={(v) => setForm({ ...form, alt: v })}
                />
              ) : (
                <>
              <label className="block text-sm">
                Optional video
                <input
                  type="file"
                  accept="video/*"
                  className="mt-2 block w-full"
                  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                />
              </label>
              <Field label="Kicker" value={form.kicker} onChange={(v) => setForm({ ...form, kicker: v })} />
              <Field label="Heading" value={form.heading} onChange={(v) => setForm({ ...form, heading: v })} />
              <Field
                label="Accent heading"
                value={form.heading_accent}
                onChange={(v) => setForm({ ...form, heading_accent: v })}
              />
              <label className="block">
                <span className="text-sm font-medium text-slate-600">Description</span>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="mt-2 w-full border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </label>
              <div className="border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Linked product</p>
                    <p className="mt-1 text-xs text-slate-900/55">
                      Shop now opens this product. Browse collection opens its collection.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPickedId(form.product_id);
                      setPickerOpen(true);
                    }}
                    className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700"
                  >
                    {form.product_id ? "Change" : "Select product"}
                  </button>
                </div>
                {(() => {
                  const linked = products.find((item) => item.id === form.product_id);
                  const linkedCollection = collections.find((item) => item.id === linked?.collection_id);
                  if (!linked) {
                    return <p className="mt-4 text-sm text-slate-500">No product selected yet.</p>;
                  }
                  const cover = linked.images?.[0]?.url;
                  return (
                    <div className="mt-4 flex items-center gap-3 border border-slate-200 p-3">
                      <div className="h-16 w-12 shrink-0 overflow-hidden bg-slate-100">
                        {cover ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={cover} alt="" className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">{linked.name}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {linkedCollection ? linkedCollection.name : "No collection"}
                        </p>
                      </div>
                      <button type="button" onClick={clearProduct} className="text-[11px] text-red-600 uppercase">
                        Remove
                      </button>
                    </div>
                  );
                })()}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Primary button" value={form.primary_cta_label} onChange={(v) => setForm({ ...form, primary_cta_label: v })} />
                <Field label="Secondary button" value={form.secondary_cta_label} onChange={(v) => setForm({ ...form, secondary_cta_label: v })} />
                <Field label="Sale tag" value={form.sale_tag_label} onChange={(v) => setForm({ ...form, sale_tag_label: v })} />
                <Field label="Sale value" value={form.sale_tag_value} onChange={(v) => setForm({ ...form, sale_tag_value: v })} />
              </div>

              <div className="border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Context labels</p>
                    <p className="mt-1 text-xs text-slate-900/55">Add any labels you want — price, off %, delivery, dates, and more.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        labels: [...(form.labels || []), newLabel({ sort_order: (form.labels?.length || 0) + 1 })],
                      })
                    }
                    className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700"
                  >
                    Add label
                  </button>
                </div>
                <div className="mt-4 space-y-3">
                  {(form.labels || []).map((item, index) => (
                    <div key={item.id} className="grid grid-cols-[1fr_1fr_auto] gap-2 border border-slate-200 p-3">
                      <Field
                        label="Label"
                        value={item.label}
                        placeholder="Price"
                        onChange={(v) =>
                          setForm({
                            ...form,
                            labels: (form.labels || []).map((label, i) =>
                              i === index
                                ? { ...label, label: v, strike: /^was$/i.test(v) ? true : label.strike }
                                : label,
                            ),
                          })
                        }
                      />
                      <Field
                        label="Value"
                        value={item.value}
                        placeholder="Rs. 4,500"
                        onChange={(v) =>
                          setForm({
                            ...form,
                            labels: (form.labels || []).map((label, i) => (i === index ? { ...label, value: v } : label)),
                          })
                        }
                      />
                      <div className="flex flex-col items-end justify-between pt-6">
                        <label className="flex items-center gap-1.5 text-[11px] uppercase">
                          <input
                            type="checkbox"
                            checked={item.accent}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                labels: (form.labels || []).map((label, i) =>
                                  i === index ? { ...label, accent: e.target.checked } : label,
                                ),
                              })
                            }
                          />
                          Red
                        </label>
                        <label className="flex items-center gap-1.5 text-[11px] uppercase">
                          <input
                            type="checkbox"
                            checked={item.strike}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                labels: (form.labels || []).map((label, i) =>
                                  i === index ? { ...label, strike: e.target.checked } : label,
                                ),
                              })
                            }
                          />
                          Strike
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            setForm({
                              ...form,
                              labels: (form.labels || []).filter((_, i) => i !== index),
                            })
                          }
                          className="text-[11px] text-sale uppercase"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                  {!form.labels.length ? (
                    <p className="text-sm text-slate-500">No labels yet. Add price, sale %, delivery, or anything else.</p>
                  ) : null}
                </div>
              </div>
              <div className="border border-slate-200 bg-white p-4">
                <p className="text-sm font-medium text-slate-600">Sale on this slide</p>
                <p className="mt-1 text-xs text-slate-900/55">
                  SALE label stays on the form. Enable it to show on the homepage, and pick a sale for the timer.
                </p>
                <label className="mt-4 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.sale_badge_enabled}
                    onChange={(e) => setForm({ ...form, sale_badge_enabled: e.target.checked })}
                  />
                  Show SALE label
                </label>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Field
                    label="Label text"
                    value={form.sale_badge_text}
                    onChange={(v) => setForm({ ...form, sale_badge_text: v })}
                  />
                  <label className="block">
                    <span className="text-sm font-medium text-slate-600">Sale timer</span>
                    <select
                      value={form.sale_id}
                      onChange={(e) => setForm({ ...form, sale_id: e.target.value })}
                      className="mt-2 w-full border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                    >
                      <option value="">No timer</option>
                      {sales.map((sale) => (
                        <option key={sale.id} value={sale.id}>
                          {sale.name}
                          {sale.is_published ? "" : " (hidden)"}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.sale_tag_visible}
                  onChange={(e) => setForm({ ...form, sale_tag_visible: e.target.checked })}
                />
                Show image sale badge
              </label>
                </>
              )}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                />
                Published
              </label>
            </div>
            <div className="border-t border-slate-200 px-6 py-4">
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white disabled:opacity-60"
              >
                {saving ? "Saving…" : form.kind === "image" ? "Save image" : "Save slide"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <AdminConfirm
        open={Boolean(pendingDelete)}
        title={pendingDelete && slideKind(pendingDelete) === "image" ? "Delete this hero image?" : "Delete this slide?"}
        message={
          pendingDelete
            ? slideKind(pendingDelete) === "image"
              ? `“${pendingDelete.alt || "Hero image"}” will be removed from the homepage hero.`
              : `“${[pendingDelete.heading, pendingDelete.heading_accent].filter(Boolean).join(" ") || "Untitled slide"}” will be removed from the homepage hero.`
            : ""
        }
        busy={deleting}
        onCancel={() => {
          if (!deleting) setPendingDelete(null);
        }}
        onConfirm={confirmDeleteSlide}
      />

      {pickerOpen ? (
        <SaleProductPicker
          products={products}
          collections={collections}
          selectedProductIds={pickedId ? [pickedId] : []}
          selectedCollectionIds={[]}
          mode="single"
          kicker="Hero slide"
          title="Choose a product"
          description="Shop now opens this product. Browse collection opens its collection."
          confirmLabel="Use this product"
          onChange={(ids) => setPickedId(ids[0] || "")}
          onCancel={() => {
            setPickerOpen(false);
            setPickedId(form.product_id);
          }}
          onConfirm={() => {
            const product = products.find((item) => item.id === pickedId);
            if (product) applyProduct(product);
            setPickerOpen(false);
          }}
        />
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setCropSrc(URL.createObjectURL(file));
        }}
      />

      {cropSrc ? (
        <ImageCropperModal
          src={cropSrc}
          frame={form.kind === "image" ? "full" : "column"}
          title={form.kind === "image" ? "Crop hero image" : "Crop image"}
          hint={
            form.kind === "image"
              ? "This fills the full homepage hero. Drag and zoom until the frame is filled."
              : "Drag and zoom until the frame is filled."
          }
          onCancel={() => {
            setCropSrc("");
            if (fileInputRef.current) fileInputRef.current.value = "";
          }}
          onCropped={(file, previewUrl) => {
            setImageFile(file);
            setPreview(previewUrl);
            setCropSrc("");
            if (fileInputRef.current) fileInputRef.current.value = "";
          }}
        />
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
      />
    </label>
  );
}
