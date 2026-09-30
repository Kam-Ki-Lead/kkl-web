import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BuilderShell } from "@/components/builder/builder-shell";
import { UnlockContactForm } from "@/components/builder/unlock-contact-form";
import { MarkReadButton } from "@/components/builder/mark-read-button";
import { Card } from "@/components/ui/card";
import { Chip, MaskedValue } from "@/components/ui/chip";
import { ButtonLink } from "@/components/ui/button";
import { newUnlockToken } from "@/app/actions/builder-enquiries";
import { DECISIONS } from "@/lib/config/business-rules";
import { formatDateTime } from "@/lib/format";
import { getServices } from "@/lib/services";
import { ServiceError } from "@/lib/services/contracts";
import { redirectForAuth } from "@/lib/auth/recover";

/**
 * Read per-account at request time: with a backend store selected this page
 * calls kkl-backend as the signed-in account, which cannot be prerendered.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Enquiry" };

/** B-17 — enquiry detail and contact access. */
export default async function BuilderEnquiryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const services = getServices().builder;
  let enquiry;
  let access;
  let wallet;
  try {
    [enquiry, access, wallet] = await Promise.all([
      services.enquiries.get(id),
      services.enquiries.contactAccessMode(),
      services.credits.wallet(),
    ]);
  } catch (error) {
    redirectForAuth(error, `/builder/enquiries/${id}`);
    if (error instanceof ServiceError && (error.kind === "forbidden" || error.kind === "unavailable")) {
      return (
        <section className="mx-auto flex max-w-[640px] flex-col gap-[12px] px-[24px] py-[48px]">
          <h1 className="t-page-title">Enquiry</h1>
          <p role="alert" className="t-body text-body">{error.message}</p>
        </section>
      );
    }
    throw error;
  }
  if (!enquiry) notFound();

  const token = await newUnlockToken();

  return (
    <BuilderShell title="Enquiry" subtitle="Detail and contact access">
      <div className="grid max-w-[1000px] grid-cols-[minmax(0,1fr)_340px] gap-[18px] max-[1060px]:grid-cols-1">
        <div className="flex flex-col gap-[16px]">
          <Card className="p-[22px]">
            <div className="flex flex-wrap items-center gap-[10px]">
              <p className="t-mono text-[12px] text-muted">{enquiry.id}</p>
              <Chip tone={enquiry.kind === "site_visit" ? "warning" : "neutral"}>
                {enquiry.kind === "site_visit" ? "Site-visit request" : "Enquiry"}
              </Chip>
              {enquiry.read ? null : <Chip tone="warning">New</Chip>}
            </div>
            {/* The approved enquiry header sets the buyer's name in 17px/600
                Public Sans — a label, not a page display title. */}
            <h2 className="mt-[3px] text-[17px] font-semibold text-ink">
              {enquiry.buyerName ?? "No name is released"}
            </h2>
            <p className="t-body mt-[2px] text-muted">
              {enquiry.listingTitle} · {formatDateTime(enquiry.receivedAt)}
            </p>

            <dl className="mt-[16px] grid grid-cols-4 gap-px overflow-hidden rounded-[10px] border border-line bg-line max-[720px]:grid-cols-2">
              <Fact label="Looking for" value={enquiry.requirement} />
              <Fact label="Budget band" value={enquiry.budgetBand ?? "Not given"} />
              <Fact label="Timeline" value={enquiry.timeline ?? "Not given"} />
              <Fact label="Source" value={enquiry.source} />
            </dl>
          </Card>

          {enquiry.message ? (
            <Card className="p-[22px]">
              <h3 className="text-[14px] font-semibold text-body">Their message</h3>
              <p className="t-body mt-[8px] whitespace-pre-wrap text-body">{enquiry.message}</p>
            </Card>
          ) : null}

          <Card className={enquiry.contactPhone ? "border-[#BFE0CE] p-[22px]" : "bg-tint p-[22px]"}>
            <h3 className={`t-card-title ${enquiry.contactPhone ? "text-success" : "text-ink"}`}>
              Contact details
            </h3>

            {enquiry.contactPhone ? (
              <>
                <dl className="mt-[12px] grid grid-cols-2 gap-[14px] max-[560px]:grid-cols-1">
                  <div>
                    <dt className="t-caption text-muted">Name</dt>
                    <dd className="mt-[1px] text-[15px] font-bold text-ink">{enquiry.buyerName}</dd>
                  </div>
                  <div>
                    <dt className="t-caption text-muted">Mobile</dt>
                    <dd className="t-mono mt-[1px] text-[15px] font-bold text-ink">
                      {enquiry.contactPhone}
                    </dd>
                  </div>
                </dl>
                <p className="t-caption mt-[12px] text-muted">
                  {access.detail}
                </p>
              </>
            ) : (
              <>
                {/* Three cases. A mask means a real value is being withheld
                    under a rule somebody agreed to; while Q-2a is open there
                    is no such rule, so there is a sentence here instead, and
                    no unlock action — offering one would select the third
                    alternative by implication. */}
                {enquiry.contactMask ? (
                  <p className="mt-[10px]">
                    <MaskedValue>{enquiry.contactMask}</MaskedValue>
                  </p>
                ) : null}
                <p className="t-body mt-[10px] text-body">{enquiry.contactAccess.label}</p>
                <p className="t-caption mt-[8px] text-muted">
                  {enquiry.contactAccess.detail}
                </p>
                {enquiry.contactAccess.selectedMode === "paid_unlock"
                  && enquiry.contactAccess.unlockPriceCredits !== null ? (
                  <div className="mt-[14px]">
                    <UnlockContactForm
                      enquiryId={enquiry.id}
                      idempotencyKey={token}
                      priceCredits={enquiry.contactAccess.unlockPriceCredits}
                      balanceCredits={wallet.balanceCredits}
                    />
                  </div>
                ) : null}
              </>
            )}
          </Card>
        </div>

        <aside className="flex flex-col gap-[16px]">
          <Card className="border-[#F3DFB4] bg-[#FFF7E8] p-[18px]">
            <h3 className="text-[14px] font-bold text-ink">Unresolved ambiguity</h3>
            <p className="t-body mt-[6px] text-body">
              The account-roles specification says a Builder is notified of enquiries on their own
              listings, but not whether the notification carries contact details. The development
              proposal lists paid contact unlocking. Neither position is confirmed — both
              alternatives are built.
            </p>
            <p className="t-caption mt-[8px] text-muted">{DECISIONS["D-05"].question} — D-05</p>
          </Card>

          <Card className="p-[18px]">
            <h3 className="t-card-title text-ink">Actions</h3>
            <div className="mt-[10px] flex flex-col gap-[10px]">
              {enquiry.read ? null : <MarkReadButton enquiryId={enquiry.id} />}
              <ButtonLink href="/builder/enquiries" variant="secondary" className="w-full">
                All enquiries
              </ButtonLink>
              <ButtonLink
                href={`/builder/properties/${enquiry.listingId}/basics`}
                variant="secondary"
                className="w-full"
              >
                Open the listing
              </ButtonLink>
            </div>
            <p className="t-caption mt-[10px] text-muted">
              There is no reply control. Whether builders answer buyers inside the portal, and
              what that thread looks like, is not in the approved inventory — the design shows the
              contact details and leaves the conversation off-platform.
            </p>
          </Card>
        </aside>
      </div>
    </BuilderShell>
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
