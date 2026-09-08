import type { ReactNode } from "react";
import { DashboardThemeProvider } from "@/components/dashboard-theme-provider";
import { ADMIN_THEME_KEY } from "@/lib/dashboard-theme";
import "./admin.css";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <DashboardThemeProvider storageKey={ADMIN_THEME_KEY}>{children}</DashboardThemeProvider>;
}
