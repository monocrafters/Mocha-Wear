"use client";

import { Suspense, useEffect } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";

const PIXEL_ID = "DAHERJRC77UES974T0R0";

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

function shouldTrack(pathname: string) {
  return Boolean(PIXEL_ID) && !SKIP_PATH.test(pathname || "");
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

export function trackTikTok(event: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined" || !PIXEL_ID) return;
  if (SKIP_PATH.test(window.location.pathname || "")) return;
  window.ttq?.track(event, params);
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
