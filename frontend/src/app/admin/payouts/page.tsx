import { AdminShell } from "@/components/admin-shell";
import { AdminPayouts } from "@/components/admin-payouts";

export default function AdminPayoutsPage() {
  return (
    <AdminShell active="payouts" kicker="Commerce" title="Payment requests" copy="Review, filter, and process reseller withdrawal requests.">
      <AdminPayouts />
    </AdminShell>
  );
}
