"use client";

import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import type { Collection } from "@/components/admin-collections";
import type { Product } from "@/components/admin-products";
import { formatPkr } from "@/lib/money";

export function SaleProductPicker({
  products,
  collections,
  selectedProductIds,
  selectedCollectionIds,
  confirmLabel = "Continue",
  mode = "multi",
  kicker = "New sale",
  title = "Choose products",
  description = "Select single pieces, or take a whole collection in one tap.",
  onChange,
  onCancel,
  onConfirm,
}: {
  products: Product[];
  collections: Collection[];
  selectedProductIds: string[];
  selectedCollectionIds: string[];
  confirmLabel?: string;
  mode?: "multi" | "single";
  kicker?: string;
  title?: string;
  description?: string;
  onChange: (productIds: string[], collectionIds: string[]) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [query, setQuery] = useState("");
  const selected = useMemo(() => new Set(selectedProductIds), [selectedProductIds]);
  const selectedCols = useMemo(() => new Set(selectedCollectionIds), [selectedCollectionIds]);

  const q = query.trim().toLowerCase();
  const visible = useMemo(() => {
    if (!q) return products;
    return products.filter((item) =>
      [item.name, item.code, item.fabric, item.color].filter(Boolean).join(" ").toLowerCase().includes(q),
    );
  }, [products, q]);

  const groups = useMemo(() => {
    const byId = new Map(collections.map((item) => [item.id, item]));
    const sections: { id: string; name: string; items: Product[] }[] = collections.map((collection) => ({
      id: collection.id,
      name: collection.name,
      items: visible.filter((item) => item.collection_id === collection.id),
    }));
    const unassigned = visible.filter((item) => !item.collection_id || !byId.has(item.collection_id));
    if (unassigned.length) sections.push({ id: "unassigned", name: "Unassigned", items: unassigned });
    return sections.filter((section) => section.items.length);
  }, [collections, visible]);

  function idsInCollection(collectionId: string) {
    return products.filter((item) => item.collection_id === collectionId).map((item) => item.id);
  }

  function syncCollections(productIds: string[]) {
    const set = new Set(productIds);
    return collections
      .filter((collection) => {
        const ids = idsInCollection(collection.id);
        return ids.length > 0 && ids.every((id) => set.has(id));
      })
      .map((collection) => collection.id);
  }

  function toggleProduct(product: Product) {
    if (mode === "single") {
      onChange(selected.has(product.id) ? [] : [product.id], []);
      return;
    }
    const next = selected.has(product.id)
      ? selectedProductIds.filter((id) => id !== product.id)
      : [...selectedProductIds, product.id];
    onChange(next, syncCollections(next));
  }

  function toggleCollection(collectionId: string) {
    const ids = idsInCollection(collectionId);
    if (!ids.length) return;
    const allOn = ids.every((id) => selected.has(id));
    const next = allOn
      ? selectedProductIds.filter((id) => !ids.includes(id))
      : [...new Set([...selectedProductIds, ...ids])];
    onChange(next, syncCollections(next));
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4" onClick={onCancel}>
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">{kicker}</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">{title}</h2>
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            </div>
            <button type="button" onClick={onCancel} className="text-sm text-slate-500 hover:text-slate-900">
              Close
            </button>
          </div>
          <label className="relative mt-4 block">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
            />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {!products.length ? (
            <p className="py-16 text-center text-sm text-slate-500">Upload products first, then select them here.</p>
          ) : !groups.length ? (
            <p className="py-16 text-center text-sm text-slate-500">No products match “{query}”.</p>
          ) : (
            <div className="space-y-8">
              {groups.map((group) => {
                const whole = group.id !== "unassigned" && idsInCollection(group.id).every((id) => selected.has(id));
                return (
                  <section key={group.id}>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">{group.name}</h3>
                        <p className="text-xs text-slate-500">
                          {group.items.filter((item) => selected.has(item.id)).length} of {group.items.length} selected
                        </p>
                      </div>
                      {mode === "multi" && group.id !== "unassigned" ? (
                        <button
                          type="button"
                          onClick={() => toggleCollection(group.id)}
                          className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                            whole || selectedCols.has(group.id)
                              ? "bg-slate-900 text-white"
                              : "border border-slate-200 text-slate-700 hover:border-slate-300"
                          }`}
                        >
                          {whole || selectedCols.has(group.id) ? "Collection selected" : "Select collection"}
                        </button>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                      {group.items.map((product) => {
                        const on = selected.has(product.id);
                        const cover = product.images?.[0]?.url;
                        return (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => toggleProduct(product)}
                            className={`overflow-hidden rounded-xl border text-left transition ${
                              on ? "border-slate-900 ring-1 ring-slate-900" : "border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <div className="relative aspect-[3/4] bg-slate-100">
                              {cover ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={cover} alt="" className="h-full w-full object-cover" />
                              ) : null}
                              <span
                                className={`absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full ${
                                  on ? "bg-slate-900 text-white" : "bg-white/90 text-transparent"
                                }`}
                              >
                                <Check size={14} />
                              </span>
                            </div>
                            <div className="p-2">
                              <p className="truncate text-sm font-medium text-slate-900">{product.name}</p>
                              <p className="mt-0.5 text-xs text-slate-500">{formatPkr(product.price)}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-6 py-4">
          <p className="text-sm text-slate-500">
            {mode === "single"
              ? selectedProductIds.length
                ? "1 product selected"
                : "Select one product"
              : `${selectedProductIds.length} product${selectedProductIds.length === 1 ? "" : "s"}${
                  selectedCollectionIds.length
                    ? ` · ${selectedCollectionIds.length} collection${selectedCollectionIds.length === 1 ? "" : "s"}`
                    : ""
                }`}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!selectedProductIds.length}
              onClick={onConfirm}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
