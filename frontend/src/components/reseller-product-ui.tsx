"use client";

import { Check } from "lucide-react";
import { useResellerLocale } from "@/components/reseller-locale-provider";

export function ProductStatusBadge({
  ready,
  saved,
  active,
}: {
  ready: boolean;
  saved: boolean;
  active: boolean;
}) {
  const { t } = useResellerLocale();

  if (!ready) {
    return (
      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800">
        {t("products.locked")}
      </span>
    );
  }
  if (saved && active) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
        <span className="grid h-3.5 w-3.5 place-items-center rounded-full bg-emerald-600 text-white">
          <Check size={8} strokeWidth={3} />
        </span>
        {t("products.live")}
      </span>
    );
  }
  if (saved && !active) {
    return (
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
        {t("products.inactive")}
      </span>
    );
  }
  return (
    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
      {t("products.setPrice")}
    </span>
  );
}

export function ActiveToggle({
  checked,
  disabled,
  label,
  compact,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label?: string;
  compact?: boolean;
  onChange: (next: boolean) => void;
}) {
  const switchEl = (
    <span
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
        checked ? "bg-slate-900" : "bg-slate-200"
      }`}
    >
      <span
        className={`absolute top-0.5 grid h-5 w-5 place-items-center rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      >
        {checked ? <Check size={11} className="text-slate-900" strokeWidth={3} /> : null}
      </span>
    </span>
  );

  if (compact) {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onChange(!checked);
        }}
        className="inline-flex disabled:opacity-50"
      >
        {switchEl}
      </button>
    );
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2.5 disabled:opacity-50"
    >
      {switchEl}
      {label ? <span className="text-sm font-medium text-slate-700">{label}</span> : null}
    </button>
  );
}
