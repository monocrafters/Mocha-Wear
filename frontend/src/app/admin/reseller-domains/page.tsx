import { AdminShell } from "@/components/admin-shell";
import { AdminResellerDomains } from "@/components/admin-reseller-domains";

export default function AdminResellerDomainsPage() {
  return (
    <AdminShell
      active="reseller-domains"
      kicker="Commerce"
      title="Reseller domains"
      copy="Monitor custom domains, suspend abusive links, or force-remove a domain."
    >
      <AdminResellerDomains />
    </AdminShell>
  );
}
