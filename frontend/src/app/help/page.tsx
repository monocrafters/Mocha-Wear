import type { Metadata } from "next";
import { HelpView } from "@/components/help-view";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Help — Mocha Wear",
  description: "Get Mocha Wear support on WhatsApp for sizes, orders, delivery, and exchanges.",
};

export default function HelpPage() {
  return (
    <>
      <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-ivory">
        <HelpView />
      </main>
      <SiteFooter />
    </>
  );
}
