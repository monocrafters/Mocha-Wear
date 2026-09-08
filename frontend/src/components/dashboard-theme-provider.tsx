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
  storeThemePreference,
  themeVars,
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
  const root = document.documentElement;
  root.setAttribute("data-dashboard-theme", resolved);
  root.setAttribute("data-dashboard-theme-pref", preference);
  root.style.colorScheme = resolved;
  root.classList.toggle("dashboard-theme-dark", resolved === "dark");
  root.classList.toggle("dashboard-theme-light", resolved === "light");

  let tag = document.getElementById("mocha-dashboard-theme-style") as HTMLStyleElement | null;
  if (!tag) {
    tag = document.createElement("style");
    tag.id = "mocha-dashboard-theme-style";
    document.head.appendChild(tag);
  }
  tag.textContent = `.admin-root{${cssVarsToInline(themeVars(resolved))};color-scheme:${resolved};}`;
}

export function dashboardThemeBootScript(storageKey: string) {
  return `(function(){try{var k=${JSON.stringify(storageKey)};var p=localStorage.getItem(k)||"system";if(p!=="light"&&p!=="dark"&&p!=="system")p="system";var dark=p==="dark"||(p==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=dark?"dark":"light";var root=document.documentElement;root.setAttribute("data-dashboard-theme",r);root.setAttribute("data-dashboard-theme-pref",p);root.style.colorScheme=r;root.classList.add(r==="dark"?"dashboard-theme-dark":"dashboard-theme-light");var vars=r==="dark"?"--dash-bg:#0b1220;--dash-surface:#111827;--dash-surface-2:#0f172a;--dash-text:#e2e8f0;--dash-text-2:#cbd5e1;--dash-muted:#94a3b8;--dash-border:#1f2937;--dash-border-strong:#334155;--dash-chip:#1e293b;--dash-overlay:rgba(0,0,0,.55);--dash-input:#0f172a;--dash-scrollbar-track:#0f172a;--dash-scrollbar-thumb:#334155;--cream:#1e293b;--ivory:#0b1220;--sand:#334155;--mocha-deep:#e2e8f0;--mocha:#cbd5e1;":"--dash-bg:#f3f4f6;--dash-surface:#ffffff;--dash-surface-2:#f8fafc;--dash-text:#0f172a;--dash-text-2:#334155;--dash-muted:#64748b;--dash-border:#e2e8f0;--dash-border-strong:#cbd5e1;--dash-chip:#f1f5f9;--dash-overlay:rgba(15,23,42,.4);--dash-input:#ffffff;--dash-scrollbar-track:#f1f5f9;--dash-scrollbar-thumb:#cbd5e1;--cream:#f1f5f9;--ivory:#f3f4f6;--sand:#e2e8f0;--mocha-deep:#0f172a;--mocha:#334155;";var s=document.getElementById("mocha-dashboard-theme-style");if(!s){s=document.createElement("style");s.id="mocha-dashboard-theme-style";document.head.appendChild(s);}s.textContent=".admin-root{"+vars+"color-scheme:"+r+";}";}catch(e){}})();`;
}

function readDomPreference(fallback: DashboardThemePreference = "system"): DashboardThemePreference {
  if (typeof document === "undefined") return fallback;
  const pref = document.documentElement.getAttribute("data-dashboard-theme-pref");
  return pref === "light" || pref === "dark" || pref === "system" ? pref : fallback;
}

export function DashboardThemeProvider({
  storageKey,
  children,
}: {
  storageKey: string;
  children: ReactNode;
}) {
  const [preference, setPreferenceState] = useState<DashboardThemePreference>(() =>
    typeof window === "undefined" ? "system" : readDomPreference(readThemePreference(storageKey)),
  );
  const [systemDark, setSystemDark] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia("(prefers-color-scheme: dark)").matches,
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      const next = readThemePreference(storageKey);
      setPreferenceState(next);
      setSystemDark(media.matches);
      applyDomTheme(next, next === "system" ? (media.matches ? "dark" : "light") : next);
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [storageKey]);

  const resolved = useMemo<DashboardResolvedTheme>(() => {
    if (preference === "system") return systemDark ? "dark" : "light";
    return preference;
  }, [preference, systemDark]);

  useEffect(() => {
    applyDomTheme(preference, resolved);
  }, [preference, resolved]);

  const setPreference = useCallback(
    (next: DashboardThemePreference) => {
      const nextResolved = resolveTheme(next);
      setPreferenceState(next);
      storeThemePreference(storageKey, next);
      applyDomTheme(next, nextResolved);
    },
    [storageKey],
  );

  const value = useMemo(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference],
  );

  const style = themeVars(resolved) as CSSProperties;

  return (
    <DashboardThemeContext.Provider value={value}>
      <div
        className={`admin-root min-h-svh theme-${resolved}`}
        data-theme={resolved}
        data-theme-pref={preference}
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
