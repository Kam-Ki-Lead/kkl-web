/**
 * Reading the public featured-leads feed, and saying what a card may show.
 *
 * WHY THIS IS NOT JUST A TYPE
 *
 * The section this feeds used to be titled "Featured Leads" and render
 * published properties. The label was corrected first and the feed built
 * second, so this module exists to make the mismatch impossible to
 * reintroduce: a card is built from a lead or it is not built at all, and
 * nothing here can accept a property.
 *
 * It is pure, and it is deliberately strict. An unauthenticated payload that
 * does not look like the contract is dropped rather than half-rendered,
 * because a half-read lead card is how a field nobody expected ends up on a
 * public page.
 *
 * WHAT A CARD MUST NOT SAY
 *
 * No contact detail, because the endpoint sends none. No age in days and no
 * pricing mechanics, because the endpoint sends neither — between them they
 * would let the ageing thresholds be read off the page. A discount badge says
 * a lead is reduced; it does not say why, and the schedule that decided it is
 * not public copy.
 *
 * A qualification level is shown only when the backend says one was recorded.
 * The commercial level mapping is an open client decision, so an absent level
 * is normal and is rendered as nothing at all rather than a zero or a dash
 * that reads like a bad lead.
 */

export type FeaturedLead = {
  readonly id: string;
  readonly reference: string;
  readonly area: { readonly id: string | null; readonly name: string | null };
  readonly budgetBand: string | null;
  readonly propertyType: string | null;
  readonly configurations: readonly string[];
  readonly qualification: {
    readonly level: number | null;
    readonly recorded: boolean;
  };
  readonly priceCredits: number;
  readonly sale: { readonly onSale: boolean; readonly discountPercent: number };
};

export type FeaturedLeadFeed = {
  readonly leads: readonly FeaturedLead[];
  readonly limit: number;
  readonly offset: number;
  readonly hasMore: boolean;
};

/** Where "View all" goes. The lead marketplace, never the property search. */
export const FEATURED_VIEW_ALL = "/seller/leads" as const;

/** What every card's action says, and where it goes. */
export const FEATURED_CTA = "Buy Leads" as const;

/**
 * The route for one lead.
 *
 * The existing marketplace detail page, so buying stays on the path it
 * already has: sign-in, verification, the confirmed price and the wallet. A
 * card is an entry point to that workflow, not a shortcut past it.
 */
export function featuredLeadHref(lead: FeaturedLead): string {
  return `/seller/leads/${encodeURIComponent(lead.id)}`;
}

function record(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

const text = (value: unknown): string | null => (typeof value === "string" ? value : null);

const whole = (value: unknown): number | null =>
  typeof value === "number" && Number.isSafeInteger(value) ? value : null;

function readLead(value: unknown): FeaturedLead | null {
  const row = record(value);
  if (!row || typeof row.id !== "string" || typeof row.reference !== "string") return null;

  // A card with no price is not a card: the whole point is that a buyer can
  // see what it costs before signing in.
  const priceCredits = whole(row.priceCredits);
  if (priceCredits === null || priceCredits < 0) return null;

  const area = record(row.area);
  const sale = record(row.sale);
  const qualification = record(row.qualification);
  if (!area || !sale || !qualification) return null;

  const discountPercent = whole(sale.discountPercent) ?? 0;
  const level = whole(qualification.level);

  return {
    id: row.id,
    reference: row.reference,
    area: { id: text(area.id), name: text(area.name) },
    budgetBand: text(row.budgetBand),
    propertyType: text(row.propertyType),
    configurations: Array.isArray(row.configurations)
      ? row.configurations.filter((item): item is string => typeof item === "string")
      : [],
    qualification: {
      // `recorded` is the backend's word for it. A level is shown only when it
      // says so, never because a number happened to arrive.
      level: qualification.recorded === true ? level : null,
      recorded: qualification.recorded === true && level !== null,
    },
    priceCredits,
    sale: {
      onSale: sale.onSale === true && discountPercent > 0,
      discountPercent,
    },
  };
}

export function readFeaturedLeadFeed(body: unknown): FeaturedLeadFeed | null {
  const row = record(body);
  if (!row || !Array.isArray(row.leads)) return null;
  const leads: FeaturedLead[] = [];
  for (const item of row.leads) {
    const lead = readLead(item);
    // One unreadable row does not poison the feed, but it is dropped rather
    // than rendered with holes in it.
    if (lead) leads.push(lead);
  }
  return {
    leads,
    limit: whole(row.limit) ?? leads.length,
    offset: whole(row.offset) ?? 0,
    hasMore: row.hasMore === true,
  };
}

/**
 * The one-line description under a card's heading.
 *
 * Built from the structured fields, so it cannot accidentally carry free
 * text somebody typed at intake.
 */
export function featuredLeadSummary(lead: FeaturedLead): string {
  const parts = [
    lead.configurations.length > 0 ? lead.configurations.join(", ") : null,
    lead.propertyType,
    lead.budgetBand ? `budget ${lead.budgetBand}` : null,
  ].filter((part): part is string => part !== null && part !== "");
  return parts.length > 0 ? parts.join(" · ") : "Requirement not stated";
}

/** The area line. Never an address, and never invented. */
export function featuredLeadArea(lead: FeaturedLead): string {
  return lead.area.name ?? "Area not stated";
}
