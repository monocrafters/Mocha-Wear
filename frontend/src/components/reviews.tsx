"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { API_URL, apiFetch } from "@/lib/api";
import type { Review } from "@/components/admin-reviews";
import { useSiteSettings } from "@/components/site-settings";
import { ReviewRowSkeleton } from "@/components/skeletons";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function Stars({ rating }: { rating: number }) {
  return (
    <p className="text-[13px] tracking-[0.08em] text-gold" aria-label={`${rating} out of 5 stars`}>
      {"★".repeat(rating)}
      <span className="text-mocha/15">{"★".repeat(Math.max(0, 5 - rating))}</span>
    </p>
  );
}

export function Reviews() {
  const [items, setItems] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const settings = useSiteSettings();
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiFetch(`${API_URL}/api/reviews`)
      .then((res) => res.json())
      .then((data) => setItems(data.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const updateArrows = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 8);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    updateArrows();
    el.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, [items, updateArrows]);

  function scrollByCard(direction: -1 | 1) {
    const el = scroller.current;
    if (!el) return;
    const card = el.querySelector("article");
    const amount = card ? card.getBoundingClientRect().width + 12 : 300;
    el.scrollBy({ left: direction * amount, behavior: "smooth" });
  }

  if (!loading && !items.length) return null;

  return (
    <section id="reviews" className="w-full border-t border-sand bg-cream/70 py-12 sm:py-14">
      <div className="mx-auto mb-6 flex max-w-[1440px] items-end justify-between px-5 sm:px-8">
        <div className="max-w-xl">
          <p className="text-[11px] font-semibold tracking-[0.28em] text-sale uppercase">{settings.reviews_kicker}</p>
          <h2 className="font-serif mt-2 text-3xl tracking-[-0.03em] text-mocha-deep sm:text-4xl">
            {settings.reviews_heading}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <p className="mr-2 hidden text-[12px] tracking-[0.16em] text-mocha/45 uppercase sm:block">
            {items.length} reviews{settings.reviews_aside ? ` · ${settings.reviews_aside}` : ""}
          </p>
          <button
            type="button"
            onClick={() => scrollByCard(-1)}
            disabled={!canPrev}
            aria-label="Previous reviews"
            className="grid h-10 w-10 place-items-center rounded-full border border-mocha/20 bg-ivory text-mocha-deep transition-opacity disabled:opacity-30"
          >
            <ChevronLeft size={18} strokeWidth={1.6} />
          </button>
          <button
            type="button"
            onClick={() => scrollByCard(1)}
            disabled={!canNext}
            aria-label="Next reviews"
            className="grid h-10 w-10 place-items-center rounded-full border border-mocha/20 bg-ivory text-mocha-deep transition-opacity disabled:opacity-30"
          >
            <ChevronRight size={18} strokeWidth={1.6} />
          </button>
        </div>
      </div>

      {loading ? (
        <ReviewRowSkeleton />
      ) : (
      <div
        ref={scroller}
        className="hide-scrollbar flex w-full gap-3 overflow-x-auto overscroll-x-contain"
      >
        <div className="w-5 shrink-0 sm:w-8" aria-hidden />
        {items.map((item) => (
          <ReviewCard key={item.id} item={item} />
        ))}
        <div className="w-5 shrink-0 sm:w-8" aria-hidden />
      </div>
      )}
    </section>
  );
}

function ReviewCard({ item }: { item: Review }) {
  return (
    <article className="flex w-[min(78vw,320px)] shrink-0 flex-col justify-between border border-sand bg-ivory px-5 py-6">
      <div>
        <Stars rating={item.rating} />
        <p className="mt-4 text-[15px] leading-7 text-mocha-deep">“{item.quote}”</p>
      </div>
      <div className="mt-6 flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-mocha-deep text-[10px] font-semibold tracking-[0.12em] text-ivory">
          {initials(item.name)}
        </span>
        <div>
          <p className="text-sm text-mocha-deep">{item.name}</p>
          {item.city ? <p className="text-[11px] tracking-[0.12em] text-mocha/45 uppercase">{item.city}</p> : null}
        </div>
      </div>
    </article>
  );
}
