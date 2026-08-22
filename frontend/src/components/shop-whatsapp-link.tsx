"use client";

import { useEffect, useState } from "react";
import { apiJson, peekApiCache } from "@/lib/api-cache";
import { useSiteSettings } from "@/components/site-settings";
import { DEFAULT_HELP, type HelpContent, whatsappHref } from "@/lib/support";
import { whatsappChatHref } from "@/lib/settings";

export function ShopWhatsAppLink({
  message,
  label,
  className = "",
}: {
  message: string;
  label: string;
  className?: string;
}) {
  const settings = useSiteSettings();
  const cached = peekApiCache<{ help?: HelpContent }>("/api/help");
  const [help, setHelp] = useState<HelpContent | null>(cached?.help || null);

  useEffect(() => {
    apiJson<{ help?: HelpContent }>("/api/help", { staleWhileRevalidate: true })
      .then((data) => {
        if (data.help) setHelp({ ...DEFAULT_HELP, ...data.help });
      })
      .catch(() => undefined);
  }, []);

  const number = settings.floating_whatsapp_number || settings.phone || help?.whatsapp_number || "";
  const href = whatsappChatHref(number, message) || whatsappHref(number, message);
  if (!href || href === "#") return null;

  return (
    <a href={href} target="_blank" rel="noreferrer" className={className}>
      {label}
    </a>
  );
}
