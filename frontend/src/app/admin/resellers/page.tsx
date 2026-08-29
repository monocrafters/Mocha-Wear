import { AdminShell } from "@/components/admin-shell";
import { AdminResellers } from "@/components/admin-resellers";

export default function AdminResellersPage() {
  return (
    <AdminShell active="resellers" kicker="Commerce" title="Resellers" copy="Manage reseller accounts, commissions, and access.">
      <AdminResellers />
    </AdminShell>
  );
}
