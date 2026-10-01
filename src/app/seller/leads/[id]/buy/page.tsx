import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SellerShell } from "@/components/seller/seller-shell";
import { PurchaseConfirmForm } from "@/components/console/purchase-confirm-form";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { AccessPanel } from "@/components/ui/states";
import { newPurchaseToken } from "@/app/actions/lead-purchase";
import { formatAreaPath, formatCreditBalance, formatExactInr } from "@/lib/format";
import { getServices } from "@/lib/services";
import { purchaseHold, UNPRICED_DETAIL, UNPRICED_LABEL } from "@/lib/domain/commerce-display";
import { marketplaceStoreKind } from "@/lib/services/backend/config";

/**
 * Read per-account at request time: with a backend store selected this page
 * calls kkl-backend as the signed-in account, which cannot be prerendered.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Confirm purchase" };

/**
 * S-09 — purchase review and confirm.
 *
 * The screen states the order of operations plainly, because it is the thing a
 * Seller is trusting: credits are deducted first, and the lead is released only
 * if that succeeded. "Balance after purchase" is arithmetic on two figures the
 * server supplied — it is a preview of what the server will do, not a balance
 * this client holds.
 *
 * The reasons a purchase cannot proceed are shown here rather than discovered
 * after pressing the button: an unverified or suspended account, or a balance
 * below the price.
 */
