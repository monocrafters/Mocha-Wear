"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { API_URL, apiFetch } from "@/lib/api";
import { formatPkr } from "@/lib/money";
import {
  cancelReasonText,
  orderDate,
  orderTotal,
  statusCopy,
  type Order,
} from "@/lib/orders";
import type { AdminCustomer } from "@/lib/admin-customers";
import { AdminFormSkeleton, AdminListSkeleton } from "@/components/skeletons";

function whatsappHref(phone: string) {
  const digits = phone.replace(/\D/g, "").replace(/^0/, "92");
  return digits ? `https://wa.me/${digits}` : "";
}

export function AdminCustomerDetail() {
  const params = useParams<{ id: string }>();
  const [item, setItem] = useState<AdminCustomer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.id) return;
    setLoading(true);
    apiFetch(`${API_URL}/api/admin/customers/${params.id}`, { credentials: "include" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Customer not found");
        setItem(data.item);
        setOrders(data.orders || []);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Customer not found");
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div>
        <AdminFormSkeleton />
        <AdminListSkeleton rows={3} />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="mt-8">
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error || "Customer not found"}</p>
        <Link href="/admin/customers" className="mt-4 inline-block text-sm font-medium text-blue-600">
          Back to customers
        </Link>
      </div>
    );
  }

  const wa = whatsappHref(item.whatsapp || item.phone);

  return (
    <div className="mt-8 space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <article className="border border-slate-200 bg-white px-5 py-5 lg:col-span-2">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-slate-500 uppercase">Customer</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">{item.name}</h2>
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[10px] tracking-[0.14em] text-slate-400 uppercase">Mobile</dt>
              <dd className="mt-1 text-slate-900">{item.phone}</dd>
            </div>
            <div>
              <dt className="text-[10px] tracking-[0.14em] text-slate-400 uppercase">WhatsApp</dt>
              <dd className="mt-1 text-slate-900">{item.whatsapp || item.phone}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-[10px] tracking-[0.14em] text-slate-400 uppercase">Delivery address</dt>
              <dd className="mt-1 leading-6 text-slate-700">
                {[item.address, item.area, item.city, item.landmark].filter(Boolean).join(", ")}
              </dd>
            </div>
          </dl>
          {wa ? (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-block text-[11px] font-semibold text-[#128C7E] uppercase"
            >
              WhatsApp customer
            </a>
          ) : null}
        </article>

        <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
          <Stat label="Orders" value={String(item.order_count)} />
          <Stat label="Pieces" value={String(item.pieces)} />
          <Stat label="Spent" value={formatPkr(item.spent)} />
        </div>
      </div>

      <div>
        <div className="flex items-end justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-900">Orders</h3>
          <p className="text-[11px] text-slate-500 uppercase">{orders.length} total</p>
        </div>

        <div className="mt-3 space-y-3">
          {orders.map((order) => {
            const status = statusCopy(order.status);
            return (
              <article key={order.id} className="border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{order.id}</p>
                    <p className="mt-0.5 text-[12px] text-slate-500">{orderDate(order)}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-semibold tracking-[0.14em] text-slate-500 uppercase">
                      {status.label}
                    </span>
                    <p className="mt-1 text-sm font-medium text-slate-900">{formatPkr(orderTotal(order))}</p>
                  </div>
                </div>
                {order.status === "cancelled" && cancelReasonText(order) ? (
                  <p className="mt-2 text-[12px] text-slate-500">Cancelled: {cancelReasonText(order)}</p>
                ) : null}
                <div className="mt-4 space-y-2.5">
                  {order.items.map((row, index) => (
                    <div key={`${order.id}-${row.product_id || row.slug || row.name}-${row.size || ""}-${index}`} className="flex gap-3">
                      <div className="h-14 w-10 shrink-0 overflow-hidden bg-slate-100">
                        {row.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={row.image} alt="" className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-slate-900">{row.name}</p>
                        <p className="mt-0.5 text-[12px] text-slate-500">
                          {[row.size ? `Size ${row.size}` : "", row.spec, `Qty ${row.qty}`, formatPkr(row.price)]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>

        {!orders.length ? (
          <p className="mt-4 border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
            No orders for this customer yet.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <article className="border border-slate-200 bg-white px-4 py-4">
      <p className="text-[10px] text-slate-500 uppercase">{label}</p>
      <p className="mt-1.5 text-lg font-semibold text-slate-900">{value}</p>
    </article>
  );
}
