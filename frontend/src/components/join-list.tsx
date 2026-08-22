"use client";

import { useSiteSettings } from "@/components/site-settings";

export function JoinList() {
  const settings = useSiteSettings();
  if (!settings.newsletter_enabled) return null;

  return (
    <section id="contact" className="border-t border-sand bg-ivory px-5 py-16 text-center sm:px-8 lg:py-24">
      <p className="store-kicker text-gold">{settings.newsletter_kicker}</p>
      <h2 className="font-serif mt-4 text-4xl tracking-[-0.03em] text-mocha-deep sm:text-5xl">
        {settings.newsletter_heading}
      </h2>
      <form className="mx-auto mt-10 flex max-w-md border-b border-mocha/25">
        <input
          type="email"
          placeholder={settings.newsletter_placeholder}
          className="w-full bg-transparent py-3 text-sm text-mocha-deep outline-none placeholder:text-mocha/35"
        />
        <button type="button" className="px-2 text-[11px] tracking-[0.2em] text-mocha-deep uppercase">
          {settings.newsletter_button}
        </button>
      </form>
    </section>
  );
}
