"use client";

import { useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { API_URL, apiFetch } from "@/lib/api";
import { invalidateApiCache } from "@/lib/api-cache";
import { readReferralQueryParam, setReferralCode } from "@/lib/referral";

export function ReferralQueryActivator() {
  const searchParams = useSearchParams();
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const code = String(searchParams.get("r") || readReferralQueryParam() || "")
    .trim()
    .toLowerCase();
  const slug = String(params.slug || "").trim();

  useEffect(() => {
    if (!code || !slug) return;

    setReferralCode(code);

    apiFetch(
      `${API_URL}/api/r/${encodeURIComponent(code)}?to=${encodeURIComponent(`/products/${slug}`)}`,
      { credentials: "include" },
    )
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) return;
        setReferralCode(data.code || code);
        invalidateApiCache("/api/products");
        invalidateApiCache("/api/pricing");
        router.replace(`/products/${slug}`, { scroll: false });
      })
      .catch(() => undefined);
  }, [code, slug, router]);

  return null;
}
