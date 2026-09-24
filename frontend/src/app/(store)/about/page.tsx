import type { Metadata } from "next";
import { AboutView } from "@/components/about-view";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "About — Mocha Wear",
  description:
    "Mocha Wear is a Lahore ladies-suit atelier — lawn, pret, and formals with cash on delivery across Pakistan. Registered factory: M/S Zaib Arts.",
};

export default function AboutPage() {
  return (
    <>
      <main className="min-w-0 bg-ivory pb-24 lg:pb-0">
        <AboutView />
      </main>
      <SiteFooter showOnMobile />
    </>
  );
}
