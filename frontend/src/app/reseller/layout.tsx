import type { ReactNode } from "react";
import Script from "next/script";
import { ResellerLocaleProvider } from "@/components/reseller-locale-provider";
import { ResellerHeaderDockProvider } from "@/components/reseller-header-dock";
import { ResellerSessionProvider } from "@/lib/reseller-session";
import { DashboardThemeProvider, dashboardThemeBootScript } from "@/components/dashboard-theme-provider";
import { RESELLER_THEME_KEY } from "@/lib/dashboard-theme";
import "../admin/admin.css";

export default function ResellerLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Script id="reseller-theme-boot" strategy="beforeInteractive">
        {dashboardThemeBootScript(RESELLER_THEME_KEY)}
      </Script>
      <DashboardThemeProvider storageKey={RESELLER_THEME_KEY}>
        <ResellerLocaleProvider>
          <ResellerSessionProvider>
            <ResellerHeaderDockProvider>{children}</ResellerHeaderDockProvider>
          </ResellerSessionProvider>
        </ResellerLocaleProvider>
      </DashboardThemeProvider>
    </>
  );
}
