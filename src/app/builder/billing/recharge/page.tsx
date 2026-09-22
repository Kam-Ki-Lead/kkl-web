import type { Metadata } from "next";
import { BuilderShell } from "@/components/builder/builder-shell";
import { RechargeForm } from "@/components/console/recharge-form";
import { getServices } from "@/lib/services";

export const metadata: Metadata = { title: "Recharge credits" };

/** S-15 — recharge credits. */
export default async function RechargePage() {
  const wallet = await getServices().builder.credits.wallet();

  return (
    <BuilderShell title="Recharge credits" subtitle="1 rupee = 1 credit">
      <div className="max-w-[640px]">
        <h2 className="t-title text-ink">Recharge credits</h2>
        <p className="t-body mt-[8px] text-body">
          Credits are added after the payment succeeds. 1 rupee buys 1 credit.
        </p>
        <RechargeForm balanceCredits={wallet.balanceCredits} scope="builder" />
      </div>
    </BuilderShell>
  );
}
