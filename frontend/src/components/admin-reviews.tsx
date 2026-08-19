"use client";

import { FormEvent, useEffect, useState } from "react";
import { API_URL, apiFetch } from "@/lib/api";
import type { Product } from "@/components/admin-products";
import { AdminConfirm } from "@/components/admin-confirm";

export type Review = {
  id: string;
  name: string;
  city: string;
  quote: string;
  rating: number;
  product_id: string;
  is_published: boolean;
  sort_order: number;
};

const emptyForm = {
  name: "",
  city: "",
  quote: "",
  rating: 5,
  product_id: "",
  is_published: true,
  sort_order: 0,
};

export function AdminReviews() {
  const [items, setItems] = useState<Review[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Review | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [pendingDelete, setPendingDelete] = useState<Review | null>(null);
  const [deleting, setDeleting] = useState(false);

  const open = creating || Boolean(editing);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [reviewsRes, productsRes] = await Promise.all([
        apiFetch(`${API_URL}/api/admin/reviews`, { credentials: "include" }),
        apiFetch(`${API_URL}/api/admin/products`, { credentials: "include" }),
      ]);
      const reviewsData = await reviewsRes.json();
      const productsData = await productsRes.json();
      if (!reviewsRes.ok) throw new Error(reviewsData.message || "Could not load reviews");
      setItems(reviewsData.items || []);
      setProducts(productsData.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load reviews");
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
    setError("");
  }

  function startEdit(item: Review) {
    setCreating(false);
    setEditing(item);
    setForm({
      name: item.name,
      city: item.city,
      quote: item.quote,
      rating: item.rating,
      product_id: item.product_id,
      is_published: item.is_published,
      sort_order: item.sort_order,
    });
    setError("");
  }

  function close() {
    setCreating(false);
    setEditing(null);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const url = editing ? `${API_URL}/api/admin/reviews/${editing.id}` : `${API_URL}/api/admin/reviews`;
      const res = await apiFetch(url, {
        method: editing ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not save review");
      close();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save review");
    } finally {
      setSaving(false);
    }
  }

  async function confirmRemove() {
    if (!pendingDelete) return;
    setDeleting(true);
    setError("");
    try {
      const res = await apiFetch(`${API_URL}/api/admin/reviews/${pendingDelete.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not delete review");
      setPendingDelete(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete review");
    } finally {
      setDeleting(false);
    }
  }

  function productName(id: string) {
    return products.find((item) => item.id === id)?.name || "";
  }

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {items.length} review{items.length === 1 ? "" : "s"}
        </p>
        <button
          type="button"
          onClick={startCreate}
          className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white"
        >
          Add review
        </button>
      </div>

      {error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      {loading ? (
        <p className="mt-10 text-sm text-slate-500">Loading reviews…</p>
      ) : items.length === 0 ? (
        <div className="mt-10 border border-dashed border-slate-200 bg-white px-6 py-16 text-center text-sm text-slate-500">
          No reviews yet. Add a customer note to show on the homepage.
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {items.map((item) => (
            <article key={item.id} className="border border-slate-200 bg-white px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-500 uppercase">
                    {item.is_published ? "Live" : "Hidden"} · {item.rating}/5
                    {item.city ? ` · ${item.city}` : ""}
                    {item.product_id ? ` · ${productName(item.product_id)}` : ""}
                  </p>
                  <h3 className="font-semibold mt-1 text-xl text-slate-900">{item.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">{item.quote}</p>
                </div>
                <div className="flex shrink-0 gap-2">
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
        <div className="fixed inset-0 z-[70] flex justify-end bg-slate-900/40" onClick={close}>
          <form
            onSubmit={onSubmit}
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="font-semibold text-2xl">{editing ? "Edit review" : "New review"}</h2>
              <button type="button" onClick={close} className="text-sm text-slate-500">
                Close
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
              <label className="block">
                <span className="text-sm font-medium text-slate-600">Name</span>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-2 w-full border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-600">City</span>
                <input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="Karachi"
                  className="mt-2 w-full border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm font-medium text-slate-600">Rating</span>
                  <select
                    value={form.rating}
                    onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
                    className="mt-2 w-full border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  >
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n} star{n === 1 ? "" : "s"}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-600">Product</span>
                  <select
                    value={form.product_id}
                    onChange={(e) => setForm({ ...form, product_id: e.target.value })}
                    className="mt-2 w-full border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="">None</option>
                    {products.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-medium text-slate-600">Review</span>
                <textarea
                  required
                  rows={5}
                  value={form.quote}
                  onChange={(e) => setForm({ ...form, quote: e.target.value })}
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

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                />
                Published on homepage
              </label>
            </div>

            <div className="border-t border-slate-200 px-6 py-4">
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save review"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <AdminConfirm
        open={Boolean(pendingDelete)}
        title="Delete this review?"
        message={pendingDelete ? `The review from “${pendingDelete.name}” will be removed from the homepage.` : ""}
        busy={deleting}
        onCancel={() => {
          if (!deleting) setPendingDelete(null);
        }}
        onConfirm={confirmRemove}
      />
    </div>
  );
}
