"use client";

import Link from "next/link";
import { useSiteSettings } from "@/components/site-settings";

export function ShopNotes() {
  const settings = useSiteSettings();
  const notes = settings.notes.filter((note) => note.title || note.copy);
  if (!notes.length && !settings.notes_heading) return null;

  return (
    <section id="help" className="border-t border-sand bg-ivory">
      <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 sm:py-14">
        <div className="mb-8 max-w-xl">
          {settings.notes_kicker ? (
            <p className="text-[11px] font-semibold tracking-[0.28em] text-sale uppercase">{settings.notes_kicker}</p>
          ) : null}
          {settings.notes_heading ? (
            <h2 className="font-serif mt-2 text-3xl tracking-[-0.03em] text-mocha-deep sm:text-4xl">
              {settings.notes_heading}
            </h2>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          {notes.map((note) => (
            <article key={note.id} className="border border-sand bg-cream/50 px-4 py-5 sm:px-5 sm:py-6">
              <h3 className="font-serif text-[1.25rem] text-mocha-deep">{note.title}</h3>
              <p className="mt-2 text-[13px] leading-6 text-mocha/65">{note.copy}</p>
            </article>
          ))}
        </div>
        {settings.notes_cta ? (
          <Link
            href="/help"
            prefetch
            className="mt-8 inline-block text-[11px] font-semibold tracking-[0.18em] text-mocha-deep uppercase underline decoration-gold underline-offset-8"
          >
            {settings.notes_cta}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
