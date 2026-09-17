import type { Metadata } from "next";
import { AdminManualOrders } from "@/components/admin-manual-orders";
import { AdminShell } from "@/components/admin-shell";

export const metadata: Metadata = {
  title: "Manual Orders — Mocha Wear Admin",
};

export default function AdminManualOrdersPage() {
  return (
    <AdminShell
      active="manual-orders"
      kicker="Commerce"
      title="Manual Orders"
      copy="Create COD orders from WhatsApp or Instagram, share a customer track link, then dispatch with courier ID."
    >
      <AdminManualOrders />
    </AdminShell>
  );
}
