"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
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
  const [playing, setPlaying] = useState(true);
  const [interacting, setInteracting] = useState(false);
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
  const feature = slides[activeIndex];
  const isVideo = Boolean(feature?.video);
  const imageOnly = feature?.kind === "image";
  const labels = (feature?.labels || []).filter(item => item.label || item.value);

  useEffect(() => {
    if (!playing || interacting || isVideo || slides.length < 2) return;
    const timer = window.setInterval(() => {
      if (document.hidden || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      setIndex(current => (current + 1) % slides.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [playing, interacting, isVideo, slides.length]);

  function changeSlide(direction: number) {
    setIndex((activeIndex + direction + slides.length) % slides.length);
    setPlaying(false);
  }

  return (
    <section
      className={`edition-hero${isVideo ? " edition-hero--video" : ""}${imageOnly ? " edition-hero--image-only" : ""}`}
      aria-labelledby="campaign-heading"
      aria-roledescription={slides.length > 1 ? "carousel" : undefined}
      onMouseEnter={() => setInteracting(true)}
      onMouseLeave={() => setInteracting(false)}
      onFocusCapture={() => setInteracting(true)}
      onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false); }}
    >
      <div className="edition-hero-wash" aria-hidden="true">
        {feature?.image ? (
          <StoreImage
            src={feature.image}
            alt=""
            sizes="100vw"
            cloudWidth={80}
            className="edition-hero-palette"
          />
        ) : null}
      </div>
      <div className="edition-hero-art">
        {feature?.video ? (
          <video
            key={feature.id}
            src={feature.video}
            poster={feature.image || undefined}
            controls
            muted
            playsInline
            preload="none"
            aria-label={feature.alt || "Featured collection film"}
          />
        ) : feature?.image ? (
          <StoreImage
            src={feature.image}
            alt={
              feature.alt ||
              feature.heading ||
              `${settings.brand_name} collection`
            }
            sizes="(max-width: 700px) 100vw, 58vw"
            cloudWidth={1400}
            preserveCrop
            priority
            className="edition-hero-image"
          />
        ) : (
          <div className="edition-art-fallback" aria-hidden="true">
            m.
          </div>
        )}
      </div>
      <div className="edition-hero-copy" aria-live={playing ? "off" : "polite"} aria-atomic="true">
        {!imageOnly && feature?.kicker ? <p className="edition-hero-kicker">{feature.kicker}</p> : null}
        <h1 id="campaign-heading" className={imageOnly ? "sr-only" : undefined}>
          {feature?.heading || `${settings.brand_name} collection`}
          {!imageOnly && feature?.heading_accent ? <em>{feature.heading_accent}</em> : null}
        </h1>
        {!imageOnly && feature?.description ? (
          <p className="edition-hero-description">
            {feature.description}
          </p>
        ) : null}
        {!imageOnly && labels.length ? <dl className="edition-feature-labels">{labels.map(item => <div key={item.id}><dt>{item.label}</dt><dd className={item.strike ? "line-through" : undefined}>{item.value}</dd></div>)}</dl> : null}
        <div className="edition-feature-actions">
          {feature?.primary_cta_label ? <a className="edition-button" href={feature.primary_cta_link || "/shop"}>{feature.primary_cta_label}<ArrowUpRight size={18} aria-hidden="true" /></a> : null}
          {feature?.secondary_cta_label ? <a className="edition-text-link" href={feature.secondary_cta_link || "/collections"}>{feature.secondary_cta_label}<ArrowUpRight size={16} aria-hidden="true" /></a> : null}
          {!feature ? <a className="edition-button" href="/shop">Shop the collection<ArrowUpRight size={18} aria-hidden="true" /></a> : null}
        </div>
      </div>
      {slides.length > 1 ? <div className="edition-feature-controls">
        <button type="button" onClick={() => changeSlide(-1)} aria-label="Previous slide"><ChevronLeft size={18} /></button>
        <span aria-hidden="true">{activeIndex + 1} / {slides.length}</span>
        <button type="button" onClick={() => changeSlide(1)} aria-label="Next slide"><ChevronRight size={18} /></button>
        <button type="button" onClick={() => setPlaying(value => !value)} aria-label={playing ? "Pause slideshow" : "Play slideshow"}>{playing ? <Pause size={15} /> : <Play size={15} />}</button>
      </div> : null}
    </section>
  );
}
