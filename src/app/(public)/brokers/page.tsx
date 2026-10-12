import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { PendingRule, StateMessage } from "@/components/ui/states";
import { LeadBoard } from "@/components/leads/lead-board";
import { DECISIONS } from "@/lib/config/business-rules";
import { readPublicLeadFeed } from "@/lib/services/public-lead-feed";
import { readPublicLeadFilters, readShown } from "@/lib/domain/public-leads";

export const metadata: Metadata = { title: "Buy Leads" };

/**
 * Prices and the reduced list move as leads age and as demand in an area
 * changes, so this page is never served from a build.
 */
export const dynamic = "force-dynamic";

/** The launch city (CR05). The board says where its inventory is. */
const CITY = "Kolkata";

const STEPS = [
  {
    heading: "Register and verify",
    body: "Create an account with your mobile number, then submit PAN and Aadhaar for verification by our team.",
  },
  { heading: "Add credits", body: "Top up your balance. One rupee is one credit." },
  {
    heading: "Buy and download",
    body: "Purchase a lead to release its contact details, then download your purchased leads as CSV.",
  },
] as const;

const REQUIREMENTS = [
  "A mobile number we can verify by one-time code",
  "PAN and Aadhaar for verification",
  "A credit balance before you can purchase",
] as const;

const PENDING = [
  { label: "What a lead costs", copy: DECISIONS["D-03"].pendingCopy },
  { label: "Credit expiry and renewal", copy: DECISIONS["D-04"].pendingCopy },
  { label: "Refund eligibility", copy: DECISIONS["D-06"].pendingCopy },
  { label: "What an unverified account can see", copy: DECISIONS["D-07"].pendingCopy },
] as const;

/**
 * P-18 — for brokers and agencies.
 *
 * This was a brochure: three paragraphs about buying leads, on a page with no
 * leads on it. It is now the marketplace, with the brochure underneath it —
 * the inventory first, because that is what somebody arriving from "Buy leads"
 * came to see, and the registration steps after it, because they are what you
 * read once you have decided.
 *
 * Nothing about the purchase path changed. A card points at the existing lead
 * page, which is still where sign-in, verification, the confirmed price and the
 * wallet live; this page cannot buy anything and does not pretend to.
 *
 * The unsettled commercial terms stay on the page. A marketplace that shows
 * prices while quietly omitting "refund eligibility is not yet decided" is
 * worse than one that says so; they are a compact note at the bottom now
 * rather than four callouts above the fold.
 */
export default async function ForBrokersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = readPublicLeadFilters(params);
  const shown = readShown(params);
  const feed = await readPublicLeadFeed();

  return (
    <div className="mx-auto max-w-[1180px] px-[32px] pb-[60px] pt-[30px] max-[1060px]:px-[18px]">
      <p className="t-eyebrow text-brand">For brokers &amp; agencies</p>
      <h1 className="t-title mt-[6px] text-ink">Buy qualified buyer leads, one buyer per lead</h1>
      <p className="t-body mt-[8px] max-w-[70ch] text-body">
        Every lead below shows its locality, configuration and budget band before you spend
        anything. Contact details are released after purchase, and a lead is sold to exactly
        one purchaser.
      </p>

      <div className="mt-[14px] flex flex-wrap gap-[10px]">
        <ButtonLink href="/auth?intent=broker">Start broker registration</ButtonLink>
        <ButtonLink href="#leads" variant="secondary">
          Browse the leads
        </ButtonLink>
      </div>

      {/* ---------------------------------------------------- the board --- */}
      <div className="mt-[30px]">
        {feed.unavailable ? (
          <StateMessage title="The lead marketplace is not reachable from this server">
            Nothing is shown rather than a list that might be out of date. Registration below
            is unaffected.
          </StateMessage>
        ) : (
          <LeadBoard
            leads={feed.leads}
            filters={filters}
            shown={shown}
            city={CITY}
            note={
              feed.hasMore
                ? "More leads are listed than this page shows; sign in to browse the full marketplace."
                : null
            }
          />
        )}
      </div>

      {/* ------------------------------------------------- the brochure --- */}
      <h2 className="t-section-title mt-[40px] text-ink">How buying a lead works</h2>
      <ol className="mt-[12px] grid grid-cols-3 gap-[14px] max-[900px]:grid-cols-1">
        {STEPS.map((step, i) => (
          <li key={step.heading}>
            <Card className="h-full p-[18px]">
              <span className="t-mono text-[11px] tracking-[0.12em] text-muted">STEP {i + 1}</span>
              <h3 className="t-card-title mt-[6px] text-ink">{step.heading}</h3>
              <p className="t-caption mt-[6px] text-body">{step.body}</p>
            </Card>
          </li>
        ))}
      </ol>

      <div className="mt-[18px] grid grid-cols-2 gap-[14px] max-[900px]:grid-cols-1">
        <Card className="p-[20px]">
          <h3 className="t-card-title text-ink">What you will need</h3>
          <ul className="mt-[10px] flex flex-col gap-[7px]">
            {REQUIREMENTS.map((r) => (
              <li key={r} className="flex gap-[9px] text-[15px] text-body">
                <span aria-hidden="true" className="flex-none font-bold text-success">
                  ✓
                </span>
                {r}
              </li>
            ))}
          </ul>
        </Card>

        {/* Commercial terms the client has still to set. Shown, not invented,
            and kept beside the requirements rather than above the inventory. */}
        <Card className="p-[20px]">
          <h3 className="t-card-title text-ink">Still to be confirmed</h3>
          <p className="t-caption mt-[4px] text-muted">
            We do not publish a figure before it is agreed.
          </p>
          <ul className="mt-[10px] flex flex-col gap-[10px]">
            {PENDING.map((item) => (
              <li key={item.label}>
                <p className="text-[14px] font-semibold text-ink">{item.label}</p>
                <PendingRule>{item.copy}</PendingRule>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-[22px] flex flex-wrap items-center gap-[12px]">
        <ButtonLink href="/auth?intent=broker">Start broker registration</ButtonLink>
        <Link
          href="/support"
          className="text-[15px] font-semibold text-brand hover:text-brand-deep"
        >
          Ask a question first <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}
