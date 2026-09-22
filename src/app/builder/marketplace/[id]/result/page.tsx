import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BuilderShell } from "@/components/builder/builder-shell";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { AccessPanel, PendingRule, StateMessage } from "@/components/ui/states";
import { readPurchaseOutcome } from "@/app/actions/lead-purchase";
import { DECISIONS } from "@/lib/config/business-rules";
import { formatCreditBalance, formatExactInr } from "@/lib/format";
import { getServices } from "@/lib/services";

export const metadata: Metadata = { title: "Purchase result" };

/**
 * S-11 purchase success, and the S-10 failure states.
 *
 * Which one renders is decided by the outcome the action recorded in an httpOnly
 * cookie, never by the URL. A Seller who edits the address cannot make this
 * screen claim a purchase: with no recorded outcome it sends them back rather
 * than inventing one.
 *
 * The success case is the only one that shows contact details, and it shows them
 * because the service returned a `PurchasedLead` — the type that has contact
 * fields at all.
 */
export default async function PurchaseResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const outcome = await readPurchaseOutcome(id, "builder");
  const services = getServices();

  if (!outcome) {
    // Nothing was recorded for this browser. Either the cookie expired or this
    // address was opened directly; both mean there is no result to show.
    const owned = await services.builder.leadMarket.getPurchased(id);
    redirect(owned ? `/builder/leads/${id}` : `/builder/marketplace/${id}`);
  }

  if (outcome.kind === "purchased") {
    const [lead, wallet] = await Promise.all([
      services.builder.leadMarket.getPurchased(id),
      services.builder.credits.wallet(),
    ]);
    if (!lead) redirect("/builder/leads");

    return (
      <BuilderShell title="Purchase result" subtitle="Lead release and download">
        <div className="max-w-[720px]">
          <div className="flex flex-wrap items-center gap-[12px]">
            <Chip tone="success">✓ Purchased</Chip>
            <h2 className="t-title text-ink">Lead purchased</h2>
          </div>
          <p className="t-body mt-[8px] text-body">
            {formatExactInr(lead.pricePaidCredits)} deducted. This lead is now yours alone —
            contact details are released below and the lead sits in My leads. Your balance is{" "}
            {formatCreditBalance(wallet.balanceCredits)}.
          </p>

          <Card className="mt-[18px] border-[#C9E4D6] p-[22px]">
            <h3 className="t-card-title text-success">Contact details</h3>
            <dl className="mt-[12px] grid grid-cols-2 gap-[14px] max-[560px]:grid-cols-1">
              <Detail label="Name" value={lead.contact.name} />
              <Detail label="Mobile" value={lead.contact.phone} mono />
              <Detail label="Email" value={lead.contact.email ?? "Not provided"} />
              <Detail label="Best time to call" value={lead.contact.bestTimeToCall ?? "Not given"} />
            </dl>
          </Card>

          <div className="mt-[16px] flex flex-wrap gap-[10px]">
            <ButtonLink href={`/builder/leads/${lead.id}/export.csv`} prefetch={false}>
              Download CSV
            </ButtonLink>
            <ButtonLink href="/builder/leads" variant="secondary">
              Go to My leads
            </ButtonLink>
          </div>

          <p className="t-caption mt-[12px] text-muted">
            The order reference is <span className="t-mono text-ink">{lead.orderId}</span>.
            Re-downloading does not cost credits.
          </p>
        </div>
      </BuilderShell>
    );
  }

  // ------------------------------------------------------------ S-10 failures

  const lead = await services.builder.leadMarket.get(id);
  const wallet = await services.builder.credits.wallet();

  if (outcome.kind === "insufficient_credits") {
    return (
      <BuilderShell title="Purchase result" subtitle="The purchase did not go through">
        <div className="max-w-[720px]">
          <AccessPanel
            tone="restricted"
            chipLabel="Not enough credits"
            title="No credits were deducted"
            actions={
              <>
                <ButtonLink href="/builder/billing/recharge">Recharge credits</ButtonLink>
                <ButtonLink href="/builder/marketplace" variant="secondary">
                  Back to marketplace
                </ButtonLink>
              </>
            }
            footnote="The lead is still listed. Nothing was charged and nothing was released."
          >
            <p>
              The deduction was not attempted, because your balance of{" "}
              {formatCreditBalance(wallet.balanceCredits)} does not cover
              {lead ? ` the ${formatExactInr(lead.priceCredits)} price` : " this lead"}. Credits
              are never partially deducted.
            </p>
          </AccessPanel>
        </div>
      </BuilderShell>
    );
  }

  if (outcome.kind === "already_sold") {
    return (
      <BuilderShell title="Purchase result" subtitle="The lead was taken">
        <div className="max-w-[720px]">
          <StateMessage
            title="Another buyer took this lead first"
            action={
              <>
                <ButtonLink href="/builder/marketplace">See what else is listed</ButtonLink>
                <ButtonLink href="/builder/leads" variant="secondary">
                  My leads
                </ButtonLink>
              </>
            }
          >
            One lead is released to one purchaser only, so it is no longer available. Nothing was
            deducted from your balance.
          </StateMessage>
        </div>
      </BuilderShell>
    );
  }

  if (outcome.kind === "not_verified") {
    const account = await services.builder.account.get();
    return (
      <BuilderShell title="Purchase result" subtitle="Verification needed">
        <div className="max-w-[720px]">
          <AccessPanel
            tone="restricted"
            chipLabel="Verification needed"
            title="Purchasing opens once an administrator approves your documents"
            actions={
              <>
                <ButtonLink href="/builder/verification">View verification status</ButtonLink>
                <ButtonLink href="/builder/support/new" variant="secondary">
                  Contact support
                </ButtonLink>
              </>
            }
            footnote="No credits were deducted."
          >
            <p>
              Your submission is {account.kycStatus === "pending" ? "in review" : "not approved"}.{" "}
              <PendingRule>{DECISIONS["D-11"].pendingCopy}</PendingRule>
            </p>
          </AccessPanel>
        </div>
      </BuilderShell>
    );
  }

  if (outcome.kind === "account_suspended") {
    return (
      <BuilderShell title="Purchase result" subtitle="Account restricted">
        <div className="max-w-[720px]">
          <AccessPanel
            tone="suspended"
            chipLabel="Account suspended"
            title="Purchasing is paused on this account"
            actions={<ButtonLink href="/builder/support/new">Contact support</ButtonLink>}
            footnote="No credits were deducted. Leads you already own are unaffected."
          >
            <p>
              Suspension does not change your verification status and does not remove purchased
              leads or their downloads.
            </p>
          </AccessPanel>
        </div>
      </BuilderShell>
    );
  }

  return (
    <BuilderShell title="Purchase result" subtitle="The deduction did not complete">
      <div className="max-w-[720px]">
        <StateMessage
          tone="error"
          title="No credits were deducted and no lead was released"
          action={
            <>
              <ButtonLink href={`/builder/marketplace/${id}/buy`}>Try again</ButtonLink>
              <ButtonLink href="/builder/support/new" variant="secondary">
                Contact support
              </ButtonLink>
            </>
          }
        >
          The deduction failed, so the lead was not released. Because credits are deducted before
          release, a failure here cannot leave you charged for a lead you did not get. Your
          balance is {formatCreditBalance(wallet.balanceCredits)} — check it against your
          transaction history before retrying.
        </StateMessage>
      </div>
    </BuilderShell>
  );
}

function Detail({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="t-caption text-muted">{label}</dt>
      <dd className={`mt-[1px] text-[15px] font-bold text-ink ${mono ? "t-mono" : ""}`}>{value}</dd>
    </div>
  );
}
