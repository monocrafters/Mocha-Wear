import type { Metadata } from "next";
import { AdminSettings } from "@/components/admin-settings";
import { AdminShell } from "@/components/admin-shell";

export const metadata: Metadata = {
  title: "Settings — Mocha Wear Admin",
};

export default function AdminSettingsPage() {
  return (
    <AdminShell
      active="settings"
      kicker="System"
      title="Settings"
      copy="Update brand, footer, contact, and homepage copy here. You should not need to change code for these."
    >
      <AdminSettings />
    </AdminShell>
  );
}
