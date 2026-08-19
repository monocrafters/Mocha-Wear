import type { Metadata } from "next";
import { AdminHelp } from "@/components/admin-help";
import { AdminShell } from "@/components/admin-shell";

export const metadata: Metadata = {
  title: "Help — Mocha Wear Admin",
};

export default function AdminHelpPage() {
  return (
    <AdminShell
      active="help"
      kicker="Support"
      title="Help"
      copy="Update hours, WhatsApp, topics, and the info cards that show on the Help page."
    >
      <AdminHelp />
    </AdminShell>
  );
}
