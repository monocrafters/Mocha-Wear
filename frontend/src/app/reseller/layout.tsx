import type { ReactNode } from "react";
import { ResellerLocaleProvider } from "@/components/reseller-locale-provider";
import { ResellerHeaderDockProvider } from "@/components/reseller-header-dock";
import { ResellerSessionProvider } from "@/lib/reseller-session";
import "../admin/admin.css";

export default function ResellerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="admin-root min-h-svh">
      <ResellerLocaleProvider>
        <ResellerSessionProvider>
          <ResellerHeaderDockProvider>{children}</ResellerHeaderDockProvider>
        </ResellerSessionProvider>
      </ResellerLocaleProvider>
    </div>
  );
}
