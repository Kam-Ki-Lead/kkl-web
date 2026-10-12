import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { ButtonLink } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/states";
import {
  PUBLIC_LEAD_PAGE,
  hasPublicLeadFilters,
  leadCountLine,
  matchesPublicLead,
  publicLeadHref,
  publicLeadHrefWith,
  publicLeadOptions,
  publicLeadShowMoreHref,
  type PublicLead,
  type PublicLeadFilters,
} from "@/lib/domain/public-leads";

/**
 * The public lead board — the inventory on P-18, before anyone signs in.
 *
 * The page used to be three paragraphs about buying leads with no leads on
 * it. This is the marketplace itself: what is listed, where, for what
 * configuration and budget, and what each one costs, with the contact details
 * withheld exactly as the copy says they are.
 *
 * WHAT IS SAFE TO SHOW HERE
 *
 * Only `PublicLead`, which is a deliberately narrower shape than the console's.
 * No contact value, no mask, no age in days, no intent score — see
 * `public-leads.ts` for why each one is absent. The purchase path is unchanged:
 * a card points at the existing lead page, which is where sign-in,
 * verification, the confirmed price and the wallet already live.
 *
 * FILTERS LIVE IN THE URL
 *
 * So Back works, a filtered board can be sent to a colleague, and a reload does
 * not reset the browse. The options are derived from the leads on hand, so no
 * filter can be offered that matches nothing.
 */
export function LeadBoard({
  leads,
  filters,
  shown,
  city,
  note,
}: {
  /** Everything the page may show, already narrowed to the public shape. */
  leads: readonly PublicLead[];
  filters: PublicLeadFilters;
  /** How many of the matching leads to draw. */
  shown: number;
  city: string;
  /** A sentence about where this inventory came from, when there is one. */
  note?: string | null;
}) {
  const options = publicLeadOptions(leads, filters);
  const matching = leads.filter((lead) => matchesPublicLead(lead, filters));
  const page = matching.slice(0, shown);
  const saleCount = leads.filter((l) => l.onSale).length;

  return (
    <section id="leads" aria-labelledby="leads-heading" className="scroll-mt-[90px]">
      <div className="flex flex-wrap items-end justify-between gap-[12px]">
        <div>
          <h2 id="leads-heading" className="t-section-title text-ink">
            Leads available now
          </h2>
          <p className="t-caption mt-[2px] text-muted">{leadCountLine(leads.length, city)}</p>
        </div>

        {/* All / Reduced. The badge says a lead is reduced, never why: the
            ageing schedule that decided it is commercial policy, not copy. */}
        {saleCount > 0 ? (
          <div className="flex gap-[8px]" role="group" aria-label="Lead list">
            <Tab href={publicLeadHrefWith(filters, { saleOnly: false })} current={!filters.saleOnly}>
              All leads
            </Tab>
            <Tab href={publicLeadHrefWith(filters, { saleOnly: true })} current={filters.saleOnly}>
              Reduced ({saleCount})
            </Tab>
          </div>
        ) : null}
      </div>

      <div className="mt-[14px] flex flex-wrap items-center gap-[10px]">
        <FilterGroup
          label="Locality"
          values={options.areas}
          current={filters.area}
          hrefFor={(value) => publicLeadHrefWith(filters, { area: value })}
        />
        <FilterGroup
          label="Budget"
          values={options.budgets}
          current={filters.budget}
          hrefFor={(value) => publicLeadHrefWith(filters, { budget: value })}
        />
        <FilterGroup
          label="Configuration"
          values={options.configurations}
          current={filters.configuration}
          hrefFor={(value) => publicLeadHrefWith(filters, { configuration: value })}
        />
        {hasPublicLeadFilters(filters) ? (
          <Link
            href="/brokers#leads"
            className="text-[14px] font-semibold text-brand underline underline-offset-2 hover:text-brand-deep"
          >
            Clear filters
          </Link>
        ) : null}
      </div>

      <p aria-live="polite" className="t-caption mt-[10px] text-muted">
        {hasPublicLeadFilters(filters)
          ? `${matching.length} of ${leads.length} leads match`
          : `Showing ${page.length} of ${matching.length}`}
      </p>

      {page.length > 0 ? (
        <>
          <ul className="mt-[12px] grid grid-cols-3 gap-[18px] max-[980px]:grid-cols-2 max-[640px]:grid-cols-1">
            {page.map((lead) => (
              <li key={lead.id}>
                <PublicLeadCard lead={lead} />
              </li>
            ))}
          </ul>

          {matching.length > page.length ? (
            <div className="mt-[18px] flex justify-center">
              <ButtonLink
                href={publicLeadShowMoreHref(filters, shown)}
                variant="secondary"
                size="sm"
              >
                Show {Math.min(PUBLIC_LEAD_PAGE, matching.length - page.length)} more
              </ButtonLink>
            </div>
          ) : null}
        </>
      ) : (
        <div className="mt-[12px]">
          <StateMessage
            title={
              hasPublicLeadFilters(filters)
                ? "No lead matches those filters"
                : "No leads are listed right now"
            }
            action={
              hasPublicLeadFilters(filters) ? (
                <ButtonLink href="/brokers#leads" size="sm" variant="secondary">
                  Clear filters
                </ButtonLink>
              ) : undefined
            }
          >
            {hasPublicLeadFilters(filters)
              ? "Clear a filter to see the rest of the marketplace."
              : "New buyer requirements are listed as they are qualified."}
          </StateMessage>
        </div>
      )}

      <p className="t-caption mt-[14px] max-w-[70ch] text-muted">
        A lead is one buyer&rsquo;s stated requirement. Contact details are released only
        after purchase, to the account that bought it, and a lead is sold to exactly one
        purchaser.
        {note ? ` ${note}` : ""}
      </p>
    </section>
  );
}

