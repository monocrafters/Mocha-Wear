"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import type { HeroSlide } from "@/components/admin-hero";
import { HeroSaleTimer } from "@/components/hero-sale-timer";
import { useCatalog } from "@/components/catalog-provider";
import { useActiveSale } from "@/lib/active-sale";

function heroHref(value?: string, fallback = "/") {
  const raw = String(value || "").trim() || fallback;
  if (raw.startsWith("#")) return `/${raw}`;
  return raw;
}

function HeroCta({
  href,
  className,
  children,
}: {
  href: string;
  className: string;
  children: ReactNode;
}) {
  const target = heroHref(href);
  if (/^https?:\/\//i.test(target) || target.startsWith("mailto:") || target.startsWith("tel:")) {
    return (
      <a href={target} className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link href={target} className={className}>
      {children}
    </Link>
  );
}

export function SaleHero() {
  const { heroSlides } = useCatalog();
  const [index, setIndex] = useState(0);
  const slides = heroSlides;

  useEffect(() => {
    setIndex(0);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (!slides.length) return null;

  const active = slides[index];
  const imageOnly = active?.kind === "image";

  return (
    <section
      className={
        imageOnly
          ? "relative h-[30svh] min-h-[210px] bg-sand lg:h-auto lg:min-h-[calc(100dvh-var(--header-h))]"
          : "grid h-[30svh] min-h-[210px] grid-cols-[minmax(0,6fr)_minmax(0,4fr)] bg-ivory lg:h-auto lg:min-h-[calc(100dvh-var(--header-h))]"
      }
    >
      <div
        className={
          imageOnly
            ? "absolute inset-0 overflow-hidden bg-sand"
            : "relative order-2 h-full min-h-0 overflow-hidden bg-sand lg:min-h-[calc(100dvh-var(--header-h))]"
        }
      >
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            className={`hero-slide-media absolute inset-0 ${i === index ? "is-active" : ""}`}
            aria-hidden={i !== index}
          >
            {slide.video ? (
              <video
                src={slide.video}
                className="absolute inset-0 h-full w-full object-cover object-[center_18%] lg:object-center"
                autoPlay={i === index}
                muted
                loop
                playsInline
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={slide.image || ""}
                alt={slide.alt || slide.heading}
                className="absolute inset-0 h-full w-full object-cover object-[center_18%] lg:object-center"
              />
            )}
            {slide.sale_tag_visible && slide.sale_tag_value ? (
              <div className="absolute right-2 top-2 z-20 rotate-3 bg-ivory px-1.5 py-1 text-center shadow-md lg:right-5 lg:top-5 lg:px-3 lg:py-2">
                <p className="text-[8px] font-semibold tracking-[0.18em] text-sale uppercase lg:text-[10px]">
                  {slide.sale_tag_label || "Sale"}
                </p>
                <p className="font-serif text-sm leading-none text-mocha-deep lg:text-2xl">{slide.sale_tag_value}</p>
              </div>
            ) : null}
          </div>
        ))}

        {slides.length > 1 ? (
          <div className="absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 gap-2 lg:bottom-5">
            {slides.map((item, i) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  i === index ? "w-6 bg-ivory" : "w-1.5 bg-ivory/55"
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        ) : null}
      </div>

      {!imageOnly ? (
      <div className="relative order-1 flex h-full min-h-0 items-center overflow-hidden px-2.5 py-2 sm:px-5 lg:min-h-[calc(100dvh-var(--header-h))] lg:px-14 lg:py-0 xl:px-20">
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            className={`hero-slide w-full ${
              i === index ? "is-active relative" : "pointer-events-none absolute inset-0 flex items-center px-3 sm:px-5 lg:px-14 xl:px-20"
            }`}
            aria-hidden={i !== index}
          >
            <SlideContext slide={slide} />
          </div>
        ))}
      </div>
      ) : null}
    </section>
  );
}

function isWasLabel(item: { label: string; strike?: boolean }) {
  return Boolean(item.strike) || /^was$/i.test(item.label);
}

function isPriceLabel(item: { label: string; accent?: boolean; strike?: boolean }) {
  return /^(price|now|current)$/i.test(item.label) || (Boolean(item.accent) && !isWasLabel(item));
}

