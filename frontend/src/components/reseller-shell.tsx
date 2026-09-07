"use client";

import { ReactNode, useState } from "react";
import { ResellerMenuButton, ResellerSidebar } from "@/components/reseller-sidebar";
import { ResellerNotifications } from "@/components/notification-bell";
import { useResellerLocale } from "@/components/reseller-locale-provider";
import { useResellerHeaderDock } from "@/components/reseller-header-dock";
import { useResellerSession } from "@/lib/reseller-session";

type ResellerShellProps = {
  active: string;
  kicker: string;
  title: string;
  copy?: string;
  compact?: boolean;
  wide?: boolean;
  children: ReactNode;
};

export function ResellerShell({
  active,
  kicker,
  title,
  copy,
  compact,
  wide,
  children,
}: ResellerShellProps) {
  const { t } = useResellerLocale();
  const dock = useResellerHeaderDock();
  const { status, session, logout } = useResellerSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const name = session?.name || "reseller";

  if (status === "checking" || !session) {
    return (
      <main className="grid min-h-svh place-items-center bg-[#f3f4f6] text-sm text-slate-500">
        {t("shell.checkingAccess")}
      </main>
    );
  }

  return (
    <div className="min-h-svh bg-[#f3f4f6]">
      <ResellerSidebar
        name={name}
        active={active}
        onLogout={() => void logout()}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="lg:pl-[260px]">
        <header className="sticky top-0 z-30 overflow-visible border-b border-slate-200 bg-white">
          <div className="flex h-14 items-center gap-2 px-4 sm:gap-3 sm:px-6">
            <ResellerMenuButton onClick={() => setSidebarOpen(true)} />
            {dock.docked && dock.toolbar ? (
              <div className="flex min-w-0 flex-1 items-center">{dock.toolbar}</div>
            ) : (
              <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">{title}</p>
            )}
            <span className="hidden shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 sm:inline">
              {name}
            </span>
            <ResellerNotifications />
          </div>
        </header>
        <section
          className={
            compact
              ? wide
                ? "px-3 py-3 sm:px-5 lg:px-6 lg:py-5"
                : "px-4 py-3 sm:px-6"
              : "px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
          }
        >
          {!compact ? (
            <>
              <p className="text-sm text-slate-500">{kicker}</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
              {copy ? <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{copy}</p> : null}
            </>
          ) : null}
          <div className={compact ? "" : "mt-8"}>{children}</div>
        </section>
      </div>
    </div>
  );
}
