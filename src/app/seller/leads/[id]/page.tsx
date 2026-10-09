import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SellerShell } from "@/components/seller/seller-shell";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Chip, MaskedValue } from "@/components/ui/chip";
import { PendingRule } from "@/components/ui/states";
import { DECISIONS } from "@/lib/config/business-rules";
import { marketplaceStoreKind } from "@/lib/services/backend/config";
import { formatAreaPath, formatCreditBalance, formatExactInr } from "@/lib/format";
import { getServices } from "@/lib/services";
import {
  NOT_SCORED_LABEL,
  NO_QUALIFICATION_DETAIL,
  UNPRICED_LABEL,
  agingDiscountSentence,
  primaryBlocker,
} from "@/lib/domain/commerce-display";

/**
 * Read per-account at request time: with a backend store selected this page
 * calls kkl-backend as the signed-in account, which cannot be prerendered.
 */
export const dynamic = "force-dynamic";

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
          <Card className="border-[#BFE0CE] bg-chip-success-bg p-[22px]">
            <Chip tone="success">Purchased</Chip>
            <h2 className="t-card-title mt-[8px] text-success">You already own this lead</h2>
            <p className="t-body mt-[6px] text-body">
              It is in My leads with full contact details. Buying it again is not possible — one
              lead is released to one purchaser only.
            </p>
            <div className="mt-[16px] flex flex-wrap gap-[10px]">
              <ButtonLink href={`/seller/purchased/${id}`}>Open the lead</ButtonLink>
              <ButtonLink href="/seller/leads" variant="secondary">
                Back to Buy Leads
              </ButtonLink>
            </div>
          </Card>
        </SellerShell>
      );
    }
    notFound();
  }

  const q = lead.qualification;
  // A price that does not exist is not a price of zero, and an affordability
  // comparison against nothing is a question with no answer. Both cases are
  // rendered rather than computed away.
  const affordable = lead.priceCredits !== null
    && wallet.balanceCredits >= lead.priceCredits;
  const blocker = primaryBlocker(lead);

  return (
    <SellerShell title={`Lead ${lead.id}`} subtitle="Masked until purchase">
      <div className="grid grid-cols-[minmax(0,1fr)_380px] gap-[18px] max-[1200px]:grid-cols-1">
        <div className="flex flex-col gap-[16px]">
          <Card className="p-[22px]">
            <p className="t-mono text-[12px] text-muted">{lead.id}</p>
            <h2 className="t-flow-title mt-[2px] text-ink">{lead.requirement}</h2>
            <p className="t-body mt-[2px] text-body">
              {formatAreaPath(lead.locationPath)}
            </p>

            <dl className="mt-[16px] grid grid-cols-3 gap-px overflow-hidden rounded-[10px] border border-line bg-line max-[720px]:grid-cols-2">
              <Fact label="Budget band" value={lead.budgetBand} />
              <Fact label="Location" value={formatAreaPath(lead.locationPath)} />
              <Fact label="Configuration" value={lead.configuration} />
              <Fact label="Timeline" value={q?.timeline ?? NOT_SCORED_LABEL} />
              <Fact label="Purpose" value={q?.purpose ?? NOT_SCORED_LABEL} />
              <Fact label="Financing" value={q?.financing ?? NOT_SCORED_LABEL} />
            </dl>
          </Card>

          <Card className="p-[22px]">
            <h2 className="t-card-title text-ink">Qualification call summary</h2>
            <p className="t-body mt-[8px] text-body">{q ? q.summary : NO_QUALIFICATION_DETAIL}</p>
            <div className="mt-[14px] flex flex-wrap gap-[8px]">
              {/* The approved S-08 tags are rectangular 14px chips, not the
                  13px pill: 700 for score and consent, 600 slate for the
                  channel. */}
              <span className="rounded-[6px] bg-chip-neutral-bg px-[12px] py-[8px] text-[14px] font-bold text-chip-neutral-fg">
                {q ? `Intent score ${q.intentScore}/100` : NOT_SCORED_LABEL}
              </span>
              {/* D-14: consent is only ever shown as captured when it was —
                  and an absent qualification call is an absent consent
                  record, never a neutral one. */}
              {q?.consentCaptured ? (
                <span className="rounded-[6px] bg-chip-success-bg px-[12px] py-[8px] text-[14px] font-bold text-chip-success-fg">
                  Consent captured
                </span>
              ) : (
                <span className="rounded-[6px] bg-chip-warning-bg px-[12px] py-[8px] text-[14px] font-bold text-chip-warning-fg">
                  No consent captured
                </span>
              )}
              <span className="rounded-[6px] bg-chip-muted-bg px-[12px] py-[8px] text-[14px] font-semibold text-slate">
                {q?.channel ?? "No call recorded"}
              </span>
            </div>
          </Card>

          <Card className="bg-tint p-[22px]">
            <h2 className="t-card-title text-slate">Contact details</h2>
            {/* A mask only when the server composed one. kkl-backend composes
                none — it has read no contact to mask — so the same slot holds
                the sentence from `contactState` rather than invented digits. */}
            {lead.contactMask ? (
              <dl className="mt-[12px] grid grid-cols-2 gap-[14px] max-[560px]:grid-cols-1">
                <div>
                  <dt className="t-caption text-muted">Name</dt>
                  <dd className="mt-[1px]">
                    <MaskedValue className="text-[16px]">
                      {lead.contactMask.split(" · ")[0]}
                    </MaskedValue>
                  </dd>
                </div>
                <div>
                  <dt className="t-caption text-muted">Mobile</dt>
                  <dd className="mt-[1px]">
                    <MaskedValue className="text-[16px]">
                      {lead.contactMask.split(" · ")[1] ?? "•••"}
                    </MaskedValue>
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="t-body mt-[12px] text-body">{lead.contactState.label}</p>
            )}
            <p className="t-caption mt-[12px] text-muted">
              Masked until purchase. One lead is released to one purchaser only, and only after
              the credit deduction succeeds. The hidden values are not sent to this page — there
              is nothing here to reveal.
            </p>
          </Card>
        </div>

        <aside className="flex flex-col gap-[16px]">
          <Card className="p-[22px]">
            <p className="text-[14px] text-muted">Lead price</p>
            {/* The approved S-08 aside sets the price at 30px/800 flat — not
                the stepping flow title. */}
            <p className="mt-[2px] font-[family-name:var(--font-heading)] text-[30px] font-extrabold leading-[1.15] tracking-[-0.03em] text-ink">
              {lead.priceCredits === null ? UNPRICED_LABEL : formatExactInr(lead.priceCredits)}
            </p>
            {lead.originalPriceCredits !== null ? (
              <p className="t-caption mt-[1px] text-muted">
                Reduced from {formatExactInr(lead.originalPriceCredits)} — aged {lead.ageDays} days
              </p>
            ) : null}
            <p className="t-caption mt-[4px] text-muted">
              Your balance {formatCreditBalance(wallet.balanceCredits)}
            </p>

            {/* The action is disabled when the server says it cannot be done,

                and the reason is beside it. A person should not have to press a

                button to be told it was never going to work. */}

            {lead.purchasable ? (

              <ButtonLink href={`/seller/leads/${lead.id}/buy`} className="mt-[16px] w-full">

                Buy Leads

              </ButtonLink>

            ) : (

              <div className="mt-[16px]">

                <span

                  aria-disabled="true"

                  className="block cursor-not-allowed rounded-[10px] bg-chip-muted-bg px-[18px] py-[12px] text-center text-[15px] font-semibold text-muted"

                >

                  Buy Leads

                </span>

                {blocker ? (

                  <p className="t-caption mt-[8px] text-warning">{blocker.reason}</p>

                ) : null}

              </div>

            )}
            <ButtonLink
              href="/seller/leads"
              variant="secondary"
              size="action"
              className="mt-[10px] w-full"
            >
              Back to Buy Leads
            </ButtonLink>

            {affordable ? null : (
              <p className="t-caption mt-[12px] text-warning">
                This costs more than your balance. The purchase screen shows what to do.
              </p>
            )}

            <p className="t-caption mt-[12px] text-muted">
              <PendingRule>{DECISIONS["D-03"].pendingCopy}</PendingRule>{" "}
              {agingDiscountSentence(marketplaceStoreKind() !== "backend")}
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
