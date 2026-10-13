"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
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

  // One campaign image keeps the opening focused. Media order remains managed in Hero.
  const feature = slides[0];
  const isVideo = Boolean(feature?.video);

  return (
    <section
      className={`edition-hero${isVideo ? " edition-hero--video" : ""}`}
      aria-labelledby="campaign-heading"
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
            priority
            className="edition-hero-image"
          />
        ) : (
          <div className="edition-art-fallback" aria-hidden="true">
            m.
          </div>
        )}
      </div>
      <div className="edition-hero-copy">
        <h1 id="campaign-heading">
          {settings.homepage_hero_heading}
          <em>{settings.homepage_hero_accent}</em>
        </h1>
        {settings.homepage_hero_copy ? (
          <p className="edition-hero-description">
            {settings.homepage_hero_copy}
          </p>
        ) : null}
        <a
          className="edition-button edition-hero-cta"
          href={settings.homepage_hero_cta_link}
        >
          {settings.homepage_hero_cta_label}
          <ArrowUpRight size={18} aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
