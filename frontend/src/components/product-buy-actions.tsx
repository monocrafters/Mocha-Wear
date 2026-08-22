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
  const { addProduct } = useCart();
  const sizes = useMemo(() => productSizes(product), [product]);
  const stock = Math.max(0, product.stock ?? 0);
  const soldOut = stock <= 0;
  const maxQty = Math.max(1, Math.min(10, stock || 1));
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [picked, setPicked] = useState("");
  const [needSize, setNeedSize] = useState(false);

  function complete(action: PendingAction, size: string) {
    if (soldOut) return;
    const qtyToAdd = Math.min(qty, maxQty);
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
    if (sizes.length && !picked) {
      setNeedSize(true);
      return;
    }
    setNeedSize(false);
    complete(action, sizes.length ? picked : "");
  }

  const sizeHelp = `Hi Mocha Wear, I need help choosing a size for ${product.name}.`;

  return (
    <>
      <div className="mt-8 hidden lg:block">
        <SizePicker
          sizes={sizes}
          picked={picked}
          needSize={needSize}
          soldOut={soldOut}
          onPick={(size) => {
            setPicked(size);
            setNeedSize(false);
          }}
        />
        {sizes.length ? (
          <ShopWhatsAppLink
            message={sizeHelp}
            label="Size help on WhatsApp"
            className="mt-2 inline-block text-[11px] tracking-[0.12em] text-mocha/50 uppercase underline decoration-mocha/20 underline-offset-4 hover:text-sale"
          />
        ) : null}
        <StockLine soldOut={soldOut} stock={stock} />
        <QtyControl qty={qty} soldOut={soldOut} maxQty={maxQty} onChange={setQty} size="lg" />
        <div className="mt-3 grid grid-cols-2 gap-3">
          <AddButton soldOut={soldOut} added={added} onClick={() => start("add")} />
          <BuyButton soldOut={soldOut} onClick={() => start("buy")} />
        </div>
        <ShopTrustLine className="mt-3" />
      </div>

      <p className="mt-4 text-[10px] tracking-[0.16em] uppercase lg:hidden">
        {soldOut ? <span className="text-sale">Sold out</span> : <span className="text-mocha/45">{stock} in stock</span>}
      </p>
      <ShopTrustLine className="mt-1 lg:hidden" />

      <div className="fixed inset-x-0 bottom-[calc(4.65rem+env(safe-area-inset-bottom))] z-[75] border-t border-sand bg-ivory px-3 py-2 shadow-[0_-6px_20px_rgba(31,22,18,0.08)] lg:hidden">
        {sizes.length ? (
          <div className="mb-2">
            <SizePicker
              sizes={sizes}
              picked={picked}
              needSize={needSize}
              soldOut={soldOut}
              compact
              onPick={(size) => {
                setPicked(size);
                setNeedSize(false);
              }}
            />
          </div>
        ) : null}
        <div className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] items-stretch gap-2">
          <QtyControl qty={qty} soldOut={soldOut} maxQty={maxQty} onChange={setQty} size="sm" />
          <AddButton soldOut={soldOut} added={added} onClick={() => start("add")} compact />
          <BuyButton soldOut={soldOut} onClick={() => start("buy")} compact />
        </div>
      </div>
    </>
  );
}

function SizePicker({
  sizes,
  picked,
  needSize,
  soldOut,
  compact,
  onPick,
}: {
  sizes: string[];
  picked: string;
  needSize: boolean;
  soldOut: boolean;
  compact?: boolean;
  onPick: (size: string) => void;
}) {
  if (!sizes.length) return null;
  return (
    <div className={compact ? "" : "mb-4"}>
      <div className="flex items-center justify-between gap-2">
        <p className={`font-semibold tracking-[0.16em] text-mocha-deep uppercase ${compact ? "text-[9px]" : "mb-2 text-[11px]"}`}>
          Size
        </p>
        {needSize ? (
          <p className={`text-sale uppercase ${compact ? "text-[9px] tracking-[0.1em]" : "text-[10px] tracking-[0.12em]"}`}>
            Choose a size
          </p>
        ) : null}
      </div>
      <div className={`flex flex-wrap ${compact ? "mt-1 gap-1.5" : "gap-2"}`}>
        {sizes.map((size) => {
          const active = picked === size;
          return (
            <button
              key={size}
              type="button"
              disabled={soldOut}
              onClick={() => onPick(size)}
              className={`border font-semibold uppercase disabled:opacity-40 ${
                compact ? "min-w-8 px-2 py-1 text-[10px] tracking-[0.08em]" : "min-w-12 px-3.5 py-2.5 text-[12px] tracking-[0.12em]"
              } ${
                active
                  ? "border-mocha-deep bg-mocha-deep text-ivory"
                  : needSize
                    ? "border-sale/50 bg-white text-mocha-deep"
                    : "border-mocha/20 bg-white text-mocha-deep hover:border-mocha-deep"
              }`}
            >
              {size}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StockLine({ soldOut, stock }: { soldOut: boolean; stock: number }) {
  return (
    <p className="mb-3 mt-4 text-[11px] tracking-[0.16em] uppercase">
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
    <div className={`flex shrink-0 items-center self-stretch border border-mocha/15 ${compact ? "" : "mb-0 w-fit"}`}>
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={soldOut}
        onClick={() => onChange(Math.max(1, qty - 1))}
        className={`grid place-items-center text-mocha-deep disabled:opacity-30 ${compact ? "h-10 w-8 text-base" : "h-11 w-11"}`}
      >
        −
      </button>
      <span className={`text-center text-sm tabular-nums ${compact ? "w-6 text-[13px]" : "w-10"}`}>{soldOut ? 0 : qty}</span>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={soldOut}
        onClick={() => onChange(Math.min(maxQty, qty + 1))}
        className={`grid place-items-center text-mocha-deep disabled:opacity-30 ${compact ? "h-10 w-8 text-base" : "h-11 w-11"}`}
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
        compact ? "h-10 min-w-0 px-2 text-[10px] tracking-[0.1em]" : "px-4 py-3.5 text-[11px] tracking-[0.18em]"
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
        compact ? "h-10 min-w-0 px-2 text-[10px] tracking-[0.1em]" : "px-4 py-3.5 text-[11px] tracking-[0.18em]"
      }`}
    >
      Buy now
    </button>
  );
}
