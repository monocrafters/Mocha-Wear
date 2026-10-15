import { CollectionSpotlight } from "@/components/collection-spotlight";
import { Reviews } from "@/components/reviews";
import { SaleCountdown } from "@/components/sale-countdown";
import { CollectionHero } from "@/components/collection-hero";
import { SaleHero } from "@/components/sale-hero";
import { JoinList } from "@/components/join-list";
import {
  EditionCollections,
  EditionProducts,
  EditionStory,
  EditionServices,
  EditionFooter,
} from "@/components/home-edition";
import type { HeroSlide } from "@/components/admin-hero";
import { API_URL } from "@/lib/api";
import { DM_Sans, Cormorant_Garamond, Bodoni_Moda, Manrope } from "next/font/google";
import "./home-edition.css";
import "./home-desktop.css";
import "./home-collection-hero.css";
import "./collection-spotlight.css";
import "./home-refined.css";

const desktopSans = Manrope({ subsets: ["latin"], variable: "--font-desktop-sans", display: "swap" });
const desktopDisplay = Bodoni_Moda({ subsets: ["latin"], weight: ["400"], style: ["normal", "italic"], variable: "--font-desktop-display", display: "swap" });

const sans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-home-sans",
  display: "swap",
});
const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-home-display",
  display: "swap",
});

export default async function Home() {
  // Render the first hero immediately, without waiting for client catalog requests.
  let slides: HeroSlide[] = [];
  try {
    const response = await fetch(`${API_URL}/api/hero`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(4000),
    });
    if (response.ok) slides = (await response.json()).hero?.slides || [];
  } catch {
    /* The client retries; the editorial fallback still renders. */
  }
  return (
    <div
      className={`home-edition ${sans.variable} ${display.variable} ${desktopSans.variable} ${desktopDisplay.variable}`}
      id="top"
    >
      <main>
        <div className="home-featured-campaign"><SaleHero initialSlides={slides} /></div>
        <CollectionHero />
        <CollectionSpotlight />
        <div className="home-lower-content">
        <div id="sale" className="edition-sale">
          <SaleCountdown />
        </div>
        <EditionCollections />
        <EditionProducts />
        <EditionStory />
        <div className="edition-reviews">
          <Reviews />
        </div>
        <EditionServices />
        <div className="edition-newsletter">
          <JoinList />
        </div>
        </div>
      </main>
      <EditionFooter />
    </div>
  );
}
