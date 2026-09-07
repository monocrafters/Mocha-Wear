"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL, apiFetch, setResellerToken } from "@/lib/api";
import { ui } from "@/lib/admin-ui";
import { PasswordInput } from "@/components/password-input";

export function ResellerLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiFetch(`${API_URL}/api/reseller/me`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        if (!data.authenticated) return;
        if (data.token) setResellerToken(data.token);
        if (!cancelled) {
          router.replace("/reseller");
          router.refresh();
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setCheckingSession(false);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await apiFetch(`${API_URL}/api/reseller/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Could not sign in");
        return;
      }
      if (data.token) setResellerToken(data.token);
      router.push("/reseller");
      router.refresh();
    } catch {
      setError("Server is not reachable. Start the backend and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="mt-8 grid place-items-center py-10 text-sm text-slate-500">
        Checking your session…
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      <label className="block">
        <span className={ui.label}>Username</span>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          required
          className={ui.input}
        />
      </label>
      <label className="block">
        <span className={ui.label}>Password</span>
        <PasswordInput
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          required
        />
      </label>
      {error ? <p className={ui.error}>{error}</p> : null}
      <button type="submit" disabled={loading} className={`${ui.btnPrimary} w-full`}>
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
