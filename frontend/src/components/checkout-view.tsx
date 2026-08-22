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

const fieldClass =
  "mt-1.5 w-full border border-mocha/15 bg-ivory px-3 py-2.5 text-sm outline-none focus:border-mocha-deep";

type Step = 1 | 2 | 3;

export function CheckoutView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const buyNow = searchParams.get("buy") === "1";
  const { items: cartItems, ready, clear } = useCart();
  const [nowItems, setNowItems] = useState<CartLine[] | null>(null);
  const [saved, setSaved] = useState<SavedAddress | null>(null);
  const [usingSaved, setUsingSaved] = useState(false);
  const [step, setStep] = useState<Step>(1);
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
    if (next) {
      applyAddress(next, true);
      setStep(3);
    }
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
    if (!auto) {
      setError("");
      setStep(3);
    }
  }

  function markEdited() {
    if (usingSaved) setUsingSaved(false);
  }

  function contactOk() {
    const mobile = normalizePkMobile(phone);
    const wa = sameWhatsappOn ? mobile : normalizePkMobile(whatsapp);
    if (!name.trim()) return "Enter your full name.";
    if (!mobile) return "Enter a Pakistani mobile like 03xxxxxxxxx or +92 3xx.";
    if (!sameWhatsappOn && !wa) return "Enter a Pakistani WhatsApp number.";
    return "";
  }

  function addressOk() {
    if (!city.trim() || !area.trim() || !address.trim()) {
      return "City, area, and complete address are required.";
    }
    return "";
  }

  function goNext() {
    setError("");
    if (step === 1) {
      const msg = contactOk();
      if (msg) {
        setError(msg);
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      const msg = addressOk();
      if (msg) {
        setError(msg);
        return;
      }
      setStep(3);
    }
  }

  async function placeOrder(event: FormEvent) {
    event.preventDefault();
    if (!items.length || placing) return;

    const c = contactOk();
    if (c) {
      setStep(1);
      setError(c);
      return;
    }
    const a = addressOk();
    if (a) {
      setStep(2);
      setError(a);
      return;
    }

    const mobile = normalizePkMobile(phone);
    const wa = sameWhatsappOn ? mobile : normalizePkMobile(whatsapp);

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

  const hint =
    step === 1
      ? "Mobile jahan rider call kare."
      : step === 2
        ? "House / street the rider can find."
        : "Check COD total, then confirm.";

  return (
    <>
      <section className="mx-auto w-full min-w-0 max-w-[1440px] px-4 py-8 pb-[calc(7.5rem+env(safe-area-inset-bottom))] sm:px-8 sm:py-14 lg:pb-14">
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

        <ol className="mt-6 flex items-center gap-2 text-[11px] font-semibold tracking-[0.14em] uppercase lg:hidden">
          {([1, 2, 3] as const).map((n) => (
            <li key={n} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setStep(n);
                }}
                className={`grid h-7 w-7 place-items-center ${
                  step === n ? "bg-mocha-deep text-ivory" : step > n ? "bg-sale text-white" : "bg-sand text-mocha/45"
                }`}
              >
                {n}
              </button>
              {n < 3 ? <span className="text-mocha/20">·</span> : null}
            </li>
          ))}
        </ol>
        <p className="mt-2 text-sm text-mocha/50 lg:hidden">{hint}</p>

        <div className="mt-6 grid w-full min-w-0 gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:items-start">
          <form id="checkout-form" onSubmit={placeOrder} className="min-w-0 border border-sand bg-white p-5 sm:p-6">
            {saved ? (
              <button
                type="button"
                onClick={() => applyAddress(saved)}
                className={`mb-5 w-full border px-4 py-3.5 text-left transition ${
                  usingSaved ? "border-mocha-deep bg-cream/70" : "border-sand bg-ivory hover:border-mocha/25"
                }`}
              >
                <p className="text-[10px] font-semibold tracking-[0.18em] text-sale uppercase">
                  {usingSaved ? "Using saved details" : "Saved details · tap to use"}
                </p>
                <p className="mt-1 truncate text-sm font-medium text-mocha-deep">{saved.name}</p>
                <p className="mt-1 truncate text-[12px] leading-5 text-mocha/50">{addressLine(saved)}</p>
              </button>
            ) : null}

            <div className={step === 1 ? "block" : "hidden lg:block"}>
              <h2 className="text-[11px] font-semibold tracking-[0.22em] text-mocha-deep uppercase">1 · Contact</h2>
              <p className="mt-2 hidden text-sm text-mocha/50 lg:block">Mobile jahan rider call kare.</p>
              <div className="mt-4 space-y-3">
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
              </div>
            </div>

            <div className={`${step === 2 ? "block" : "hidden lg:block"} ${step === 1 ? "lg:mt-8" : "mt-0 lg:mt-8"}`}>
              <h2 className="text-[11px] font-semibold tracking-[0.22em] text-mocha-deep uppercase">2 · Address</h2>
              <p className="mt-2 hidden text-sm text-mocha/50 lg:block">House / street the rider can find.</p>
              <div className="mt-4 space-y-3">
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
                          className={`min-h-10 border px-3 py-2 text-[12px] ${
                            active
                              ? "border-mocha-deep bg-mocha-deep text-ivory"
                              : "border-mocha/20 bg-white text-mocha-deep"
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
                      className={`min-h-10 border px-3 py-2 text-[12px] ${
                        cityOther ? "border-mocha-deep bg-mocha-deep text-ivory" : "border-mocha/20 bg-white text-mocha-deep"
                      }`}
                    >
                      Other
                    </button>
                  </div>
                  {cityOther ? (
                    <input
                      autoComplete="address-level2"
                      value={city}
                      onChange={(e) => {
                        markEdited();
                        setCity(e.target.value);
                      }}
                      placeholder="Your city"
                      className={fieldClass}
                    />
                  ) : null}
                </div>
                <label className="block">
                  <span className="text-[10px] tracking-[0.16em] text-mocha/40 uppercase">Area / town</span>
                  <input
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
                    value={landmark}
                    onChange={(e) => {
                      markEdited();
                      setLandmark(e.target.value);
                    }}
                    placeholder="Near a mosque, school, or well-known shop"
                    className={fieldClass}
                  />
                </label>
              </div>
            </div>

            <div className={`${step === 3 ? "block" : "hidden"} mt-6 lg:hidden`}>
              <h2 className="text-[11px] font-semibold tracking-[0.22em] text-mocha-deep uppercase">3 · Review</h2>
              <SummaryBody items={items} subtotal={subtotal} total={total} />
            </div>

            {error ? <p className="mt-4 text-sm text-sale">{error}</p> : null}

            <button
              type="submit"
              disabled={placing}
              className="mt-6 hidden w-full bg-sale px-4 py-3.5 text-[12px] font-semibold tracking-[0.16em] text-white uppercase hover:bg-sale-deep disabled:opacity-60 lg:block"
            >
              {placing ? "Placing order…" : `Confirm COD · ${formatPkr(total)}`}
            </button>
          </form>

          <aside className="hidden min-w-0 border border-sand bg-white p-5 sm:p-6 lg:block">
            <h2 className="text-[11px] font-semibold tracking-[0.22em] text-mocha-deep uppercase">3 · Review</h2>
            <SummaryBody items={items} subtotal={subtotal} total={total} />
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
          <span className="text-mocha/50">{step < 3 ? `Step ${step} of 3` : "COD · Free delivery"}</span>
          <span className="font-medium text-mocha-deep">{formatPkr(total)}</span>
        </div>
        <button
          type={step === 3 ? "submit" : "button"}
          form={step === 3 ? "checkout-form" : undefined}
          disabled={placing}
          onClick={step === 3 ? undefined : goNext}
          className="flex h-11 w-full items-center justify-center bg-sale text-[12px] font-semibold tracking-[0.14em] text-white uppercase disabled:opacity-60"
        >
          {placing ? "Placing order…" : step === 3 ? `Confirm COD · ${formatPkr(total)}` : "Continue"}
        </button>
      </div>
    </>
  );
}

function SummaryBody({
  items,
  subtotal,
  total,
}: {
  items: CartLine[];
  subtotal: number;
  total: number;
}) {
  return (
    <>
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
      <p className="mt-4 text-[12px] leading-5 text-mocha/45">
        Pay the rider in cash when your order arrives. We’ll WhatsApp or call to confirm.
      </p>
    </>
  );
}
