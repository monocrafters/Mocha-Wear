import { Reviews } from "@/components/reviews";
import { SaleCountdown } from "@/components/sale-countdown";
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
import "./home-edition.css";

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
    <div className="home-edition" id="top">
      <main>
        <SaleHero initialSlides={slides} />
        <div className="edition-sale">
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
      </main>
      <EditionFooter />
    </div>
  );
}
