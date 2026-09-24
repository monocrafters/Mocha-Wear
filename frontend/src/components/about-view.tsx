"use client";

import Link from "next/link";
import { useSiteSettings } from "@/components/site-settings";
import { brandLabel } from "@/lib/settings";

const FACTORY = {
  name: "M/S Zaib Arts",
  regNo: "2026011702772",
  dated: "21-07-2026",
  address: "Sultan Ahmed Road, Rehmanpura, Chowkelahi Plaza, Ichhra, Lahore",
  act: "Factories Act, 1934 · Section 2(j)",
  authority: "Directorate of Labour Welfare, Government of the Punjab",
};

const PILLARS = [
  {
    title: "Made for her wardrobe",
    copy: "Lawn, pret, and formals — warm palettes, considered embroidery, and pieces you can dress up or keep easy.",
  },
  {
    title: "Pakistan-wide COD",
    copy: "Order online, pay at the door. Free nationwide delivery, usually within 3–5 days after confirmation.",
  },
  {
    title: "Easy exchange",
    copy: "Seven days on unworn pieces with tags still on — so the fit feels right when it arrives.",
  },
];

export function AboutView() {
  const settings = useSiteSettings();
  const brand = brandLabel(settings);
  const email = settings.email || "support@mochawear.shop";
  const cities = settings.cities || "Karachi · Lahore · Islamabad";

  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 py-10 lg:px-8 lg:py-16">
      <div className="relative overflow-hidden bg-mocha-deep px-6 py-14 text-ivory sm:px-10 lg:px-14 lg:py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 80% 60% at 20% 20%, #a68a64 0%, transparent 55%), radial-gradient(ellipse 70% 50% at 90% 80%, #4a3428 0%, transparent 50%)",
          }}
        />
        <div className="relative max-w-2xl">
          <p className="text-[10px] font-semibold tracking-[0.28em] text-gold uppercase">About</p>
          <h1 className="font-serif mt-3 text-[2.5rem] leading-[0.95] tracking-[-0.03em] sm:text-5xl lg:text-6xl">
            {brand}
          </h1>
          <p className="mt-5 max-w-lg text-sm leading-7 text-ivory/70 sm:text-base">
            {settings.tagline ||
              "A ladies-suit atelier for the modern wardrobe — warm palettes, considered embroidery, and sale drops worth dressing for."}
          </p>
        </div>
      </div>

      <div className="mt-12 grid gap-10 lg:mt-16 lg:grid-cols-[1.2fr_0.8fr] lg:gap-16">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.22em] text-sale uppercase">Our story</p>
          <h2 className="font-serif mt-2 text-3xl tracking-[-0.02em] text-mocha-deep lg:text-4xl">
            An atelier rooted in Lahore.
          </h2>
          <div className="mt-5 space-y-4 text-sm leading-7 text-mocha/70 sm:text-[15px]">
            <p>
              Mocha Wear is a ladies-suit brand built for everyday polish and occasion dressing — 2 &amp; 3 piece
              lawn, pret, and formals chosen for fabric, colour, and how they wear in real Pakistani heat and homes.
            </p>
            <p>
              We sell direct online with cash on delivery across {cities}. Every order is packed from our
              registered production house in Lahore, so what you see on the site is what leaves our floor.
            </p>
            <p>
              Prefer a person over a form? Message us on WhatsApp from Help, or write to{" "}
              <a href={`mailto:${email}`} className="text-mocha-deep underline decoration-sand underline-offset-4">
                {email}
              </a>
              .
            </p>
          </div>
        </div>

        <aside className="border border-sand bg-cream/60 px-5 py-6 sm:px-6">
          <p className="text-[10px] font-semibold tracking-[0.22em] text-gold uppercase">Registered factory</p>
          <p className="font-serif mt-3 text-2xl text-mocha-deep">{FACTORY.name}</p>
          <p className="mt-3 text-sm leading-6 text-mocha/65">{FACTORY.address}</p>
          <dl className="mt-5 space-y-3 border-t border-sand pt-5 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-mocha/45">Reg. no.</dt>
              <dd className="font-medium text-mocha-deep">{FACTORY.regNo}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-mocha/45">Dated</dt>
              <dd className="font-medium text-mocha-deep">{FACTORY.dated}</dd>
            </div>
            <div>
              <dt className="text-mocha/45">Under</dt>
              <dd className="mt-1 text-mocha-deep">{FACTORY.act}</dd>
            </div>
            <div>
              <dt className="text-mocha/45">Issued by</dt>
              <dd className="mt-1 text-mocha/70">{FACTORY.authority}</dd>
            </div>
          </dl>
        </aside>
      </div>

      <div className="mt-14 border-t border-sand pt-12 lg:mt-20">
        <p className="text-[10px] font-semibold tracking-[0.22em] text-sale uppercase">How we sell</p>
        <h2 className="font-serif mt-2 max-w-md text-3xl tracking-[-0.02em] text-mocha-deep">
          Simple buying. Honest delivery.
        </h2>
        <div className="mt-8 grid gap-8 sm:grid-cols-3">
          {PILLARS.map((item) => (
            <div key={item.title}>
              <h3 className="text-sm font-semibold tracking-wide text-mocha-deep">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-mocha/60">{item.copy}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-14 flex flex-col gap-4 border border-sand bg-white px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:mt-16">
        <div>
          <p className="font-serif text-2xl text-mocha-deep">Visit the sale</p>
          <p className="mt-1 text-sm text-mocha/55">Lawn, pret, and formals — marked down for the season.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/shop"
            className="inline-flex min-h-11 items-center justify-center bg-mocha-deep px-5 text-[11px] font-semibold tracking-[0.16em] text-ivory uppercase"
          >
            Shop suits
          </Link>
          <Link
            href="/help"
            className="inline-flex min-h-11 items-center justify-center border border-mocha/20 px-5 text-[11px] font-semibold tracking-[0.16em] text-mocha-deep uppercase"
          >
            Help
          </Link>
        </div>
      </div>
    </section>
  );
}
