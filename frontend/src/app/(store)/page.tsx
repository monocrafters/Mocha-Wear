import { CategoryGrid } from "@/components/category-grid";
import { ProductGrid } from "@/components/product-grid";
import { Reviews } from "@/components/reviews";
import { SaleCountdown } from "@/components/sale-countdown";
import { SaleHero } from "@/components/sale-hero";
import { ScrollProgress } from "@/components/scroll-progress";
import { ShopNotes } from "@/components/shop-notes";
import { JoinList } from "@/components/join-list";
import { SiteFooter } from "@/components/site-footer";
import { HomeTrust } from "@/components/home-trust";

export default function Home() {
  return (
    <>
      <ScrollProgress />
      <main className="min-w-0 overflow-x-hidden">
        <SaleHero />
        <SaleCountdown />
        <HomeTrust />
        <CategoryGrid />
        <ProductGrid />
        <Reviews />
        <ShopNotes />
        <JoinList />
      </main>
      <SiteFooter showOnMobile />
    </>
  );
}
