"use client";

import { useEffect, useState } from "react";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function HeroSaleTimer({ endsAt }: { endsAt?: string | null }) {
  const [left, setLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, done: false });

  useEffect(() => {
    if (!endsAt) return;
    const tick = () => {
      const diff = Math.max(0, new Date(endsAt).getTime() - Date.now());
      setLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff / 3600000) % 24),
        minutes: Math.floor((diff / 60000) % 60),
        seconds: Math.floor((diff / 1000) % 60),
        done: diff <= 0,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  if (!endsAt || left.done) return null;

  const cells = [
    { label: "d", value: left.days },
    { label: "h", value: left.hours },
    { label: "m", value: left.minutes },
    { label: "s", value: left.seconds },
  ];

  return (
    <p className="hero-copy-item mt-8 hidden leading-none text-mocha-deep/70 lg:block" style={{ transitionDelay: "500ms" }}>
      <span className="store-kicker text-sale lg:text-[13px] lg:tracking-[0.22em]">
        Ends in
      </span>
      {cells.map((cell, index) => (
        <span key={cell.label}>
          {index ? <span className="mx-0.5 text-mocha/20 lg:mx-2.5">·</span> : <span className="mx-1 lg:mx-3" />}
          <span className="font-serif text-[0.95rem] text-mocha-deep tabular-nums lg:text-[1.85rem]">
            {pad(cell.value)}
          </span>
          <span className="ml-px text-[11px] uppercase text-mocha/40 lg:ml-1 lg:text-[12px]">{cell.label}</span>
        </span>
      ))}
    </p>
  );
}
