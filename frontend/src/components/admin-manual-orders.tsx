"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Check, Copy, FileDown, Link2, Plus, Trash2, X } from "lucide-react";
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
import { AdminListSkeleton } from "@/components/skeletons";

type DraftItem = { name: string; size: string; qty: string; price: string };

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

const emptyItem = (): DraftItem => ({ name: "", size: "", qty: "1", price: "" });

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
  items: [emptyItem()],
});

function tone(status: OrderStatus) {
  if (status === "processing") return "bg-amber-50 text-amber-800";
  if (status === "packed") return "bg-slate-100 text-slate-700";
  if (status === "shipped") return "bg-blue-50 text-blue-700";
  if (status === "delivered") return "bg-emerald-50 text-emerald-800";
  return "bg-red-50 text-red-700";
}

export function AdminManualOrders() {
  const [items, setItems] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | OrderStatus>("all");
  const [selected, setSelected] = useState<Order | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<DraftForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [shipOpen, setShipOpen] = useState(false);
  const [courier, setCourier] = useState("");
  const [dispatchId, setDispatchId] = useState("");
  const [copied, setCopied] = useState(false);

  async function load() {
    setError("");
    try {
      const res = await apiFetch(`${API_URL}/api/admin/orders`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not load orders");
      const manual = ((data.items || []) as Order[]).filter((order) => order.source === "manual");
      setItems(manual);
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

  async function createOrder(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const lineItems = form.items
        .map((item) => ({
          name: item.name.trim(),
          size: item.size.trim(),
          qty: Math.max(1, Math.min(10, Number(item.qty) || 1)),
          price: Math.max(0, Number(item.price) || 0),
          image: "",
          spec: "",
        }))
        .filter((item) => item.name);
      if (!lineItems.length) throw new Error("Add at least one item");

      const res = await apiFetch(`${API_URL}/api/admin/orders`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not create order");
      const order = data.item as Order;
      setForm(emptyForm());
      setCreateOpen(false);
      setMessage(`Order ${order.id} created`);
      setSelected(order);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create order");
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
            WhatsApp / Instagram orders — fill details, share the track link, then dispatch with ID.
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
            onClick={() => {
              setCreateOpen(true);
              setForm(emptyForm());
            }}
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

      {createOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/40 p-0 sm:place-items-center sm:p-4">
          <form
            onSubmit={(event) => void createOrder(event)}
            className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:max-w-2xl sm:rounded-2xl sm:p-6"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">New manual order</h2>
              <button type="button" onClick={() => setCreateOpen(false)} className="rounded p-1 text-slate-400 hover:bg-slate-50">
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
                <select
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                >
                  {PK_CITIES.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
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
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">Items</p>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, items: [...form.items, emptyItem()] })}
                  className="text-xs font-medium text-blue-700"
                >
                  + Add item
                </button>
              </div>
              <div className="mt-2 space-y-2">
                {form.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-[1fr_72px_72px_72px_36px] gap-2">
                    <input
                      required
                      value={item.name}
                      onChange={(e) => updateItem(index, { name: e.target.value })}
                      placeholder="Product / suit name"
                      className="rounded-lg border border-slate-200 px-2 py-2 text-sm"
                    />
                    <input
                      value={item.size}
                      onChange={(e) => updateItem(index, { size: e.target.value })}
                      placeholder="Size"
                      className="rounded-lg border border-slate-200 px-2 py-2 text-sm"
                    />
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={item.qty}
                      onChange={(e) => updateItem(index, { qty: e.target.value })}
                      className="rounded-lg border border-slate-200 px-2 py-2 text-sm"
                    />
                    <input
                      required
                      type="number"
                      min={0}
                      value={item.price}
                      onChange={(e) => updateItem(index, { price: e.target.value })}
                      placeholder="Price"
                      className="rounded-lg border border-slate-200 px-2 py-2 text-sm"
                    />
                    <button
                      type="button"
                      disabled={form.items.length === 1}
                      onClick={() =>
                        setForm({
                          ...form,
                          items: form.items.filter((_, i) => i !== index),
                        })
                      }
                      className="grid place-items-center rounded-lg border border-red-100 text-red-600 disabled:opacity-40"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button type="button" onClick={() => setCreateOpen(false)} className="flex-1 rounded-lg border py-2.5 text-sm font-medium">
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white disabled:opacity-60"
              >
                {saving ? "Creating…" : "Create order"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
