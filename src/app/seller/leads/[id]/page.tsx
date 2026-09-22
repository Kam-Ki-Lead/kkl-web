import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SellerShell } from "@/components/seller/seller-shell";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Chip, MaskedValue } from "@/components/ui/chip";
import { PendingRule } from "@/components/ui/states";
import { DECISIONS } from "@/lib/config/business-rules";
import { formatAreaPath, formatCreditBalance, formatExactInr } from "@/lib/format";
import { getServices } from "@/lib/services";

export const metadata: Metadata = { title: "Lead" };

/**
 * S-08 — masked lead detail.
 *
 * Every contact value on this screen is a placeholder the server composed. The
 * response carries no name, phone or email for an unpurchased lead, so there is
 * nothing in the HTML, the RSC payload or the client bundle to recover. Masking
 * here is the absence of data, not a visual treatment over data.
 */
export default async function MaskedLeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const services = getServices();
  const [lead, wallet, purchased] = await Promise.all([
    services.leadMarket.get(id),
    services.credits.wallet(),
    services.leadMarket.getPurchased(id),
  ]);

  // A lead already bought is not "missing" — it has a screen of its own, and
  // sending someone to a 404 for a lead they own would be wrong.
  if (!lead) {
    if (purchased) {
      return (
        <SellerShell title={`Lead ${id}`} subtitle="Already purchased">
          <Card className="border-[#C9E4D6] bg-chip-success-bg p-[22px]">
            <Chip tone="success">Purchased</Chip>
            <h2 className="t-heading mt-[8px] text-success">You already own this lead</h2>
            <p className="t-body mt-[6px] text-body">
              It is in My leads with full contact details. Buying it again is not possible — one
              lead is released to one purchaser only.
            </p>
            <div className="mt-[16px] flex flex-wrap gap-[10px]">
              <ButtonLink href={`/seller/purchased/${id}`}>Open the lead</ButtonLink>
              <ButtonLink href="/seller/leads" variant="secondary">
                Back to marketplace
              </ButtonLink>
            </div>
          </Card>
        </SellerShell>
      );
    }
    notFound();
  }

  const q = lead.qualification;
  const affordable = wallet.balanceCredits >= lead.priceCredits;

  return (
    <SellerShell title={`Lead ${lead.id}`} subtitle="Masked until purchase">
      <div className="grid grid-cols-[minmax(0,1fr)_380px] gap-[18px] max-[1200px]:grid-cols-1">
        <div className="flex flex-col gap-[16px]">
          <Card className="p-[22px]">
            <p className="t-mono text-[13px] text-muted">{lead.id}</p>
            <h2 className="t-title mt-[2px] text-ink">{lead.requirement}</h2>
            <p className="t-body mt-[2px] text-muted">
              {formatAreaPath(lead.locationPath)}
            </p>

            <dl className="mt-[16px] grid grid-cols-3 gap-px overflow-hidden rounded-[10px] border border-line bg-line max-[720px]:grid-cols-2">
              <Fact label="Budget band" value={lead.budgetBand} />
              <Fact label="Location" value={formatAreaPath(lead.locationPath)} />
              <Fact label="Configuration" value={lead.configuration} />
              <Fact label="Timeline" value={q.timeline} />
              <Fact label="Purpose" value={q.purpose} />
              <Fact label="Financing" value={q.financing} />
            </dl>
          </Card>

          <Card className="p-[22px]">
            <h2 className="t-card-title text-ink">Qualification call summary</h2>
            <p className="t-body mt-[8px] text-body">{q.summary}</p>
            <div className="mt-[14px] flex flex-wrap gap-[8px]">
              <Chip tone="neutral">Intent score {q.intentScore}/100</Chip>
              {/* D-14: consent is only ever shown as captured when it was. */}
              {q.consentCaptured ? (
                <Chip tone="success">Consent captured</Chip>
              ) : (
                <Chip tone="warning">No consent captured</Chip>
              )}
              <Chip tone="muted">{q.channel}</Chip>
            </div>
          </Card>

          <Card className="bg-tint p-[22px]">
            <h2 className="t-card-title text-ink">Contact details</h2>
            <dl className="mt-[12px] grid grid-cols-2 gap-[14px] max-[560px]:grid-cols-1">
              <div>
                <dt className="t-caption text-muted">Name</dt>
                <dd className="mt-[1px]">
                  <MaskedValue>{lead.contactMask.split(" · ")[0]}</MaskedValue>
                </dd>
              </div>
              <div>
                <dt className="t-caption text-muted">Mobile</dt>
                <dd className="mt-[1px]">
                  <MaskedValue>{lead.contactMask.split(" · ")[1] ?? "•••"}</MaskedValue>
                </dd>
              </div>
            </dl>
            <p className="t-caption mt-[12px] text-muted">
              Masked until purchase. One lead is released to one purchaser only, and only after
              the credit deduction succeeds. The hidden values are not sent to this page — there
              is nothing here to reveal.
            </p>
          </Card>
        </div>

        <aside className="flex flex-col gap-[16px]">
          <Card className="p-[22px]">
            <p className="t-caption text-muted">Lead price</p>
            <p className="t-title mt-[2px] text-ink">{formatExactInr(lead.priceCredits)}</p>
            {lead.originalPriceCredits !== null ? (
              <p className="t-caption mt-[1px] text-muted">
                Reduced from {formatExactInr(lead.originalPriceCredits)} — aged {lead.ageDays} days
              </p>
            ) : null}
            <p className="t-caption mt-[4px] text-muted">
              Your balance {formatCreditBalance(wallet.balanceCredits)}
            </p>

            <ButtonLink href={`/seller/leads/${lead.id}/buy`} className="mt-[16px] w-full">
              Buy this lead
            </ButtonLink>
            <ButtonLink href="/seller/leads" variant="secondary" className="mt-[10px] w-full">
              Back to marketplace
            </ButtonLink>

            {affordable ? null : (
              <p className="t-caption mt-[12px] text-warning">
                This costs more than your balance. The purchase screen shows what to do.
              </p>
            )}

            <p className="t-caption mt-[12px] text-muted">
              <PendingRule>{DECISIONS["D-03"].pendingCopy}</PendingRule> The aging discount shown
              on the Sale tab is 20%; no other discount rule is set.
            </p>
          </Card>
        </aside>
      </div>
    </SellerShell>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white px-[15px] py-[12px]">
      <dt className="t-caption text-muted">{label}</dt>
      <dd className="mt-[1px] text-[15px] font-bold text-ink">{value}</dd>
    </div>
  );
}
