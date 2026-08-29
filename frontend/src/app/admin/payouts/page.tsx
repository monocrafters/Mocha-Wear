import { AdminShell } from "@/components/admin-shell";
import { AdminPayouts } from "@/components/admin-payouts";

export default function AdminPayoutsPage() {
  return (
    <AdminShell active="payouts" kicker="Commerce" title="Payouts" copy="Review and process reseller payout requests.">
      <AdminPayouts />
    </AdminShell>
  );
}
