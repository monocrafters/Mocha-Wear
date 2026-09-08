export type DashboardThemePreference = "light" | "dark" | "system";
export type DashboardResolvedTheme = "light" | "dark";

export const ADMIN_THEME_KEY = "mocha_admin_theme";
export const RESELLER_THEME_KEY = "mocha_reseller_theme";

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
