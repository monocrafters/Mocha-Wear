"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { API_URL, apiFetch, clearResellerToken } from "@/lib/api";

type ResellerSession = {
  name: string;
  id?: string;
  code?: string;
};

type ResellerSessionContextValue = {
  status: "checking" | "ready";
  session: ResellerSession | null;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const ResellerSessionContext = createContext<ResellerSessionContextValue | null>(null);

/** Survives route remounts so sidebar nav does not flash "Checking access". */
let cachedSession: ResellerSession | null = null;

export function ResellerSessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "ready">(cachedSession ? "ready" : "checking");
  const [session, setSession] = useState<ResellerSession | null>(cachedSession);

  const applySession = useCallback((next: ResellerSession | null) => {
    cachedSession = next;
    setSession(next);
    setStatus(next ? "ready" : "checking");
  }, []);

  const refresh = useCallback(async () => {
    const res = await apiFetch(`${API_URL}/api/reseller/me`, { credentials: "include" });
    if (!res.ok) throw new Error("unauthorized");
    const data = await res.json();
    const next: ResellerSession = {
      name: data.reseller?.name || data.reseller?.username || "reseller",
      id: data.reseller?.id,
      code: data.reseller?.code,
    };
    applySession(next);
  }, [applySession]);

  useEffect(() => {
    let cancelled = false;
    refresh().catch(() => {
      if (cancelled) return;
      cachedSession = null;
      setSession(null);
      setStatus("checking");
      router.replace("/Reseller_Login");
    });
    return () => {
      cancelled = true;
    };
  }, [refresh, router]);

  const logout = useCallback(async () => {
    await apiFetch(`${API_URL}/api/reseller/logout`, {
      method: "POST",
      credentials: "include",
    }).catch(() => undefined);
    clearResellerToken();
    cachedSession = null;
    setSession(null);
    router.replace("/Reseller_Login");
  }, [router]);

  const value = useMemo(
    () => ({ status, session, refresh, logout }),
    [status, session, refresh, logout],
  );

  return <ResellerSessionContext.Provider value={value}>{children}</ResellerSessionContext.Provider>;
}

export function useResellerSession() {
  const ctx = useContext(ResellerSessionContext);
  if (!ctx) {
    throw new Error("useResellerSession must be used within ResellerSessionProvider");
  }
  return ctx;
}
