import type { Metadata } from "next";
import { ShopCatalog } from "@/components/shop-catalog";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Shop — Mocha Wear",
  description: "Shop lawn, pret, and formal ladies suits on sale at Mocha Wear.",
};

export default function ShopPage() {
  return (
    <>
      <main className="min-w-0 bg-ivory pb-24 lg:pb-0">
        <ShopCatalog />
      </main>
      <SiteFooter showOnMobile />
    </>
  );
}
