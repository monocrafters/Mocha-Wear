"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useDashboardTheme } from "@/components/dashboard-theme-provider";
import type { DashboardThemePreference } from "@/lib/dashboard-theme";

const OPTIONS: {
  id: DashboardThemePreference;
  label: string;
  hint: string;
  icon: typeof Sun;
}[] = [
  { id: "light", label: "Light", hint: "Bright dashboard", icon: Sun },
  { id: "dark", label: "Dark", hint: "Dim dashboard", icon: Moon },
  { id: "system", label: "System", hint: "Match device setting", icon: Monitor },
];

export function ThemePreferencePicker({
  title = "Appearance",
  help = "Choose light, dark, or follow your device setting.",
  labels,
}: {
  title?: string;
  help?: string;
  labels?: Partial<
    Record<
      DashboardThemePreference,
      {
        label: string;
        hint: string;
      }
    >
  >;
}) {
  const { preference, setPreference, ready } = useDashboardTheme();
  const activePreference =
    ready || typeof document === "undefined"
      ? preference
      : (() => {
          const boot = document.documentElement.getAttribute("data-dashboard-theme-pref");
          return boot === "light" || boot === "dark" || boot === "system" ? boot : preference;
        })();

  return (
    <div className="border border-slate-200 bg-white p-4 sm:p-5">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{help}</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          const active = activePreference === option.id;
          const label = labels?.[option.id]?.label ?? option.label;
          const hint = labels?.[option.id]?.hint ?? option.hint;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setPreference(option.id)}
              className={`dash-choice rounded-lg px-3 py-3 text-left text-sm ${
                active ? "dash-choice-active" : ""
              }`}
            >
              <span className="flex items-center gap-2 font-medium">
                <Icon size={15} />
                {label}
              </span>
              <span className={`dash-choice-hint mt-1 block text-xs ${active ? "" : "text-slate-500"}`}>
                {hint}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
