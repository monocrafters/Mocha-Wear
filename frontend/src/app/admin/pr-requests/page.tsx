import { AdminShell } from "@/components/admin-shell";
import { AdminPrRequests } from "@/components/admin-pr-requests";

export default function AdminPrRequestsPage() {
  return (
    <AdminShell
      active="pr-requests"
      kicker="Commerce"
      title="PR requests"
      copy="Resellers unlock a PR package request after every 100 successful delivered products (qty)."
    >
      <AdminPrRequests />
    </AdminShell>
  );
}
