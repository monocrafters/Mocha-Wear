"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check } from "lucide-react";
import { ShopWhatsAppLink } from "@/components/shop-whatsapp-link";
import { formatPkr } from "@/lib/money";
import { orderTotal, readOrdersCache, type Order } from "@/lib/orders";

export function OrderConfirmed() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || "";
  const [order, setOrder] = useState<Order | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const cached = readOrdersCache();
    setOrder((id ? cached.find((row) => row.id === id) : null) || cached[0] || null);
    setReady(true);
  }, [id]);

  if (!ready) {
    return <section className="flex-1 px-5 py-16" />;
  }

  if (!order) {
    return (
      <section className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="font-serif text-3xl text-mocha-deep">Order confirmed</h1>
        <p className="mt-3 max-w-sm text-sm leading-6 text-mocha/55">
          We have your order. Open Orders to see the details on this phone.
        </p>
        <Link
          href="/orders"
          prefetch
          className="mt-8 inline-block bg-mocha-deep px-5 py-3 text-[11px] font-semibold tracking-[0.18em] text-ivory uppercase"
        >
          View orders
        </Link>
      </section>
    );
  }

  const total = orderTotal(order);
  const phone = order.customer?.phone || "";
  const message = orderWhatsAppMessage(order, total);

  return (
    <section className="mx-auto w-full max-w-lg flex-1 px-5 py-12 sm:px-8 sm:py-16">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-sale/10 text-sale">
        <Check size={22} strokeWidth={2} />
      </span>
      <p className="mt-5 text-[10px] font-semibold tracking-[0.22em] text-sale uppercase">Cash on delivery</p>
      <h1 className="font-serif mt-2 text-4xl tracking-[-0.03em] text-mocha-deep">Order placed</h1>
      <p className="mt-3 text-sm leading-6 text-mocha/55">
        We’ll WhatsApp or call to confirm. Pay the rider in cash when your parcel arrives.
      </p>

      <div className="mt-8 border border-sand bg-white px-5 py-5">
        <p className="text-[10px] tracking-[0.18em] text-mocha/40 uppercase">Order number</p>
        <p className="mt-1 font-serif text-2xl text-mocha-deep">{order.id}</p>
        <p className="mt-4 text-[10px] tracking-[0.18em] text-mocha/40 uppercase">COD total</p>
        <p className="mt-1 text-lg text-mocha-deep">{formatPkr(total)}</p>
        {order.customer?.name ? (
          <p className="mt-4 text-sm text-mocha/60">
            {order.customer.name}
            {phone ? ` · ${phone}` : ""}
          </p>
        ) : null}
        <ul className="mt-4 space-y-1.5 text-[13px] text-mocha/55">
          {order.items.map((item, index) => (
            <li key={`${item.name}-${index}`}>
              {item.name}
              {item.size ? ` · ${item.size}` : ""} × {item.qty}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <ShopWhatsAppLink
          message={message}
          label="WhatsApp this order"
          className="flex w-full items-center justify-center bg-[#25D366] py-3.5 text-[11px] font-semibold tracking-[0.16em] text-white uppercase"
        />
        <Link
          href="/orders"
          prefetch
          className="flex w-full items-center justify-center border border-mocha-deep py-3.5 text-[11px] font-semibold tracking-[0.16em] text-mocha-deep uppercase"
        >
          View orders
        </Link>
        <Link
          href="/shop"
          prefetch
          className="text-center text-[11px] tracking-[0.16em] text-mocha/50 uppercase underline decoration-mocha/20 underline-offset-8"
        >
          Keep shopping
        </Link>
      </div>
    </section>
  );
}

function orderWhatsAppMessage(order: Order, total: number) {
  const lines = order.items
    .map((item) => `${item.name}${item.size ? ` (${item.size})` : ""} × ${item.qty}`)
    .join(", ");
  return `Hi Mocha Wear, I just placed order ${order.id}. ${lines}. COD ${formatPkr(total)}. Please confirm.`;
}
