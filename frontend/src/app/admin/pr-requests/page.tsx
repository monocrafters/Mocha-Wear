import { AdminShell } from "@/components/admin-shell";
import { AdminPrRequests } from "@/components/admin-pr-requests";

export default function AdminPrRequestsPage() {
  return (
    <AdminShell
      active="pr-requests"
      kicker="Commerce"
      title="PR requests"
      copy="Resellers with PR enabled unlock a package request after every 100 delivered products (qty). Manage access in Resellers → Edit."
    >
      <AdminPrRequests />
    </AdminShell>
  );
}
