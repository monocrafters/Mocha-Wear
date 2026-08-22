import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderConfirmed } from "@/components/order-confirmed";
import { CheckoutSkeleton } from "@/components/skeletons";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Order confirmed — Mocha Wear",
  description: "Your Mocha Wear cash-on-delivery order is in.",
};

export default function OrderConfirmedPage() {
  return (
    <>
      <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-ivory pb-24 lg:pb-0">
        <Suspense fallback={<CheckoutSkeleton />}>
          <OrderConfirmed />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
