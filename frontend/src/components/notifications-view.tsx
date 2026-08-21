"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import type { AppNotification } from "@/lib/notifications";
import {
  fetchUserNotifications,
  markUserRead,
  markUserReadAll,
  notificationTime,
} from "@/lib/notifications";
import { NotificationListSkeleton, Skeleton } from "@/components/skeletons";

export function NotificationsView() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const unread = items.filter((item) => !item.read).length;

  const load = useCallback(async () => {
    try {
      const next = await fetchUserNotifications();
      setItems(next);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function openItem(item: AppNotification) {
    if (!item.read) {
      await markUserRead(item);
      setItems((current) => current.map((row) => (row.id === item.id ? { ...row, read: true } : row)));
    }
  }

  async function markAll() {
    if (!unread) return;
    await markUserReadAll(items);
    setItems((current) => current.map((item) => ({ ...item, read: true })));
  }

  return (
    <section className="flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col lg:mx-auto lg:max-w-[1440px] lg:w-full lg:px-8 lg:py-12">
      <div className="flex items-end justify-between gap-3 px-4 py-3 lg:px-0 lg:pb-6">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold tracking-[0.22em] text-sale uppercase">Inbox</p>
          <h1 className="font-serif mt-0.5 text-[1.75rem] leading-none tracking-[-0.03em] text-mocha-deep lg:text-5xl">
            Notifications
          </h1>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <p className="text-[11px] tracking-[0.16em] text-mocha/45 uppercase">
            {loading ? <Skeleton className="inline-block h-3 w-16 align-middle" /> : unread ? `${unread} new` : `${items.length} total`}
          </p>
          {unread ? (
            <button
              type="button"
              onClick={markAll}
              className="text-[10px] font-semibold tracking-[0.14em] text-mocha-deep uppercase underline decoration-mocha/20 underline-offset-4"
            >
              Mark all read
            </button>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(4.75rem+env(safe-area-inset-bottom))] lg:overflow-visible lg:px-0 lg:pb-0">
        {loading ? (
          <NotificationListSkeleton />
        ) : items.length ? (
          <div className="space-y-2 lg:mx-auto lg:max-w-2xl">
            {items.map((item) => (
              <Link
                key={item.id}
                href={item.href || "/"}
                prefetch
                onClick={() => openItem(item)}
                className={`block border px-4 py-4 ${
                  item.read ? "border-sand bg-white" : "border-mocha-deep/20 bg-cream/70"
                }`}
              >
                {!item.read ? (
                  <p className="text-[9px] font-semibold tracking-[0.16em] text-sale uppercase">New</p>
                ) : null}
                <p className={`text-sm font-medium text-mocha-deep ${item.read ? "" : "mt-1"}`}>{item.title}</p>
                {item.message ? <p className="mt-1 text-[13px] leading-6 text-mocha/55">{item.message}</p> : null}
                <p className="mt-2 text-[10px] tracking-[0.12em] text-mocha/35 uppercase">{notificationTime(item.created_at)}</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 py-10 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-cream text-mocha-deep">
              <Bell size={22} strokeWidth={1.6} />
            </span>
            <h2 className="font-serif mt-5 text-3xl text-mocha-deep">No notifications yet.</h2>
            <p className="mt-3 max-w-sm text-sm leading-6 text-mocha/55">
              Order updates, new arrivals, and sale notes will show up here.
            </p>
            <Link
              href="/shop"
              prefetch
              className="mt-8 inline-block bg-mocha-deep px-5 py-3 text-[11px] font-semibold tracking-[0.18em] text-ivory uppercase"
            >
              Shop the sale
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
