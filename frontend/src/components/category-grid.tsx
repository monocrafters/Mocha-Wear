"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { API_URL, apiFetch } from "@/lib/api";
import type { Collection } from "@/components/admin-collections";
import { collectionCardSrc, collectionHref } from "@/lib/collection";
import { useSiteSettings } from "@/components/site-settings";

export function CategoryGrid() {
  const [items, setItems] = useState<Collection[]>([]);
  const settings = useSiteSettings();
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiFetch(`${API_URL}/api/collections`)
      .then((res) => res.json())
      .then((data) => setItems(data.items || []))
      .catch(() => setItems([]));
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
    const card = el.querySelector("a");
    const amount = card ? card.getBoundingClientRect().width + 12 : 280;
    el.scrollBy({ left: direction * amount, behavior: "smooth" });
  }

  if (!items.length) return null;

  return (
    <section id="collections" className="w-full py-12 sm:py-14">
      <div className="mx-auto mb-6 flex max-w-[1440px] items-end justify-between px-5 sm:px-8">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.28em] text-sale uppercase">{settings.collections_kicker}</p>
          <h2 className="font-serif mt-1.5 text-3xl tracking-[-0.03em] text-mocha-deep sm:text-4xl">
            {settings.collections_heading}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/collections"
            className="mr-2 hidden text-[11px] tracking-[0.22em] text-mocha/70 uppercase underline decoration-gold/60 underline-offset-8 sm:inline"
          >
            {settings.collections_all_label}
          </Link>
          <button
            type="button"
            onClick={() => scrollByCard(-1)}
            disabled={!canPrev}
            aria-label="Previous collections"
            className="grid h-10 w-10 place-items-center rounded-full border border-mocha/20 bg-ivory text-mocha-deep transition-opacity disabled:opacity-30 lg:hidden"
          >
            <ChevronLeft size={18} strokeWidth={1.6} />
          </button>
          <button
            type="button"
            onClick={() => scrollByCard(1)}
            disabled={!canNext}
            aria-label="Next collections"
            className="grid h-10 w-10 place-items-center rounded-full border border-mocha/20 bg-ivory text-mocha-deep transition-opacity disabled:opacity-30 lg:hidden"
          >
            <ChevronRight size={18} strokeWidth={1.6} />
          </button>
        </div>
      </div>

      <div
        ref={scroller}
        className="hide-scrollbar flex w-full gap-3 overflow-x-auto overscroll-x-contain lg:mx-auto lg:grid lg:max-w-[1440px] lg:grid-cols-4 lg:gap-5 lg:overflow-visible lg:px-8"
      >
        <div className="w-5 shrink-0 sm:w-8 lg:hidden" aria-hidden />
        {items.map((collection) => {
          const src = collectionCardSrc(collection).mobile;
          const kicker = collection.is_on_sale
            ? collection.sale_label || collection.subtitle || "Sale"
            : collection.subtitle;
          return (
            <Link
              key={collection.id}
              href={collectionHref(collection)}
              className="group relative aspect-[4/5] w-[min(72vw,280px)] shrink-0 overflow-hidden bg-sand sm:w-[260px] lg:w-full"
            >
              {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src}
                  alt={collection.name}
                  className="absolute inset-0 h-full w-full object-cover transition duration-[900ms] ease-out group-hover:scale-[1.04]"
                />
              ) : (
                <div className="absolute inset-0 bg-sand" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-mocha-deep/85 via-mocha-deep/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-ivory lg:p-6">
                {kicker ? (
                  <p className="text-[10px] tracking-[0.22em] text-gold uppercase">{kicker}</p>
                ) : null}
                <h3 className="font-serif mt-1.5 text-[1.65rem] leading-none lg:text-[1.85rem]">{collection.name}</h3>
              </div>
            </Link>
          );
        })}
        <div className="w-5 shrink-0 sm:w-8 lg:hidden" aria-hidden />
      </div>
    </section>
  );
}
