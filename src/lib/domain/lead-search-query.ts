/**
 * Turning a homepage search into a lead-marketplace query.
 *
 * WHY THIS IS ITS OWN MODULE
 *
 * The homepage card and `/seller/leads` are two screens that have to agree on
 * a vocabulary, and they did not. The card forwarded its own display labels
 * into the marketplace's filter keys, so the search it offered could not match
 * anything:
 *
 *   `config`  the marketplace matches this with `includes()` against text like
 *             "2 BHK, 3 BHK". The card sent the digits only ("3"), which
 *             matched by luck, and — when no BHK was chosen, which is the
 *             card's default state — it sent the PROPERTY TYPE instead
 *             ("Apartment"), which matched nothing. The default homepage lead
 *             search therefore always came back empty.
 *
 *   `budget`  the marketplace compares this for exact equality against the
 *             band each lead carries, and those bands come from what buyers
 *             stated. The card's bands are its own labels ("Up to ₹50L"),
 *             which are not those values, so forwarding it could only ever
 *             filter everything out.
 *
 *   type      the marketplace has no property-type parameter at all.
 *
 * So this module forwards only what the marketplace genuinely filters on, and
 * names what it withholds and why. A filter that cannot work is not carried
 * across in a form that looks like it does.
 *
 * The marketplace's own filter control populates budget and configuration from
 * the values the leads in the feed actually carry, which is the right place to
 * narrow by band.
 */

/** What the homepage card holds when somebody presses "Search leads". */
export type HomeLeadSearch = {
  /** A location record id, or "" for everywhere. */
  readonly areaId: string;
  /** The BHK count as digits ("3"), or "" for any. */
  readonly bhk: string;
};

/**
 * The query keys `/seller/leads` parses.
 *
 * `area` is a location record id: the marketplace adapter resolves it to the
 * area name it filters on, so an id is correct here.
 *
 * `config` is sent in the canonical "3 BHK" form, which `includes()` matches
 * against a lead's "2 BHK, 3 BHK" exactly as intended, rather than relying on
 * a bare digit matching by coincidence.
 */
export function leadSearchParams(search: HomeLeadSearch): Array<[string, string]> {
  const params: Array<[string, string]> = [];
  const area = search.areaId.trim();
  const bhk = search.bhk.trim();
  if (area) params.push(["area", area]);
  if (bhk) params.push(["config", `${bhk} BHK`]);
  return params;
}

/** The path to send somebody to, query included. */
export function leadSearchHref(search: HomeLeadSearch): string {
  const params = new URLSearchParams(leadSearchParams(search));
  const query = params.toString();
  return query ? `/seller/leads?${query}` : "/seller/leads";
}

/**
 * What the homepage deliberately does not forward, and why.
 *
 * Exported so a screen can say it rather than leaving somebody to wonder
 * where their budget selection went.
 */
export const NOT_FORWARDED = Object.freeze({
  budget:
    "A lead's budget band is compared exactly against the band the buyer stated, "
    + "and this card's bands are display labels rather than those values. Choose a "
    + "band on the results page, from the bands that exist.",
  propertyType:
    "The lead marketplace has no property-type filter. A buyer requirement records "
    + "a configuration and a budget, not a property type to match against.",
});
