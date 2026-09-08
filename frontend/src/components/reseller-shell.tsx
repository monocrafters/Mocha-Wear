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
      <main className="dash-bg grid min-h-svh place-items-center text-sm dash-muted">
        {t("shell.checkingAccess")}
      </main>
    );
  }

  return (
    <div className="dash-bg min-h-svh">
      <ResellerSidebar
        name={name}
        active={active}
        onLogout={() => void logout()}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div>
        <header className="dash-surface sticky top-0 z-30 overflow-visible border-b dash-border">
          <div className="mx-auto flex h-14 max-w-lg items-center gap-2 px-4 sm:px-5">
            <ResellerMenuButton onClick={() => setSidebarOpen(true)} />
            {dock.docked && dock.toolbar ? (
              <div className="flex min-w-0 flex-1 items-center">{dock.toolbar}</div>
            ) : (
              <p className="dash-text min-w-0 flex-1 truncate text-sm font-medium">{title}</p>
            )}
            <ResellerNotifications />
          </div>
        </header>
        <section
          className={
            compact
              ? wide
                ? "mx-auto max-w-3xl px-3 py-3 sm:px-5"
                : "mx-auto max-w-lg px-4 py-3"
              : "mx-auto max-w-lg px-4 py-6"
          }
        >
          {!compact ? (
            <>
              <p className="dash-muted text-sm">{kicker}</p>
              <h1 className="dash-text mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
              {copy ? <p className="dash-muted mt-2 max-w-2xl text-sm leading-6">{copy}</p> : null}
            </>
          ) : null}
          <div className={compact ? "" : "mt-8"}>{children}</div>
        </section>
      </div>
    </div>
  );
}