export default async function PurchaseReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const services = getServices();
  const fromApi = marketplaceStoreKind() === "backend";
  const [lead, wallet, account, purchased] = await Promise.all([
    services.leadMarket.get(id),
    services.credits.wallet(),
    fromApi ? Promise.resolve(null) : services.sellerAccount.get(),
    services.leadMarket.getPurchased(id),
  ]);

  if (!lead) {
    if (purchased) redirect(`/seller/purchased/${id}`);
    notFound();
  }

  // An unpriced lead has no shortfall to compute and no purchase to confirm:
  // it is blocked before any of the account questions are asked, because
  // there is no amount. Zero would read as free. A backend lead uses the
  // blockers on that lead, not a sample account's verification.
  const hold = fromApi
    ? purchaseHold({
        priceCredits: lead.priceCredits,
        balanceCredits: wallet.balanceCredits,
        blockers: lead.blockers,
      })
    : null;
  const shortfall = hold
    ? hold.shortfall
    : lead.priceCredits === null
      ? 0
      : lead.priceCredits - wallet.balanceCredits;
  const blocked = hold
    ? hold.kind
    : lead.priceCredits === null
      ? ("unpriced" as const)
      : account?.accountStatus === "suspended"
        ? ("suspended" as const)
        : account?.kycStatus !== "approved"
          ? ("unverified" as const)
          : shortfall > 0
            ? ("funds" as const)
            : null;
  const blockReason = hold?.reason ?? null;

  const token = await newPurchaseToken();

  return (
    <SellerShell title="Confirm purchase" subtitle="Credits are deducted before release">
      <div className="max-w-[720px]">
        <h2 className="t-flow-title text-ink">Confirm purchase</h2>
        <p className="t-body mt-[8px] text-body">
          Credits are deducted first. The lead is released to you only if the deduction succeeds,
          and no one else can buy it afterwards.
        </p>

        <Card className="mt-[18px] overflow-hidden">
          <Row label="Lead" value={`${lead.id} · ${lead.requirement}`} />
          <Row label="Area" value={formatAreaPath(lead.locationPath)} />
          <Row
            label="Price"
            value={lead.priceCredits === null ? UNPRICED_LABEL : formatExactInr(lead.priceCredits)}
          />
          <Row label="Current balance" value={formatCreditBalance(wallet.balanceCredits)} />
          <Row
            label="Balance after purchase"
            value={
              lead.priceCredits === null
                ? formatCreditBalance(wallet.balanceCredits)
                : formatCreditBalance(Math.max(0, wallet.balanceCredits - lead.priceCredits))
            }
            strong
          />
        </Card>

        {blocked === null ? (
          <div className="mt-[18px]">
            <PurchaseConfirmForm leadId={lead.id} idempotencyKey={token} />
          </div>
        ) : null}

        {blocked === "funds" ? (
          <AccessPanel
            tone="restricted"
            chipLabel="Not enough credits"
            title="Your balance does not cover this lead"
            actions={
              <>
                <ButtonLink href="/seller/billing/recharge">Recharge credits</ButtonLink>
                <ButtonLink href="/seller/leads" variant="secondary">
                  Back to Buy Leads
                </ButtonLink>
              </>
            }
            footnote="Nothing has been deducted and the lead is still listed for others."
          >
            <p>
              This lead costs {lead.priceCredits === null ? UNPRICED_LABEL : formatExactInr(lead.priceCredits)} and your balance is{" "}
              {formatCreditBalance(wallet.balanceCredits)} — {formatExactInr(shortfall)} short.
              Recharging first is the only route; the purchase is not attempted and no partial
              deduction is made.
            </p>
          </AccessPanel>
        ) : null}

        {blocked === "unpriced" ? (
          <AccessPanel
            tone="restricted"
            chipLabel="Not priced"
            title="This lead cannot be bought yet"
            actions={
              <ButtonLink href="/seller/leads" variant="secondary">
                Back to the marketplace
              </ButtonLink>
            }
            footnote="Nothing has been deducted and the lead is still listed."
          >
            <p>{UNPRICED_DETAIL}</p>
          </AccessPanel>
        ) : null}

        {blocked === "unverified" ? (
          <AccessPanel
            tone="restricted"
            chipLabel="Verification needed"
            title="Leads can be bought once your account is verified"
            actions={
              <>
                <ButtonLink href="/seller/kyc/status">View verification status</ButtonLink>
                <ButtonLink href="/seller/leads" variant="secondary">
                  Back to Buy Leads
                </ButtonLink>
              </>
            }
            footnote="Browsing the marketplace stays available while you wait."
          >
            <p>
              {blockReason ??
                `PAN and Aadhaar are reviewed by an administrator before any lead can be purchased. Your submission is ${verificationWord(account?.kycStatus ?? "not_submitted")}.`}
            </p>
          </AccessPanel>
        ) : null}

        {blocked === "refused" ? (
          <AccessPanel
            tone="restricted"
            chipLabel="Not available"
            title="This lead cannot be bought"
            actions={
              <ButtonLink href="/seller/leads" variant="secondary">
                Back to Buy Leads
              </ButtonLink>
            }
            footnote="Nothing has been deducted."
          >
            <p>{blockReason}</p>
          </AccessPanel>
        ) : null}

        {blocked === "suspended" ? (
          <AccessPanel
            tone="suspended"
            chipLabel="Account suspended"
            title="Purchasing is paused on this account"
            actions={
              <>
                <ButtonLink href="/seller/support/new">Contact support</ButtonLink>
                <ButtonLink href="/seller/purchased" variant="secondary">
                  My leads
                </ButtonLink>
              </>
            }
            footnote="Leads you have already bought stay available, with their contact details and downloads."
          >
            <p>
              Suspension does not change your verification and does not remove anything you have
              already purchased. Support can say what is needed to lift it.
            </p>
          </AccessPanel>
        ) : null}
      </div>
    </SellerShell>
  );
}

function verificationWord(status: string): string {
  if (status === "pending") return "in review";
  if (status === "rejected") return "rejected — the status screen says why";
  return "not submitted yet";
}

function Row({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex flex-wrap items-baseline justify-between gap-[12px] border-b border-line px-[18px] py-[13px] last:border-b-0 ${
        strong ? "bg-tint" : ""
      }`}
    >
      <span className={strong ? "text-[16px] font-bold text-ink" : "text-[15px] text-muted"}>
        {label}
      </span>
      {/* The approved review rows set values at 600; the closing-balance row
          promotes its figure to Archivo 800, the "number you compare" rule. */}
      <span
        className={
          strong
            ? "font-[family-name:var(--font-heading)] text-[16px] font-extrabold text-ink"
            : "text-[15px] font-semibold text-ink"
        }
      >
        {value}
      </span>
    </div>
  );
}
