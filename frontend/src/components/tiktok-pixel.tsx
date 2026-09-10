"use client";

import { Suspense, useEffect } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";

const PIXEL_ID = "DAHERJRC77UES974T0R0";
const CURRENCY = "PKR";

/** Skip dashboards/logins — keep ad attribution on the storefront. */
const SKIP_PATH =
  /^\/(admin|reseller|Admin_Login|Reseller_Login)(\/|$)/i;

type TikTokQueue = {
  page: (...args: unknown[]) => void;
  track: (...args: unknown[]) => void;
  identify: (...args: unknown[]) => void;
  load: (id: string, options?: Record<string, unknown>) => void;
  instance: (id: string) => TikTokQueue;
};

declare global {
  interface Window {
    TiktokAnalyticsObject?: string;
    ttq?: TikTokQueue;
  }
}

export type TikTokProductInput = {
  id?: string;
  code?: string;
  slug?: string;
  name?: string;
  price?: number;
  qty?: number;
};

function shouldTrack(pathname = typeof window !== "undefined" ? window.location.pathname : "") {
  return Boolean(PIXEL_ID) && !SKIP_PATH.test(pathname || "");
}

function productContentId(product: TikTokProductInput) {
  return String(product.id || product.code || product.slug || "").trim();
}

function buildEventPayload(products: TikTokProductInput[], value?: number) {
  const contents = products
    .map((product) => {
      const content_id = productContentId(product);
      if (!content_id) return null;
      const quantity = Math.max(1, Number(product.qty) || 1);
      const price = Number(product.price) || 0;
      return {
        content_id,
        content_type: "product",
        content_name: String(product.name || content_id),
        quantity,
        price,
      };
    })
    .filter(Boolean) as Array<{
    content_id: string;
    content_type: string;
    content_name: string;
    quantity: number;
    price: number;
  }>;

  if (!contents.length) return null;

  const total =
    value != null && Number.isFinite(value)
      ? Number(value)
      : contents.reduce((sum, row) => sum + row.price * row.quantity, 0);

  return {
    contents,
    content_type: "product",
    /** TikTok validators often expect a top-level content_id too. */
    content_id: contents.map((row) => row.content_id).join(","),
    value: Math.max(0, total),
    currency: CURRENCY,
  };
}

export function trackTikTok(event: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined" || !shouldTrack()) return;
  window.ttq?.track(event, params);
}

export function trackViewContent(product: TikTokProductInput) {
  const payload = buildEventPayload([{ ...product, qty: 1 }]);
  if (!payload) return;
  trackTikTok("ViewContent", payload);
}

export function trackAddToCart(product: TikTokProductInput) {
  const payload = buildEventPayload([product]);
  if (!payload) return;
  trackTikTok("AddToCart", payload);
}

export function trackInitiateCheckout(products: TikTokProductInput[], value?: number) {
  const payload = buildEventPayload(products, value);
  if (!payload) return;
  trackTikTok("InitiateCheckout", payload);
}

export function trackPlaceOrder(
  orderId: string,
  products: TikTokProductInput[],
  value?: number,
) {
  if (typeof window === "undefined" || !orderId) return;
  const key = `tt_order_${orderId}`;
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch {
    /* ignore */
  }
  const payload = buildEventPayload(products, value);
  if (!payload) return;
  trackTikTok("PlaceAnOrder", { ...payload, order_id: orderId });
  trackTikTok("CompletePayment", { ...payload, order_id: orderId });
}

function TikTokPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!shouldTrack(pathname)) return;
    window.ttq?.page();
  }, [pathname, searchParams]);

  return null;
}

export function TikTokPixel() {
  if (!PIXEL_ID) return null;

  return (
    <>
      <Script id="tiktok-pixel" strategy="afterInteractive">
        {`
!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
  ttq.load(${JSON.stringify(PIXEL_ID)});
  ttq.page();
}(window, document, 'ttq');
`}
      </Script>
      <Suspense fallback={null}>
        <TikTokPageView />
      </Suspense>
    </>
  );
}
