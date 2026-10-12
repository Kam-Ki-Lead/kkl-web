import type { MarketplaceLead } from "@/lib/domain/types";
import type { FeaturedLead } from "@/lib/domain/featured-leads";

/**
 * What a lead may look like on a page nobody has signed in to.
 *
 * WHY THIS NARROWS RATHER THAN REUSES
 *
 * `MarketplaceLead` is the console's shape. It carries `ageDays`,
 * `intentScore`, the applied pricing version and a contact mask — fields the
 * signed-in, verified marketplace is allowed to show and a public page is not.
 * Between them, age and the discount let the ageing schedule be read off the
 * page by anyone with a browser, and the schedule is commercial policy.
 *
 * So the public board does not render a `MarketplaceLead`. It renders this,
 * and the two adapters below are the only way to get one. Adding a field to
 * the console's shape cannot widen the public page by accident, because
 * nothing here would carry it.
 *
 * WHAT IS DELIBERATELY ABSENT
 *
 * No contact value and no mask. No age in days. No intent score — the band is
 * carried when one exists, because a word is not a number and the band is what
 * the approved card shows. No pricing version. No buyer name, ever: the lead's
 * reference is the only identifier on the card.
 */
export type PublicLead = {
  readonly id: string;
  /** The lead's public reference, e.g. "LD-40118". Never a person. */
  readonly reference: string;
  /** "Action Area I, New Town" — a locality, never an address. */
  readonly area: string;
  readonly configurations: readonly string[];
  readonly budgetBand: string | null;
  readonly propertyType: string | null;
  /** A word, when one was recorded. Never a score. */
  readonly qualification: string | null;
  /** Null when no price is configured. A zero would read as free. */
  readonly priceCredits: number | null;
  readonly onSale: boolean;
  readonly discountPercent: number;
};

/** The purchase path a card points at: sign-in, verification, wallet, then buy. */
export function publicLeadHref(lead: PublicLead): string {
  return `/seller/leads/${encodeURIComponent(lead.id)}`;
}

/* -- the two adapters ---------------------------------------------------- */

/** From the public feed (`/v1/leads/featured`), which is already public-safe. */
export function fromFeaturedLead(lead: FeaturedLead): PublicLead {
  return {
    id: lead.id,
    reference: lead.reference,
    area: lead.area.name ?? "Area not stated",
    configurations: lead.configurations,
    budgetBand: lead.budgetBand,
    propertyType: lead.propertyType,
    qualification: lead.qualification.recorded ? `Qualification ${lead.qualification.level}` : null,
    priceCredits: lead.priceCredits,
    onSale: lead.sale.onSale,
    discountPercent: lead.sale.discountPercent,
  };
}

/**
 * From the sample marketplace, which is what a server with the marketplace
 * switch off has. Every field the public page may not show is dropped here,
 * named, so the omission is a decision rather than an oversight.
 */
export function fromMarketplaceLead(lead: MarketplaceLead): PublicLead {
  // Dropped on purpose: ageDays, intentScore, priceConfigurationId,
  // priceConfigurationVersion, originalPriceCredits, contactMask.
  return {
    id: lead.id,
    reference: lead.id.toUpperCase(),
    area: lead.locationPath.slice(-2).reverse().join(", "),
    configurations: lead.configuration ? [lead.configuration] : [],
    budgetBand: lead.budgetBand || null,
    propertyType: null,
    qualification: lead.intentBand ? intentWord(lead.intentBand) : null,
    priceCredits: lead.priceCredits,
    onSale: lead.status === "on_sale",
    discountPercent: 0,
  };
}

/** The band as a word. The score behind it never leaves the console. */
function intentWord(band: string): string {
  return `${band.charAt(0).toUpperCase()}${band.slice(1)} intent`;
}

/* -- the browse ---------------------------------------------------------- */

export const PUBLIC_LEAD_PAGE = 12;

export type PublicLeadFilters = {
  readonly area: string | null;
  readonly budget: string | null;
  readonly configuration: string | null;
  readonly saleOnly: boolean;
};

export const NO_PUBLIC_LEAD_FILTERS: PublicLeadFilters = {
  area: null,
  budget: null,
  configuration: null,
  saleOnly: false,
};

const one = (value: string | string[] | undefined): string | null => {
  const v = Array.isArray(value) ? value[0] : value;
  return v && v.trim() !== "" ? v : null;
};

export function readPublicLeadFilters(
  params: Record<string, string | string[] | undefined>,
): PublicLeadFilters {
  return {
    area: one(params.area),
    budget: one(params.budget),
    configuration: one(params.config),
    saleOnly: one(params.tab) === "sale",
  };
}

export function hasPublicLeadFilters(f: PublicLeadFilters): boolean {
  return Boolean(f.area || f.budget || f.configuration || f.saleOnly);
}

export function matchesPublicLead(lead: PublicLead, f: PublicLeadFilters): boolean {
  if (f.area && lead.area !== f.area) return false;
  if (f.budget && lead.budgetBand !== f.budget) return false;
  if (f.configuration && !lead.configurations.includes(f.configuration)) return false;
  if (f.saleOnly && !lead.onSale) return false;
  return true;
}

