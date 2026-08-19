import type { Metadata } from "next";
import { AdminCollections } from "@/components/admin-collections";
import { AdminShell } from "@/components/admin-shell";

export const metadata: Metadata = {
  title: "Collections — Mocha Wear Admin",
};

export default function AdminCollectionPage() {
  return (
    <AdminShell
      active="collections"
      kicker="Catalog"
      title="Collections"
      copy="Add covers, videos, sale lines, and publish collections to the storefront."
    >
      <AdminCollections />
    </AdminShell>
  );
}