function SlideContext({ slide }: { slide: HeroSlide }) {
  const active = useActiveSale();
  const endsAt = slide.sale?.ends_at || active?.ends_at;
  const labels = (slide.labels || []).filter((item) => item.label || item.value);
  const kickerParts = slide.kicker
    ? slide.kicker.split("·").map((part) => part.trim()).filter(Boolean)
    : [];
  const was = labels.find((item) => isWasLabel(item));
  const price = labels.find((item) => item !== was && isPriceLabel(item));
  const specs = labels.filter((item) => item !== price && item !== was);
  const mobileSpecs = specs.filter((item) => !/^print$/i.test(item.label.trim()));

  return (
    <div className="mx-auto w-full max-w-xl text-center lg:mx-0 lg:text-left">
      {kickerParts.length || slide.sale_badge_enabled ? (
        <div className="hero-copy-item flex flex-wrap items-center justify-center gap-1.5 lg:justify-start lg:gap-2.5" style={{ transitionDelay: "80ms" }}>
          {slide.sale_badge_enabled ? (
            <span className="bg-sale px-1.5 py-0.5 text-[8px] font-semibold tracking-[0.14em] text-white uppercase lg:px-2.5 lg:py-1 lg:text-[10px] lg:tracking-[0.18em]">
              {slide.sale_badge_text || slide.sale?.badge || "SALE"}
            </span>
          ) : null}
          {kickerParts.map((part, i) => (
            <span
              key={part}
              className={`text-[8px] font-semibold tracking-[0.14em] text-sale uppercase lg:text-[10px] lg:tracking-[0.18em] ${i > 0 ? "hidden sm:inline" : ""}`}
            >
              {part}
            </span>
          ))}
        </div>
      ) : null}
      <h1
        className="hero-copy-item font-serif mt-1 text-[1.2rem] leading-[1.08] tracking-[-0.03em] text-mocha-deep sm:text-2xl lg:mt-3 lg:text-[clamp(2rem,4.2vw,4.25rem)] lg:leading-[0.95]"
        style={{ transitionDelay: "160ms" }}
      >
        {slide.heading}{" "}
        {slide.heading_accent ? <em className="italic text-sale">{slide.heading_accent}</em> : null}
      </h1>
      {slide.description ? (
        <p
          className="hero-copy-item mt-4 hidden max-w-md text-[14px] leading-7 text-mocha-deep/70 lg:block"
          style={{ transitionDelay: "240ms" }}
        >
          {slide.description}
        </p>
      ) : null}
      {price || was ? (
        <div className="hero-copy-item mt-1.5 flex flex-wrap items-end justify-center gap-x-2 lg:mt-5 lg:justify-start lg:gap-x-4" style={{ transitionDelay: "300ms" }}>
          {price ? <p className="font-serif text-[1.2rem] leading-none text-sale sm:text-xl lg:text-[2.15rem]">{price.value}</p> : null}
          {was ? (
            <p className="text-[11px] text-mocha-deep/40 line-through decoration-mocha-deep/35 lg:pb-1 lg:text-[15px]">{was.value}</p>
          ) : null}
        </div>
      ) : null}
      {mobileSpecs.length ? (
        <ul
          className="hero-copy-item mt-2 flex flex-wrap items-center justify-center divide-x divide-mocha/15 lg:hidden"
          style={{ transitionDelay: "340ms" }}
        >
          {mobileSpecs.map((item) => (
            <li key={item.id || `${slide.id}-${item.label}`} className="px-2 first:pl-0 last:pr-0">
              <p className="text-[7px] font-semibold tracking-[0.14em] text-mocha/40 uppercase">{item.label}</p>
              <p className={`mt-0.5 text-[11px] font-medium leading-none ${item.accent ? "text-sale" : "text-mocha-deep"}`}>
                {item.value}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
      {specs.length ? (
        <ul
          className="hero-copy-item mt-7 hidden divide-x divide-mocha/15 border-t border-mocha/10 pt-5 lg:flex lg:flex-wrap"
          style={{ transitionDelay: "420ms" }}
        >
          {specs.map((item) => (
            <li key={item.id || `${slide.id}-${item.label}`} className="px-4 first:pl-0 last:pr-0">
              <p className="text-[9px] font-semibold tracking-[0.16em] text-mocha/40 uppercase">{item.label}</p>
              <p className={`mt-1 text-[13px] font-medium ${item.accent ? "text-sale" : "text-mocha-deep"}`}>
                {item.value}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
      <div
        className={`hero-copy-item mt-2.5 gap-1.5 lg:mt-6 lg:flex lg:flex-wrap lg:items-center lg:justify-start lg:gap-3 ${
          slide.primary_cta_label && slide.secondary_cta_label ? "grid grid-cols-2" : "flex justify-center"
        }`}
        style={{ transitionDelay: "360ms" }}
      >
        {slide.primary_cta_label ? (
          <HeroCta
            href={slide.primary_cta_link || "/#shop"}
            className="flex min-h-8 items-center justify-center bg-sale px-1.5 py-1.5 text-center text-[8px] font-semibold leading-tight tracking-[0.12em] text-white uppercase transition-colors duration-300 hover:bg-sale-deep lg:min-h-0 lg:px-7 lg:py-3.5 lg:text-[11px] lg:tracking-[0.2em]"
          >
            {slide.primary_cta_label}
          </HeroCta>
        ) : null}
        {slide.secondary_cta_label ? (
          <HeroCta
            href={slide.secondary_cta_link || "/#collections"}
            className="flex min-h-8 items-center justify-center border border-mocha-deep px-1.5 py-1.5 text-center text-[8px] font-semibold leading-tight tracking-[0.12em] text-mocha-deep uppercase transition-colors hover:bg-mocha-deep hover:text-ivory lg:min-h-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:text-[11px] lg:tracking-[0.18em] lg:underline lg:decoration-mocha/25 lg:underline-offset-8 lg:hover:bg-transparent lg:hover:text-sale lg:hover:decoration-sale"
          >
            {slide.secondary_cta_label}
          </HeroCta>
        ) : null}
      </div>
      {endsAt ? <HeroSaleTimer endsAt={endsAt} /> : null}
    </div>
  );
}
