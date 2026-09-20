"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { API_URL } from "@/lib/api";

function clickLabel(target: HTMLElement) {
  const fromAttr = target.getAttribute("data-track") || target.closest("[data-track]")?.getAttribute("data-track");
  if (fromAttr) return fromAttr.slice(0, 160);
  const text = (target.innerText || target.getAttribute("aria-label") || target.getAttribute("title") || "")
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, 160);
}

function clickHref(target: HTMLElement) {
  const anchor = target.closest("a");
  if (anchor?.href) return anchor.href.slice(0, 400);
  return "";
}

async function sendEvent(payload: Record<string, string>) {
  try {
    await fetch(`${API_URL}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
      credentials: "omit",
    });
  } catch {
    /* ignore analytics failures */
  }
}

export function SiteEventsTracker() {
  const pathname = usePathname();
  const lastPath = useRef("");

  useEffect(() => {
    if (!pathname || pathname === lastPath.current) return;
    if (pathname.startsWith("/admin") || pathname.startsWith("/reseller") || pathname.startsWith("/Admin") || pathname.startsWith("/Reseller")) {
      return;
    }
    lastPath.current = pathname;
    void sendEvent({
      type: "page_view",
      path: pathname,
      referrer: typeof document !== "undefined" ? document.referrer || "" : "",
      device: /Mobi|Android|iPhone/i.test(navigator.userAgent) ? "mobile" : "desktop",
    });
  }, [pathname]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const interactive = target.closest("a,button,[role='button'],[data-track]");
      if (!(interactive instanceof HTMLElement)) return;

      const path = window.location.pathname || "/";
      if (path.startsWith("/admin") || path.startsWith("/reseller") || path.startsWith("/Admin") || path.startsWith("/Reseller")) {
        return;
      }

      void sendEvent({
        type: "click",
        path,
        label: clickLabel(interactive),
        href: clickHref(interactive),
        referrer: document.referrer || "",
        device: /Mobi|Android|iPhone/i.test(navigator.userAgent) ? "mobile" : "desktop",
      });
    }

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true } as AddEventListenerOptions);
  }, []);

  return null;
}
