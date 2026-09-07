import { API_URL, apiFetch } from "@/lib/api";

export const PR_ORDER_TARGET = 100;

export type PrRequest = {
  id: string;
  reseller_id: string;
  status: "pending" | "approved" | "rejected" | string;
  note?: string;
  admin_note?: string;
  delivered_at_request?: number;
  milestone?: number;
  created_at?: string;
  reviewed_at?: string;
};

export type PrProgress = {
  target: number;
  delivered: number;
  current: number;
  percent: number;
  earned: number;
  used: number;
  next_milestone: number;
  can_request: boolean;
  unlocked: boolean;
  pending_request: PrRequest | null;
  requests?: PrRequest[];
};

export async function fetchPrProgress(): Promise<PrProgress> {
  const res = await apiFetch(`${API_URL}/api/reseller/pr-progress`, { credentials: "include" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Could not load PR progress");
  return data as PrProgress;
}

export async function requestPrPackage(note = "") {
  const res = await apiFetch(`${API_URL}/api/reseller/pr-requests`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ note }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Could not send PR request");
  return data.item as PrRequest;
}
