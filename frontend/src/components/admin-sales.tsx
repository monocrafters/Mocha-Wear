"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { API_URL, apiFetch } from "@/lib/api";
import type { Collection } from "@/components/admin-collections";
import type { Product } from "@/components/admin-products";
import { AdminConfirm } from "@/components/admin-confirm";
import { SaleProductPicker } from "@/components/sale-product-picker";
import { AdminListSkeleton } from "@/components/skeletons";

export type Sale = {
  id: string;
  name: string;
  headline: string;
  badge: string;
  discount_label: string;
  starts_at: string;
  ends_at: string;
  product_ids?: string[];
  collection_ids?: string[];
  is_published: boolean;
  created_at: string;
};

const emptyForm = {
  name: "",
  headline: "",
  badge: "SALE",
  discount_label: "",
  starts_at: "",
  ends_at: "",
  is_published: true,
};

function toLocalInput(iso: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function AdminSales() {
  const [items, setItems] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Sale | null>(null);
  const [creating, setCreating] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [detailsReady, setDetailsReady] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [productIds, setProductIds] = useState<string[]>([]);
  const [collectionIds, setCollectionIds] = useState<string[]>([]);
  const [pendingDelete, setPendingDelete] = useState<Sale | null>(null);
  const [deleting, setDeleting] = useState(false);

  const open = creating || Boolean(editing);
  const showForm = open && detailsReady && !pickerOpen;
  const selectedProducts = useMemo(
    () => products.filter((item) => productIds.includes(item.id)),
    [products, productIds],
  );

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [salesRes, productsRes, collectionsRes] = await Promise.all([
        apiFetch(`${API_URL}/api/admin/sales`, { credentials: "include" }),
        apiFetch(`${API_URL}/api/admin/products`, { credentials: "include" }),
        apiFetch(`${API_URL}/api/admin/collections`, { credentials: "include" }),
      ]);
      const salesData = await salesRes.json();
      const productsData = await productsRes.json();
      const collectionsData = await collectionsRes.json();
      if (!salesRes.ok) throw new Error(salesData.message || "Could not load sales");
      setItems(salesData.items || []);
      setProducts(productsData.items || []);
      setCollections(collectionsData.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load sales");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function startCreate() {
    const start = new Date();
    const end = new Date(start.getTime() + 14 * 86400000);
    setEditing(null);
    setCreating(true);
    setForm({
      ...emptyForm,
      starts_at: toLocalInput(start.toISOString()),
      ends_at: toLocalInput(end.toISOString()),
    });
    setProductIds([]);
    setCollectionIds([]);
    setDetailsReady(false);
    setPickerOpen(true);
    setError("");
  }

  function startEdit(item: Sale) {
    setCreating(false);
    setEditing(item);
    setForm({
      name: item.name,
      headline: item.headline,
      badge: item.badge,
      discount_label: item.discount_label,
      starts_at: toLocalInput(item.starts_at),
      ends_at: toLocalInput(item.ends_at),
      is_published: item.is_published,
    });
    setProductIds(item.product_ids || []);
    setCollectionIds(item.collection_ids || []);
    setDetailsReady(true);
    setPickerOpen(false);
    setError("");
  }

  function close() {
    setCreating(false);
    setEditing(null);
    setPickerOpen(false);
    setDetailsReady(false);
  }

  function closePicker() {
    setPickerOpen(false);
    if (creating && !detailsReady) {
      setCreating(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!productIds.length) {
      setError("Choose at least one product for this sale");
      setPickerOpen(true);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const url = editing ? `${API_URL}/api/admin/sales/${editing.id}` : `${API_URL}/api/admin/sales`;
      const res = await apiFetch(url, {
        method: editing ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          product_ids: productIds,
          collection_ids: collectionIds,
          starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : "",
          ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not save sale");
      close();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save sale");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(item: Sale) {
    await apiFetch(`${API_URL}/api/admin/sales/${item.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_published: !item.is_published }),
    });
    await load();
  }

  async function confirmRemove() {
    if (!pendingDelete) return;
    setDeleting(true);
    setError("");
    try {
      const res = await apiFetch(`${API_URL}/api/admin/sales/${pendingDelete.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not delete sale");
      setPendingDelete(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete sale");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return <AdminListSkeleton />;
  }

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">Pick the products first, then set the sale dates and copy.</p>
        <button
          type="button"
          onClick={startCreate}
          className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white"
        >
          Add sale
        </button>
      </div>

      {error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="mt-8 space-y-3">
        {items.map((item) => (
          <article key={item.id} className="flex items-center justify-between gap-4 border border-slate-200 bg-white px-4 py-4">
            <div className="min-w-0">
              <p className="text-[10px] text-slate-500 uppercase">
                {item.is_published ? "Live" : "Hidden"}
                {item.discount_label ? ` · ${item.discount_label}` : ""}
                {` · ${item.product_ids?.length || 0} products`}
              </p>
              <h3 className="font-semibold mt-1 truncate text-xl text-slate-900">{item.name}</h3>
              <p className="mt-1 text-sm text-slate-500">
                {item.ends_at ? `Ends ${new Date(item.ends_at).toLocaleString()}` : "No end date"}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button type="button" onClick={() => startEdit(item)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700">
                Edit
              </button>
              <button type="button" onClick={() => toggle(item)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700">
                {item.is_published ? "Hide" : "Show"}
              </button>
              <button type="button" onClick={() => setPendingDelete(item)} className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600">
                Delete
              </button>
            </div>
          </article>
        ))}
        {!items.length ? (
          <p className="border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
            No sales yet. Add one and choose the products it covers.
          </p>
        ) : null}
      </div>

      {showForm ? (
        <div className="fixed inset-0 z-[70] flex justify-end bg-slate-900/40" onClick={close}>
          <form
            onSubmit={onSubmit}
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="font-semibold text-2xl">{editing ? "Edit sale" : "New sale"}</h2>
              <button type="button" onClick={close} className="text-sm text-slate-500">
                Close
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-slate-600">Products on sale</span>
                  <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    className="text-sm font-medium text-blue-600"
                  >
                    {selectedProducts.length ? "Change" : "Choose products"}
                  </button>
                </div>
                {selectedProducts.length ? (
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {selectedProducts.slice(0, 8).map((product) => (
                      <span key={product.id} className="relative h-16 w-12 shrink-0 overflow-hidden bg-slate-100">
                        {product.images?.[0]?.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={product.images[0].url} alt="" className="h-full w-full object-cover" />
                        ) : null}
                      </span>
                    ))}
                    {selectedProducts.length > 8 ? (
                      <span className="grid h-16 w-12 shrink-0 place-items-center bg-slate-100 text-xs text-slate-500">
                        +{selectedProducts.length - 8}
                      </span>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">No products selected yet.</p>
                )}
                <p className="mt-2 text-xs text-slate-500">{selectedProducts.length} selected</p>
              </div>
              <label className="block">
                <span className="text-sm font-medium text-slate-600">Name</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-2 w-full border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  required
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-600">Headline</span>
                <input
                  value={form.headline}
                  onChange={(e) => setForm({ ...form, headline: e.target.value })}
                  className="mt-2 w-full border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm font-medium text-slate-600">Badge</span>
                  <input
                    value={form.badge}
                    onChange={(e) => setForm({ ...form, badge: e.target.value })}
                    className="mt-2 w-full border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-600">OFF badge</span>
                  <input
                    value={form.discount_label}
                    onChange={(e) => setForm({ ...form, discount_label: e.target.value })}
                    placeholder="50% OFF"
                    className="mt-2 w-full border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  />
                  <p className="mt-1.5 text-xs text-slate-500">Shows on every selected product card.</p>
                </label>
              </div>
              <label className="block">
                <span className="text-sm font-medium text-slate-600">Starts</span>
                <input
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                  className="mt-2 w-full border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-600">Ends</span>
                <input
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                  className="mt-2 w-full border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  required
                />
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
            <div className="border-t border-slate-200 px-6 py-4">
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save sale"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {pickerOpen ? (
        <SaleProductPicker
          products={products}
          collections={collections}
          selectedProductIds={productIds}
          selectedCollectionIds={collectionIds}
          confirmLabel={editing ? "Update products" : "Continue"}
          onChange={(nextProducts, nextCollections) => {
            setProductIds(nextProducts);
            setCollectionIds(nextCollections);
          }}
          onCancel={closePicker}
          onConfirm={() => {
            setDetailsReady(true);
            setPickerOpen(false);
          }}
        />
      ) : null}

      <AdminConfirm
        open={Boolean(pendingDelete)}
        title="Delete this sale?"
        message={pendingDelete ? `“${pendingDelete.name}” will be removed. Products will stay in the catalogue.` : ""}
        busy={deleting}
        onCancel={() => {
          if (!deleting) setPendingDelete(null);
        }}
        onConfirm={confirmRemove}
      />
    </div>
  );
}
