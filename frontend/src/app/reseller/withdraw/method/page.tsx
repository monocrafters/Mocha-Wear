import { Suspense } from "react";
import { ResellerWithdrawMethod } from "@/components/reseller-withdraw-method";

export default function ResellerWithdrawMethodPage() {
  return (
    <Suspense fallback={null}>
      <ResellerWithdrawMethod />
    </Suspense>
  );
}
