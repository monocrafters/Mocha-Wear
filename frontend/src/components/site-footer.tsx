"use client";

import Link from "next/link";
import { useSiteSettings } from "@/components/site-settings";
import { copyrightLine, instagramHref } from "@/lib/settings";

const visitLinks = [
  { href: "/shop", label: "Shop" },
  { href: "/collections", label: "Collections" },
  { href: "/#sale", label: "Sale" },
  { href: "/cart", label: "Cart" },
  { href: "/orders", label: "Orders" },
  { href: "/help", label: "Help" },
];

export function SiteFooter({ showOnMobile = false }: { showOnMobile?: boolean }) {
  const settings = useSiteSettings();
  const words = settings.marquee.length ? settings.marquee : ["Mocha Wear"];
  const ig = instagramHref(settings);

  return (
    <footer className={`bg-mocha-deep text-ivory ${showOnMobile ? "" : "hidden lg:block"}`}>
      {showOnMobile ? <MobileStrip /> : null}

      <div className="hidden lg:block">
        <div className="overflow-hidden border-b border-ivory/10 py-5">
          <div className="animate-marquee flex w-max gap-12 text-[11px] tracking-[0.38em] uppercase text-ivory/70">
            {Array.from({ length: 12 }).map((_, i) => (
              <span key={i} className="flex gap-12">
                {words.map((word, w) => (
                  <span key={`${i}-${w}`}>{word}</span>
                ))}
              </span>
            ))}
          </div>
        </div>

        <div className="mx-auto grid max-w-[1440px] gap-12 px-8 py-20 md:grid-cols-4">
          <div className="md:col-span-2">
            <p className="font-serif text-4xl tracking-[0.18em] uppercase">{settings.brand_name}</p>
            {settings.brand_suffix ? (
              <p className="mt-1 text-[10px] tracking-[0.4em] text-gold uppercase">{settings.brand_suffix}</p>
            ) : null}
            {settings.tagline ? (
              <p className="mt-6 max-w-sm text-sm leading-7 text-ivory/60">{settings.tagline}</p>
            ) : null}
          </div>
          <div>
            <p className="text-[10px] tracking-[0.28em] text-gold uppercase">{settings.visit_heading}</p>
            <ul className="mt-5 space-y-2.5 text-sm text-ivory/65">
              {visitLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} prefetch className="hover:text-ivory">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[10px] tracking-[0.28em] text-gold uppercase">{settings.atelier_heading}</p>
            <ul className="mt-5 space-y-2.5 text-sm text-ivory/65">
              {settings.email ? (
                <li>
                  <a href={`mailto:${settings.email}`} className="hover:text-ivory">
                    {settings.email}
                  </a>
                </li>
              ) : null}
              {settings.phone ? <li>{settings.phone}</li> : null}
              {settings.cities ? <li>{settings.cities}</li> : null}
              {settings.delivery_line ? <li>{settings.delivery_line}</li> : null}
              {settings.instagram ? (
                <li className="flex items-center gap-2 pt-2">
                  <svg
                    aria-hidden
                    viewBox="0 0 24 24"
                    className="h-4 w-4 fill-none stroke-current"
                    strokeWidth="1.6"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
                  </svg>
                  {ig ? (
                    <a href={ig} target="_blank" rel="noreferrer" className="hover:text-ivory">
                      {settings.instagram}
                    </a>
                  ) : (
                    settings.instagram
                  )}
                </li>
              ) : null}
            </ul>
          </div>
        </div>
      </div>

      <div
        className={`border-t border-ivory/10 px-5 py-5 text-center text-[10px] tracking-[0.22em] text-ivory/35 uppercase ${
          showOnMobile ? "pb-24 lg:pb-5" : "lg:pb-5"
        }`}
      >
        {copyrightLine(settings)}
      </div>
    </footer>
  );
}

function MobileStrip() {
  const settings = useSiteSettings();
  return (
    <div className="border-b border-ivory/10 px-5 py-8 lg:hidden">
      <p className="font-serif text-3xl tracking-[0.18em] uppercase">{settings.brand_name}</p>
      {settings.brand_suffix ? (
        <p className="mt-1 text-[10px] tracking-[0.4em] text-gold uppercase">{settings.brand_suffix}</p>
      ) : null}
      {settings.mobile_line ? <p className="mt-4 text-sm text-ivory/60">{settings.mobile_line}</p> : null}
      {settings.email ? <p className="mt-3 text-sm text-ivory/50">{settings.email}</p> : null}
    </div>
  );
}
