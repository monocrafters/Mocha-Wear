"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL, apiFetch, setAdminToken } from "@/lib/api";
import { ui } from "@/lib/admin-ui";

export function AdminLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await apiFetch(`${API_URL}/api/admin/login`, {
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
      if (data.token) setAdminToken(data.token);
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Server is not reachable. Start the backend and try again.");
    } finally {
      setLoading(false);
    }
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
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          className={ui.input}
        />
      </label>
      {error ? <p className={ui.error}>{error}</p> : null}
      <button type="submit" disabled={loading} className={`${ui.btnPrimary} w-full`}>
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
