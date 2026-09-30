import type { Metadata } from "next";
import Link from "next/link";
import { BuilderShell } from "@/components/builder/builder-shell";
import { Card } from "@/components/ui/card";
import { Chip, MaskedValue } from "@/components/ui/chip";
import { ButtonLink } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/states";
import { DECISIONS } from "@/lib/config/business-rules";
import { formatDateTime } from "@/lib/format";
import { getServices } from "@/lib/services";
import { ServiceError } from "@/lib/services/contracts";
import { redirectForAuth } from "@/lib/auth/recover";
import type { ContactAccessMode } from "@/lib/domain/types";

/**
 * Read per-account at request time: with a backend store selected this page
 * calls kkl-backend as the signed-in account, which cannot be prerendered.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Enquiries" };

const TABS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "enquiry", label: "Enquiries" },
  { key: "site_visit", label: "Site visits" },
] as const;

/** B-16 — enquiries on the Builder's own listings. */
/** One sentence per candidate rule, so the screen never has to guess. */
const MODE_COPY: Record<ContactAccessMode, { title: string; detail: string }> = {
  included_free: {
    title: "alternative A — included",
    detail:
      "Contact details on enquiries for your own listings are visible without unlocking.",
  },
  included_with_subscription: {
    title: "alternative A2 — included with a subscription",
    detail:
      "Contact details on enquiries for your own listings come with an active subscription.",
  },
  paid_unlock: {
    title: "alternative B — paid unlock",
    detail:
      "Contact details on enquiries for your own listings are unlocked with credits, one enquiry at a time.",
  },
};

export default async function BuilderEnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const tab = one(params.tab) ?? "all";

  const services = getServices().builder;
  let enquiries;
  let access;
  try {
    [enquiries, access] = await Promise.all([
      services.enquiries.list({
        unreadOnly: tab === "unread" || undefined,
        kind: tab === "enquiry" ? "enquiry" : tab === "site_visit" ? "site_visit" : undefined,
      }),
      services.enquiries.contactAccessMode(),
    ]);
  } catch (error) {
    redirectForAuth(error, "/builder/enquiries");
    if (error instanceof ServiceError && (error.kind === "forbidden" || error.kind === "unavailable")) {
      return (
        <section className="mx-auto flex max-w-[640px] flex-col gap-[12px] px-[24px] py-[48px]">
          <h1 className="t-page-title">Enquiries</h1>
          <p role="alert" className="t-body text-body">{error.message}</p>
        </section>
      );
    }
    throw error;
  }
  const mode = access.selectedMode;

  return (
    <BuilderShell title="Enquiries" subtitle="Buyers who contacted you about your listings">
      <div className="flex flex-col gap-[16px]">
        <div className="flex flex-wrap items-center justify-between gap-[12px]">
          {/* The approved filter is the same row of pills as B-07's:
              brand-filled when active, white with a control border when not. */}
          <div role="tablist" aria-label="Enquiry filter" className="flex flex-wrap gap-[8px]">
            {TABS.map((t) => (
              <Link
                key={t.key}
                href={t.key === "all" ? "/builder/enquiries" : `/builder/enquiries?tab=${t.key}`}
                aria-current={t.key === tab ? "page" : undefined}
                className={`inline-flex min-h-[40px] items-center rounded-full border-[1.5px] px-[14px] py-[9px] text-[14px] font-semibold transition-[background-color,border-color,color] duration-150 ${
                  t.key === tab
                    ? "border-brand bg-brand text-white"
                    : "border-control-border bg-white text-body hover:border-brand"
                }`}
              >
                {t.label}
              </Link>
            ))}
          </div>
          <ButtonLink href="/builder/enquiries/notifications" variant="secondary" size="sm">
            How enquiries reach you
          </ButtonLink>
        </div>

        {enquiries.length === 0 ? (
          <StateMessage
            title={tab === "all" ? "No enquiries yet" : "Nothing matches this filter"}
            action={<ButtonLink href="/builder/properties">My properties</ButtonLink>}
          >
            {tab === "all"
              ? "Enquiries arrive here when a buyer contacts you through one of your published listings."
              : "Switch tabs to see your other enquiries."}
          </StateMessage>
        ) : (
          <ul className="flex flex-col gap-[10px]">
            {enquiries.map((enquiry) => (
              <li key={enquiry.id}>
                <Card className="flex flex-wrap items-start justify-between gap-[12px] p-[18px]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-[10px]">
                      <h2 className="font-[family-name:var(--font-heading)] text-[16px] font-bold text-ink">
                        <Link
                          href={`/builder/enquiries/${enquiry.id}`}
                          className="underline-offset-2 hover:underline"
                        >
                          {enquiry.buyerName ?? enquiry.listingTitle}
                        </Link>
                      </h2>
                      {enquiry.read ? null : <Chip tone="warning">New</Chip>}
                    </div>
                    <p className="t-caption mt-[2px] text-muted">
                      {enquiry.listingTitle} ·{" "}
                      {enquiry.kind === "site_visit" ? "Site-visit request" : "Enquiry"}
                    </p>
                    <p className="mt-[1px] text-[14px] text-muted">
                      {enquiry.id} · {formatDateTime(enquiry.receivedAt)}
                    </p>
                  </div>

                  {/* THREE CASES, AND THE THIRD IS NOT A MASK
                      A released number; a withheld one under a rule somebody
                      chose, which is what a mask means; and no rule at all,
                      which is every deployment today. The third gets a
                      sentence — a mask there would imply a real value is
                      being held back under an agreement that does not
                      exist. */}
                  <div className="flex-none text-right">
                    {enquiry.contactPhone ? (
                      <>
                        <p className="t-mono text-[15px] text-ink">{enquiry.contactPhone}</p>
                        <p className="t-caption text-success">Contact available</p>
                      </>
                    ) : enquiry.contactMask ? (
                      <>
                        <MaskedValue>{enquiry.contactMask}</MaskedValue>
                        <p className="t-caption text-muted">
                          {enquiry.unlockPriceCredits === null
                            ? enquiry.contactAccess.label
                            : `Locked · ₹${enquiry.unlockPriceCredits.toLocaleString("en-IN")} to unlock`}
                        </p>
                      </>
                    ) : (
                      <p className="t-caption max-w-[220px] text-muted">
                        {enquiry.contactAccess.label}
                      </p>
                    )}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}

        {/* D-05 / Q-2a. The screen says what is in force, every time — and
            when nothing is, it says that rather than picking one to show. */}
        <Card className="border-[#F3DFB4] bg-[#FFF7E8] p-[18px]">
          <h2 className="t-card-title text-ink">
            {mode === null ? access.label : `Showing ${MODE_COPY[mode].title}`}
          </h2>
          <p className="t-body mt-[6px] text-body">
            {mode === null ? (
              <>
                Three rules are on the table and none has been confirmed: contact details
                included at no extra charge, included through a subscription, or unlocked
                by spending credits. Until one is chosen, no contact detail is released
                and none is shown here.
              </>
            ) : (
              <>
                {MODE_COPY[mode].detail} This is a design proposal, not a stated rule.
              </>
            )}
          </p>
          <p className="t-caption mt-[8px] text-muted">{DECISIONS["D-05"].question} — D-05</p>
        </Card>
      </div>
    </BuilderShell>
  );
}
