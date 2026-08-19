import type { Metadata } from "next";
import { NotificationsView } from "@/components/notifications-view";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Notifications — Mocha Wear",
  description: "Order updates, new arrivals, and sale notes from Mocha Wear.",
};

export default function NotificationsPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-x-clip bg-ivory">
        <NotificationsView />
      </main>
      <SiteFooter />
    </>
  );
}
