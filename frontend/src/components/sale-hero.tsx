"use client";

import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { apiJson } from "@/lib/api-cache";
import type { HeroSlide } from "@/components/admin-hero";
import { StoreImage } from "@/components/store-image";
import { useSiteSettings } from "@/components/site-settings";

export function SaleHero({
  initialSlides = [],
}: {
  initialSlides?: HeroSlide[];
}) {
  const [slides, setSlides] = useState(initialSlides);
  const [index, setIndex] = useState(0);
  const settings = useSiteSettings();
  useEffect(() => {
    let live = true;
    const apply = (data: { hero?: { slides?: HeroSlide[] } }) => {
      if (live && data.hero?.slides) setSlides(data.hero.slides);
    };
    apiJson<{ hero?: { slides?: HeroSlide[] } }>("/api/hero", {
      staleWhileRevalidate: true,
      onUpdate: apply,
    })
      .then(apply)
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  const activeIndex = slides.length ? index % slides.length : 0;
  const active = slides[activeIndex];
  const imageOnly = active?.kind === "image";
  const labels = (active?.labels || []).filter(
    (item) => item.label || item.value,
  );

  return (
    <section
      className={`edition-hero${imageOnly ? " edition-hero--image" : ""}`}
      aria-label="Featured collection"
      aria-roledescription={slides.length > 1 ? "carousel" : undefined}
    >
      <div className="edition-hero-top">
        <span>
          {settings.brand_name} {settings.brand_suffix} <i aria-hidden>—</i> The
          wardrobe edit
        </span>
        <a href="#collections">
          Explore the collection <ArrowDown size={13} />
        </a>
      </div>
      <div className="edition-hero-body">
        {!imageOnly ? (
          <div
            className="edition-hero-copy"
            key={`copy-${active?.id || "fallback"}`}
          >
            <p className="edition-eyebrow">
              <span className="edition-dot" />
              {active?.kicker || settings.products_kicker}
            </p>
            <h1>
              {active?.heading || "A little more"}
              <em>{active?.heading_accent || "you."}</em>
            </h1>
            <p className="edition-hero-description">
              {active?.description || settings.tagline}
            </p>
            {labels.length > 0 ? (
              <dl className="edition-hero-specs">
                {labels.map((label) => (
                  <div key={label.id}>
                    <dt>{label.label}</dt>
                    <dd className={label.strike ? "line-through" : ""}>
                      {label.value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
            <div className="edition-hero-actions">
              <a
                className="edition-button"
                href={active?.primary_cta_link || "/shop"}
              >
                {active?.primary_cta_label || "Discover the edit"}
                <ArrowUpRight size={18} />
              </a>
              {active?.secondary_cta_label ? (
                <a
                  className="edition-text-link"
                  href={active.secondary_cta_link || "#collections"}
                >
                  {active.secondary_cta_label}
                </a>
              ) : null}
            </div>
            <div className="edition-hero-signature">
              <span aria-hidden>m.</span>
              <p>
                {settings.delivery_line}
                <br />
                <small>
                  {settings.brand_name} {settings.brand_suffix}
                </small>
              </p>
            </div>
          </div>
        ) : (
          <h1 className="sr-only">
            {active.heading ||
              `${settings.brand_name} ${settings.brand_suffix} collection`}
          </h1>
        )}
        <div className="edition-hero-art">
          <span className="edition-art-label" aria-hidden>
            {settings.brand_name} / {String(activeIndex + 1).padStart(2, "0")}
          </span>
          <div className="edition-hero-photo" key={active?.id || "empty"}>
            {active?.video ? (
              <video
                src={active.video}
                poster={active.image || undefined}
                controls
                muted
                playsInline
                loop
                preload="none"
                aria-label={active.alt || active.heading}
              />
            ) : active?.image ? (
              <StoreImage
                src={active.image}
                alt={active.alt || active.heading}
                sizes={imageOnly ? "100vw" : "(max-width: 700px) 90vw, 48vw"}
                cloudWidth={1200}
                priority
                className="object-cover object-[center_25%]"
              />
            ) : (
              <div className="edition-art-fallback" aria-hidden>
                {settings.brand_name}
              </div>
            )}
            {active?.sale_tag_visible && active.sale_tag_value ? (
              <div className="edition-sale-stamp">
                <span>{active.sale_tag_label || "Sale"}</span>
                <strong>{active.sale_tag_value}</strong>
              </div>
            ) : null}
          </div>
          <div className="edition-photo-caption">
            <span>
              {active?.sale_badge_enabled
                ? active.sale_badge_text || "The sale edit"
                : "The featured edit"}
            </span>
            <span>
              {String(activeIndex + 1).padStart(2, "0")} /{" "}
              {String(slides.length || 1).padStart(2, "0")}
            </span>
          </div>
          {imageOnly && active.primary_cta_label ? (
            <a
              className="edition-button edition-image-cta"
              href={active.primary_cta_link || "/shop"}
            >
              {active.primary_cta_label}
              <ArrowUpRight size={18} />
            </a>
          ) : null}
        </div>
      </div>
      <div className="edition-hero-bottom">
        <a href="#shop" className="edition-discover">
          <ArrowDown size={14} />
          <span>Find your next favourite</span>
        </a>
        {slides.length > 1 ? (
          <div className="edition-slide-controls">
            <button
              aria-label="Previous feature"
              onClick={() =>
                setIndex((activeIndex - 1 + slides.length) % slides.length)
              }
            >
              <ChevronLeft size={17} />
            </button>
            <div className="edition-slide-dots">
              {slides.map((slide, i) => (
                <button
                  key={slide.id}
                  onClick={() => setIndex(i)}
                  aria-label={`Show ${slide.heading || `feature ${i + 1}`}`}
                  aria-pressed={activeIndex === i}
                >
                  <span />
                </button>
              ))}
            </div>
            <button
              aria-label="Next feature"
              onClick={() => setIndex((activeIndex + 1) % slides.length)}
            >
              <ChevronRight size={17} />
            </button>
          </div>
        ) : (
          <span className="edition-eyebrow">Considered. Collected. Yours.</span>
        )}
      </div>
    </section>
  );
}