/** How many values one filter row offers before it stops being scannable. */
export const MAX_FILTER_VALUES = 8;

/**
 * A budget band's lower bound, in rupees, for ordering.
 *
 * Sorted as text, "₹1Cr – ₹1.5Cr" lands between "₹10L" and "₹20L" and the row
 * reads as noise. The bands are composed by the service, so this parses the
 * first amount it finds and leaves anything it cannot read at the end rather
 * than guessing a position for it.
 */
export function budgetBandFloor(band: string): number {
  const match = /₹\s*([\d.,]+)\s*(Cr|L)?/i.exec(band);
  if (!match) return Number.MAX_SAFE_INTEGER;
  const amount = Number((match[1] ?? "").replace(/,/g, ""));
  if (!Number.isFinite(amount)) return Number.MAX_SAFE_INTEGER;
  const unit = (match[2] ?? "").toLowerCase();
  return unit === "cr" ? amount * 10_000_000 : unit === "l" ? amount * 100_000 : amount;
}

/**
 * The values a filter may offer, taken from the leads on hand.
 *
 * Offering a value nothing matches is how a filter produces an empty page and
 * reads as a broken marketplace, so the options are derived, never listed.
 *
 * Capped and ranked, because derived is not the same as useful: the sample
 * marketplace spans 23 localities and 14 budget bands, and a row of 23 pills
 * is a wall, not a filter. Localities come by how many leads are in them,
 * budgets in money order, configurations in their own order. A value that is
 * currently chosen is always offered, so a filter can be cleared even when it
 * has fallen out of the top of its list.
 */
export function publicLeadOptions(
  leads: readonly PublicLead[],
  chosen: PublicLeadFilters = NO_PUBLIC_LEAD_FILTERS,
  max: number = MAX_FILTER_VALUES,
): {
  readonly areas: readonly string[];
  readonly budgets: readonly string[];
  readonly configurations: readonly string[];
} {
  const tally = (values: readonly string[]) => {
    const counts = new Map<string, number>();
    for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
    return counts;
  };

  const cap = (ranked: readonly string[], keep: string | null) => {
    const top = ranked.slice(0, max);
    return keep && !top.includes(keep) ? [...top, keep] : top;
  };

  const areaCounts = tally(leads.map((l) => l.area));
  const areas = [...areaCounts.keys()].sort(
    (a, b) => (areaCounts.get(b) ?? 0) - (areaCounts.get(a) ?? 0) || a.localeCompare(b),
  );

  const budgetCounts = tally(
    leads.map((l) => l.budgetBand).filter((b): b is string => Boolean(b)),
  );
  // Ranked by how many leads sit in the band, then shown in money order, so
  // the row is both the bands people are actually buying and readable.
  const budgets = [...budgetCounts.keys()]
    .sort((a, b) => (budgetCounts.get(b) ?? 0) - (budgetCounts.get(a) ?? 0) || a.localeCompare(b))
    .slice(0, max)
    .sort((a, b) => budgetBandFloor(a) - budgetBandFloor(b) || a.localeCompare(b));

  const configurations = [...new Set(leads.flatMap((l) => l.configurations))].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );

  return {
    areas: cap(areas, chosen.area),
    budgets: cap(budgets, chosen.budget).sort(
      (a, b) => budgetBandFloor(a) - budgetBandFloor(b) || a.localeCompare(b),
    ),
    configurations: cap(configurations, chosen.configuration),
  };
}

/** A URL with one filter changed and the rest kept. Paging resets with it. */
export function publicLeadHrefWith(
  current: PublicLeadFilters,
  change: Partial<PublicLeadFilters>,
): string {
  const next = { ...current, ...change };
  const query = new URLSearchParams();
  if (next.area) query.set("area", next.area);
  if (next.budget) query.set("budget", next.budget);
  if (next.configuration) query.set("config", next.configuration);
  if (next.saleOnly) query.set("tab", "sale");
  const text = query.toString();
  return text ? `/brokers?${text}#leads` : "/brokers#leads";
}

/** "Show 12 more" — the same filters, one page further in. */
export function publicLeadShowMoreHref(current: PublicLeadFilters, shown: number): string {
  const base = publicLeadHrefWith(current, {}).split("#")[0] ?? "/brokers";
  const [path, query] = [base.split("?")[0] ?? "/brokers", base.split("?")[1] ?? ""];
  const next = new URLSearchParams(query);
  next.set("show", String(shown + PUBLIC_LEAD_PAGE));
  return `${path}?${next.toString()}#leads`;
}

/** How many to draw: a page at a time, never fewer than one page. */
export function readShown(params: Record<string, string | string[] | undefined>): number {
  const raw = Number(one(params.show));
  if (!Number.isSafeInteger(raw) || raw < PUBLIC_LEAD_PAGE) return PUBLIC_LEAD_PAGE;
  return Math.min(raw, PUBLIC_LEAD_PAGE * 20);
}

/** "32 leads available in Kolkata" — derived, never stated. */
export function leadCountLine(count: number, city: string): string {
  if (count === 0) return `No leads are listed in ${city} right now`;
  return `${count} ${count === 1 ? "lead" : "leads"} available in ${city} right now`;
}
