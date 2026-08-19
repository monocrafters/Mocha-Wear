"use client";

import { useEffect, useState } from "react";
import { API_URL, apiFetch } from "@/lib/api";
import { useSiteSettings } from "@/components/site-settings";
import { whatsappChatHref } from "@/lib/settings";

export function HomeWhatsAppButton() {
  const settings = useSiteSettings();
  const [helpNumber, setHelpNumber] = useState("");
  const [helpMessage, setHelpMessage] = useState("");

  useEffect(() => {
    apiFetch(`${API_URL}/api/help`)
      .then((res) => res.json())
      .then((data) => {
        setHelpNumber(data.help?.whatsapp_number || data.help?.whatsapp_display || "");
        setHelpMessage(data.help?.default_message || "");
      })
      .catch(() => undefined);
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
      className="fixed right-4 z-[80] grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-[0_10px_24px_rgba(37,211,102,0.45)] transition hover:bg-[#1ebe57] bottom-[calc(5.25rem+env(safe-area-inset-bottom))] lg:bottom-8 lg:right-8"
    >
      <svg viewBox="0 0 24 24" className="h-7 w-7 fill-current" aria-hidden>
        <path d="M12.04 2c-5.46 0-9.91 4.4-9.91 9.83 0 1.73.46 3.43 1.33 4.92L2 22l5.39-1.41a10.1 10.1 0 0 0 4.65 1.17h.01c5.46 0 9.91-4.4 9.91-9.83C21.96 6.4 17.5 2 12.04 2Zm5.77 13.98c-.24.68-1.4 1.25-1.93 1.33-.5.08-1.13.11-1.82-.11-.42-.14-.96-.31-1.66-.61-2.92-1.26-4.82-4.2-4.97-4.4-.14-.19-1.18-1.57-1.18-3 0-1.42.75-2.12 1.01-2.41.27-.29.58-.36.77-.36h.55c.18 0 .42-.07.66.5.24.58.82 2 .89 2.15.07.14.12.31.02.5-.1.19-.14.31-.29.48-.14.16-.3.37-.43.5-.14.14-.29.29-.12.56.16.27.73 1.2 1.56 1.95 1.08.96 1.98 1.26 2.26 1.4.27.14.43.12.59-.07.16-.19.68-.79.86-1.06.18-.27.36-.22.61-.13.24.1 1.54.73 1.8.86.27.14.44.2.51.31.07.12.07.68-.17 1.36Z" />
      </svg>
    </a>
  );
}
