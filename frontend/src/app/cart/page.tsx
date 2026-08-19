import type { Metadata } from "next";
import { CartView } from "@/components/cart-view";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Cart — Mocha Wear",
  description: "Review your Mocha Wear bag and place a cash-on-delivery order.",
};

export default function CartPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-x-clip bg-ivory">
        <CartView />
      </main>
      <SiteFooter />
    </>
  );
}
