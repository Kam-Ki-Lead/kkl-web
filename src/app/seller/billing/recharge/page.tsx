import type { Metadata } from "next";
import { SellerShell } from "@/components/seller/seller-shell";
import { RechargeForm } from "@/components/console/recharge-form";
import { getServices } from "@/lib/services";
import { AccessPanel } from "@/components/ui/states";

/**
 * Read per-account at request time: with a backend store selected this page
 * calls kkl-backend as the signed-in account, which cannot be prerendered.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Recharge credits" };

/** S-15 — recharge credits. */
export default async function RechargePage() {
  const credits = getServices().credits;
  const [wallet, availability] = await Promise.all([
    credits.wallet(),
    credits.availability(),
  ]);

  return (
    <SellerShell title="Recharge credits" subtitle="1 rupee = 1 credit">
      <div className="max-w-[640px]">
        <h2 className="t-flow-title text-ink">Recharge credits</h2>
        <p className="t-body mt-[8px] text-body">
          Credits are added after the payment succeeds. 1 rupee buys 1 credit.
        </p>
        {/* The action is offered only when the service says it can be taken.
            When it cannot, the reason is the service's own sentence — it
            names the provider and the outstanding dependency, which is what
            somebody reading this needs, and is not something this screen
            could compose for itself. */}
        {availability.recharge.available ? (
          <RechargeForm balanceCredits={wallet.balanceCredits} />
        ) : (
          <div className="mt-[18px]">
            <AccessPanel
              tone="restricted"
              chipLabel="Unavailable"
              title="Recharge is unavailable"
              footnote="No payment has been attempted and nothing has been charged."
            >
              <p>{availability.recharge.reason}</p>
            </AccessPanel>
          </div>
        )}
      </div>
    </SellerShell>
  );
}
