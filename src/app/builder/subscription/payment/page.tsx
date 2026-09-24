import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BuilderShell } from "@/components/builder/builder-shell";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { AccessPanel, StateMessage } from "@/components/ui/states";
import { readSubscriptionOutcome } from "@/app/actions/builder-subscription";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Subscription payment" };

/**
 * B-04 — the subscription gateway result.
 *
 * Which state renders comes from the server-held outcome, never the URL, so
 * this screen cannot be made to claim a subscription that did not start.
 */
export default async function SubscriptionPaymentPage() {
  const outcome = await readSubscriptionOutcome();
  if (!outcome) redirect("/builder/subscription");

  if (outcome.kind === "active") {
    return (
      <BuilderShell title="Subscription payment" subtitle="Gateway result">
        <div className="max-w-[640px]">
          <div className="flex flex-wrap items-center gap-[12px]">
            <Chip tone="success">✓ Active</Chip>
            <h2 className="t-flow-title text-ink">Your subscription is active</h2>
          </div>
          <p className="t-body mt-[8px] text-body">
            Publishing is unlocked. Listings you publish stay visible on the public portal while
            this is active.
          </p>

          <Card className="mt-[18px] overflow-hidden">
            <Row label="Reference" value={outcome.reference} mono />
            <Row label="Started" value={formatDate(outcome.subscription.startedAt)} />
            <Row label="Next charge" value={formatDate(outcome.subscription.renewsAt)} />
            <Row
              label="Amount"
              value={
                outcome.subscription.priceInr === null
                  ? "Not set by the client — nothing was charged"
                  : `₹${outcome.subscription.priceInr.toLocaleString("en-IN")}`
              }
            />
          </Card>

          <div className="mt-[16px] flex flex-wrap gap-[10px]">
            <ButtonLink href="/builder/properties">Publish a listing</ButtonLink>
            <ButtonLink href="/builder/subscription" variant="secondary">
              Subscription
            </ButtonLink>
          </div>

          <p className="t-caption mt-[12px] text-muted">
            No price was charged, because none is set (D-01). The term shown is a placeholder so
            the renewal states can be reviewed; the billing cycle is not agreed either.
          </p>
        </div>
      </BuilderShell>
    );
  }

  if (outcome.kind === "pending") {
    return (
      <BuilderShell title="Subscription payment" subtitle="Gateway result">
        <div className="max-w-[640px]">
          <StateMessage
            title="The payment has not settled yet"
            action={
              <>
                <ButtonLink href="/builder/subscription">Subscription</ButtonLink>
                <ButtonLink href="/builder/billing/history" variant="secondary">
                  Transaction history
                </ButtonLink>
              </>
            }
          >
            The gateway has not confirmed. The subscription does not start until it does. Keep the
            reference <span className="t-mono text-ink">{outcome.reference}</span>, and do not pay
            again — a second payment would be a second charge.
          </StateMessage>
        </div>
      </BuilderShell>
    );
  }

  if (outcome.kind === "not_verified") {
    return (
      <BuilderShell title="Subscription payment" subtitle="Verification needed">
        <div className="max-w-[640px]">
          <AccessPanel
            tone="restricted"
            chipLabel="Verification needed"
            title="A subscription starts once your company is verified"
            actions={
              <>
                <ButtonLink href="/builder/verification">Verification status</ButtonLink>
                <ButtonLink href="/builder/support/new" variant="secondary">
                  Contact support
                </ButtonLink>
              </>
            }
            footnote="Nothing was charged."
          >
            <p>
              Your submission is{" "}
              {outcome.kycStatus === "pending" ? "in review" : "not approved yet"}. Drafts and the
              lead marketplace stay available while you wait.
            </p>
          </AccessPanel>
        </div>
      </BuilderShell>
    );
  }

  if (outcome.kind === "account_suspended") {
    return (
      <BuilderShell title="Subscription payment" subtitle="Account restricted">
        <div className="max-w-[640px]">
          <AccessPanel
            tone="suspended"
            chipLabel="Account suspended"
            title="A subscription cannot be started while this account is suspended"
            actions={<ButtonLink href="/builder/support/new">Contact support</ButtonLink>}
            footnote="Nothing was charged. Your listings and enquiries are unaffected."
          >
            <p>Suspension does not change your verification status.</p>
          </AccessPanel>
        </div>
      </BuilderShell>
    );
  }

  return (
    <BuilderShell title="Subscription payment" subtitle="Gateway result">
      <div className="max-w-[640px]">
        <StateMessage
          tone="error"
          title="No subscription was started"
          action={
            <>
              <ButtonLink href="/builder/subscription">Try again</ButtonLink>
              <ButtonLink href="/builder/support/new" variant="secondary">
                Contact support
              </ButtonLink>
            </>
          }
        >
          {outcome.message} If your bank shows a debit, send support the reference from your
          statement — a subscription only starts when the gateway confirms.
        </StateMessage>
      </div>
    </BuilderShell>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-[12px] border-b border-line px-[18px] py-[13px] last:border-b-0">
      <span className="text-[15px] text-muted">{label}</span>
      <span className={`text-[15px] font-bold text-ink ${mono ? "t-mono" : ""}`}>{value}</span>
    </div>
  );
}
