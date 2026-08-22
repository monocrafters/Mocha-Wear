"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Package, Search, Truck } from "lucide-react";
import { formatPkr } from "@/lib/money";
import { OrderListSkeleton, Skeleton } from "@/components/skeletons";
import {
  CUSTOMER_CANCEL_REASONS,
  ORDERS_EVENT,
  canCancelOrder,
  cancelOrderRequest,
  cancelReasonText,
  lookupOrders,
  orderDate,
  orderPlace,
  orderTotal,
  readOrdersCache,
  rememberOrderPhone,
  statusCopy,
  stepIndex,
  type Order,
  type OrderStatus,
} from "@/lib/orders";

const filters: { id: "all" | OrderStatus; label: string; short: string }[] = [
  { id: "all", label: "All", short: "All" },
  { id: "processing", label: "Processing", short: "Process" },
  { id: "packed", label: "Packed", short: "Packed" },
  { id: "shipped", label: "Shipped", short: "Shipped" },
  { id: "delivered", label: "Delivered", short: "Delivered" },
  { id: "cancelled", label: "Cancelled", short: "Cancelled" },
];

const steps = ["Confirmed", "Packed", "Shipped", "Delivered"] as const;

export function OrdersList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<(typeof filters)[number]["id"]>("all");
  const [phone, setPhone] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [cancelOrder, setCancelOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelDetail, setCancelDetail] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [cancelling, setCancelling] = useState(false);

  async function load() {
    try {
      const items = await lookupOrders();
      setOrders(items);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const next = await lookupOrders();
        if (alive) setOrders(next);
      } catch {
        if (alive) setOrders([]);
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();

    function onLocal() {
      if (alive) setOrders(readOrdersCache());
    }

    function onVisible() {
      if (document.visibilityState === "hidden") return;
      load();
    }

    window.addEventListener(ORDERS_EVENT, onLocal);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      window.removeEventListener(ORDERS_EVENT, onLocal);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const items = useMemo(() => {
    if (active === "all") return orders.filter((order) => order.status !== "cancelled");
    return orders.filter((order) => order.status === active);
  }, [orders, active]);

  const stats = useMemo(() => {
    return {
      processing: orders.filter((order) => order.status === "processing").length,
      packed: orders.filter((order) => order.status === "packed").length,
      shipped: orders.filter((order) => order.status === "shipped").length,
      delivered: orders.filter((order) => order.status === "delivered").length,
    };
  }, [orders]);

  async function findOrders(event: FormEvent) {
    event.preventDefault();
    const mobile = phone.replace(/\D/g, "");
    if (mobile.length !== 11 || !mobile.startsWith("03")) {
      setLookupError("Enter an 11-digit number starting with 03.");
      return;
    }
    setLookupError("");
    rememberOrderPhone(mobile);
    setLoading(true);
    await load();
  }

  async function confirmCancel() {
    if (!cancelOrder || cancelling) return;
    if (!cancelReason) {
      setCancelError("Choose a reason.");
      return;
    }
    if (cancelReason === "Other" && !cancelDetail.trim()) {
      setCancelError("Write a short reason.");
      return;
    }
    setCancelling(true);
    setCancelError("");
    try {
      const next = await cancelOrderRequest(cancelOrder.id, cancelReason, cancelDetail.trim());
      setOrders((current) => current.map((order) => (order.id === next.id ? next : order)));
      setCancelOrder(null);
      setCancelReason("");
      setCancelDetail("");
      setActive("cancelled");
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Could not cancel order");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <section className="flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col lg:mx-auto lg:max-w-[1440px] lg:w-full lg:px-8 lg:py-12">
      <div className="flex items-end justify-between px-4 py-2 lg:px-0 lg:py-0 lg:pb-6">
        <div>
          <p className="text-[9px] font-semibold tracking-[0.2em] text-sale uppercase lg:text-[10px] lg:tracking-[0.22em]">
            Your wardrobe
          </p>
          <h1 className="font-serif mt-0.5 text-[1.45rem] leading-none tracking-[-0.03em] text-mocha-deep lg:text-5xl">
            Orders
          </h1>
        </div>
        <p className="text-[10px] tracking-[0.14em] text-mocha/45 uppercase lg:text-[11px] lg:tracking-[0.16em]">
          {loading ? <Skeleton className="inline-block h-3 w-16 align-middle" /> : `${orders.length} order${orders.length === 1 ? "" : "s"}`}
        </p>
      </div>

      <div className="mx-4 mt-2 grid grid-cols-4 divide-x divide-sand border border-sand bg-white lg:hidden">
        {(
          [
            { label: "Process", value: stats.processing },
            { label: "Packed", value: stats.packed },
            { label: "Shipped", value: stats.shipped },
            { label: "Delivered", value: stats.delivered },
          ] as const
        ).map((card) => (
          <div key={card.label} className="px-1 py-1.5 text-center">
            <p className="truncate text-[10px] tracking-[0.08em] text-mocha/40 uppercase">{card.label}</p>
            <p className="font-serif mt-0.5 text-base leading-none text-mocha-deep">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-8 hidden grid-cols-4 gap-4 lg:grid">
        {(
          [
            { label: "Processing", value: stats.processing },
            { label: "Packed", value: stats.packed },
            { label: "On the way", value: stats.shipped },
            { label: "Delivered", value: stats.delivered },
          ] as const
        ).map((card) => (
          <article key={card.label} className="border border-sand bg-white px-5 py-5">
            <p className="text-[11px] tracking-[0.18em] text-mocha/45 uppercase">{card.label}</p>
            <p className="font-serif mt-2 text-3xl text-mocha-deep">{card.value}</p>
          </article>
        ))}
      </div>

      <div className="hide-scrollbar mt-2 flex w-full min-w-0 max-w-full flex-nowrap gap-1 overflow-x-auto px-4 lg:mt-0 lg:flex-wrap lg:gap-2 lg:px-0">
        {filters.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => setActive(filter.id)}
            className={`shrink-0 px-2.5 py-1.5 text-center text-[10px] font-semibold tracking-[0.08em] uppercase lg:px-3.5 lg:tracking-[0.16em] ${
              active === filter.id ? "bg-mocha-deep text-ivory" : "border border-mocha/15 text-mocha-deep"
            }`}
          >
            <span className="lg:hidden">{filter.short}</span>
            <span className="hidden lg:inline">{filter.label}</span>
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-2 pb-[calc(4.75rem+env(safe-area-inset-bottom))] lg:overflow-visible lg:px-0 lg:pt-4 lg:pb-0">
        {loading ? (
          <OrderListSkeleton />
        ) : items.length ? (
          <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
            {items.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onCancel={() => {
                  setCancelReason("");
                  setCancelDetail("");
                  setCancelError("");
                  setCancelOrder(order);
                }}
              />
            ))}
          </div>
        ) : orders.length ? (
          <p className="py-10 text-center text-sm text-mocha/45 lg:py-16">No orders in this status.</p>
        ) : (
          <EmptyOrders phone={phone} error={lookupError} onPhone={setPhone} onFind={findOrders} />
        )}
      </div>

      {cancelOrder ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-mocha-deep/45 p-0 lg:items-center lg:p-6"
          onClick={() => {
            if (!cancelling) setCancelOrder(null);
          }}
        >
          <div
            className="w-full bg-ivory px-5 pt-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl lg:max-w-md lg:pb-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-mocha/15 lg:hidden" />
            <p className="text-[10px] font-semibold tracking-[0.22em] text-sale uppercase">Cancel order</p>
            <h2 className="font-serif mt-1 text-2xl text-mocha-deep">{cancelOrder.id}</h2>
            <p className="mt-1 text-sm text-mocha/55">Why do you want to cancel?</p>
            <div className="mt-4 space-y-2">
              {CUSTOMER_CANCEL_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => {
                    setCancelReason(reason);
                    setCancelError("");
                  }}
                  className={`w-full border px-3 py-2.5 text-left text-sm ${
                    cancelReason === reason
                      ? "border-mocha-deep bg-mocha-deep text-ivory"
                      : "border-mocha/15 bg-white text-mocha-deep"
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
            {cancelReason === "Other" ? (
              <textarea
                value={cancelDetail}
                onChange={(e) => setCancelDetail(e.target.value)}
                rows={3}
                placeholder="Write your reason"
                className="mt-3 w-full border border-mocha/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-mocha-deep"
              />
            ) : null}
            {cancelError ? <p className="mt-3 text-sm text-sale">{cancelError}</p> : null}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={cancelling}
                onClick={() => setCancelOrder(null)}
                className="border border-mocha/20 py-3 text-[11px] font-semibold tracking-[0.16em] text-mocha-deep uppercase"
              >
                Keep order
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={confirmCancel}
                className="bg-sale py-3 text-[11px] font-semibold tracking-[0.16em] text-white uppercase disabled:opacity-60"
              >
                {cancelling ? "Cancelling…" : "Cancel order"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function OrderCard({ order, onCancel }: { order: Order; onCancel: () => void }) {
  const status = statusCopy(order.status);
  const current = stepIndex(order.status);
  const place = orderPlace(order);
  const cancelled = order.status === "cancelled";
  const reason = cancelReasonText(order);

  return (
    <article className="bg-white lg:border lg:border-sand">
      <div className="flex items-start justify-between gap-3 px-3 pt-2.5 lg:px-5 lg:pt-5">
        <div className="min-w-0">
          <p className="text-[10px] tracking-[0.18em] text-mocha/40 uppercase">Order {order.id}</p>
          <p className="mt-0.5 truncate text-[13px] text-mocha-deep">
            {orderDate(order)}
            {place ? ` · ${place}` : ""}
          </p>
        </div>
        <span className={`shrink-0 px-2 py-1 text-[9px] font-semibold tracking-[0.14em] uppercase ${status.tone}`}>
          {status.label}
        </span>
      </div>

      {cancelled ? (
        <div className="mx-3 mt-2 border border-sale/20 bg-sale/5 px-3 py-2 lg:mx-5">
          <p className="text-[10px] font-semibold tracking-[0.14em] text-sale uppercase">Cancelled</p>
          <p className="mt-1 text-[12px] leading-5 text-mocha/70">
            {reason || "This order was cancelled."}
            {order.cancelled_by === "admin" ? " · Cancelled by Mocha Wear" : ""}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-1 px-3 pt-2 lg:px-5 lg:pt-3">
          {steps.map((step, index) => {
            const done = index <= current;
            return (
              <div key={step} className="min-w-0">
                <div className={`h-0.5 ${done ? "bg-mocha-deep" : "bg-sand"}`} />
                <p
                  className={`mt-1.5 truncate text-[10px] tracking-[0.1em] uppercase ${
                    done ? "text-mocha-deep" : "text-mocha/30"
                  }`}
                >
                  {step}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-2 px-3 py-2.5 lg:space-y-2.5 lg:px-5 lg:py-3">
        {order.items.map((item, index) => (
          <div key={`${order.id}-${item.name}-${item.slug || ""}-${item.size || ""}-${index}`} className="flex gap-3">
            <Link
              href={item.slug ? `/products/${item.slug}` : "/shop"}
              prefetch
              className="relative h-[72px] w-[54px] shrink-0 overflow-hidden bg-sand lg:h-20 lg:w-[60px]"
            >
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
              ) : null}
            </Link>
            <div className="flex min-w-0 flex-1 flex-col justify-center">
              <Link
                href={item.slug ? `/products/${item.slug}` : "/shop"}
                prefetch
                className="font-serif truncate text-[1.15rem] leading-tight text-mocha-deep lg:text-[1.35rem]"
              >
                {item.name}
              </Link>
              {item.spec ? <p className="mt-0.5 truncate text-[11px] text-mocha/45">{item.spec}</p> : null}
              <p className="mt-1 text-[13px] text-mocha-deep">
                {item.size ? `Size ${item.size} · ` : ""}Qty {item.qty} · {formatPkr(item.price)}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-sand px-3 py-2.5 lg:px-5 lg:py-3.5">
        <div>
          <p className="text-[9px] tracking-[0.14em] text-mocha/40 uppercase">{order.payment}</p>
          <p className="text-sm font-medium text-mocha-deep">{formatPkr(orderTotal(order))}</p>
        </div>
        {order.status === "delivered" ? (
          <Link
            href="/shop"
            prefetch
            className="bg-mocha-deep px-3 py-2 text-[10px] font-semibold tracking-[0.14em] text-ivory uppercase"
          >
            Buy again
          </Link>
        ) : canCancelOrder(order.status) ? (
          <button
            type="button"
            onClick={onCancel}
            className="border border-sale px-3 py-2 text-[10px] font-semibold tracking-[0.14em] text-sale uppercase"
          >
            Cancel order
          </button>
        ) : null}
      </div>
    </article>
  );
}

function EmptyOrders({
  phone,
  error,
  onPhone,
  onFind,
}: {
  phone: string;
  error: string;
  onPhone: (value: string) => void;
  onFind: (event: FormEvent) => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 py-10 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-cream text-mocha-deep">
        <Package size={22} strokeWidth={1.6} />
      </span>
      <h2 className="font-serif mt-5 text-3xl text-mocha-deep">No orders here yet.</h2>
      <p className="mt-3 max-w-sm text-sm leading-6 text-mocha/55">
        Place a suit and it will land here. Already ordered? Find it with your mobile number.
      </p>
      <form onSubmit={onFind} className="mt-6 flex w-full max-w-sm gap-2">
        <input
          value={phone}
          onChange={(e) => onPhone(e.target.value)}
          inputMode="numeric"
          maxLength={11}
          placeholder="03xxxxxxxxx"
          className="min-w-0 flex-1 border border-mocha/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-mocha-deep"
        />
        <button
          type="submit"
          className="inline-flex items-center gap-1 bg-mocha-deep px-3 py-2.5 text-[10px] font-semibold tracking-[0.14em] text-ivory uppercase"
        >
          <Search size={13} strokeWidth={1.8} />
          Find
        </button>
      </form>
      {error ? <p className="mt-2 text-sm text-sale">{error}</p> : null}
      <Link
        href="/shop"
        prefetch
        className="mt-8 inline-flex items-center gap-2 bg-mocha-deep px-5 py-3 text-[11px] font-semibold tracking-[0.18em] text-ivory uppercase"
      >
        <Truck size={14} strokeWidth={1.8} />
        Shop the sale
      </Link>
    </div>
  );
}
