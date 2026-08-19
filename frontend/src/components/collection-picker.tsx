"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { Collection } from "@/components/admin-collections";

export function CollectionPicker({
  collections,
  value,
  onChange,
}: {
  collections: Collection[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const selected = collections.find((item) => item.id === value);

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 border border-slate-200 bg-white px-3 py-2.5 text-left text-sm outline-none hover:border-slate-300 focus:border-blue-500"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          {selected?.cover_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={selected.cover_image} alt="" className="h-8 w-7 shrink-0 object-cover" />
          ) : (
            <span className="grid h-8 w-7 shrink-0 place-items-center bg-slate-100 text-[9px] text-slate-400">
              —
            </span>
          )}
          <span className="min-w-0">
            <span className="block truncate font-medium text-slate-900">
              {selected?.name || "Unassigned"}
            </span>
            <span className="block truncate text-[11px] text-slate-500">
              {selected?.code || "No collection"}
            </span>
          </span>
        </span>
        <ChevronDown size={16} className={`shrink-0 text-slate-400 ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto border border-slate-200 bg-white shadow-lg">
          <PickerRow
            label="Unassigned"
            hint="Not in a collection"
            active={!value}
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
          />
          {collections.map((item) => (
            <PickerRow
              key={item.id}
              image={item.cover_image}
              label={item.name}
              hint={item.code || item.slug}
              active={value === item.id}
              onClick={() => {
                onChange(item.id);
                setOpen(false);
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PickerRow({
  image,
  label,
  hint,
  active,
  onClick,
}: {
  image?: string;
  label: string;
  hint: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-slate-50 ${
        active ? "bg-slate-50" : "bg-white"
      }`}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="h-9 w-8 shrink-0 object-cover" />
      ) : (
        <span className="grid h-9 w-8 shrink-0 place-items-center bg-slate-100 text-[9px] text-slate-400">
          —
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-slate-900">{label}</span>
        <span className="block truncate text-[11px] text-slate-500">{hint}</span>
      </span>
      {active ? <Check size={14} className="shrink-0 text-blue-600" /> : null}
    </button>
  );
}
