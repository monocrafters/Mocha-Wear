import type { Metadata } from "next";
import { CollectionsList } from "@/components/collections-list";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Collections — Mocha Wear",
  description: "Browse Mocha Wear lawn, pret, and formal collections on sale.",
};

export default function CollectionsPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-ivory">
        <CollectionsList />
      </main>
      <SiteFooter />
    </>
  );
}
