import type { Metadata } from "next";
import { AdminHero } from "@/components/admin-hero";
import { AdminShell } from "@/components/admin-shell";

export const metadata: Metadata = {
  title: "Hero — Mocha Wear Admin",
};

export default function AdminHeroPage() {
  return (
    <AdminShell
      active="hero"
      kicker="Storefront"
      title="Hero section"
      copy="Use Slides for product copy and buttons. Use Hero image to add a cropped photo that fills the homepage hero."
    >
      <AdminHero />
    </AdminShell>
  );
}
