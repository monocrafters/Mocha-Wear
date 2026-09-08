"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  cssVarsToInline,
  readThemePreference,
  resolveTheme,
  rootThemeStyle,
  storeThemePreference,
  themeVars,
  THEME_CHANGE_EVENT,
  type DashboardResolvedTheme,
  type DashboardThemePreference,
} from "@/lib/dashboard-theme";

type DashboardThemeContextValue = {
  preference: DashboardThemePreference;
  resolved: DashboardResolvedTheme;
  setPreference: (preference: DashboardThemePreference) => void;
  ready: boolean;
};

const DashboardThemeContext = createContext<DashboardThemeContextValue | null>(null);

function applyDomTheme(preference: DashboardThemePreference, resolved: DashboardResolvedTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-dashboard-theme", resolved);
  root.setAttribute("data-dashboard-theme-pref", preference);
  root.style.colorScheme = resolved;
  root.classList.remove("dashboard-theme-dark", "dashboard-theme-light");
  root.classList.add(resolved === "dark" ? "dashboard-theme-dark" : "dashboard-theme-light");

  let tag = document.getElementById("mocha-dashboard-theme-style") as HTMLStyleElement | null;
  if (!tag) {
    tag = document.createElement("style");
    tag.id = "mocha-dashboard-theme-style";
    document.head.appendChild(tag);
  }
  const vars = cssVarsToInline(themeVars(resolved));
  tag.textContent = `.admin-root{${vars};background:var(--dash-bg);color:var(--dash-text);color-scheme:${resolved};}`;
}

function readBootPreference(): DashboardThemePreference | null {
  if (typeof document === "undefined") return null;
  const pref = document.documentElement.getAttribute("data-dashboard-theme-pref");
  return pref === "light" || pref === "dark" || pref === "system" ? pref : null;
}

function readBootResolved(): DashboardResolvedTheme | null {
  if (typeof document === "undefined") return null;
  const theme = document.documentElement.getAttribute("data-dashboard-theme");
  return theme === "dark" || theme === "light" ? theme : null;
}

export function DashboardThemeProvider({
  storageKey,
  children,
}: {
  storageKey: string;
  children: ReactNode;
}) {
  // Do NOT paint a theme on the first SSR/hydration pass.
  // The root boot script already applied the saved theme; React must not
  // overwrite it with light defaults before localStorage is read.
  const [ready, setReady] = useState(false);
  const [preference, setPreferenceState] = useState<DashboardThemePreference>("system");
  const [resolved, setResolved] = useState<DashboardResolvedTheme>("light");

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const sync = () => {
      const nextPref = readThemePreference(storageKey);
      const nextResolved =
        nextPref === "system" ? (media.matches ? "dark" : "light") : nextPref;
      setPreferenceState(nextPref);
      setResolved(nextResolved);
      setReady(true);
      applyDomTheme(nextPref, nextResolved);
    };

    sync();
    media.addEventListener("change", sync);
    window.addEventListener(THEME_CHANGE_EVENT, sync);
    return () => {
      media.removeEventListener("change", sync);
      window.removeEventListener(THEME_CHANGE_EVENT, sync);
    };
  }, [storageKey]);

  const setPreference = useCallback(
    (next: DashboardThemePreference) => {
      const nextResolved = resolveTheme(next);
      storeThemePreference(storageKey, next);
      setPreferenceState(next);
      setResolved(nextResolved);
      setReady(true);
      applyDomTheme(next, nextResolved);
    },
    [storageKey],
  );

  const value = useMemo(
    () => ({ preference, resolved, setPreference, ready }),
    [preference, resolved, setPreference, ready],
  );

  // Before ready: leave class/style alone so the boot script theme stays visible.
  // After ready: own the theme completely via class + inline vars.
  const bootResolved = ready ? resolved : readBootResolved();
  const bootPreference = ready ? preference : readBootPreference() || preference;
  const activeResolved = bootResolved || resolved;
  const activePreference = bootPreference;

  const style = ready ? (rootThemeStyle(activeResolved) as CSSProperties) : undefined;
  const className = ready
    ? `admin-root min-h-svh theme-${activeResolved}`
    : "admin-root min-h-svh";

  return (
    <DashboardThemeContext.Provider value={value}>
      <div
        className={className}
        data-theme={ready ? activeResolved : undefined}
        data-theme-pref={ready ? activePreference : undefined}
        style={style}
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
