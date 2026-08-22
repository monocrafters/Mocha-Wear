"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCart } from "@/components/cart-provider";
import {
  cartCount,
  cartLineId,
  cartSubtotal,
  clearBuyNow,
  readBuyNow,
  type CartLine,
} from "@/lib/cart";
import {
  addressLine,
  asSavedAddress,
  normalizePkMobile,
  readCustomerSession,
  sameWhatsapp,
  type SavedAddress,
} from "@/lib/customer";
import { formatPkr } from "@/lib/money";
import { placeOrderRequest, readOrdersCache, rememberOrderPhone } from "@/lib/orders";
import { isListedCity, PK_CITIES } from "@/lib/pk-cities";
import { CheckoutSkeleton } from "@/components/skeletons";
import { ShopTrustLine } from "@/components/shop-trust-line";
import { ShopWhatsAppLink } from "@/components/shop-whatsapp-link";
import { HomeWhatsAppButton } from "@/components/home-whatsapp-button";

const fieldClass =
  "mt-1.5 w-full border border-mocha/15 bg-ivory px-3 py-2.5 text-sm outline-none focus:border-mocha-deep";

export function CheckoutView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const buyNow = searchParams.get("buy") === "1";
  const { items: cartItems, ready, clear } = useCart();
  const [nowItems, setNowItems] = useState<CartLine[] | null>(null);
  const [saved, setSaved] = useState<SavedAddress | null>(null);
  const [usingSaved, setUsingSaved] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [sameWhatsappOn, setSameWhatsappOn] = useState(true);
  const [city, setCity] = useState("");
  const [cityOther, setCityOther] = useState(false);
  const [area, setArea] = useState("");
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [error, setError] = useState("");
  const [placing, setPlacing] = useState(false);

  const items = useMemo(() => (buyNow ? nowItems || [] : cartItems), [buyNow, nowItems, cartItems]);
  const count = cartCount(items);
  const subtotal = cartSubtotal(items);
  const total = subtotal;
  const checkoutReady = buyNow ? nowItems !== null : ready;

  useEffect(() => {
    if (buyNow) setNowItems(readBuyNow());
  }, [buyNow]);

  useEffect(() => {
    if (!checkoutReady) return;
    if (items.length) return;
    router.replace(buyNow ? "/shop" : "/cart");
  }, [buyNow, checkoutReady, items.length, router]);

  useEffect(() => {
    const fromSession = readCustomerSession();
    const last = readOrdersCache()[0];
    const fromOrder = asSavedAddress(
      last?.customer
        ? {
            name: last.customer.name,
            phone: last.customer.phone,
            whatsapp: last.customer.whatsapp || last.customer.phone,
            city: last.customer.city || last.city,
            area: last.customer.area,
            address: last.customer.address,
            landmark: last.customer.landmark,
          }
        : null,
    );
    const next = fromSession || fromOrder;
    setSaved(next);
    if (next) applyAddress(next, true);
  }, []);

  function applyAddress(row: SavedAddress, auto = false) {
    setName(row.name);
    setPhone(row.phone);
    setWhatsapp(sameWhatsapp(row) ? "" : row.whatsapp);
    setSameWhatsappOn(sameWhatsapp(row));
    setCity(row.city);
    setCityOther(!isListedCity(row.city));
    setArea(row.area);
    setAddress(row.address);
    setLandmark(row.landmark);
    setUsingSaved(true);
    if (!auto) setError("");
  }

  function markEdited() {
    if (usingSaved) setUsingSaved(false);
  }

  async function placeOrder(event: FormEvent) {
    event.preventDefault();
    if (!items.length || placing) return;

    const mobile = normalizePkMobile(phone);
    const wa = sameWhatsappOn ? mobile : normalizePkMobile(whatsapp);

    if (!name.trim() || !phone.trim() || !city.trim() || !area.trim() || !address.trim()) {
      setError("Full name, mobile, city, area, and complete address are required.");
      return;
    }
    if (!mobile) {
      setError("Enter a Pakistani mobile like 03xxxxxxxxx or +92 3xx.");
      return;
    }
    if (!sameWhatsappOn && !wa) {
      setError("Enter a Pakistani WhatsApp number like 03xxxxxxxxx or +92 3xx.");
      return;
    }

    setPlacing(true);
    setError("");
    try {
      rememberOrderPhone(mobile);
      const order = await placeOrderRequest({
        city: city.trim(),
        customer: {
          name: name.trim(),
          phone: mobile,
          whatsapp: sameWhatsappOn ? mobile : wa,
          city: city.trim(),
          area: area.trim(),
          address: address.trim(),
          landmark: landmark.trim(),
        },
        items: items.map((line) => ({
          product_id: line.productId,
          name: line.name,
          spec: line.spec,
          size: line.size,
          qty: line.qty,
          price: line.price,
          image: line.image,
          slug: line.slug,
        })),
      });
      if (buyNow) clearBuyNow();
      else clear();
      router.push(`/orders/confirmed?id=${encodeURIComponent(order.id)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not place order. Try again.");
      setPlacing(false);
    }
  }

  if (!checkoutReady || !items.length) {
    return <CheckoutSkeleton />;
  }

  return (
    <>
    <section className="mx-auto w-full min-w-0 max-w-[1440px] px-4 py-10 pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:px-8 sm:py-14 lg:pb-14">
      <p className="text-[10px] tracking-[0.18em] text-mocha/40 uppercase">
        <Link href="/" prefetch className="hover:text-mocha-deep">
          Home
        </Link>
        <span className="mx-2">/</span>
        {buyNow ? (
          items[0]?.slug ? (
            <Link href={`/products/${items[0].slug}`} prefetch className="hover:text-mocha-deep">
              Product
            </Link>
          ) : (
            <Link href="/shop" prefetch className="hover:text-mocha-deep">
              Shop
            </Link>
          )
        ) : (
          <Link href="/cart" prefetch className="hover:text-mocha-deep">
            Cart
          </Link>
        )}
        <span className="mx-2">/</span>
        <span className="text-mocha-deep">Checkout</span>
      </p>

      <div className="mt-5 flex min-w-0 flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.28em] text-sale uppercase">Cash on delivery</p>
          <h1 className="font-serif mt-2 text-4xl tracking-[-0.03em] text-mocha-deep sm:text-5xl">Checkout</h1>
          <ShopTrustLine className="mt-2" />
        </div>
        <p className="text-[12px] tracking-[0.16em] text-mocha/45 uppercase">
          {count} piece{count === 1 ? "" : "s"}
        </p>
      </div>

      <div className="mt-8 grid w-full min-w-0 gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:items-start">
        <form id="checkout-form" onSubmit={placeOrder} className="min-w-0 border border-sand bg-white p-5 sm:p-6">
          <h2 className="text-[11px] font-semibold tracking-[0.22em] text-mocha-deep uppercase">
            Delivery details
          </h2>
          <p className="mt-2 text-sm text-mocha/50">
            {saved
              ? usingSaved
                ? "Using your last delivery details. Edit anything that changed."
                : "Tap saved details to fill the form, or enter a new address."
              : "Enter the address the rider should deliver to."}
          </p>

          {saved ? (
            <button
              type="button"
              onClick={() => applyAddress(saved)}
              className={`mt-5 w-full border px-4 py-3.5 text-left transition ${
                usingSaved ? "border-mocha-deep bg-cream/70" : "border-sand bg-ivory hover:border-mocha/25"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold tracking-[0.18em] text-sale uppercase">
                    {usingSaved ? "Using saved details" : "Saved details"}
                  </p>
                  <p className="mt-1 truncate text-sm font-medium text-mocha-deep">{saved.name}</p>
                  <p className="mt-0.5 text-[12px] text-mocha/55">{saved.phone}</p>
                  <p className="mt-1 truncate text-[12px] leading-5 text-mocha/50">{addressLine(saved)}</p>
                </div>
                <span className="shrink-0 text-[10px] tracking-[0.14em] text-mocha/40 uppercase">
                  {usingSaved ? "Selected" : "Tap to fill"}
                </span>
              </div>
            </button>
          ) : null}

          <div className="mt-6 space-y-3">
            <label className="block">
              <span className="text-[10px] tracking-[0.16em] text-mocha/40 uppercase">Full name</span>
              <input
                name="name"
                autoComplete="name"
                value={name}
                onChange={(e) => {
                  markEdited();
                  setName(e.target.value);
                }}
                className={fieldClass}
              />
            </label>

            <label className="block">
              <span className="text-[10px] tracking-[0.16em] text-mocha/40 uppercase">Mobile number</span>
              <input
                name="tel"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => {
                  markEdited();
                  setPhone(e.target.value);
                }}
                placeholder="03xxxxxxxxx or +92 3xx"
                className={fieldClass}
              />
            </label>

            <label className="flex items-center gap-2 text-sm text-mocha-deep">
              <input
                type="checkbox"
                checked={sameWhatsappOn}
                onChange={(e) => {
                  markEdited();
                  setSameWhatsappOn(e.target.checked);
                }}
                className="accent-mocha-deep"
              />
              WhatsApp is the same number
            </label>

            {!sameWhatsappOn ? (
              <label className="block">
                <span className="text-[10px] tracking-[0.16em] text-mocha/40 uppercase">WhatsApp number</span>
                <input
                  name="whatsapp"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  value={whatsapp}
                  onChange={(e) => {
                    markEdited();
                    setWhatsapp(e.target.value);
                  }}
                  placeholder="03xxxxxxxxx or +92 3xx"
                  className={fieldClass}
                />
              </label>
            ) : null}

            <div>
              <span className="text-[10px] tracking-[0.16em] text-mocha/40 uppercase">City</span>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {PK_CITIES.map((item) => {
                  const active = !cityOther && city === item;
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        markEdited();
                        setCityOther(false);
                        setCity(item);
                      }}
                      className={`border px-3 py-1.5 text-[11px] tracking-[0.06em] ${
                        active
                          ? "border-mocha-deep bg-mocha-deep text-ivory"
                          : "border-mocha/20 bg-white text-mocha-deep hover:border-mocha-deep"
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    markEdited();
                    setCityOther(true);
                    if (isListedCity(city)) setCity("");
                  }}
                  className={`border px-3 py-1.5 text-[11px] tracking-[0.06em] ${
                    cityOther
                      ? "border-mocha-deep bg-mocha-deep text-ivory"
                      : "border-mocha/20 bg-white text-mocha-deep hover:border-mocha-deep"
                  }`}
                >
                  Other
                </button>
              </div>
              {cityOther ? (
                <input
                  name="address-level2"
                  autoComplete="address-level2"
                  value={city}
                  onChange={(e) => {
                    markEdited();
                    setCity(e.target.value);
                  }}
                  placeholder="Your city"
                  className={fieldClass}
                />
              ) : (
                <input type="hidden" name="address-level2" value={city} />
              )}
            </div>

            <label className="block">
              <span className="text-[10px] tracking-[0.16em] text-mocha/40 uppercase">Area / town</span>
              <input
                name="address-level3"
                autoComplete="address-level3"
                value={area}
                onChange={(e) => {
                  markEdited();
                  setArea(e.target.value);
                }}
                placeholder="DHA, Gulshan, Johar Town"
                className={fieldClass}
              />
            </label>

            <label className="block">
              <span className="text-[10px] tracking-[0.16em] text-mocha/40 uppercase">Complete address</span>
              <textarea
                name="street-address"
                autoComplete="street-address"
                value={address}
                onChange={(e) => {
                  markEdited();
                  setAddress(e.target.value);
                }}
                rows={3}
                placeholder="House / flat no., street, block"
                className={`${fieldClass} resize-none`}
              />
            </label>

            <label className="block">
              <span className="text-[10px] tracking-[0.16em] text-mocha/40 uppercase">Landmark · optional</span>
              <input
                autoComplete="off"
                value={landmark}
                onChange={(e) => {
                  markEdited();
                  setLandmark(e.target.value);
                }}
                placeholder="Near a mosque, school, or well-known shop"
                className={fieldClass}
              />
            </label>

            {error ? <p className="text-sm text-sale">{error}</p> : null}

            <button
              type="submit"
              disabled={placing}
              className="hidden w-full bg-sale px-4 py-3.5 text-[12px] font-semibold tracking-[0.16em] text-white uppercase hover:bg-sale-deep disabled:opacity-60 lg:block"
            >
              {placing ? "Placing order…" : "Confirm order"}
            </button>
          </div>
        </form>

        <aside className="min-w-0 border border-sand bg-white p-5 sm:p-6">
          <h2 className="text-[11px] font-semibold tracking-[0.22em] text-mocha-deep uppercase">Order summary</h2>
          <div className="mt-5 space-y-3">
            {items.map((line) => (
              <div key={cartLineId(line)} className="flex gap-3">
                <Link href={`/products/${line.slug}`} prefetch className="relative h-16 w-12 shrink-0 overflow-hidden bg-sand">
                  {line.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={line.image} alt={line.name} className="h-full w-full object-cover" />
                  ) : null}
                </Link>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-mocha-deep">{line.name}</p>
                  <p className="mt-0.5 text-[12px] text-mocha/45">
                    {line.size ? `Size ${line.size} · ` : ""}Qty {line.qty} · {formatPkr(line.price * line.qty)}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <dl className="mt-5 space-y-3 border-t border-sand pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-mocha/50">Subtotal</dt>
              <dd>{formatPkr(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-mocha/50">Delivery</dt>
              <dd>Free</dd>
            </div>
            <div className="flex justify-between font-medium">
              <dt>COD total</dt>
              <dd>{formatPkr(total)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-[12px] leading-5 text-mocha/45">Pay the rider in cash when your order arrives. We’ll WhatsApp or call to confirm.</p>
          <ShopWhatsAppLink
            message="Hi Mocha Wear, I have a question before I place my COD order."
            label="Question? WhatsApp us"
            className="mt-4 inline-block text-[11px] tracking-[0.14em] text-mocha/50 uppercase underline decoration-mocha/20 underline-offset-8 hover:text-sale"
          />
          <Link
            href={buyNow && items[0]?.slug ? `/products/${items[0].slug}` : "/cart"}
            prefetch
            className="mt-6 block text-[11px] tracking-[0.16em] text-mocha/50 uppercase underline decoration-mocha/20 underline-offset-8 hover:text-mocha-deep"
          >
            {buyNow ? "Back to product" : "Back to cart"}
          </Link>
        </aside>
      </div>
    </section>

    <div className="fixed inset-x-0 bottom-0 z-[75] border-t border-sand bg-ivory px-4 py-3 pb-[calc(4.65rem+env(safe-area-inset-bottom))] lg:hidden">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-mocha/50">COD · Free delivery</span>
        <span className="font-medium text-mocha-deep">{formatPkr(total)}</span>
      </div>
      <button
        type="submit"
        form="checkout-form"
        disabled={placing}
        className="flex w-full items-center justify-center bg-sale py-3 text-[11px] font-semibold tracking-[0.16em] text-white uppercase disabled:opacity-60"
      >
        {placing ? "Placing order…" : "Confirm order"}
      </button>
    </div>
    <HomeWhatsAppButton lift />
    </>
  );
}
