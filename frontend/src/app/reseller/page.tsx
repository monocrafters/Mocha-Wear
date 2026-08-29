import type { Metadata } from "next";
import { ResellerOverview } from "@/components/reseller-overview";

export const metadata: Metadata = { title: "Reseller — Mocha Wear" };

export default function ResellerHomePage() {
  return <ResellerOverview />;
}
