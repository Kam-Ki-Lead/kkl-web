import type { Metadata } from "next";
import { SellerShell } from "@/components/seller/seller-shell";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { DECISIONS } from "@/lib/config/business-rules";
import { formatCreditBalance } from "@/lib/format";
import { getServices } from "@/lib/services";

export const metadata: Metadata = { title: "Credit expiry" };

/**
 * S-18 — the proposed credit-expiry states.
 *
 * This screen exists because D-04 is open. The account-roles specification says
 * credits have an expiry date and says nothing else: not the period, not the
 * warning window, not whether expired credits can be renewed or restored, and
 * not whether a recharge revives them.
 *
 * So the three states are shown as **designs, not as this account's state**. No
 * period is stated in any of them, no date is computed, and no renewal control
 * is offered — offering one would imply a route that has not been agreed. The
 * figures are illustrative and labelled as such; the only real number here is
 * the balance, and it is the usable one.
 *
 * It is reached from S-14's "See the proposed states" and is not in the rail.
 */
export default async function CreditExpiryPage() {
  const wallet = await getServices().credits.wallet();

  return (
    <SellerShell title="Credit expiry" subtitle="Proposed states — rules not yet set">
      <div className="flex flex-col gap-[18px]">
        <Card className="border-[#F3DFB4] bg-[#FFF7E8] p-[22px]">
          <h2 className="t-card-title text-ink">Unresolved: credit expiry and renewal</h2>
          <p className="t-body mt-[6px] max-w-[80ch] text-body">
            The account-roles specification states that credits have an expiry date, and nothing
            else. Period, warning window, whether expired credits can be renewed or restored, and
            whether a recharge revives them are all open. Below are the three states the design
            supports once the rule is set — no period is stated in any of them, and none of them
            describes your account.
          </p>
          <p className="t-caption mt-[10px] text-muted">
            {DECISIONS["D-04"].question} — D-04, blocks launch
          </p>
        </Card>

        <div className="grid grid-cols-3 gap-[14px] max-[1060px]:grid-cols-1">
          <Card className="p-[20px]">
            <Chip tone="success">Active</Chip>
            <p className="t-heading mt-[10px] text-ink">
              {formatCreditBalance(wallet.balanceCredits)}
            </p>
            <p className="t-body-sm mt-[4px] text-body">Credits usable now.</p>
            <p className="t-caption mt-[10px] text-muted">
              Shown when the balance is well inside the validity window. This is the only one of
              the three that reflects a real figure — it is your balance, and all of it is usable.
            </p>
          </Card>

          <Card className="p-[20px]">
            <Chip tone="warning">Expiring soon</Chip>
            <p className="t-heading mt-[10px] text-muted">
              {wallet.expiringSoonCredits === null
                ? "Not calculable"
                : formatCreditBalance(wallet.expiringSoonCredits)}
            </p>
            <p className="t-body-sm mt-[4px] text-body">
              A portion of the balance is close to its expiry date.
            </p>
            <p className="t-caption mt-[10px] text-muted">
              Needs the warning window, and whether partial batches expire first. Both undecided,
              so there is no figure to show — an amount here would be invented.
            </p>
          </Card>

          <Card className="p-[20px]">
            <Chip tone="danger">Expired</Chip>
            <p className="t-heading mt-[10px] text-muted">
              {wallet.expiredCredits === null
                ? "Not calculable"
                : formatCreditBalance(wallet.expiredCredits)}
            </p>
            <p className="t-body-sm mt-[4px] text-body">
              Credits past their validity date, held separately from the usable balance.
            </p>
            <p className="t-caption mt-[10px] text-muted">
              Needs the client&rsquo;s answer on renewal and restoration. No renewal button is
              shown until then, because there is no agreed route for one to take.
            </p>
          </Card>
        </div>

        <div>
          <ButtonLink href="/seller/billing" variant="secondary">
            Back to billing &amp; credits
          </ButtonLink>
        </div>
      </div>
    </SellerShell>
  );
}
