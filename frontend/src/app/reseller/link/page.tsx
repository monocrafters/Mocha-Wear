import type { Metadata } from "next";
import { ResellerLinkView } from "@/components/reseller-link-view";

export const metadata: Metadata = { title: "My link — Reseller" };

export default function ResellerLinkPage() {
  return <ResellerLinkView />;
}
