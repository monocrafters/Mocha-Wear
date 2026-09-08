export type DashboardThemePreference = "light" | "dark" | "system";
export type DashboardResolvedTheme = "light" | "dark";

export const ADMIN_THEME_KEY = "mocha_admin_theme";
export const RESELLER_THEME_KEY = "mocha_reseller_theme";

export const LIGHT_THEME_VARS: Record<string, string> = {
  "--mocha-deep": "#0f172a",
  "--mocha": "#334155",
  "--latte": "#94a3b8",
  "--gold": "#64748b",
  "--cream": "#f1f5f9",
  "--ivory": "#f3f4f6",
  "--sand": "#e2e8f0",
  "--sale": "#dc2626",
  "--sale-deep": "#b91c1c",
  "--dash-bg": "#f3f4f6",
  "--dash-surface": "#ffffff",
  "--dash-surface-2": "#f8fafc",
  "--dash-text": "#0f172a",
  "--dash-text-2": "#334155",
  "--dash-muted": "#64748b",
  "--dash-border": "#e2e8f0",
  "--dash-border-strong": "#cbd5e1",
  "--dash-chip": "#f1f5f9",
  "--dash-overlay": "rgba(15, 23, 42, 0.4)",
  "--dash-input": "#ffffff",
  "--dash-scrollbar-track": "#f1f5f9",
  "--dash-scrollbar-thumb": "#cbd5e1",
};

export const DARK_THEME_VARS: Record<string, string> = {
  "--mocha-deep": "#e2e8f0",
  "--mocha": "#cbd5e1",
  "--latte": "#94a3b8",
  "--gold": "#94a3b8",
  "--cream": "#1e293b",
  "--ivory": "#0b1220",
  "--sand": "#334155",
  "--sale": "#f87171",
  "--sale-deep": "#ef4444",
  "--dash-bg": "#0b1220",
  "--dash-surface": "#111827",
  "--dash-surface-2": "#0f172a",
  "--dash-text": "#e2e8f0",
  "--dash-text-2": "#cbd5e1",
  "--dash-muted": "#94a3b8",
  "--dash-border": "#1f2937",
  "--dash-border-strong": "#334155",
  "--dash-chip": "#1e293b",
  "--dash-overlay": "rgba(0, 0, 0, 0.55)",
  "--dash-input": "#0f172a",
  "--dash-scrollbar-track": "#0f172a",
  "--dash-scrollbar-thumb": "#334155",
};

export function themeVars(resolved: DashboardResolvedTheme): Record<string, string> {
  return resolved === "dark" ? DARK_THEME_VARS : LIGHT_THEME_VARS;
}

export function isThemePreference(value: unknown): value is DashboardThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

export function readThemePreference(storageKey: string): DashboardThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const raw = localStorage.getItem(storageKey);
    return isThemePreference(raw) ? raw : "system";
  } catch {
    return "system";
  }
}

export function storeThemePreference(storageKey: string, preference: DashboardThemePreference) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey, preference);
    document.cookie = `${storageKey}=${preference}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    /* ignore */
  }
}

export function systemPrefersDark() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolveTheme(preference: DashboardThemePreference): DashboardResolvedTheme {
  if (preference === "light" || preference === "dark") return preference;
  return systemPrefersDark() ? "dark" : "light";
}

export function cssVarsToInline(vars: Record<string, string>) {
  return Object.entries(vars)
    .map(([key, value]) => `${key}:${value}`)
    .join(";");
}
