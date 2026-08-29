import type { ReactNode } from "react";
import { ResellerLocaleProvider } from "@/components/reseller-locale-provider";
import { ResellerHeaderDockProvider } from "@/components/reseller-header-dock";
import "../admin/admin.css";

export default function ResellerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="admin-root min-h-svh">
      <ResellerLocaleProvider>
        <ResellerHeaderDockProvider>{children}</ResellerHeaderDockProvider>
      </ResellerLocaleProvider>
    </div>
  );
}
