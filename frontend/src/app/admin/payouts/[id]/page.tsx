import { AdminShell } from "@/components/admin-shell";
import { AdminPayoutDetail } from "@/components/admin-payout-detail";

export default async function AdminPayoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AdminShell active="payouts" kicker="Commerce" title="Withdrawal request" copy="Review payment details and update status.">
      <AdminPayoutDetail payoutId={id} />
    </AdminShell>
  );
}
