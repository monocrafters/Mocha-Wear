import { API_URL, apiFetch } from "@/lib/api";

export type ResellerNotification = {
  id: string;
  role: "reseller";
  reseller_id?: string;
  type: string;
  title: string;
  message: string;
  href: string;
  read: boolean;
  created_at: string;
};

export type ResellerBadges = {
  pending_products: number;
  unread_notifications: number;
  unread_orders: number;
  open_withdrawal: boolean;
  withdraw_ready: boolean;
};

export async function fetchResellerNotifications() {
  const res = await apiFetch(`${API_URL}/api/reseller/notifications`, { credentials: "include" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Could not load notifications");
  return {
    items: (data.items || []) as ResellerNotification[],
    unread: Number(data.unread) || 0,
  };
}

export async function fetchResellerBadges() {
  const res = await apiFetch(`${API_URL}/api/reseller/badges`, { credentials: "include" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Could not load badges");
  return data as ResellerBadges;
}

export async function markResellerRead(id: string) {
  await apiFetch(`${API_URL}/api/reseller/notifications/${encodeURIComponent(id)}/read`, {
    method: "POST",
    credentials: "include",
  });
}

export async function markResellerReadAll() {
  await apiFetch(`${API_URL}/api/reseller/notifications/read-all`, {
    method: "POST",
    credentials: "include",
  });
}

export async function markPricingPageSeen() {
  await apiFetch(`${API_URL}/api/reseller/badges/pricing-seen`, {
    method: "POST",
    credentials: "include",
  });
}

export const RESELLER_BADGES_REFRESH = "reseller-badges-refresh";

export function refreshResellerBadges() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(RESELLER_BADGES_REFRESH));
  }
}

export { notificationTime } from "@/lib/notifications";
