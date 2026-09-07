import { Suspense } from "react";
import { ResellerWithdrawMethodDetails } from "@/components/reseller-withdraw-method-details";

export default function ResellerWithdrawMethodDetailsPage() {
  return (
    <Suspense fallback={null}>
      <ResellerWithdrawMethodDetails />
    </Suspense>
  );
}
