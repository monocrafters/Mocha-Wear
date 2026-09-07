import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { AdminResellerDetail } from "@/components/admin-reseller-detail";

export const metadata: Metadata = {
  title: "Reseller — Mocha Wear Admin",
};

export default function AdminResellerDetailPage() {
  return (
    <AdminShell
      active="resellers"
      kicker="Commerce"
      title="Reseller detail"
      copy="Wallet, orders, prices, withdrawals, and click progress for this reseller."
    >
      <p className="mt-4">
        <Link href="/admin/resellers" className="text-sm font-medium text-blue-600 hover:text-blue-700">
          ← All resellers
        </Link>
      </p>
      <AdminResellerDetail />
    </AdminShell>
  );
}
