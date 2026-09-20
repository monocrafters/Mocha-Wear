"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Check, Copy, FileDown, Link2, Pencil, Plus, Trash2, X } from "lucide-react";
import { API_URL, apiFetch } from "@/lib/api";
import { formatPkr } from "@/lib/money";
import { PK_CITIES } from "@/lib/pk-cities";
import { printOrdersPdf } from "@/lib/order-pdf";
import {
  ORDER_STATUSES,
  orderDate,
  orderPlace,
  orderTotal,
  orderTrackUrl,
  statusCopy,
  type Order,
  type OrderStatus,
} from "@/lib/orders";
import type { Collection } from "@/components/admin-collections";
import type { Product } from "@/components/admin-products";
import { AdminConfirm } from "@/components/admin-confirm";
import { AdminListSkeleton } from "@/components/skeletons";
import { SaleProductPicker } from "@/components/sale-product-picker";

type DraftItem = {
  product_id: string;
  name: string;
  size: string;
  qty: string;
  price: string;
  image: string;
  slug: string;
  spec: string;
};

type DraftForm = {
  channel: string;
  name: string;
  phone: string;
  whatsapp: string;
  city: string;
  area: string;
  address: string;
  landmark: string;
  note: string;
  delivery: string;
  items: DraftItem[];
};

const CHANNELS = ["WhatsApp", "Instagram", "Phone", "Other"] as const;

const emptyForm = (): DraftForm => ({
  channel: "WhatsApp",
  name: "",
  phone: "",
  whatsapp: "",
  city: "Karachi",
  area: "",
  address: "",
  landmark: "",
  note: "",
  delivery: "0",
  items: [],
});

function productToDraft(product: Product, existing?: DraftItem): DraftItem {
  const sizes = product.sizes || [];
  const size =
    existing?.size && sizes.some((row) => row.toLowerCase() === existing.size.toLowerCase())
      ? existing.size
      : sizes[0] || existing?.size || "";
  return {
    product_id: product.id,
    name: product.name,
    size,
    qty: existing?.qty || "1",
    price: existing?.price || String(product.price || 0),
    image: product.images?.[0]?.url || "",
    slug: product.slug || "",
    spec: [product.fabric, product.color].filter(Boolean).join(" · "),
  };
}

function orderToForm(order: Order): DraftForm {
  return {
    channel: order.channel || "WhatsApp",
    name: order.customer?.name || "",
    phone: order.customer?.phone || "",
    whatsapp: order.customer?.whatsapp || "",
    city: order.customer?.city || order.city || "Karachi",
    area: order.customer?.area || "",
    address: order.customer?.address || "",
    landmark: order.customer?.landmark || "",
    note: order.note || "",
    delivery: String(order.delivery ?? 0),
    items: order.items.map((item) => ({
      product_id: item.product_id || "",
      name: item.name,
      size: item.size || "",
      qty: String(item.qty || 1),
      price: String(item.price || 0),
      image: item.image || "",
      slug: item.slug || "",
      spec: item.spec || "",
    })),
  };
}

function tone(status: OrderStatus) {
  if (status === "processing") return "bg-amber-50 text-amber-800";
  if (status === "packed") return "bg-slate-100 text-slate-700";
  if (status === "shipped") return "bg-blue-50 text-blue-700";
  if (status === "delivered") return "bg-emerald-50 text-emerald-800";
  return "bg-red-50 text-red-700";
}

