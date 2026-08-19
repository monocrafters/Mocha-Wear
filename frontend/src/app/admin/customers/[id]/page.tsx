import type { Metadata } from "next";
import { AdminCustomerDetail } from "@/components/admin-customer-detail";
import { AdminShell } from "@/components/admin-shell";

export const metadata: Metadata = {
  title: "Customer — Mocha Wear Admin",
};

export default function AdminCustomerDetailPage() {
  return (
    <AdminShell
      active="customers"
      kicker="Commerce"
      title="Customer"
      copy="Delivery details, contact, and every order with sizes."
    >
      <p className="mt-4">
        <a href="/admin/customers" className="text-sm font-medium text-blue-600 hover:text-blue-700">
          ← All customers
        </a>
      </p>
      <AdminCustomerDetail />
    </AdminShell>
  );
}
