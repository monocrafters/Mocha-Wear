import type { Metadata } from "next";
import { AdminCustomers } from "@/components/admin-customers";
import { AdminShell } from "@/components/admin-shell";

export const metadata: Metadata = {
  title: "Customers — Mocha Wear Admin",
};

export default function AdminCustomersPage() {
  return (
    <AdminShell
      active="customers"
      kicker="Commerce"
      title="Customers"
      copy="Everyone who placed an order. Open a customer to see address, sizes, and order history."
    >
      <AdminCustomers />
    </AdminShell>
  );
}
