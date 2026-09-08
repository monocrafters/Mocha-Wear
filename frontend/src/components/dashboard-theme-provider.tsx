"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  readThemePreference,
  resolveTheme,
  storeThemePreference,
  type DashboardResolvedTheme,
  type DashboardThemePreference,
} from "@/lib/dashboard-theme";

type DashboardThemeContextValue = {
  preference: DashboardThemePreference;
  resolved: DashboardResolvedTheme;
  setPreference: (preference: DashboardThemePreference) => void;
};

const DashboardThemeContext = createContext<DashboardThemeContextValue | null>(null);

function getInitialTheme(storageKey: string): {
  preference: DashboardThemePreference;
  resolved: DashboardResolvedTheme;
} {
  if (typeof window === "undefined") {
    return { preference: "system", resolved: "light" };
  }
  const preference = readThemePreference(storageKey);
  return { preference, resolved: resolveTheme(preference) };
}

export function DashboardThemeProvider({
  storageKey,
  children,
}: {
  storageKey: string;
  children: ReactNode;
}) {
  const initial = useMemo(() => getInitialTheme(storageKey), [storageKey]);
  const [preference, setPreferenceState] = useState<DashboardThemePreference>(initial.preference);
  const [resolved, setResolved] = useState<DashboardResolvedTheme>(initial.resolved);

  useEffect(() => {
    const next = readThemePreference(storageKey);
    setPreferenceState(next);
    setResolved(resolveTheme(next));
  }, [storageKey]);

  useEffect(() => {
    const apply = () => setResolved(resolveTheme(preference));
    apply();
    if (preference !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [preference]);

  const setPreference = useCallback(
    (next: DashboardThemePreference) => {
      setPreferenceState(next);
      storeThemePreference(storageKey, next);
      setResolved(resolveTheme(next));
    },
    [storageKey],
  );

  const value = useMemo(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference],
  );

  return (
    <DashboardThemeContext.Provider value={value}>
      <div
        className="admin-root min-h-svh"
        data-theme={resolved}
        data-theme-pref={preference}
        suppressHydrationWarning
      >
        {children}
      </div>
    </DashboardThemeContext.Provider>
  );
}

export function useDashboardTheme() {
  const ctx = useContext(DashboardThemeContext);
  if (!ctx) {
    throw new Error("useDashboardTheme must be used within DashboardThemeProvider");
  }
  return ctx;
}
