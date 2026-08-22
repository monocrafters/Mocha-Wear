"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { CartSkeleton } from "@/components/skeletons";
import { cartLineId } from "@/lib/cart";
import { formatPkr } from "@/lib/money";

export function CartView() {
  const { items, count, subtotal, total, setQty, remove, ready } = useCart();

  if (!ready) {
    return <CartSkeleton />;
  }

  if (!items.length) {
    return (
      <section className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center lg:py-24">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-cream text-mocha-deep">
          <ShoppingBag size={22} strokeWidth={1.6} />
        </span>
        <h1 className="font-serif mt-5 text-3xl text-mocha-deep">Your bag is empty.</h1>
        <p className="mt-3 max-w-sm text-sm leading-6 text-mocha/55">
          Add a lawn or pret suit from the sale, then check out with cash on delivery.
        </p>
        <Link
          href="/shop"
          prefetch
          className="mt-8 inline-block bg-mocha-deep px-5 py-3 text-[11px] font-semibold tracking-[0.18em] text-ivory uppercase"
        >
          Shop the sale
        </Link>
      </section>
    );
  }

  return (
    <section className="flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col lg:mx-auto lg:max-w-[1440px] lg:w-full lg:px-8 lg:py-12">
      <div className="flex items-end justify-between px-4 py-3 lg:px-0 lg:pb-6">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.22em] text-sale uppercase">Your bag</p>
          <h1 className="font-serif mt-0.5 text-[1.75rem] leading-none tracking-[-0.03em] text-mocha-deep lg:text-5xl">
            Cart
          </h1>
        </div>
        <p className="text-[11px] tracking-[0.16em] text-mocha/45 uppercase">
          {count} piece{count === 1 ? "" : "s"}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(10.75rem+env(safe-area-inset-bottom))] lg:grid lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)] lg:items-start lg:gap-8 lg:overflow-visible lg:px-0 lg:pb-0">
        <div className="space-y-2">
          {items.map((line) => (
            <article key={cartLineId(line)} className="flex gap-3 bg-white p-3">
              <Link href={`/products/${line.slug}`} prefetch className="relative h-[92px] w-[68px] shrink-0 overflow-hidden bg-sand">
                {line.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={line.image} alt={line.name} className="h-full w-full object-cover" />
                ) : null}
              </Link>
              <div className="flex min-w-0 flex-1 flex-col justify-between">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link href={`/products/${line.slug}`} prefetch className="font-serif block truncate text-[1.2rem] leading-tight text-mocha-deep">
                      {line.name}
                    </Link>
                    <p className="mt-0.5 truncate text-[11px] text-mocha/45">
                      {[line.size ? `Size ${line.size}` : "", line.spec].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(line.productId, line.size)}
                    className="shrink-0 text-[10px] tracking-[0.14em] text-mocha/40 uppercase hover:text-sale"
                  >
                    Remove
                  </button>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center border border-mocha/15">
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      onClick={() => setQty(line.productId, line.qty - 1, line.size)}
                      className="grid h-8 w-8 place-items-center text-mocha-deep"
                    >
                      −
                    </button>
                    <span className="w-7 text-center text-sm">{line.qty}</span>
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      disabled={line.qty >= (line.maxQty || 10)}
                      onClick={() => setQty(line.productId, line.qty + 1, line.size)}
                      className="grid h-8 w-8 place-items-center text-mocha-deep disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                  <p className="text-sm font-medium text-mocha-deep">{formatPkr(line.price * line.qty)}</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <aside className="mt-3 hidden border border-sand bg-white p-6 lg:mt-0 lg:block">
          <SummaryBody subtotal={subtotal} total={total} />
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-[calc(4.65rem+env(safe-area-inset-bottom))] z-[75] border-t border-sand bg-white px-4 py-2.5 lg:hidden">
        <div className="flex items-center justify-between text-sm">
          <span className="text-mocha/50">Total · COD · Free delivery</span>
          <span className="font-medium text-mocha-deep">{formatPkr(total)}</span>
        </div>
        <Link
          href="/checkout"
          prefetch
          className="mt-3 flex w-full items-center justify-center bg-sale py-3 text-[11px] font-semibold tracking-[0.16em] text-white uppercase"
        >
          Proceed to checkout
        </Link>
      </div>
    </section>
  );
}

function SummaryBody({ subtotal, total }: { subtotal: number; total: number }) {
  return (
    <>
      <h2 className="text-[11px] font-semibold tracking-[0.22em] text-mocha-deep uppercase">Order summary</h2>
      <dl className="mt-5 space-y-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-mocha/50">Subtotal</dt>
          <dd>{formatPkr(subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-mocha/50">Delivery</dt>
          <dd>Free</dd>
        </div>
        <div className="flex justify-between border-t border-sand pt-3 font-medium">
          <dt>Total</dt>
          <dd>{formatPkr(total)}</dd>
        </div>
      </dl>
      <p className="mt-3 text-[12px] leading-5 text-mocha/45">Free nationwide delivery.</p>
      <div className="mt-5 border border-sand bg-cream/50 px-3 py-3">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-mocha-deep uppercase">
          Payment · Cash on delivery
        </p>
        <p className="mt-1 text-[12px] leading-5 text-mocha/50">Pay the rider in cash when your order arrives.</p>
      </div>
      <Link
        href="/checkout"
        prefetch
        className="mt-5 flex w-full items-center justify-center bg-sale px-4 py-3.5 text-[12px] font-semibold tracking-[0.16em] text-white uppercase hover:bg-sale-deep"
      >
        Proceed to checkout
      </Link>
    </>
  );
}