function Tab({
  href,
  current,
  children,
}: {
  href: string;
  current: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={current ? "true" : undefined}
      className={[
        "rounded-full border px-[14px] py-[7px] text-[14px] font-semibold",
        "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-saffron",
        current
          ? "border-brand bg-brand text-white"
          : "border-line bg-white text-ink hover:border-brand",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

/**
 * One filter, as a row of links rather than a `<select>`.
 *
 * A link is a GET, so the board works with the script stripped out and every
 * state is a URL somebody can share. Choosing a chosen value again clears it.
 */
function FilterGroup({
  label,
  values,
  current,
  hrefFor,
}: {
  label: string;
  values: readonly string[];
  current: string | null;
  hrefFor: (value: string | null) => string;
}) {
  if (values.length < 2) return null;
  return (
    <div className="flex flex-wrap items-center gap-[6px]">
      <span className="text-[13px] font-bold text-muted">{label}</span>
      {values.map((value) => {
        const chosen = current === value;
        return (
          <Link
            key={value}
            href={hrefFor(chosen ? null : value)}
            aria-pressed={chosen}
            className={[
              "rounded-full border px-[12px] py-[6px] text-[14px] font-semibold",
              "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-saffron",
              chosen
                ? "border-brand bg-chip-neutral-bg text-brand"
                : "border-line bg-white text-ink hover:border-brand",
            ].join(" ")}
          >
            {value}
          </Link>
        );
      })}
    </div>
  );
}

function PublicLeadCard({ lead }: { lead: PublicLead }) {
  const summary = [
    lead.configurations.length > 0 ? lead.configurations.join(", ") : null,
    lead.propertyType,
    lead.budgetBand ? `budget ${lead.budgetBand}` : null,
  ]
    .filter((part): part is string => Boolean(part))
    .join(" · ");

  return (
    <Card className="flex h-full flex-col p-[18px]">
      <div className="flex flex-wrap items-start justify-between gap-[8px]">
        <h3 className="t-card-title text-ink">{lead.area}</h3>
        {lead.qualification ? <Chip tone="neutral">{lead.qualification}</Chip> : null}
      </div>

      <p className="t-body mt-[4px] text-body">{summary || "Requirement not stated"}</p>
      <p className="t-mono mt-[8px] text-[12px] text-muted">{lead.reference}</p>

      <div className="mt-auto pt-[14px]">
        <div className="flex flex-wrap items-baseline gap-[8px]">
          {/* Null is not zero. A lead with no configured price says so. */}
          {lead.priceCredits === null ? (
            <span className="text-[15px] font-semibold text-muted">Price not yet set</span>
          ) : (
            <span className="text-[19px] font-bold text-ink">{lead.priceCredits} credits</span>
          )}
          {lead.onSale ? (
            <Chip tone="success">
              {lead.discountPercent > 0 ? `${lead.discountPercent}% off` : "Reduced"}
            </Chip>
          ) : null}
        </div>
        <ButtonLink
          href={publicLeadHref(lead)}
          size="sm"
          className="mt-[12px] w-full"
          aria-label={`Buy lead ${lead.reference} in ${lead.area}`}
        >
          Buy this lead
        </ButtonLink>
      </div>
    </Card>
  );
}
