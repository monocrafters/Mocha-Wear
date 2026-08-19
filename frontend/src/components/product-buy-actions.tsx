"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/components/admin-products";
import { useCart } from "@/components/cart-provider";
import { lineFromProduct, writeBuyNow } from "@/lib/cart";
import { productSizes } from "@/lib/product";

type PendingAction = "add" | "buy";

export function ProductBuyActions({ product }: { product: Product }) {
  const router = useRouter();
  const { addProduct } = useCart();
  const sizes = useMemo(() => productSizes(product), [product]);
  const stock = Math.max(0, product.stock ?? 0);
  const soldOut = stock <= 0;
  const maxQty = Math.max(1, Math.min(10, stock || 1));
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [picked, setPicked] = useState("");

  function complete(action: PendingAction, size: string) {
    if (soldOut) return;
    const qtyToAdd = Math.min(qty, maxQty);
    setPending(null);
    if (action === "buy") {
      writeBuyNow([lineFromProduct(product, qtyToAdd, size)]);
      router.push("/checkout?buy=1");
      return;
    }
    addProduct(product, qtyToAdd, size);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  }

  function start(action: PendingAction) {
    if (soldOut) return;
    if (!sizes.length) {
      complete(action, "");
      return;
    }
    setPending(action);
  }

  function confirmSize() {
    if (!pending) return;
    if (sizes.length && !picked) return;
    complete(pending, picked);
  }

  return (
    <>
      <div className="mt-8 hidden lg:block">
        <StockLine soldOut={soldOut} stock={stock} />
        <QtyControl qty={qty} soldOut={soldOut} maxQty={maxQty} onChange={setQty} size="lg" />
        <div className="mt-3 grid grid-cols-2 gap-3">
          <AddButton soldOut={soldOut} added={added} onClick={() => start("add")} />
          <BuyButton soldOut={soldOut} onClick={() => start("buy")} />
        </div>
      </div>

      <p className="mt-4 text-[10px] tracking-[0.16em] uppercase lg:hidden">
        {soldOut ? <span className="text-sale">Sold out</span> : <span className="text-mocha/45">{stock} in stock</span>}
      </p>

      <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-sand bg-ivory px-2.5 pt-1.5 pb-[calc(3.85rem+env(safe-area-inset-bottom))] lg:hidden">
        <div className="flex items-center gap-1.5">
          <QtyControl qty={qty} soldOut={soldOut} maxQty={maxQty} onChange={setQty} size="sm" />
          <AddButton soldOut={soldOut} added={added} onClick={() => start("add")} compact />
          <BuyButton soldOut={soldOut} onClick={() => start("buy")} compact />
        </div>
      </div>

      {pending ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-mocha-deep/45 p-0 lg:items-center lg:p-6"
          onClick={() => setPending(null)}
        >
          <div
            className="w-full bg-ivory px-5 pt-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl lg:max-w-md lg:pb-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-mocha/15 lg:hidden" />
            <p className="text-[10px] font-semibold tracking-[0.22em] text-sale uppercase">Choose size</p>
            <h2 className="font-serif mt-1 text-2xl text-mocha-deep">
              {pending === "buy" ? "Select a size to buy" : "Select a size to add"}
            </h2>
            <p className="mt-1 text-sm text-mocha/55">{product.name}</p>

            <div className="mt-5 flex flex-wrap gap-2">
              {sizes.map((size) => {
                const active = picked === size;
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setPicked(size)}
                    className={`min-w-12 border px-3.5 py-2.5 text-[12px] font-semibold tracking-[0.12em] uppercase ${
                      active
                        ? "border-mocha-deep bg-mocha-deep text-ivory"
                        : "border-mocha/20 bg-white text-mocha-deep hover:border-mocha-deep"
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPending(null)}
                className="border border-mocha/20 py-3.5 text-[11px] font-semibold tracking-[0.16em] text-mocha-deep uppercase"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!picked}
                onClick={confirmSize}
                className={`py-3.5 text-[11px] font-semibold tracking-[0.16em] text-white uppercase disabled:opacity-40 ${
                  pending === "buy" ? "bg-sale hover:bg-sale-deep" : "bg-mocha-deep hover:bg-mocha"
                }`}
              >
                {pending === "buy" ? "Buy now" : "Add to bag"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function StockLine({ soldOut, stock }: { soldOut: boolean; stock: number }) {
  return (
    <p className="mb-3 text-[11px] tracking-[0.16em] uppercase">
      {soldOut ? <span className="text-sale">Sold out</span> : <span className="text-mocha/45">{stock} in stock</span>}
    </p>
  );
}

function QtyControl({
  qty,
  soldOut,
  maxQty,
  onChange,
  size,
}: {
  qty: number;
  soldOut: boolean;
  maxQty: number;
  onChange: (n: number) => void;
  size: "sm" | "lg";
}) {
  const compact = size === "sm";
  return (
    <div
      className={`flex shrink-0 items-center border border-mocha/15 ${compact ? "" : "mb-0 w-fit"}`}
    >
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={soldOut}
        onClick={() => onChange(Math.max(1, qty - 1))}
        className={`grid place-items-center text-mocha-deep disabled:opacity-30 ${compact ? "h-8 w-7 text-sm" : "h-11 w-11"}`}
      >
        −
      </button>
      <span className={`text-center text-sm tabular-nums ${compact ? "w-5 text-[12px]" : "w-10"}`}>{soldOut ? 0 : qty}</span>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={soldOut}
        onClick={() => onChange(Math.min(maxQty, qty + 1))}
        className={`grid place-items-center text-mocha-deep disabled:opacity-30 ${compact ? "h-8 w-7 text-sm" : "h-11 w-11"}`}
      >
        +
      </button>
    </div>
  );
}

function AddButton({
  soldOut,
  added,
  onClick,
  compact,
}: {
  soldOut: boolean;
  added: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={soldOut}
      onClick={onClick}
      className={`border border-mocha-deep font-semibold tracking-[0.16em] text-mocha-deep uppercase transition-colors hover:bg-mocha-deep hover:text-ivory disabled:cursor-not-allowed disabled:opacity-40 ${
        compact ? "h-8 min-w-0 flex-1 px-1.5 text-[9px] tracking-[0.12em]" : "px-4 py-3.5 text-[11px] tracking-[0.18em]"
      }`}
    >
      {soldOut ? "Sold out" : added ? "Added" : "Add to bag"}
    </button>
  );
}

function BuyButton({
  soldOut,
  onClick,
  compact,
}: {
  soldOut: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={soldOut}
      onClick={onClick}
      className={`bg-sale font-semibold tracking-[0.16em] text-white uppercase transition-colors hover:bg-sale-deep disabled:cursor-not-allowed disabled:opacity-40 ${
        compact ? "h-8 min-w-0 flex-1 px-1.5 text-[9px] tracking-[0.12em]" : "px-4 py-3.5 text-[11px] tracking-[0.18em]"
      }`}
    >
      Buy now
    </button>
  );
}
