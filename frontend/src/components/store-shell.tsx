"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SiteHeader } from "@/components/site-header";

export function StoreShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin") || pathname.startsWith("/Admin_Login");

  if (isAdmin) return children;

  return (
    <>
      <SiteHeader />
      {children}
    </>
  );
}
