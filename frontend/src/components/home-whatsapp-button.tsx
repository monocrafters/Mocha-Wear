"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiJson } from "@/lib/api-cache";
import { useSiteSettings } from "@/components/site-settings";
import { whatsappChatHref } from "@/lib/settings";

const POS_KEY = "mocha-wa-pos";
const SIZE = 56;
const MARGIN = 16;

type Pos = { x: number; y: number };

function defaultPos(): Pos {
  if (typeof window === "undefined") return { x: 0, y: 0 };
  const nav = 74 + (Number.parseInt(getComputedStyle(document.documentElement).getPropertyValue("env(safe-area-inset-bottom)") || "0", 10) || 0);
  return {
    x: window.innerWidth - SIZE - MARGIN,
    y: window.innerHeight - SIZE - MARGIN - nav,
  };
}

function readPos(): Pos | null {
  try {
    const raw = JSON.parse(localStorage.getItem(POS_KEY) || "null");
    if (!raw || typeof raw.x !== "number" || typeof raw.y !== "number") return null;
    return raw;
  } catch {
    return null;
  }
}

function clamp(pos: Pos): Pos {
  const maxX = Math.max(MARGIN, window.innerWidth - SIZE - MARGIN);
  const nav = 80;
  const maxY = Math.max(MARGIN, window.innerHeight - SIZE - MARGIN - nav);
  return {
    x: Math.min(maxX, Math.max(MARGIN, pos.x)),
    y: Math.min(maxY, Math.max(MARGIN, pos.y)),
  };
}

export function HomeWhatsAppButton() {
  const settings = useSiteSettings();
  const [helpNumber, setHelpNumber] = useState("");
  const [helpMessage, setHelpMessage] = useState("");
  const [pos, setPos] = useState<Pos | null>(null);
  const drag = useRef<{
    pointerId: number;
    dx: number;
    dy: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const skipClick = useRef(false);

  useEffect(() => {
    apiJson<{ help?: { whatsapp_number?: string; whatsapp_display?: string; default_message?: string } }>("/api/help")
      .then((data) => {
        setHelpNumber(data.help?.whatsapp_number || data.help?.whatsapp_display || "");
        setHelpMessage(data.help?.default_message || "");
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const next = clamp(readPos() || defaultPos());
    setPos(next);
    function onResize() {
      setPos((current) => clamp(current || defaultPos()));
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLAnchorElement>) => {
    if (!pos) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      pointerId: event.pointerId,
      dx: event.clientX - pos.x,
      dy: event.clientY - pos.y,
      startX: pos.x,
      startY: pos.y,
      moved: false,
    };
  }, [pos]);

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLAnchorElement>) => {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    const next = clamp({ x: event.clientX - state.dx, y: event.clientY - state.dy });
    if (Math.hypot(next.x - state.startX, next.y - state.startY) > 8) state.moved = true;
    setPos(next);
  }, []);

  const onPointerUp = useCallback((event: React.PointerEvent<HTMLAnchorElement>) => {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    drag.current = null;
    if (state.moved) {
      skipClick.current = true;
      setPos((current) => {
        const saved = clamp(current || defaultPos());
        try {
          localStorage.setItem(POS_KEY, JSON.stringify(saved));
        } catch {
          /* ignore */
        }
        return saved;
      });
    }
  }, []);

  if (settings.floating_whatsapp_enabled === false) return null;

  const number = settings.floating_whatsapp_number || settings.phone || helpNumber;
  const message = settings.floating_whatsapp_message || helpMessage;
  const href = whatsappChatHref(number, message);
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat on WhatsApp"
      onClick={(event) => {
        if (skipClick.current) {
          event.preventDefault();
          skipClick.current = false;
        }
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={
        pos
          ? { left: pos.x, top: pos.y, right: "auto", bottom: "auto" }
          : { right: 16, bottom: "calc(5.25rem + env(safe-area-inset-bottom))" }
      }
      className="fixed z-[80] grid h-14 w-14 touch-none place-items-center rounded-full bg-[#25D366] text-white shadow-[0_10px_24px_rgba(37,211,102,0.45)] hover:bg-[#1ebe57] lg:bottom-8"
    >
      <svg viewBox="0 0 24 24" className="pointer-events-none h-7 w-7 fill-current" aria-hidden>
        <path d="M12.04 2c-5.46 0-9.91 4.4-9.91 9.83 0 1.73.46 3.43 1.33 4.92L2 22l5.39-1.41a10.1 10.1 0 0 0 4.65 1.17h.01c5.46 0 9.91-4.4 9.91-9.83C21.96 6.4 17.5 2 12.04 2Zm5.77 13.98c-.24.68-1.4 1.25-1.93 1.33-.5.08-1.13.11-1.82-.11-.42-.14-.96-.31-1.66-.61-2.92-1.26-4.82-4.2-4.97-4.4-.14-.19-1.18-1.57-1.18-3 0-1.42.75-2.12 1.01-2.41.27-.29.58-.36.77-.36h.55c.18 0 .42-.07.66.5.24.58.82 2 .89 2.15.07.14.12.31.02.5-.1.19-.14.31-.29.48-.14.16-.3.37-.43.5-.14.14-.29.29-.12.56.16.27.73 1.2 1.56 1.95 1.08.96 1.98 1.26 2.26 1.4.27.14.43.12.59-.07.16-.19.68-.79.86-1.06.18-.27.36-.22.61-.13.24.1 1.54.73 1.8.86.27.14.44.2.51.31.07.12.07.68-.17 1.36Z" />
      </svg>
    </a>
  );
}
