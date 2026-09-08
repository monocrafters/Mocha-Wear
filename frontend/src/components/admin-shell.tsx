"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { API_URL, apiFetch, clearAdminToken } from "@/lib/api";
import { AdminMenuButton, AdminSidebar } from "@/components/admin-sidebar";
import { AdminNotifications } from "@/components/notification-bell";

type AdminShellProps = {
  active: string;
  kicker: string;
  title: string;
  copy?: string;
  children: ReactNode;
};

export function AdminShell({ active, kicker, title, copy, children }: AdminShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<"checking" | "ready">("checking");
  const [username, setUsername] = useState("admin");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    apiFetch(`${API_URL}/api/admin/me`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("unauthorized");
        return res.json();
      })
      .then((data) => {
        setUsername(data.username || "admin");
        setStatus("ready");
      })
      .catch(() => {
        router.replace("/Admin_Login");
      });
  }, [router, pathname]);

  async function logout() {
    await apiFetch(`${API_URL}/api/admin/logout`, {
      method: "POST",
      credentials: "include",
    }).catch(() => undefined);
    clearAdminToken();
    router.replace("/Admin_Login");
  }

  if (status === "checking") {
    return (
      <main className="dash-bg grid min-h-svh place-items-center text-sm dash-muted">
        Checking access…
      </main>
    );
  }

  return (
    <div className="dash-bg min-h-svh">
      <AdminSidebar
        username={username}
        active={active}
        onLogout={logout}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div>
        <header className="dash-surface sticky top-0 z-30 border-b dash-border">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <AdminMenuButton onClick={() => setSidebarOpen(true)} />
              <p className="dash-text truncate text-sm font-medium">{title}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <AdminNotifications />
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                {username}
              </span>
            </div>
          </div>
        </header>
        <section className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-5">
          <p className="dash-muted text-sm">{kicker}</p>
          <h1 className="dash-text mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
          {copy ? <p className="dash-muted mt-2 max-w-2xl text-sm leading-6">{copy}</p> : null}
          {children}
        </section>
      </div>
    </div>
  );
}
