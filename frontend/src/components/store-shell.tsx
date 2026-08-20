"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { CatalogProvider } from "@/components/catalog-provider";

export function StoreShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin") || pathname.startsWith("/Admin_Login");

  if (isAdmin) return children;

  return (
    <CatalogProvider>
      <SiteHeader />
      {children}
    </CatalogProvider>
  );
}
