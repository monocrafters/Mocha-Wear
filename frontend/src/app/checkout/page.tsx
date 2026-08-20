import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckoutView } from "@/components/checkout-view";
import { CheckoutSkeleton } from "@/components/skeletons";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Checkout — Mocha Wear",
  description: "Enter your delivery details and place a cash-on-delivery order.",
};

export default function CheckoutPage() {
  return (
    <>
      <SiteHeader />
      <main className="min-w-0 max-w-full flex-1 overflow-x-clip bg-ivory pb-24 lg:pb-0">
        <Suspense fallback={<CheckoutSkeleton />}>
          <CheckoutView />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
