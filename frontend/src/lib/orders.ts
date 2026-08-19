import { API_URL, apiFetch } from "@/lib/api";
import { saveCustomerSession } from "@/lib/customer";

export type OrderStatus = "processing" | "packed" | "shipped" | "delivered" | "cancelled";

export type OrderItem = {
  product_id?: string;
  name: string;
  spec: string;
  size?: string;
  qty: number;
  price: number;
  image: string;
  slug?: string;
};

export type Order = {
  id: string;
  created_at: string;
  updated_at?: string;
  placedAt?: string;
  status: OrderStatus;
  city: string;
  payment: string;
  delivery: number;
  subtotal?: number;
  total?: number;
  note?: string;
  cancel_reason?: string;
  cancel_detail?: string;
  cancelled_by?: "customer" | "admin" | string;
  cancelled_at?: string;
  customer_id?: string;
  customer?: {
    name: string;
    phone: string;
    whatsapp?: string;
    city?: string;
    area: string;
    address: string;
    landmark?: string;
  };
  items: OrderItem[];
};

export const ORDERS_KEY = "mocha-wear-orders";
export const ORDER_IDS_KEY = "mocha-wear-order-ids";
export const ORDER_PHONE_KEY = "mocha-wear-order-phone";
export const ORDERS_EVENT = "mocha-orders";

export const ORDER_STATUSES: { id: OrderStatus; label: string }[] = [
  { id: "processing", label: "Processing" },
  { id: "packed", label: "Packed" },
  { id: "shipped", label: "Shipped" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
];

function notify() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(ORDERS_EVENT));
}

export function readOrderIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(ORDER_IDS_KEY) || "[]");
    const ids = Array.isArray(raw) ? raw.map((id) => String(id)).filter(Boolean) : [];
    const legacy = readOrdersCache().map((order) => order.id);
    return [...new Set([...ids, ...legacy])];
  } catch {
    return [];
  }
}

export function rememberOrder(order: Order) {
  if (typeof window === "undefined") return;
  const ids = [order.id, ...readOrderIds().filter((id) => id !== order.id)];
  localStorage.setItem(ORDER_IDS_KEY, JSON.stringify(ids));
  if (order.customer?.phone) localStorage.setItem(ORDER_PHONE_KEY, order.customer.phone);
  const cached = [order, ...readOrdersCache().filter((row) => row.id !== order.id)];
  localStorage.setItem(ORDERS_KEY, JSON.stringify(cached));
  if (order.customer) {
    saveCustomerSession({
      name: order.customer.name || "",
      phone: order.customer.phone || "",
      whatsapp: order.customer.whatsapp || order.customer.phone || "",
      city: order.customer.city || order.city || "",
      area: order.customer.area || "",
      address: order.customer.address || "",
      landmark: order.customer.landmark || "",
    });
  }
  notify();
}

export function readOrderPhone() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(ORDER_PHONE_KEY) || "";
}

export function rememberOrderPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits) localStorage.setItem(ORDER_PHONE_KEY, digits);
}

export function readOrdersCache(): Order[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw.filter((row) => row && row.id && Array.isArray(row.items));
  } catch {
    return [];
  }
}

export function writeOrdersCache(orders: Order[], options?: { silent?: boolean }) {
  const next = JSON.stringify(orders);
  const prev = localStorage.getItem(ORDERS_KEY);
  localStorage.setItem(ORDERS_KEY, next);
  if (!options?.silent && prev !== next) notify();
}

let lookupInFlight: Promise<Order[]> | null = null;

export async function lookupOrders() {
  if (lookupInFlight) return lookupInFlight;

  lookupInFlight = (async () => {
    const ids = readOrderIds();
    const phone = readOrderPhone();
    const cached = readOrdersCache();
    if (!ids.length && !phone) return cached;

    try {
      const res = await apiFetch(`${API_URL}/api/orders/lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, phone: phone || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not load orders");
      const items: Order[] = data.items || [];
      writeOrdersCache(items, { silent: true });
      return items;
    } catch {
      return cached;
    }
  })().finally(() => {
    lookupInFlight = null;
  });

  return lookupInFlight;
}

export async function placeOrderRequest(payload: {
  city: string;
  customer: NonNullable<Order["customer"]>;
  items: OrderItem[];
}) {
  const res = await apiFetch(`${API_URL}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Could not place order");
  const order = data.item as Order;
  rememberOrder(order);
  return order;
}

export function orderDate(order: Order) {
  const iso = order.created_at;
  if (iso) {
    const date = new Date(iso);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
  }
  return order.placedAt || "";
}

export function orderTotal(order: Order) {
  if (typeof order.total === "number") return order.total;
  const goods = order.items.reduce((sum, item) => sum + item.price * item.qty, 0);
  return goods + (order.delivery || 0);
}

export function orderPlace(order: Order) {
  return [order.customer?.area, order.city || order.customer?.city].filter(Boolean).join(", ");
}

export function statusCopy(status: OrderStatus) {
  if (status === "processing") return { label: "Processing", tone: "bg-gold/15 text-mocha" };
  if (status === "packed") return { label: "Packed", tone: "bg-cream text-mocha-deep" };
  if (status === "shipped") return { label: "On the way", tone: "bg-mocha-deep text-ivory" };
  if (status === "delivered") return { label: "Delivered", tone: "bg-sale/10 text-sale" };
  return { label: "Cancelled", tone: "bg-sand text-mocha/55" };
}

export function canCancelOrder(status: OrderStatus) {
  return status === "processing" || status === "packed";
}

export const CUSTOMER_CANCEL_REASONS = [
  "Changed my mind",
  "Ordered by mistake",
  "Want a different size",
  "Delivery is taking too long",
  "Other",
] as const;

export const ADMIN_CANCEL_REASONS = [
  "Out of stock",
  "Location / delivery problem",
  "Could not reach customer",
  "Duplicate order",
  "Other",
] as const;

export function stepIndex(status: OrderStatus) {
  if (status === "processing") return 0;
  if (status === "packed") return 1;
  if (status === "shipped") return 2;
  if (status === "delivered") return 3;
  return -1;
}

export function cancelReasonText(order: Order) {
  const reason = String(order.cancel_reason || "").trim();
  const detail = String(order.cancel_detail || "").trim();
  if (!reason && !detail) return "";
  if (reason.toLowerCase() === "other") return detail || "Other";
  return detail ? `${reason} — ${detail}` : reason;
}

export async function cancelOrderRequest(id: string, reason: string, detail = "") {
  const res = await apiFetch(`${API_URL}/api/orders/${id}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ids: readOrderIds(),
      phone: readOrderPhone() || undefined,
      reason,
      detail,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Could not cancel order");
  const order = data.item as Order;
  rememberOrder(order);
  return order;
}
