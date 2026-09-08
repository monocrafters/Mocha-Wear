import type { ReactNode } from "react";
import Script from "next/script";
import { DashboardThemeProvider, dashboardThemeBootScript } from "@/components/dashboard-theme-provider";
import { ADMIN_THEME_KEY } from "@/lib/dashboard-theme";
import "./admin.css";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Script id="admin-theme-boot" strategy="beforeInteractive">
        {dashboardThemeBootScript(ADMIN_THEME_KEY)}
      </Script>
      <DashboardThemeProvider storageKey={ADMIN_THEME_KEY}>{children}</DashboardThemeProvider>
    </>
  );
}
