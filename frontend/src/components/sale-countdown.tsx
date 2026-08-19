"use client";

import { padTime, useActiveSale, useSaleCountdown } from "@/lib/active-sale";

export function SaleCountdown() {
  const sale = useActiveSale();
  const left = useSaleCountdown(sale?.ends_at);

  if (!sale || left.done) return null;

  const cells = [
    { label: "Days", value: left.days },
    { label: "Hours", value: left.hours },
    { label: "Mins", value: left.minutes },
    { label: "Secs", value: left.seconds },
  ];

  const endLabel = new Date(sale.ends_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
  });

  return (
    <section id="sale" className="relative overflow-hidden bg-sale text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/20" />
      <div className="mx-auto flex max-w-[1440px] flex-col items-center gap-5 px-4 py-6 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:gap-10 lg:px-14 lg:py-9">
        <div className="max-w-xl text-center lg:text-left">
          <p className="inline-flex items-center gap-2 text-[9px] font-semibold tracking-[0.22em] uppercase text-white/85 lg:text-[11px] lg:tracking-[0.28em]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inset-0 animate-ping rounded-full bg-white/80" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-white" />
            </span>
            {sale.discount_label || "Sale live"} · Closes {endLabel}
          </p>
          <h2 className="font-serif mt-2 text-[1.45rem] leading-[1.15] tracking-[-0.02em] lg:mt-2.5 lg:text-[2.5rem]">
            {sale.headline || sale.name || "Don’t miss the mocha drop."}
          </h2>
        </div>

        <div className="flex items-end" aria-live="polite">
          {cells.map((cell, i) => (
            <div key={cell.label} className="flex items-end">
              {i > 0 ? (
                <span
                  className="mb-6 px-1 font-serif text-lg leading-none text-white/50 sm:mb-7 sm:px-1.5 sm:text-2xl"
                  aria-hidden
                >
                  :
                </span>
              ) : null}
              <div className="flex w-[58px] flex-col items-center sm:w-[76px]">
                <div className="w-full bg-ivory px-1.5 py-2.5 text-center shadow-[0_8px_20px_rgba(0,0,0,0.12)] sm:px-2 sm:py-3.5">
                  <p className="font-serif text-[1.45rem] leading-none text-mocha-deep tabular-nums sm:text-[2rem]">
                    {padTime(cell.value)}
                  </p>
                </div>
                <p className="mt-1.5 text-[8px] font-semibold tracking-[0.18em] text-white/75 uppercase sm:text-[10px] sm:tracking-[0.2em]">
                  {cell.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
