"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCatalog } from "@/components/catalog-provider";
import { collectionCardSrc, collectionHref } from "@/lib/collection";
import { CollectionRowSkeleton } from "@/components/skeletons";
import { StoreImage } from "@/components/store-image";
import { useSiteSettings } from "@/components/site-settings";
import type { Collection } from "@/components/admin-collections";

export function CategoryGrid() {
  const { collections: items, loading } = useCatalog();
  const settings = useSiteSettings();
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const featured = items[0];
  const rest = items.slice(1);

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
  }, [rest.length, updateArrows]);

  function scrollByCard(direction: -1 | 1) {
    const el = scroller.current;
    if (!el) return;
    const card = el.querySelector("a");
    const amount = card ? card.getBoundingClientRect().width + 12 : 220;
    el.scrollBy({ left: direction * amount, behavior: "smooth" });
  }

  if (!loading && !items.length) return null;

  return (
    <section id="collections" className="w-full border-t border-sand bg-ivory py-14 lg:py-20">
      <div className="mx-auto mb-8 flex max-w-[1440px] items-end justify-between px-5 sm:px-8">
        <div>
          <p className="store-kicker text-gold">{settings.collections_kicker}</p>
          <h2 className="font-serif mt-2 text-3xl tracking-[-0.03em] text-mocha-deep sm:text-4xl">
            {settings.collections_heading}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/collections"
            prefetch
            className="mr-2 hidden text-[11px] tracking-[0.22em] text-mocha/70 uppercase underline decoration-gold underline-offset-8 sm:inline"
          >
            {settings.collections_all_label}
          </Link>
          {rest.length > 1 ? (
            <>
              <button
                type="button"
                onClick={() => scrollByCard(-1)}
                disabled={!canPrev}
                aria-label="Previous collections"
                className="grid h-9 w-9 place-items-center border border-mocha/15 bg-ivory text-mocha-deep transition-opacity disabled:opacity-30 lg:hidden"
              >
                <ChevronLeft size={16} strokeWidth={1.6} />
              </button>
              <button
                type="button"
                onClick={() => scrollByCard(1)}
                disabled={!canNext}
                aria-label="Next collections"
                className="grid h-9 w-9 place-items-center border border-mocha/15 bg-ivory text-mocha-deep transition-opacity disabled:opacity-30 lg:hidden"
              >
                <ChevronRight size={16} strokeWidth={1.6} />
              </button>
            </>
          ) : null}
        </div>
      </div>

      {loading ? (
        <CollectionRowSkeleton />
      ) : (
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8">
          {featured ? <LookbookCard collection={featured} /> : null}
          {rest.length ? (
            <div
              ref={scroller}
              className="hide-scrollbar mt-4 flex gap-3 overflow-x-auto overscroll-x-contain lg:mt-5 lg:grid lg:grid-cols-3 lg:overflow-visible"
            >
              {rest.map((collection) => (
                <RailCard key={collection.id} collection={collection} />
              ))}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

function collectionKicker(collection: Collection) {
  return collection.is_on_sale
    ? collection.sale_label || collection.subtitle || "Sale"
    : collection.subtitle;
}

function LookbookCard({ collection }: { collection: Collection }) {
  const src = collectionCardSrc(collection).mobile;
  const kicker = collectionKicker(collection);
  return (
    <Link
      href={collectionHref(collection)}
      prefetch
      className="group relative block aspect-[3/4] overflow-hidden bg-sand sm:aspect-[16/9] lg:aspect-[21/9]"
    >
      {src ? (
        <StoreImage
          src={src}
          alt={collection.name}
          className="object-cover transition duration-[900ms] ease-out group-hover:scale-[1.03]"
          sizes="100vw"
          cloudWidth={1400}
          cloudHeight={900}
        />
      ) : (
        <div className="absolute inset-0 bg-sand" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-mocha-deep/80 via-mocha-deep/15 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-6 text-ivory sm:p-8 lg:p-10">
        {kicker ? <p className="store-kicker text-gold">{kicker}</p> : null}
        <h3 className="font-serif mt-2 text-[2.1rem] leading-none sm:text-5xl lg:text-6xl">{collection.name}</h3>
        <span className="mt-4 inline-block text-[11px] font-semibold tracking-[0.2em] uppercase underline decoration-gold underline-offset-8">
          Shop
        </span>
      </div>
    </Link>
  );
}

function RailCard({ collection }: { collection: Collection }) {
  const src = collectionCardSrc(collection).mobile;
  const kicker = collectionKicker(collection);
  return (
    <Link
      href={collectionHref(collection)}
      prefetch
      className="group relative aspect-[4/5] w-[min(58vw,220px)] shrink-0 overflow-hidden bg-sand lg:w-full"
    >
      {src ? (
        <StoreImage
          src={src}
          alt={collection.name}
          className="object-cover transition duration-[900ms] ease-out group-hover:scale-[1.04]"
          sizes="(max-width: 1024px) 58vw, 30vw"
          cloudWidth={640}
          cloudHeight={800}
        />
      ) : (
        <div className="absolute inset-0 bg-sand" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-mocha-deep/85 via-mocha-deep/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4 text-ivory lg:p-5">
        {kicker ? <p className="store-kicker text-gold">{kicker}</p> : null}
        <h3 className="font-serif mt-1.5 text-[1.45rem] leading-none lg:text-[1.65rem]">{collection.name}</h3>
      </div>
    </Link>
  );
}
