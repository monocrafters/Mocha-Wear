"use client";
import { usePathname } from "next/navigation";
export function StoreTheme({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const page = pathname.split("/")[1] || "home";
  return <div className={page === "home" ? "store-theme-home" : "store-page-theme"} data-store-page={page}>{children}</div>;
}
