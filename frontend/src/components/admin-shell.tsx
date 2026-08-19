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
      <main className="grid min-h-svh place-items-center bg-[#f3f4f6] text-sm text-slate-500">
        Checking access…
      </main>
    );
  }

  return (
    <div className="min-h-svh bg-[#f3f4f6]">
      <AdminSidebar
        username={username}
        active={active}
        onLogout={logout}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="lg:pl-[260px]">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <AdminMenuButton onClick={() => setSidebarOpen(true)} />
            <p className="text-sm font-medium text-slate-900">{title}</p>
          </div>
          <div className="flex items-center gap-2">
            <AdminNotifications />
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              {username}
            </span>
          </div>
        </header>
        <section className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <p className="text-sm text-slate-500">{kicker}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
          {copy ? <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{copy}</p> : null}
          {children}
        </section>
      </div>
    </div>
  );
}
