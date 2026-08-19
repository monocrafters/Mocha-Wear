import type { Metadata } from "next";
import { AdminProducts } from "@/components/admin-products";
import { AdminShell } from "@/components/admin-shell";

export const metadata: Metadata = {
  title: "Products — Mocha Wear Admin",
};

export default function AdminProductPage() {
  return (
    <AdminShell
      active="products"
      kicker="Catalog"
      title="Products"
      copy="Add suits with multiple photos, prices, and a collection. First image is the cover."
    >
      <AdminProducts />
    </AdminShell>
  );
}
