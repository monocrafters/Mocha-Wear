import { API_URL, apiFetch } from "@/lib/api";
import { readOrderPhone } from "@/lib/orders";
import { readCustomerSession } from "@/lib/customer";

export type AppNotification = {
  id: string;
  role: "admin" | "user";
  phone?: string;
  type: string;
  title: string;
  message: string;
  href: string;
  read: boolean;
  created_at: string;
};

const SEEN_KEY = "mocha-wear-notif-seen";

export function currentUserPhone() {
  return readCustomerSession()?.phone || readOrderPhone() || "";
}

export function readSeenIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(SEEN_KEY) || "[]");
    return Array.isArray(raw) ? raw.map(String) : [];
  } catch {
    return [];
  }
}

export function rememberSeen(ids: string[]) {
  const next = [...new Set([...readSeenIds(), ...ids])].slice(0, 300);
  localStorage.setItem(SEEN_KEY, JSON.stringify(next));
}

export function notificationTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function fetchUserNotifications() {
  const phone = currentUserPhone();
  const res = await apiFetch(`${API_URL}/api/notifications?phone=${encodeURIComponent(phone)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Could not load notifications");
  const items: AppNotification[] = data.items || [];
  const seen = new Set(readSeenIds());
  return items.map((item) => ({
    ...item,
    read: item.phone ? item.read : seen.has(item.id),
  }));
}

export async function fetchAdminNotifications() {
  const res = await apiFetch(`${API_URL}/api/admin/notifications`, { credentials: "include" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Could not load notifications");
  return (data.items || []) as AppNotification[];
}

export async function markAdminRead(id: string) {
  await apiFetch(`${API_URL}/api/admin/notifications/${id}/read`, {
    method: "POST",
    credentials: "include",
  });
}

export async function markAdminReadAll() {
  await apiFetch(`${API_URL}/api/admin/notifications/read-all`, {
    method: "POST",
    credentials: "include",
  });
}

export async function markUserRead(item: AppNotification) {
  if (!item.phone) {
    rememberSeen([item.id]);
    return;
  }
  await apiFetch(`${API_URL}/api/notifications/${item.id}/read`, { method: "POST" });
}

export async function markUserReadAll(items: AppNotification[]) {
  rememberSeen(items.filter((item) => !item.phone).map((item) => item.id));
  const personal = items.filter((item) => item.phone && !item.read);
  await Promise.all(
    personal.map((item) => apiFetch(`${API_URL}/api/notifications/${item.id}/read`, { method: "POST" })),
  );
}
