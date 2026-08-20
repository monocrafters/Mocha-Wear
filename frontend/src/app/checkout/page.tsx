import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckoutView } from "@/components/checkout-view";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Checkout — Mocha Wear",
  description: "Enter your delivery details and place a cash-on-delivery order.",
};

export default function CheckoutPage() {
  return (
    <>
      <main className="min-w-0 max-w-full flex-1 overflow-x-clip bg-ivory pb-24 lg:pb-0">
        <Suspense
          fallback={
            <section className="px-5 py-24 text-center text-sm tracking-[0.16em] text-mocha/45 uppercase">
              Loading…
            </section>
          }
        >
          <CheckoutView />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
