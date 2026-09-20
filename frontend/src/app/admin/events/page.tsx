import type { Metadata } from "next";
import { AdminEvents } from "@/components/admin-events";
import { AdminShell } from "@/components/admin-shell";

export const metadata: Metadata = {
  title: "Events — Mocha Wear Admin",
};

export default function AdminEventsPage() {
  return (
    <AdminShell
      active="events"
      kicker="Insights"
      title="Events"
      copy="Track which store pages get views and clicks, and from which locations visitors come."
    >
      <AdminEvents />
    </AdminShell>
  );
}
