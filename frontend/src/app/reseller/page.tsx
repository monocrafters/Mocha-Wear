import type { Metadata } from "next";
import { ResellerOverview } from "@/components/reseller-overview";

export const metadata: Metadata = { title: "Dashboard — Mocha Wear Reseller" };

export default function ResellerHomePage() {
  return <ResellerOverview />;
}
