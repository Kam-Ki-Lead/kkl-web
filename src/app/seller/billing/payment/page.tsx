import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SellerShell } from "@/components/seller/seller-shell";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { StateMessage } from "@/components/ui/states";
import { readRechargeOutcome } from "@/app/actions/recharge";
import { formatCreditBalance, formatExactInr } from "@/lib/format";

export const metadata: Metadata = { title: "Payment" };

/**
 * S-16 — the gateway result: credited, pending, or failed.
 *
 * Which one renders comes from the server-held outcome, never the URL, so this
 * screen cannot be made to claim a payment that did not happen.
 *
 * The pending case deliberately does not poll or promise. "Pending" means the
 * gateway has not settled, and only kkl-backend will know when it has — the
 * honest instruction is to check the transaction history rather than to imply
 * this page will update itself.
 */
export default async function PaymentResultPage() {
  const outcome = await readRechargeOutcome();
  if (!outcome) redirect("/seller/billing");

  if (outcome.kind === "credited") {
    return (
      <SellerShell title="Payment" subtitle="Gateway result">
        <div className="max-w-[640px]">
          <div className="flex flex-wrap items-center gap-[12px]">
            <Chip tone="success">✓ Paid</Chip>
            <h2 className="t-title text-ink">Credits added</h2>
          </div>
          <p className="t-body mt-[8px] text-body">
            {formatExactInr(outcome.amountInr)} credited. Your balance is now{" "}
            {formatCreditBalance(outcome.balanceCredits)}.
          </p>

          <Card className="mt-[18px] overflow-hidden">
            <Row label="Amount paid" value={formatExactInr(outcome.amountInr)} />
            <Row label="Credits added" value={outcome.amountInr.toLocaleString("en-IN")} />
            <Row label="Payment reference" value={outcome.paymentReference} mono />
            <Row label="Invoice" value={outcome.invoiceId} mono />
          </Card>

          <div className="mt-[16px] flex flex-wrap gap-[10px]">
            <ButtonLink href="/seller/leads">Back to marketplace</ButtonLink>
            <ButtonLink href={`/seller/billing/invoices/${outcome.invoiceId}`} variant="secondary">
              View invoice
            </ButtonLink>
          </div>
        </div>
      </SellerShell>
    );
  }

  if (outcome.kind === "pending") {
    return (
      <SellerShell title="Payment" subtitle="Gateway result">
        <div className="max-w-[640px]">
          <StateMessage
            title="The payment has not settled yet"
            action={
              <>
                <ButtonLink href="/seller/billing/history">Transaction history</ButtonLink>
                <ButtonLink href="/seller/billing" variant="secondary">
                  Billing &amp; credits
                </ButtonLink>
              </>
            }
          >
            The gateway has taken the payment but not confirmed it. No credits have been added
            yet, and none will be until it confirms. Keep the reference{" "}
            <span className="t-mono text-ink">{outcome.paymentReference}</span> — the transaction
            history is where the outcome appears. Do not pay again; a second payment would be a
            second charge.
          </StateMessage>
        </div>
      </SellerShell>
    );
  }

  return (
    <SellerShell title="Payment" subtitle="Gateway result">
      <div className="max-w-[640px]">
        <StateMessage
          tone="error"
          title="No credits were added"
          action={
            <>
              <ButtonLink href="/seller/billing/recharge">Try again</ButtonLink>
              <ButtonLink href="/seller/support/new" variant="secondary">
                Contact support
              </ButtonLink>
            </>
          }
        >
          {outcome.message} Your balance is unchanged. If your bank shows a debit, send support
          the reference from your statement and it will be reconciled — credits are only added
          when the gateway confirms.
        </StateMessage>
      </div>
    </SellerShell>
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
