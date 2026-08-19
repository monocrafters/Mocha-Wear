"use client";

import { FormEvent, ReactNode, RefObject } from "react";
import { ArrowLeft, Search, X } from "lucide-react";

export function SearchBar({
  value,
  onChange,
  onSubmit,
  onClose,
  onClear,
  inputRef,
  placeholder = "Search suits…",
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onClose: () => void;
  onClear?: () => void;
  inputRef?: RefObject<HTMLInputElement | null>;
  placeholder?: string;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="shrink-0 bg-mocha-deep px-2 pb-2.5 pt-[max(0.55rem,env(safe-area-inset-top))]"
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Close search"
          onClick={onClose}
          className="grid h-9 w-8 shrink-0 place-items-center text-ivory"
        >
          <ArrowLeft size={18} strokeWidth={1.8} />
        </button>
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-ivory px-3">
          <Search size={16} strokeWidth={1.7} className="shrink-0 text-mocha/40" />
          <input
            id="site-search"
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="h-10 min-w-0 flex-1 bg-transparent text-sm text-mocha-deep outline-none placeholder:text-mocha/35"
          />
          {value ? (
            <button type="button" aria-label="Clear search" onClick={onClear} className="text-mocha/40">
              <X size={15} />
            </button>
          ) : null}
        </label>
      </div>
    </form>
  );
}

export function SearchShell({ children }: { children: ReactNode }) {
  return <div className="flex min-h-dvh min-w-0 flex-1 flex-col bg-ivory">{children}</div>;
}
