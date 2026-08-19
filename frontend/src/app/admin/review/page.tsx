import type { Metadata } from "next";
import { AdminReviews } from "@/components/admin-reviews";
import { AdminShell } from "@/components/admin-shell";

export const metadata: Metadata = {
  title: "Reviews — Mocha Wear Admin",
};

export default function AdminReviewPage() {
  return (
    <AdminShell
      active="reviews"
      kicker="Commerce"
      title="Reviews"
      copy="Add customer reviews to show on the homepage. Only published notes go live."
    >
      <AdminReviews />
    </AdminShell>
  );
}
