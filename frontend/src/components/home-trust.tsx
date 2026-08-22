"use client";

import { useSiteSettings } from "@/components/site-settings";

export function HomeTrust() {
  const settings = useSiteSettings();
  const items = [
    settings.delivery_line?.trim() || "",
    "Cash on delivery",
    settings.phone?.trim() || (settings.floating_whatsapp_enabled ? "WhatsApp atelier" : ""),
  ].filter(Boolean);

  if (!items.length) return null;

  return (
    <section className="border-y border-sand bg-ivory">
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 divide-y divide-sand px-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-8">
        {items.map((line) => (
          <p
            key={line}
            className="py-5 text-center font-serif text-[1.05rem] leading-snug text-mocha-deep sm:py-7"
          >
            {line}
          </p>
        ))}
      </div>
    </section>
  );
}

export function HomeAtelierLine() {
  const settings = useSiteSettings();
  const parts = ["Cash on delivery", settings.cities?.trim(), settings.delivery_line?.trim()].filter(Boolean);
  if (!parts.length) return null;

  return (
    <p className="mt-10 text-center text-[11px] tracking-[0.18em] text-mocha/40 uppercase">{parts.join(" · ")}</p>
  );
}
