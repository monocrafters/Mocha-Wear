import type { Metadata } from "next";
import { AdminSpotlight } from "@/components/admin-spotlight";
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
      copy="Manage desktop collection spotlights and mobile campaign slides."
    >
      <AdminSpotlight />
      <AdminHero />
    </AdminShell>
  );
}
