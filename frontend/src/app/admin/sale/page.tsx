import type { Metadata } from "next";
import { AdminSales } from "@/components/admin-sales";
import { AdminShell } from "@/components/admin-shell";

export const metadata: Metadata = {
  title: "Sale — Mocha Wear Admin",
};

export default function AdminSalePage() {
  return (
    <AdminShell
      active="sale"
      kicker="Commerce"
      title="Sales"
      copy="Choose the products first, then set dates and attach the sale to a hero slide."
    >
      <AdminSales />
    </AdminShell>
  );
}
