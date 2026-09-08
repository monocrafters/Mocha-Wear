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

function applyDomTheme(preference: DashboardThemePreference, resolved: DashboardResolvedTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-dashboard-theme", resolved);
  document.documentElement.setAttribute("data-dashboard-theme-pref", preference);
  document.documentElement.style.colorScheme = resolved;
}

export function dashboardThemeBootScript(storageKey: string) {
  return `(function(){try{var k=${JSON.stringify(storageKey)};var p=localStorage.getItem(k)||"system";if(p!=="light"&&p!=="dark"&&p!=="system")p="system";var dark=p==="dark"||(p==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=dark?"dark":"light";document.documentElement.setAttribute("data-dashboard-theme",r);document.documentElement.setAttribute("data-dashboard-theme-pref",p);document.documentElement.style.colorScheme=r;}catch(e){}})();`;
}

export function DashboardThemeProvider({
  storageKey,
  children,
}: {
  storageKey: string;
  children: ReactNode;
}) {
  const [preference, setPreferenceState] = useState<DashboardThemePreference>("system");
  const [systemDark, setSystemDark] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const next = readThemePreference(storageKey);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    setPreferenceState(next);
    setSystemDark(media.matches);
    setReady(true);

    const onChange = () => setSystemDark(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [storageKey]);

  const resolved = useMemo<DashboardResolvedTheme>(() => {
    if (!ready) {
      if (typeof document !== "undefined") {
        const fromDom = document.documentElement.getAttribute("data-dashboard-theme");
        if (fromDom === "dark" || fromDom === "light") return fromDom;
      }
      return resolveTheme(preference);
    }
    if (preference === "system") return systemDark ? "dark" : "light";
    return preference;
  }, [preference, systemDark, ready]);

  useEffect(() => {
    applyDomTheme(preference, resolved);
  }, [preference, resolved]);

  const setPreference = useCallback(
    (next: DashboardThemePreference) => {
      setPreferenceState(next);
      storeThemePreference(storageKey, next);
      const nextResolved = resolveTheme(next);
      applyDomTheme(next, nextResolved);
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
