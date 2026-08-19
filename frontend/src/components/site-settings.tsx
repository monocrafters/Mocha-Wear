"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { API_URL, apiFetch } from "@/lib/api";
import { DEFAULT_SETTINGS, type SiteSettings } from "@/lib/settings";

const SiteSettingsContext = createContext<SiteSettings>(DEFAULT_SETTINGS);

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    apiFetch(`${API_URL}/api/settings`)
      .then((res) => res.json())
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
