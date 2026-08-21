import type { Metadata } from "next";
import { OrdersList } from "@/components/orders-list";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Orders — Mocha Wear",
  description: "Track your Mocha Wear suit orders, from packing to doorstep.",
};

export default function OrdersPage() {
  return (
    <>
      <main className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-x-clip bg-ivory">
        <OrdersList />
      </main>
      <SiteFooter />
    </>
  );
}
