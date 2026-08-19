import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchResults } from "@/components/search-results";

export const metadata: Metadata = {
  title: "Search — Mocha Wear",
  description: "Search Mocha Wear lawn, pret, and formal suits.",
};

export default function SearchPage() {
  return (
    <main className="flex min-h-dvh min-w-0 flex-1 flex-col bg-ivory">
      <Suspense
        fallback={
          <p className="px-5 py-16 text-center text-sm tracking-[0.16em] text-mocha/45 uppercase">Loading search…</p>
        }
      >
        <SearchResults />
      </Suspense>
    </main>
  );
}