export function AdminManualOrders() {
  const [items, setItems] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | OrderStatus>("all");
  const [selected, setSelected] = useState<Order | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DraftForm>(emptyForm);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerIds, setPickerIds] = useState<string[]>([]);
  const [pickerCollectionIds, setPickerCollectionIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Order | null>(null);
  const [shipOpen, setShipOpen] = useState(false);
  const [courier, setCourier] = useState("");
  const [dispatchId, setDispatchId] = useState("");
  const [copied, setCopied] = useState(false);

  const productsById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);

  async function load() {
    setError("");
    try {
      const [ordersRes, productsRes, collectionsRes] = await Promise.all([
        apiFetch(`${API_URL}/api/admin/orders`, { credentials: "include" }),
        apiFetch(`${API_URL}/api/admin/products`, { credentials: "include" }),
        apiFetch(`${API_URL}/api/admin/collections`, { credentials: "include" }),
      ]);
      const ordersData = await ordersRes.json();
      const productsData = await productsRes.json();
      const collectionsData = await collectionsRes.json();
      if (!ordersRes.ok) throw new Error(ordersData.message || "Could not load orders");
      if (!productsRes.ok) throw new Error(productsData.message || "Could not load products");
      if (!collectionsRes.ok) throw new Error(collectionsData.message || "Could not load collections");

      const manual = ((ordersData.items || []) as Order[]).filter((order) => order.source === "manual");
      setItems(manual);
      setProducts((productsData.items || []) as Product[]);
      setCollections((collectionsData.items || []) as Collection[]);
      setSelected((current) => (current ? manual.find((row) => row.id === current.id) || null : null));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    setShipOpen(false);
    setCourier(selected?.courier || "");
    setDispatchId(selected?.dispatch_id || "");
    setCopied(false);
  }, [selected]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((order) => {
      if (filter !== "all" && order.status !== filter) return false;
      if (!q) return true;
      const blob = [
        order.id,
        order.channel,
        order.customer?.name,
        order.customer?.phone,
        order.city,
        order.note,
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [items, query, filter]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setFormOpen(true);
    setPickerOpen(false);
  }

  function openEdit(order: Order) {
    setEditingId(order.id);
    setForm(orderToForm(order));
    setFormOpen(true);
    setPickerOpen(false);
    setSelected(order);
  }

  function openPicker() {
    const ids = form.items.map((item) => item.product_id).filter(Boolean);
    setPickerIds(ids);
    setPickerCollectionIds([]);
    setPickerOpen(true);
  }

  function applyPickerSelection() {
    const existing = new Map(form.items.filter((item) => item.product_id).map((item) => [item.product_id, item]));
    const nextItems = pickerIds
      .map((id) => {
        const product = productsById.get(id);
        if (!product) return null;
        return productToDraft(product, existing.get(id));
      })
      .filter((item): item is DraftItem => Boolean(item));
    setForm((current) => ({ ...current, items: nextItems }));
    setPickerOpen(false);
  }

  function buildLineItems() {
    return form.items
      .map((item) => ({
        product_id: item.product_id,
        name: item.name.trim(),
        size: item.size.trim(),
        qty: Math.max(1, Math.min(10, Number(item.qty) || 1)),
        price: Math.max(0, Number(item.price) || 0),
        image: item.image,
        slug: item.slug,
        spec: item.spec,
      }))
      .filter((item) => item.name);
  }

  function buildPayload(lineItems: ReturnType<typeof buildLineItems>) {
    return {
      channel: form.channel,
      note: form.note.trim(),
      delivery: Math.max(0, Number(form.delivery) || 0),
      payment: "Cash on delivery",
      customer: {
        name: form.name.trim(),
        phone: form.phone.trim(),
        whatsapp: (form.whatsapp || form.phone).trim(),
        city: form.city.trim(),
        area: form.area.trim(),
        address: form.address.trim(),
        landmark: form.landmark.trim(),
      },
      items: lineItems,
    };
  }

  async function submitOrder(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const lineItems = buildLineItems();
      if (!lineItems.length) throw new Error("Select at least one product");

      const payload = buildPayload(lineItems);
      const res = await apiFetch(
        editingId ? `${API_URL}/api/admin/orders/${encodeURIComponent(editingId)}` : `${API_URL}/api/admin/orders`,
        {
          method: editingId ? "PATCH" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || (editingId ? "Could not update order" : "Could not create order"));
      const order = data.item as Order;
      setForm(emptyForm());
      setFormOpen(false);
      setEditingId(null);
      setMessage(editingId ? `Order ${order.id} updated` : `Order ${order.id} created`);
      setSelected(order);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save order");
    } finally {
      setSaving(false);
    }
  }

  async function patchOrder(id: string, body: Record<string, unknown>) {
    setSaving(true);
    setError("");
    try {
      const res = await apiFetch(`${API_URL}/api/admin/orders/${encodeURIComponent(id)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not update order");
      const order = data.item as Order;
      setItems((list) => list.map((row) => (row.id === order.id ? order : row)));
      setSelected(order);
      setMessage(`Updated ${order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update order");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    setError("");
    try {
      const res = await apiFetch(`${API_URL}/api/admin/orders/${encodeURIComponent(pendingDelete.id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not delete order");
      setMessage(`Deleted ${pendingDelete.id}`);
      setItems((list) => list.filter((row) => row.id !== pendingDelete.id));
      if (selected?.id === pendingDelete.id) setSelected(null);
      if (editingId === pendingDelete.id) {
        setFormOpen(false);
        setEditingId(null);
      }
      setPendingDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete order");
    } finally {
      setDeleting(false);
    }
  }

  async function confirmDispatch() {
    if (!selected) return;
    if (!courier.trim() || !dispatchId.trim()) {
      setError("Courier and Dispatch ID are required");
      return;
    }
    await patchOrder(selected.id, {
      status: "shipped",
      courier: courier.trim(),
      dispatch_id: dispatchId.trim(),
    });
    setShipOpen(false);
  }

  async function copyTrackLink(order: Order) {
    const url = orderTrackUrl(order.id);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setMessage("Track link copied");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Could not copy link");
    }
  }

  function updateItem(index: number, patch: Partial<DraftItem>) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  }

  if (loading) return <AdminListSkeleton rows={6} />;

  return (
    <div className="space-y-4">
      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {message ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-600">
            WhatsApp / Instagram orders — pick products from catalogue, share the track link, then dispatch.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => printOrdersPdf(visible, "Mocha Wear — Manual Orders")}
            disabled={!visible.length}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
          >
            <FileDown size={14} />
            PDF all
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white"
          >
            <Plus size={14} />
            New manual order
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, phone, order id…"
          className="min-w-[200px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as "all" | OrderStatus)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="all">All statuses</option>
          {ORDER_STATUSES.map((row) => (
            <option key={row.id} value={row.id}>
              {row.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {visible.length ? (
            <div className="divide-y divide-slate-100">
              {visible.map((order) => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => setSelected(order)}
                  className={`flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50 ${
                    selected?.id === order.id ? "bg-slate-50" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{order.id}</p>
                    <p className="truncate text-sm text-slate-600">{order.customer?.name}</p>
                    <p className="text-xs text-slate-500">
                      {order.channel || "Manual"} · {orderDate(order)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${tone(order.status)}`}>
                      {statusCopy(order.status).label}
                    </span>
                    <p className="mt-1 text-sm font-medium text-slate-900">{formatPkr(orderTotal(order))}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="px-4 py-16 text-center text-sm text-slate-500">No manual orders yet.</p>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          {selected ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-semibold text-slate-900">{selected.id}</p>
                  <p className="text-xs text-slate-500">
                    {selected.channel || "Manual"} · {orderDate(selected)}
                  </p>
                </div>
                <button type="button" onClick={() => setSelected(null)} className="rounded p-1 text-slate-400 hover:bg-slate-50">
                  <X size={16} />
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(selected)}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700"
                >
                  <Pencil size={12} />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDelete(selected)}
                  className="inline-flex items-center gap-1 rounded-md border border-red-100 bg-white px-2.5 py-1.5 text-xs font-medium text-red-700"
                >
                  <Trash2 size={12} />
                  Delete
                </button>
              </div>

              <div className="rounded-lg border border-emerald-100 bg-emerald-50/70 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800">Customer track link</p>
                <p className="mt-1 break-all text-xs text-slate-700">{orderTrackUrl(selected.id)}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void copyTrackLink(selected)}
                    className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-white px-2.5 py-1.5 text-xs font-medium text-emerald-800"
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? "Copied" : "Copy link"}
                  </button>
                  <a
                    href={orderTrackUrl(selected.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-white px-2.5 py-1.5 text-xs font-medium text-emerald-800"
                  >
                    <Link2 size={12} />
                    Open
                  </a>
                  <button
                    type="button"
                    onClick={() => printOrdersPdf([selected], `Order ${selected.id}`)}
                    className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-white px-2.5 py-1.5 text-xs font-medium text-emerald-800"
                  >
                    <FileDown size={12} />
                    PDF
                  </button>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Status</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {ORDER_STATUSES.filter((row) => row.id !== "cancelled").map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      disabled={saving}
                      onClick={() => {
                        if (row.id === "shipped") {
                          setShipOpen(true);
                          return;
                        }
                        void patchOrder(selected.id, { status: row.id });
                      }}
                      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${
                        selected.status === row.id ? tone(row.id) : "border border-slate-200 text-slate-600"
                      }`}
                    >
                      {row.label}
                    </button>
                  ))}
                </div>
              </div>

              {shipOpen ? (
                <div className="space-y-2 rounded-lg border border-blue-100 bg-blue-50/60 p-3">
                  <p className="text-xs font-medium text-blue-900">Dispatch requires courier + ID</p>
                  <input
                    value={courier}
                    onChange={(e) => setCourier(e.target.value)}
                    placeholder="Courier e.g. TCS"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                  <input
                    value={dispatchId}
                    onChange={(e) => setDispatchId(e.target.value)}
                    placeholder="Dispatch / tracking ID"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShipOpen(false)} className="flex-1 rounded-lg border py-2 text-sm">
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void confirmDispatch()}
                      className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white disabled:opacity-60"
                    >
                      Dispatch
                    </button>
                  </div>
                </div>
              ) : null}

              {(selected.courier || selected.dispatch_id) && (
                <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <p>Courier: {selected.courier || "—"}</p>
                  <p>Dispatch ID: {selected.dispatch_id || "—"}</p>
                </div>
              )}

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Customer</p>
                <p className="mt-1 font-medium text-slate-900">{selected.customer?.name}</p>
                <p className="text-sm text-slate-600">{selected.customer?.phone}</p>
                <p className="text-sm text-slate-600">{orderPlace(selected)}</p>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Items</p>
                <ul className="mt-1 space-y-1 text-sm">
                  {selected.items.map((item, index) => (
                    <li key={`${item.name}-${index}`} className="flex justify-between gap-2">
                      <span>
                        {item.name}
                        {item.size ? ` · ${item.size}` : ""} × {item.qty}
                      </span>
                      <span>{formatPkr(item.price * item.qty)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-right text-sm font-semibold">{formatPkr(orderTotal(selected))}</p>
              </div>

              {selected.note ? (
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <span className="font-medium">Note:</span> {selected.note}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="py-16 text-center text-sm text-slate-500">Select an order to see the track link and dispatch.</p>
          )}
        </div>
      </div>

      {formOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/40 p-0 sm:place-items-center sm:p-4">
          <form
            onSubmit={(event) => void submitOrder(event)}
            className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:max-w-2xl sm:rounded-2xl sm:p-6"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">{editingId ? "Edit manual order" : "New manual order"}</h2>
              <button
                type="button"
                onClick={() => {
                  setFormOpen(false);
                  setEditingId(null);
                }}
                className="rounded p-1 text-slate-400 hover:bg-slate-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm sm:col-span-2">
                <span className="font-medium text-slate-700">Channel</span>
                <select
                  value={form.channel}
                  onChange={(e) => setForm({ ...form, channel: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                >
                  {CHANNELS.map((channel) => (
                    <option key={channel} value={channel}>
                      {channel}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Customer name</span>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Mobile (03…)</span>
                <input
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">WhatsApp</span>
                <input
                  value={form.whatsapp}
                  onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                  placeholder="Same as mobile if empty"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">City</span>
                <input
                  required
                  list="manual-order-cities"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="Pick or type any city"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                />
                <datalist id="manual-order-cities">
                  {PK_CITIES.map((city) => (
                    <option key={city} value={city} />
                  ))}
                </datalist>
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Area</span>
                <input
                  required
                  value={form.area}
                  onChange={(e) => setForm({ ...form, area: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="font-medium text-slate-700">Address</span>
                <textarea
                  required
                  rows={2}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Landmark</span>
                <input
                  value={form.landmark}
                  onChange={(e) => setForm({ ...form, landmark: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Delivery fee</span>
                <input
                  type="number"
                  min={0}
                  value={form.delivery}
                  onChange={(e) => setForm({ ...form, delivery: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="font-medium text-slate-700">Internal note</span>
                <textarea
                  rows={2}
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="Instagram handle, colour, special request…"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                />
              </label>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">Products</p>
                <button
                  type="button"
                  onClick={openPicker}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50"
                >
                  {form.items.length ? "Change products" : "Select products"}
                </button>
              </div>

              {form.items.length ? (
                <div className="mt-2 space-y-2">
                  {form.items.map((item, index) => {
                    const product = item.product_id ? productsById.get(item.product_id) : undefined;
                    const sizes = product?.sizes?.length ? product.sizes : item.size ? [item.size] : [];
                    return (
                      <div
                        key={`${item.product_id || item.name}-${index}`}
                        className="grid grid-cols-[1fr_88px_72px_36px] items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/60 p-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">{item.name}</p>
                          <p className="text-xs text-slate-500">{formatPkr(Number(item.price) || 0)}</p>
                        </div>
                        {sizes.length ? (
                          <select
                            value={item.size}
                            onChange={(e) => updateItem(index, { size: e.target.value })}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm"
                          >
                            {sizes.map((size) => (
                              <option key={size} value={size}>
                                {size}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            value={item.size}
                            onChange={(e) => updateItem(index, { size: e.target.value })}
                            placeholder="Size"
                            className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm"
                          />
                        )}
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={item.qty}
                          onChange={(e) => updateItem(index, { qty: e.target.value })}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setForm({
                              ...form,
                              items: form.items.filter((_, i) => i !== index),
                            })
                          }
                          className="grid place-items-center rounded-lg border border-red-100 bg-white text-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-3 rounded-lg border border-dashed border-slate-200 px-3 py-8 text-center text-sm text-slate-500">
                  Open the product picker and select one or more suits from the catalogue.
                </p>
              )}
            </div>

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setFormOpen(false);
                  setEditingId(null);
                }}
                className="flex-1 rounded-lg border py-2.5 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !form.items.length}
                className="flex-1 rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white disabled:opacity-60"
              >
                {saving ? "Saving…" : editingId ? "Save changes" : "Create order"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {pickerOpen ? (
        <SaleProductPicker
          products={products}
          collections={collections}
          selectedProductIds={pickerIds}
          selectedCollectionIds={pickerCollectionIds}
          kicker="Manual order"
          title="Select products"
          description="Pick one or more products from the catalogue. You can adjust size and quantity after."
          confirmLabel={form.items.length ? "Update selection" : "Add products"}
          onChange={(nextProducts, nextCollections) => {
            setPickerIds(nextProducts);
            setPickerCollectionIds(nextCollections);
          }}
          onCancel={() => setPickerOpen(false)}
          onConfirm={applyPickerSelection}
        />
      ) : null}

      <AdminConfirm
        open={Boolean(pendingDelete)}
        title="Delete this manual order?"
        message={
          pendingDelete
            ? `${pendingDelete.id} for ${pendingDelete.customer?.name || "customer"} will be permanently removed.`
            : ""
        }
        busy={deleting}
        onCancel={() => {
          if (!deleting) setPendingDelete(null);
        }}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
