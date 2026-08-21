"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import type { AppNotification } from "@/lib/notifications";
import {
  fetchAdminNotifications,
  fetchUserNotifications,
  markAdminRead,
  markAdminReadAll,
  notificationTime,
} from "@/lib/notifications";

export function NotificationBell({
  items,
  onOpen,
  onRead,
  onReadAll,
}: {
  items: AppNotification[];
  onOpen?: () => void;
  onRead: (item: AppNotification) => void;
  onReadAll?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const unread = items.filter((item) => !item.read).length;

  useEffect(() => {
    if (!open) return;
    onOpen?.();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpen]);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen((current) => !current)}
        className="relative grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      >
        <Bell size={16} strokeWidth={1.6} />
        {unread ? (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <button type="button" className="fixed inset-0 z-[80]" aria-label="Close notifications" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-[81] mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-slate-900 uppercase">Notifications</p>
              {onReadAll && unread ? (
                <button type="button" onClick={onReadAll} className="text-[11px] text-slate-500 hover:text-slate-900">
                  Mark all read
                </button>
              ) : null}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {items.length ? (
                items.slice(0, 20).map((item) => (
                  <a
                    key={item.id}
                    href={item.href || "#"}
                    onClick={() => {
                      onRead(item);
                      setOpen(false);
                    }}
                    className={`block border-b border-slate-100 px-4 py-3 last:border-0 ${item.read ? "opacity-70" : "bg-slate-50"}`}
                  >
                    <p className="text-sm font-medium text-slate-900">{item.title}</p>
                    {item.message ? <p className="mt-0.5 text-[12px] leading-5 text-slate-500">{item.message}</p> : null}
                    <p className="mt-1 text-[10px] tracking-[0.08em] text-slate-400 uppercase">{notificationTime(item.created_at)}</p>
                  </a>
                ))
              ) : (
                <p className="px-4 py-8 text-center text-sm text-slate-500">No notifications yet.</p>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

export function AdminNotifications() {
  const [items, setItems] = useState<AppNotification[]>([]);

  const load = useCallback(() => {
    fetchAdminNotifications()
      .then(setItems)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 60_000);
    function onVisible() {
      if (document.visibilityState === "visible") load();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  return (
    <NotificationBell
      items={items}
      onOpen={load}
      onReadAll={async () => {
        await markAdminReadAll();
        load();
      }}
      onRead={async (item) => {
        if (!item.read) await markAdminRead(item.id);
        load();
      }}
    />
  );
}

export function StoreNotifications() {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const active = pathname.startsWith("/notifications");

  useEffect(() => {
    function load() {
      if (document.visibilityState !== "visible") return;
      fetchUserNotifications()
        .then((items) => setUnread(items.filter((item) => !item.read).length))
        .catch(() => undefined);
    }
    load();
    const timer = window.setInterval(load, 60_000);
    document.addEventListener("visibilitychange", load);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", load);
    };
  }, [pathname]);

  return (
    <Link
      href="/notifications"
      prefetch
      aria-label="Notifications"
      className={`header-icon-btn relative grid h-10 w-10 place-items-center rounded-full ${
        active ? "is-gold" : ""
      }`}
    >
      <Bell size={18} strokeWidth={1.6} />
      {unread ? (
        <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-sale px-1 text-[9px] font-semibold text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
