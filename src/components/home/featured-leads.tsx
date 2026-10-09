import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Card, SectionHeader } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { isFrameworkSignal } from "@/lib/services/backend/session";
import { authBackendBaseUrl, marketplaceStoreKind } from "@/lib/services/backend/config";
import {
  FEATURED_CTA,
  FEATURED_VIEW_ALL,
  featuredLeadArea,
  featuredLeadHref,
  featuredLeadSummary,
  readFeaturedLeadFeed,
  type FeaturedLead,
} from "@/lib/domain/featured-leads";

/**
 * P-01 — Featured Leads.
 *
 * Real buyer requirements from `/v1/leads/featured`, which is where this
 * section should always have been reading. It previously rendered published
 * properties under a lead heading, so a Seller looking for buyer requirements
 * landed on a property listing.
 *
 * The Projects section below it is untouched: projects are properties and
 * belong in their own row, pointing at the property search.
 *
 * Renders nothing at all when the feed is empty or unavailable. An empty
 * marketplace is not an error worth a panel on a public homepage, and an
 * apology where cards should be reads as a broken site.
 */
export async function FeaturedLeads() {
  if (marketplaceStoreKind() !== "backend") return null;

  let leads: readonly FeaturedLead[];
  try {
    const response = await fetch(`${authBackendBaseUrl()}/v1/leads/featured?limit=6`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const feed = readFeaturedLeadFeed(await response.json());
    if (!feed) return null;
    leads = feed.leads;
  } catch (error) {
    if (isFrameworkSignal(error)) throw error;
    return null;
  }
  if (leads.length === 0) return null;

  return (
    <section className="mb-[32px]">
      <SectionHeader
        title="Featured Leads"
        level="page"
        subtitle="Buyer requirements available to purchase"
        action={
          <Link
            href={FEATURED_VIEW_ALL}
            className="text-[15px] font-semibold text-brand hover:text-brand-deep"
          >
            View all <span aria-hidden="true">→</span>
          </Link>
        }
      />
      <ul className="grid grid-cols-3 gap-[18px] max-[900px]:grid-cols-2 max-[560px]:grid-cols-1">
        {leads.map((lead) => (
          <li key={lead.id}>
            <LeadCard lead={lead} />
          </li>
        ))}
      </ul>
      <p className="t-caption mt-[10px] text-muted">
        A lead is one buyer&rsquo;s stated requirement. Contact details are released only
        after purchase, to the account that bought it.
      </p>
    </section>
  );
}

function LeadCard({ lead }: { lead: FeaturedLead }) {
  return (
    <Card className="flex h-full flex-col p-[18px]">
      <div className="flex flex-wrap items-start justify-between gap-[8px]">
        <h3 className="t-card-title text-ink">{featuredLeadArea(lead)}</h3>
        {/* Only when the backend says a level was recorded. The commercial
            mapping is not approved, so most leads show nothing here and that
            is the honest state rather than a zero. */}
        {lead.qualification.recorded ? (
          <Chip tone="neutral">Qualification {lead.qualification.level}</Chip>
        ) : null}
      </div>

      <p className="t-body mt-[4px] text-body">{featuredLeadSummary(lead)}</p>

      <p className="t-mono mt-[8px] text-[12px] text-muted">{lead.reference}</p>

      <div className="mt-auto pt-[14px]">
        <div className="flex flex-wrap items-baseline gap-[8px]">
          <span className="text-[19px] font-bold text-ink">
            {lead.priceCredits} credits
          </span>
          {/* The badge says a lead is reduced. It does not say why: the ageing
              schedule that decided it is policy, not public copy. */}
          {lead.sale.onSale ? (
            <Chip tone="success">{lead.sale.discountPercent}% off</Chip>
          ) : null}
        </div>
        <ButtonLink
          href={featuredLeadHref(lead)}
          size="sm"
          className="mt-[12px] w-full"
          aria-label={`${FEATURED_CTA} — ${lead.reference}`}
        >
          {FEATURED_CTA}
        </ButtonLink>
      </div>
    </Card>
  );
}
