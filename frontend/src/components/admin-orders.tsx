"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { API_URL, apiFetch } from "@/lib/api";
import { formatPkr } from "@/lib/money";
import {
  ADMIN_CANCEL_REASONS,
  ORDER_STATUSES,
  cancelReasonText,
  orderDate,
  orderPlace,
  orderTotal,
  statusCopy,
  type Order,
  type OrderStatus,
} from "@/lib/orders";
import { AdminListSkeleton, AdminStatsSkeleton } from "@/components/skeletons";

function adminTone(status: OrderStatus) {
  if (status === "processing") return "bg-amber-50 text-amber-800";
  if (status === "packed") return "bg-slate-100 text-slate-700";
  if (status === "shipped") return "bg-blue-50 text-blue-700";
  if (status === "delivered") return "bg-emerald-50 text-emerald-800";
  return "bg-red-50 text-red-700";
}

type Stats = {
  total: number;
  processing: number;
  packed: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  revenue: number;
  pieces: number;
};

const emptyStats: Stats = {
  total: 0,
  processing: 0,
  packed: 0,
  shipped: 0,
  delivered: 0,
  cancelled: 0,
  revenue: 0,
  pieces: 0,
};

export function AdminOrders() {
  const [items, setItems] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | OrderStatus>("all");
  const [selected, setSelected] = useState<Order | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelDetail, setCancelDetail] = useState("");

  async function load() {
    setError("");
    try {
      const res = await apiFetch(`${API_URL}/api/admin/orders`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not load orders");
      setItems(data.items || []);
      setStats(data.stats || emptyStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setNote(selected?.note || "");
    setCancelOpen(false);
    setCancelReason("");
    setCancelDetail("");
  }, [selected]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((order) => {
      if (filter !== "all" && order.status !== filter) return false;
      if (!q) return true;
      const blob = [
        order.id,
        order.city,
        order.customer?.name,
        order.customer?.phone,
        order.customer?.whatsapp,
        order.customer?.area,
        ...order.items.map((item) => item.name),
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [items, query, filter]);

  async function setStatus(order: Order, status: OrderStatus) {
    if (status === "cancelled") {
      if (order.status !== "cancelled") setCancelOpen(true);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await apiFetch(`${API_URL}/api/admin/orders/${order.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not update order");
      setSelected(data.item);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update order");
    } finally {
      setSaving(false);
    }
  }

  async function confirmAdminCancel() {
    if (!selected) return;
    if (!cancelReason) {
      setError("Choose a cancel reason");
      return;
    }
    if (cancelReason === "Other" && !cancelDetail.trim()) {
      setError("Write a short reason in Other");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await apiFetch(`${API_URL}/api/admin/orders/${selected.id}/cancel`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason, detail: cancelDetail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not cancel order");
      setSelected(data.item);
      setCancelOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel order");
    } finally {
      setSaving(false);
    }
  }

  async function saveNote(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      const res = await apiFetch(`${API_URL}/api/admin/orders/${selected.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not save note");
      setSelected(data.item);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save note");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div>
        <AdminStatsSkeleton count={6} />
        <AdminListSkeleton />
      </div>
    );
  }

  const cards = [
    { label: "Orders", value: String(stats.total) },
    { label: "Processing", value: String(stats.processing) },
    { label: "Packed", value: String(stats.packed) },
    { label: "Shipped", value: String(stats.shipped) },
    { label: "Delivered", value: String(stats.delivered) },
    { label: "Revenue", value: formatPkr(stats.revenue) },
  ];

  return (
    <div className="mt-8">
      {error ? <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-3 lg:hidden">
        {cards.map((card) => (
          <div key={card.label} className="min-w-[120px] shrink-0 border border-slate-200 bg-white px-3 py-3">
            <p className="text-[9px] text-slate-500 uppercase">{card.label}</p>
            <p className="font-semibold mt-1 text-xl leading-none text-slate-900">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-6 hidden grid-cols-3 gap-4 xl:grid-cols-6 lg:grid">
        {cards.map((card) => (
          <article key={card.label} className="border border-slate-200 bg-white px-4 py-5">
            <p className="text-[11px] text-slate-500 uppercase">{card.label}</p>
            <p className="font-semibold mt-2 text-2xl text-slate-900 xl:text-3xl">{card.value}</p>
          </article>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, phone, city, order ID"
          className="w-full border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 sm:max-w-sm"
        />
        <p className="text-[11px] text-slate-500 uppercase">
          {visible.length} shown · {stats.pieces} pieces
        </p>
      </div>

      <div className="hide-scrollbar mt-4 flex gap-2 overflow-x-auto">
        {[{ id: "all" as const, label: "All" }, ...ORDER_STATUSES].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={`shrink-0 px-3.5 py-1.5 text-[10px] font-semibold uppercase ${
              filter === item.id ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-900"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2 lg:hidden">
        {visible.map((order) => (
          <button
            key={order.id}
            type="button"
            onClick={() => setSelected(order)}
            className="flex w-full items-start justify-between gap-3 bg-white px-4 py-3 text-left"
          >
            <div className="min-w-0">
              <p className="text-[10px] text-slate-500 uppercase">{order.id}</p>
              {order.reseller_code ? (
                <p className="mt-0.5 text-[10px] font-medium tracking-wide text-amber-700 uppercase">
                  Reseller /r/{order.reseller_code}
                </p>
              ) : (
                <p className="mt-0.5 text-[10px] text-slate-400 uppercase">Direct</p>
              )}
              <p className="mt-0.5 truncate text-sm font-medium text-slate-900">
                {order.customer?.name || "Customer"}
              </p>
              <p className="mt-0.5 truncate text-[12px] text-slate-500">
                {orderDate(order)} · {orderPlace(order) || order.city}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${adminTone(order.status)}`}>
                {statusCopy(order.status).label}
              </span>
              <p className="mt-2 text-sm font-medium text-slate-900">{formatPkr(orderTotal(order))}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-4 hidden overflow-x-auto border border-slate-200 bg-white lg:block">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-slate-200 text-[10px] text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">City</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((order) => (
              <tr key={order.id} className="border-b border-slate-200 last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{order.id}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {order.reseller_code ? `Reseller /r/${order.reseller_code}` : "Direct"}
                    {order.commission_total ? ` · ${formatPkr(order.commission_total)} commission` : ""}
                  </p>
                  <p className="text-[12px] text-slate-500">{orderDate(order)}</p>
                </td>
                <td className="px-4 py-3">
                  <p>{order.customer?.name || "—"}</p>
                  <p className="text-[12px] text-slate-500">{order.customer?.phone}</p>
                </td>
                <td className="px-4 py-3">{orderPlace(order) || order.city || "—"}</td>
                <td className="px-4 py-3 font-medium">{formatPkr(orderTotal(order))}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${adminTone(order.status)}`}>
                    {statusCopy(order.status).label}
                  </span>
                  {order.status === "cancelled" && cancelReasonText(order) ? (
                    <p className="mt-1 max-w-[180px] truncate text-[11px] text-slate-500">{cancelReasonText(order)}</p>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => setSelected(order)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700"
                  >
                    Open
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!visible.length ? (
        <p className="mt-4 border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
          No orders match this view yet.
        </p>
      ) : null}

      {selected ? (
        <div className="fixed inset-0 z-[70] flex justify-end bg-slate-900/40" onClick={() => setSelected(null)}>
          <aside
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-[10px] text-slate-500 uppercase">Order</p>
                <h2 className="font-semibold text-2xl text-slate-900">{selected.id}</h2>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="text-sm text-slate-500">
                Close
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase">Status</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {ORDER_STATUSES.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      disabled={saving || (selected.status === "delivered" && item.id === "cancelled")}
                      onClick={() => setStatus(selected, item.id)}
                      className={`px-3 py-1.5 text-[10px] font-semibold uppercase disabled:opacity-60 ${
                        selected.status === item.id
                          ? item.id === "cancelled"
                            ? "bg-red-600 text-white"
                            : "bg-slate-900 text-white"
                          : "border border-slate-200 text-slate-900"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                {selected.status === "cancelled" ? (
                  <div className="mt-4 border border-red-100 bg-red-50 px-3 py-3">
                    <p className="text-[10px] font-semibold tracking-[0.14em] text-red-700 uppercase">Cancelled</p>
                    <p className="mt-1 text-sm text-slate-800">
                      {cancelReasonText(selected) || "This order was cancelled."}
                    </p>
                    <p className="mt-1 text-[12px] text-slate-500">
                      By {selected.cancelled_by === "customer" ? "customer" : "admin"}
                    </p>
                  </div>
                ) : selected.status !== "delivered" ? (
                  <button
                    type="button"
                    onClick={() => setCancelOpen(true)}
                    className="mt-4 w-full rounded-lg bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-700"
                  >
                    Cancel order
                  </button>
                ) : null}
                {cancelOpen ? (
                  <div className="mt-4 border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase">Cancel reason</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {ADMIN_CANCEL_REASONS.map((reason) => (
                        <button
                          key={reason}
                          type="button"
                          onClick={() => setCancelReason(reason)}
                          className={`px-3 py-1.5 text-[10px] font-semibold uppercase ${
                            cancelReason === reason
                              ? "bg-red-600 text-white"
                              : "border border-slate-200 bg-white text-slate-700"
                          }`}
                        >
                          {reason}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={cancelDetail}
                      onChange={(e) => setCancelDetail(e.target.value)}
                      rows={3}
                      placeholder={
                        cancelReason === "Other"
                          ? "Write the reason"
                          : "Optional note — stock out, location, or extra detail"
                      }
                      className="mt-3 w-full border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                    />
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => setCancelOpen(false)}
                        className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={confirmAdminCancel}
                        className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-medium text-white disabled:opacity-60"
                      >
                        {saving ? "Cancelling…" : "Cancel order"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase">Customer</p>
                <p className="mt-2 text-sm font-medium text-slate-900">{selected.customer?.name}</p>
                <p className="mt-1 text-sm text-slate-500">{selected.customer?.phone}</p>
                {selected.customer?.whatsapp && selected.customer.whatsapp !== selected.customer.phone ? (
                  <p className="text-sm text-slate-500">WhatsApp {selected.customer.whatsapp}</p>
                ) : null}
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {[selected.customer?.address, selected.customer?.area, selected.city || selected.customer?.city, selected.customer?.landmark]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {selected.customer?.phone ? (
                    <a
                      href={`https://wa.me/92${selected.customer.phone.replace(/\D/g, "").replace(/^0/, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-semibold text-[#128C7E] uppercase"
                    >
                      WhatsApp
                    </a>
                  ) : null}
                  {selected.customer_id ? (
                    <a
                      href={`/admin/customers/${selected.customer_id}`}
                      className="text-[11px] font-semibold text-blue-600 uppercase"
                    >
                      Customer page
                    </a>
                  ) : null}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase">Pieces</p>
                <div className="mt-3 space-y-3">
                  {selected.items.map((item, index) => (
                    <div key={`${selected.id}-${item.product_id || item.slug || item.name}-${item.size || ""}-${index}`} className="flex gap-3">
                      <div className="h-16 w-12 shrink-0 overflow-hidden bg-sand">
                        {item.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.image} alt="" className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm text-slate-900">{item.name}</p>
                        <p className="mt-0.5 text-[12px] text-slate-500">
                          {[item.size ? `Size ${item.size}` : "", item.spec, `Qty ${item.qty}`, formatPkr(item.price)]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-between border-t border-slate-200 pt-3 text-sm">
                  <span className="text-slate-500">{selected.payment} · Free delivery</span>
                  <span className="font-medium">{formatPkr(orderTotal(selected))}</span>
                </div>
              </div>

              <form onSubmit={saveNote}>
                <label className="block">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">
                    Internal note
                  </span>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    className="mt-2 w-full border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                    placeholder="Rider notes, missing size, callback…"
                  />
                </label>
                <button
                  type="submit"
                  disabled={saving}
                  className="mt-3 w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save note"}
                </button>
              </form>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
