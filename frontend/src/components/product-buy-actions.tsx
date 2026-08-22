"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/components/admin-products";
import { useCart } from "@/components/cart-provider";
import { ShopTrustLine } from "@/components/shop-trust-line";
import { ShopWhatsAppLink } from "@/components/shop-whatsapp-link";
import { lineFromProduct, writeBuyNow } from "@/lib/cart";
import { productSizes } from "@/lib/product";

type PendingAction = "add" | "buy";

export function ProductBuyActions({ product }: { product: Product }) {
  const router = useRouter();
  const { addProduct, count } = useCart();
  const sizes = useMemo(() => productSizes(product), [product]);
  const stock = Math.max(0, product.stock ?? 0);
  const soldOut = stock <= 0;
  const maxQty = Math.max(1, Math.min(10, stock || 1));
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [sheet, setSheet] = useState<PendingAction | null>(null);

  function complete(action: PendingAction, size: string) {
    if (soldOut) return;
    const qtyToAdd = Math.min(qty, maxQty);
    setSheet(null);
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
    if (sizes.length) {
      setSheet(action);
      return;
    }
    complete(action, "");
  }

  const sizeHelp = `Hi Mocha Wear, I need help choosing a size for ${product.name}.`;

  return (
    <>
      <div className="mt-6 lg:mt-8">
        {sizes.length ? (
          <p className="text-[12px] text-mocha/50">
            Sizes {sizes.join(" · ")}. Tap Add or Buy, then choose your size.
          </p>
        ) : null}
        {sizes.length ? (
          <ShopWhatsAppLink
            message={sizeHelp}
            label="Size help on WhatsApp"
            className="mt-2 inline-block text-[11px] tracking-[0.12em] text-mocha/50 uppercase underline decoration-mocha/20 underline-offset-4 hover:text-sale"
          />
        ) : null}

        <StockLine soldOut={soldOut} stock={stock} />
        <ShopTrustLine className="mt-1 mb-4 lg:hidden" />

        <div className="hidden lg:block">
          <QtyControl qty={qty} soldOut={soldOut} maxQty={maxQty} onChange={setQty} size="lg" />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <AddButton soldOut={soldOut} added={added} count={count} onClick={() => start("add")} />
            <BuyButton soldOut={soldOut} onClick={() => start("buy")} />
          </div>
          <ShopTrustLine className="mt-3" />
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-[calc(4.65rem+env(safe-area-inset-bottom))] z-[75] border-t border-sand bg-ivory px-3 py-2.5 shadow-[0_-6px_20px_rgba(31,22,18,0.08)] lg:hidden">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] items-stretch gap-2">
          <QtyControl qty={qty} soldOut={soldOut} maxQty={maxQty} onChange={setQty} size="sm" />
          <AddButton soldOut={soldOut} added={added} count={count} onClick={() => start("add")} compact />
          <BuyButton soldOut={soldOut} onClick={() => start("buy")} compact />
        </div>
      </div>

      {sheet ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-mocha-deep/45 p-0 lg:items-center lg:p-6"
          onClick={() => setSheet(null)}
        >
          <div
            className="w-full bg-ivory px-5 pt-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl lg:max-w-md lg:pb-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-mocha/15 lg:hidden" />
            <p className="text-[11px] font-semibold tracking-[0.18em] text-sale uppercase">Choose size</p>
            <h2 className="font-serif mt-1 text-2xl text-mocha-deep">
              {sheet === "buy" ? "Select a size to buy" : "Select a size to add"}
            </h2>
            <p className="mt-1 text-sm text-mocha/55">{product.name}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {sizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => complete(sheet, size)}
                  className="min-h-11 min-w-11 border border-mocha/20 bg-ivory px-4 text-[13px] font-semibold tracking-[0.1em] text-mocha-deep uppercase hover:border-mocha-deep hover:bg-mocha-deep hover:text-ivory"
                >
                  {size}
                </button>
              ))}
            </div>
            <ShopWhatsAppLink
              message={sizeHelp}
              label="Size help on WhatsApp"
              className="mt-4 inline-block text-[11px] tracking-[0.12em] text-mocha/50 uppercase underline decoration-mocha/20 underline-offset-4 hover:text-sale"
            />
            <button
              type="button"
              onClick={() => setSheet(null)}
              className="mt-5 w-full border border-mocha/20 py-3.5 text-[11px] font-semibold tracking-[0.16em] text-mocha-deep uppercase"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function StockLine({ soldOut, stock }: { soldOut: boolean; stock: number }) {
  return (
    <p className="mt-4 text-[11px] tracking-[0.16em] uppercase lg:mb-3">
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
    <div className={`flex shrink-0 items-center self-stretch border border-mocha/15 ${compact ? "" : "w-fit"}`}>
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={soldOut}
        onClick={() => onChange(Math.max(1, qty - 1))}
        className={`grid place-items-center text-mocha-deep disabled:opacity-30 ${compact ? "h-11 w-10 text-lg" : "h-11 w-11"}`}
      >
        −
      </button>
      <span className={`text-center text-sm tabular-nums ${compact ? "w-7 text-[14px]" : "w-10"}`}>{soldOut ? 0 : qty}</span>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={soldOut}
        onClick={() => onChange(Math.min(maxQty, qty + 1))}
        className={`grid place-items-center text-mocha-deep disabled:opacity-30 ${compact ? "h-11 w-10 text-lg" : "h-11 w-11"}`}
      >
        +
      </button>
    </div>
  );
}

function AddButton({
  soldOut,
  added,
  count,
  onClick,
  compact,
}: {
  soldOut: boolean;
  added: boolean;
  count: number;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={soldOut}
      onClick={onClick}
      className={`relative border border-mocha-deep font-semibold text-mocha-deep uppercase transition-colors hover:bg-mocha-deep hover:text-ivory disabled:cursor-not-allowed disabled:opacity-40 ${
        compact ? "h-11 min-w-0 px-2 text-[12px] tracking-[0.1em]" : "px-4 py-3.5 text-[11px] tracking-[0.18em]"
      }`}
    >
      {soldOut ? "Sold out" : added ? "Added" : "Add to bag"}
      {!soldOut && count ? (
        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-sale px-1 text-[10px] font-semibold text-white">
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
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
      className={`bg-sale font-semibold text-white uppercase transition-colors hover:bg-sale-deep disabled:cursor-not-allowed disabled:opacity-40 ${
        compact ? "h-11 min-w-0 px-2 text-[12px] tracking-[0.1em]" : "px-4 py-3.5 text-[11px] tracking-[0.18em]"
      }`}
    >
      Buy now
    </button>
  );
}
