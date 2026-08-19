import type { Metadata } from "next";
import { AdminDashboard } from "@/components/admin-dashboard";

export const metadata: Metadata = {
  title: "Admin Dashboard — Mocha Wear",
};

export default function AdminPage() {
  return <AdminDashboard />;
}
