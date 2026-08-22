"use client";

import { padTime, useActiveSale, useSaleCountdown } from "@/lib/active-sale";

export function SaleTimerInline({ className = "" }: { className?: string }) {
  const sale = useActiveSale();
  const left = useSaleCountdown(sale?.ends_at);
  if (!sale || left.done) return null;

  const cells = [
    { label: "d", value: left.days },
    { label: "h", value: left.hours },
    { label: "m", value: left.minutes },
    { label: "s", value: left.seconds },
  ];

  return (
    <p className={`text-[12px] tracking-[0.12em] text-mocha-deep/70 ${className}`}>
      <span className="font-semibold tracking-[0.18em] text-sale uppercase">
        {sale.discount_label || "Sale"} · Ends in
      </span>
      {cells.map((cell, index) => (
        <span key={cell.label}>
          {index ? <span className="mx-1.5 text-mocha/25">·</span> : <span className="mx-2" />}
          <span className="font-serif text-[1.05rem] text-mocha-deep tabular-nums">{padTime(cell.value)}</span>
          <span className="ml-0.5 text-[10px] uppercase text-mocha/40">{cell.label}</span>
        </span>
      ))}
    </p>
  );
}

export function SaleTimerProduct() {
  const sale = useActiveSale();
  const left = useSaleCountdown(sale?.ends_at);
  if (!sale || left.done) return null;

  const cells = [
    { label: "Days", value: left.days },
    { label: "Hours", value: left.hours },
    { label: "Mins", value: left.minutes },
    { label: "Secs", value: left.seconds },
  ];

  return (
    <div className="mt-3 border border-sand bg-cream/50 px-3 py-2.5 lg:mt-5 lg:px-4 lg:py-3">
      <p className="store-kicker text-sale">
        {sale.discount_label || "Sale live"} · {sale.name}
      </p>
      <div className="mt-2 flex items-end lg:mt-3" aria-live="polite">
        {cells.map((cell, index) => (
          <div key={cell.label} className="flex items-end">
            {index ? (
              <span className="mb-4 px-0.5 font-serif text-base leading-none text-mocha/25 lg:mb-4 lg:px-1 lg:text-lg" aria-hidden>
                :
              </span>
            ) : null}
            <div className="flex w-[46px] flex-col items-center sm:w-[52px] lg:w-[58px]">
              <p className="font-serif text-[1.15rem] leading-none text-mocha-deep tabular-nums lg:text-[1.35rem]">
                {padTime(cell.value)}
              </p>
              <p className="mt-1.5 text-[11px] font-semibold tracking-[0.14em] text-mocha/45 uppercase">{cell.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SaleTimerStrip() {
  const sale = useActiveSale();
  const left = useSaleCountdown(sale?.ends_at);
  if (!sale || left.done) return null;

  const cells = [
    { label: "d", value: left.days },
    { label: "h", value: left.hours },
    { label: "m", value: left.minutes },
    { label: "s", value: left.seconds },
  ];

  return (
    <div className="w-full min-w-0 overflow-hidden border-b border-sand bg-cream/80">
      <div className="mx-auto flex w-full min-w-0 max-w-[1440px] flex-col gap-1 px-4 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-2 sm:px-8 sm:py-2.5">
        <p className="min-w-0 truncate text-[10px] font-semibold tracking-[0.18em] text-sale uppercase">
          {sale.discount_label || "Sale live"} · {sale.headline || sale.name}
        </p>
        <p className="shrink-0 text-[11px] tracking-[0.08em] text-mocha-deep">
          <span className="mr-2 text-[10px] tracking-[0.16em] text-mocha/45 uppercase">Ends in</span>
          {cells.map((cell, index) => (
            <span key={cell.label}>
              {index ? <span className="mx-1 text-mocha/25">:</span> : null}
              <span className="font-serif tabular-nums">{padTime(cell.value)}</span>
              <span className="ml-0.5 text-[9px] text-mocha/40 uppercase">{cell.label}</span>
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}

export function SaleTimerHeader() {
  const sale = useActiveSale();
  const left = useSaleCountdown(sale?.ends_at);
  if (!sale || left.done) {
    return <>Sale live · Up to 50% off · Free nationwide delivery</>;
  }

  return (
    <>
      {sale.discount_label || "Sale live"} · Ends in {padTime(left.days)}d {padTime(left.hours)}h{" "}
      {padTime(left.minutes)}m {padTime(left.seconds)}s
    </>
  );
}
