import type { Metadata } from "next";
import { AdminOrders } from "@/components/admin-orders";
import { AdminShell } from "@/components/admin-shell";

export const metadata: Metadata = {
  title: "Orders — Mocha Wear Admin",
};

export default function AdminOrdersPage() {
  return (
    <AdminShell
      active="orders"
      kicker="Commerce"
      title="Orders"
      copy="Every COD order lands here. Update packing, shipping, and delivery as it moves."
    >
      <AdminOrders />
    </AdminShell>
  );
}
