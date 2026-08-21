"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiJson, peekApiCache } from "@/lib/api-cache";
import { DEFAULT_SETTINGS, type SiteSettings } from "@/lib/settings";

const SiteSettingsContext = createContext<SiteSettings>(DEFAULT_SETTINGS);

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const cached = peekApiCache<{ settings?: SiteSettings }>("/api/settings");
    if (cached?.settings) {
      setSettings({ ...DEFAULT_SETTINGS, ...cached.settings });
    }

    apiJson<{ settings?: SiteSettings }>("/api/settings", {
      staleWhileRevalidate: true,
      onUpdate: (data) => {
        if (data.settings) setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
      },
    })
      .then((data) => {
        if (data.settings) setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
      })
      .catch(() => undefined);
  }, []);

  return <SiteSettingsContext.Provider value={settings}>{children}</SiteSettingsContext.Provider>;
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}
