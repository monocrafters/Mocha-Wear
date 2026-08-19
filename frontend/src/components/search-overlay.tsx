"use client";

import { SearchPanel } from "@/components/search-panel";

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-ivory">
      <div className="search-sheet flex min-h-0 flex-1 flex-col">
        <SearchPanel onClose={onClose} />
      </div>
    </div>
  );
}
