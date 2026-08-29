"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { API_URL, apiFetch, clearResellerToken } from "@/lib/api";
import { ResellerMenuButton, ResellerSidebar } from "@/components/reseller-sidebar";
import { useResellerLocale } from "@/components/reseller-locale-provider";
import { useResellerHeaderDock } from "@/components/reseller-header-dock";

type ResellerShellProps = {
  active: string;
  kicker: string;
  title: string;
  copy?: string;
  compact?: boolean;
  children: ReactNode;
};

function ResellerShellFrame({ active, kicker, title, copy, compact, children }: ResellerShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useResellerLocale();
  const dock = useResellerHeaderDock();
  const [status, setStatus] = useState<"checking" | "ready">("checking");
  const [name, setName] = useState("reseller");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    apiFetch(`${API_URL}/api/reseller/me`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("unauthorized");
        return res.json();
      })
      .then((data) => {
        setName(data.reseller?.name || data.reseller?.username || "reseller");
        setStatus("ready");
      })
      .catch(() => {
        router.replace("/Reseller_Login");
      });
  }, [router, pathname]);

  async function logout() {
    await apiFetch(`${API_URL}/api/reseller/logout`, {
      method: "POST",
      credentials: "include",
    }).catch(() => undefined);
    clearResellerToken();
    router.replace("/Reseller_Login");
  }

  if (status === "checking") {
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
        onLogout={logout}
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
          </div>
        </header>
        <section className={compact ? "px-4 py-3 sm:px-6" : "px-4 py-6 sm:px-6 lg:px-8 lg:py-8"}>
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

export function ResellerShell(props: ResellerShellProps) {
  return <ResellerShellFrame {...props} />;
}
