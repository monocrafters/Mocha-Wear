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
    <section id="sale" className="relative overflow-hidden border-y border-sand bg-cream/70 text-mocha-deep">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-sale" />
      <div className="mx-auto flex max-w-[1440px] flex-col items-center gap-5 px-4 py-7 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:gap-10 lg:px-14 lg:py-10">
        <div className="max-w-xl text-center lg:text-left">
          <p className="store-kicker text-sale">
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
                <span className="mb-5 px-1 font-serif text-lg leading-none text-mocha/25 sm:mb-6 sm:px-1.5 sm:text-2xl" aria-hidden>
                  :
                </span>
              ) : null}
              <div className="flex w-[58px] flex-col items-center sm:w-[76px]">
                <p className="font-serif text-[1.45rem] leading-none text-mocha-deep tabular-nums sm:text-[2rem]">
                  {padTime(cell.value)}
                </p>
                <p className="mt-1.5 text-[11px] font-semibold tracking-[0.16em] text-mocha/45 uppercase">{cell.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
