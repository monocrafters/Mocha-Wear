import { AdminShell } from "@/components/admin-shell";
import { AdminLinkRequests } from "@/components/admin-link-requests";

export default function AdminLinkRequestsPage() {
  return (
    <AdminShell
      active="link-requests"
      kicker="Commerce"
      title="Link requests"
      copy="Approve or reject reseller link change requests (/r/name)."
    >
      <AdminLinkRequests />
    </AdminShell>
  );
}
