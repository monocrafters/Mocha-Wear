import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchResults } from "@/components/search-results";
import { ProductGridSkeleton } from "@/components/skeletons";

export const metadata: Metadata = {
  title: "Search — Mocha Wear",
  description: "Search Mocha Wear lawn, pret, and formal suits.",
};

export default function SearchPage() {
  return (
    <main className="flex min-h-dvh min-w-0 flex-1 flex-col bg-ivory">
      <Suspense fallback={<div className="px-4 py-8 lg:mx-auto lg:max-w-[1440px] lg:px-8"><ProductGridSkeleton /></div>}>
        <SearchResults />
      </Suspense>
    </main>
  );
}
