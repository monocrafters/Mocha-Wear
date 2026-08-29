"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL, apiFetch } from "@/lib/api";
import { invalidateApiCache } from "@/lib/api-cache";
import { setReferralCode } from "@/lib/referral";

export function ReferralProductClient({ code, slug }: { code: string; slug: string }) {
  const router = useRouter();
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!code || !slug) {
      router.replace("/");
      return;
    }
    apiFetch(`${API_URL}/api/r/${encodeURIComponent(code)}/p/${encodeURIComponent(slug)}`, {
      credentials: "include",
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error("invalid");
        setReferralCode(data.code || code);
        invalidateApiCache("/api/products");
        invalidateApiCache("/api/pricing");
        router.replace(data.to || `/products/${slug}`);
      })
      .catch(() => {
        setError(true);
        router.replace("/");
      });
  }, [code, slug, router]);

  return (
    <main className="grid min-h-svh place-items-center bg-white text-sm text-slate-500">
      {error ? "Redirecting…" : "Opening product…"}
    </main>
  );
}
