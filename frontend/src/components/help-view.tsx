"use client";

import { useEffect, useState } from "react";
import {
  ChevronRight,
  Clock,
  Headset,
  MapPin,
  MessageCircle,
  Package,
  RefreshCw,
  Ruler,
  ShoppingBag,
  Tag,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { API_URL, apiFetch } from "@/lib/api";
import { DEFAULT_HELP, whatsappHref, type HelpContent } from "@/lib/support";

const ICONS: Record<string, LucideIcon> = {
  ruler: Ruler,
  package: Package,
  "map-pin": MapPin,
  refresh: RefreshCw,
  headset: Headset,
  clock: Clock,
  truck: Truck,
  message: MessageCircle,
  "shopping-bag": ShoppingBag,
  tag: Tag,
};

export function HelpView() {
  const [help, setHelp] = useState<HelpContent>(DEFAULT_HELP);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    apiFetch(`${API_URL}/api/help`)
      .then((res) => res.json())
      .then((data) => {
        if (data.help) setHelp({ ...DEFAULT_HELP, ...data.help });
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const chatHref = whatsappHref(help.whatsapp_number, help.default_message);
  const number = help.whatsapp_display || help.whatsapp_number;

  if (!ready) {
    return (
      <p className="px-5 py-16 text-center text-sm tracking-[0.16em] text-mocha/45 uppercase">Loading support…</p>
    );
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col lg:mx-auto lg:max-w-[1440px] lg:w-full lg:px-8 lg:py-16">
      <MobileHelp help={help} chatHref={chatHref} number={number} />
      <DesktopHelp help={help} chatHref={chatHref} number={number} />
    </section>
  );
}

function MobileHelp({
  help,
  chatHref,
  number,
}: {
  help: HelpContent;
  chatHref: string;
  number: string;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col lg:hidden">
      <div className="flex items-end justify-between px-4 py-3">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.22em] text-sale uppercase">{help.kicker}</p>
          <h1 className="font-serif mt-0.5 text-[1.75rem] leading-none tracking-[-0.03em] text-mocha-deep">
            {help.title}
          </h1>
        </div>
        {help.hours ? (
          <p className="flex items-center gap-1 text-[11px] text-mocha/45">
            <Clock size={12} strokeWidth={1.8} />
            {help.hours}
          </p>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(8.25rem+env(safe-area-inset-bottom))]">
        {help.topics.length ? (
          <div className="overflow-hidden bg-white">
            {help.topics.map((topic, index) => {
              const Icon = ICONS[topic.icon] || MessageCircle;
              return (
                <a
                  key={topic.id}
                  href={whatsappHref(help.whatsapp_number, topic.message)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-3 px-3.5 py-3.5 active:bg-cream/80 ${
                    index ? "border-t border-sand" : ""
                  }`}
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center bg-cream text-mocha-deep">
                    <Icon size={16} strokeWidth={1.7} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-medium text-mocha-deep">{topic.title}</span>
                    <span className="mt-0.5 block truncate text-[12px] text-mocha/45">{topic.copy}</span>
                  </span>
                  <ChevronRight size={16} strokeWidth={1.7} className="shrink-0 text-mocha/25" />
                </a>
              );
            })}
          </div>
        ) : null}

        {help.notes.length ? (
          <div className="mt-3 grid grid-cols-2 gap-px bg-sand">
            {help.notes.map((note) => (
              <article key={note.id} className="bg-ivory px-3.5 py-3.5">
                <p className="text-[13px] font-medium text-mocha-deep">{note.title}</p>
                <p className="mt-0.5 text-[12px] text-mocha/50">{note.copy}</p>
              </article>
            ))}
          </div>
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-sand bg-white px-4 pt-3 pb-[calc(3.85rem+env(safe-area-inset-bottom))]">
        <p className="mb-2 text-center text-[11px] text-mocha/45">
          {[number, help.reply_line].filter(Boolean).join(" · ")}
        </p>
        <a
          href={chatHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 bg-[#25D366] py-3 text-[11px] font-semibold tracking-[0.16em] text-white uppercase"
        >
          <WhatsAppMark />
          {help.cta_label}
        </a>
      </div>
    </div>
  );
}

function DesktopHelp({
  help,
  chatHref,
  number,
}: {
  help: HelpContent;
  chatHref: string;
  number: string;
}) {
  return (
    <div className="hidden lg:block">
      <div className="grid items-start gap-16 lg:grid-cols-[minmax(340px,0.85fr)_minmax(0,1.15fr)]">
        <aside className="sticky top-[calc(var(--header-h)+28px)]">
          <p className="text-[11px] font-semibold tracking-[0.28em] text-sale uppercase">{help.kicker}</p>
          <h1 className="font-serif mt-3 text-5xl tracking-[-0.03em] text-mocha-deep">
            {help.desktop_heading || help.title}
          </h1>
          {help.desktop_copy ? (
            <p className="mt-5 max-w-sm text-[15px] leading-7 text-mocha/60">{help.desktop_copy}</p>
          ) : null}

          <div className="mt-10 bg-mocha-deep px-7 py-8 text-ivory">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-white/10">
              <Headset size={22} strokeWidth={1.6} />
            </span>
            <p className="font-serif mt-5 text-3xl leading-none">{help.cta_label}</p>
            <p className="mt-4 flex items-center gap-2 text-sm text-ivory/65">
              <Clock size={14} strokeWidth={1.7} />
              {[help.hours, help.reply_line].filter(Boolean).join(" · ")}
            </p>
            {number ? <p className="mt-1 text-sm text-ivory/45">{number}</p> : null}
            <a
              href={chatHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-7 inline-flex items-center gap-2 bg-[#25D366] px-5 py-3.5 text-[11px] font-semibold tracking-[0.18em] text-white uppercase transition-opacity hover:opacity-90"
            >
              <WhatsAppMark />
              {help.cta_desktop_label}
            </a>
          </div>
        </aside>

        <div>
          {help.topics_heading ? (
            <p className="text-[11px] font-semibold tracking-[0.28em] text-sale uppercase">{help.topics_heading}</p>
          ) : null}
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {help.topics.map((topic) => {
              const Icon = ICONS[topic.icon] || MessageCircle;
              return (
                <a
                  key={topic.id}
                  href={whatsappHref(help.whatsapp_number, topic.message)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group border border-sand bg-white px-6 py-6 transition-colors hover:border-mocha-deep"
                >
                  <span className="grid h-10 w-10 place-items-center bg-cream text-mocha-deep">
                    <Icon size={18} strokeWidth={1.6} />
                  </span>
                  <h2 className="font-serif mt-5 text-[1.6rem] leading-none text-mocha-deep">{topic.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-mocha/55">{topic.copy}</p>
                  <span className="mt-5 inline-flex items-center gap-1 text-[11px] font-semibold tracking-[0.16em] text-[#128C7E] uppercase">
                    Message us
                    <ChevronRight
                      size={14}
                      strokeWidth={1.8}
                      className="transition-transform group-hover:translate-x-0.5"
                    />
                  </span>
                </a>
              );
            })}
          </div>

          {help.notes.length ? (
            <>
              {help.notes_heading ? (
                <p className="mt-14 text-[11px] font-semibold tracking-[0.28em] text-sale uppercase">
                  {help.notes_heading}
                </p>
              ) : null}
              <div className="mt-5 grid grid-cols-2 gap-4">
                {help.notes.map((note) => (
                  <article key={note.id} className="border border-sand bg-cream/50 px-6 py-6">
                    <h2 className="font-serif text-[1.35rem] text-mocha-deep">{note.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-mocha/60">{note.copy}</p>
                  </article>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function WhatsAppMark() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-current">
      <path d="M12.04 2C6.58 2 2.15 6.4 2.15 11.83c0 1.94.57 3.76 1.56 5.28L2 22l5.05-1.64A10.1 10.1 0 0 0 12.04 22C17.5 22 21.93 17.6 21.93 12.17 21.93 6.74 17.5 2 12.04 2Zm5.77 14.4c-.24.68-1.4 1.26-1.94 1.34-.5.07-1.12.1-1.81-.11-.42-.13-.95-.31-1.64-.6-2.88-1.25-4.76-4.16-4.9-4.35-.15-.2-1.2-1.6-1.2-3.05 0-1.46.76-2.17 1.03-2.47.27-.3.6-.37.8-.37h.57c.18 0 .43-.07.67.51.24.6.82 2.07.89 2.22.07.15.12.32.02.52-.1.2-.15.32-.3.5-.15.17-.31.38-.45.51-.15.15-.3.31-.13.6.18.3.79 1.3 1.7 2.1 1.17 1.04 2.16 1.36 2.46 1.51.3.15.48.13.65-.08.18-.2.75-.87.95-1.17.2-.3.4-.25.67-.15.27.1 1.72.81 2.01.96.3.15.5.22.57.34.08.13.08.74-.16 1.42Z" />
    </svg>
  );
}
