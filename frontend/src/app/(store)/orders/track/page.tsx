"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FileDown, Loader2 } from "lucide-react";
import { formatPkr } from "@/lib/money";
import { printOrdersPdf } from "@/lib/order-pdf";
import {
  ORDER_STATUSES,
  lookupOrderById,
  orderDate,
  orderPlace,
  orderTotal,
  rememberOrder,
  statusCopy,
  stepIndex,
  type Order,
} from "@/lib/orders";

function TrackInner() {
  const searchParams = useSearchParams();
  const id = (searchParams.get("id") || "").trim();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError("Missing order id");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    void lookupOrderById(id)
      .then((item) => {
        if (cancelled) return;
        if (!item) {
          setError("Order not found");
          setOrder(null);
          return;
        }
        rememberOrder(item);
        setOrder(item);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load order");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="grid min-h-[40vh] place-items-center text-slate-500">
        <Loader2 className="animate-spin" size={22} />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-lg font-semibold text-slate-900">Could not open this order</p>
        <p className="mt-2 text-sm text-slate-600">{error || "Check the link and try again."}</p>
        <Link href="/orders" className="mt-6 inline-block text-sm font-medium text-blue-700 underline">
          Go to My Orders
        </Link>
      </div>
    );
  }

  const step = stepIndex(order.status);
  const copy = statusCopy(order.status);

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Order tracking</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{order.id}</h1>
      <p className="mt-1 text-sm text-slate-600">{orderDate(order)}</p>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase ${copy.tone}`}>
          {copy.label}
        </p>

        {order.status !== "cancelled" ? (
          <ol className="mt-5 flex justify-between gap-1">
            {ORDER_STATUSES.filter((row) => row.id !== "cancelled").map((row, index) => {
              const active = step >= index;
              return (
                <li key={row.id} className="flex flex-1 flex-col items-center gap-1 text-center">
                  <span
                    className={`h-2 w-full rounded-full ${active ? "bg-emerald-600" : "bg-slate-200"}`}
                  />
                  <span className={`text-[10px] ${active ? "font-semibold text-slate-800" : "text-slate-400"}`}>
                    {row.label}
                  </span>
                </li>
              );
            })}
          </ol>
        ) : null}

        {(order.courier || order.dispatch_id) && (
          <div className="mt-5 rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-700">
            {order.courier ? <p>Courier: {order.courier}</p> : null}
            {order.dispatch_id ? <p>Dispatch ID: {order.dispatch_id}</p> : null}
          </div>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Deliver to</p>
        <p className="mt-1 font-medium text-slate-900">{order.customer?.name}</p>
        <p className="text-sm text-slate-600">{order.customer?.phone}</p>
        <p className="mt-1 text-sm text-slate-600">{orderPlace(order)}</p>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Items</p>
        <ul className="mt-2 space-y-2 text-sm">
          {order.items.map((item, index) => (
            <li key={`${item.name}-${index}`} className="flex justify-between gap-3">
              <span>
                {item.name}
                {item.size ? ` · ${item.size}` : ""} × {item.qty}
              </span>
              <span className="shrink-0 font-medium">{formatPkr(item.price * item.qty)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t border-slate-100 pt-3 text-sm">
          <span className="text-slate-500">Total · {order.payment}</span>
          <span className="font-semibold text-slate-900">{formatPkr(orderTotal(order))}</span>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => printOrdersPdf([order], `Order ${order.id}`)}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white"
        >
          <FileDown size={16} />
          Download PDF
        </button>
        <Link
          href="/orders"
          className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-800"
        >
          My Orders
        </Link>
      </div>

      <p className="mt-4 text-center text-xs text-slate-500">
        This order is saved on this phone so you can open it again from My Orders.
      </p>
    </div>
  );
}

export default function OrderTrackPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-[40vh] place-items-center text-slate-500">
          <Loader2 className="animate-spin" size={22} />
        </div>
      }
    >
      <TrackInner />
    </Suspense>
  );
}
