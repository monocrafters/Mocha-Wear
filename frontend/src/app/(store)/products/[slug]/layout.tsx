import { Suspense, type ReactNode } from "react";
import { ReferralQueryActivator } from "@/components/referral-query-activator";

export default function ProductSlugLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <ReferralQueryActivator />
      </Suspense>
      {children}
    </>
  );
}
