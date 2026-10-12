import type { LocalitySummary } from "@/lib/services/contracts";

/**
 * The "Popular localities" pill cloud — P-01's locality section.
 *
 * The rules live here rather than in the component so they can be tested
 * without a browser, and so the two numbers on screen (the subtitle's total
 * and the "+N more" pill) are derived from the same place and cannot drift
 * apart.
 */

/**
 * Whether the homepage draws the section at all.
 *
 * Off for now, at the client's request. The section, its tests and its browser
 * checks are all intact behind this one flag — turning it back on is this line
 * and nothing else, which is why the section was not deleted.
 */
export const SHOW_POPULAR_LOCALITIES = false;

/** The section's heading. One constant, so renaming it is one edit. */
export const POPULAR_LOCALITIES_HEADING = "Popular localities";

/** At or above this many listings, a locality is drawn in solid brand. */
export const HIGHLIGHT_MIN = 3;

/** "1 listing", never "1 listings". */
export function listingCountLabel(count: number): string {
  return count === 1 ? "1 listing" : `${count} listings`;
}

/**
 * The pills, in the order the service gave them — highest count first, then
 * alphabetical. Not re-sorted here: the order is the service's to decide, and
 * sorting twice is how the two disagree.
 *
 * A locality with nothing in it is dropped, because the pill's whole content
 * is a count and "Behala 0" is an invitation to an empty results page.
 */
export function localityPills(localities: readonly LocalitySummary[]): readonly LocalitySummary[] {
  return localities.filter((l) => l.listingCount > 0);
}

export function isHighlighted(count: number): boolean {
  return count >= HIGHLIGHT_MIN;
}

/**
 * How many localities the cloud is not showing.
 *
 * `total` is the same figure the subtitle quotes, so the two agree on screen.
 * Never negative: if the page is showing more pills than the total claims,
 * the answer is "none left", not a negative pill.
 */
export function moreLocalityCount(total: number, shown: number): number {
  return Math.max(0, total - shown);
}

/** "+20 more localities", or "+1 more locality". */
export function moreLocalitiesLabel(count: number): string {
  return `+${count} more ${count === 1 ? "locality" : "localities"}`;
}

/**
 * The same destination the locality cards used: the search, filtered to that
 * location record. Encoded, though every id this has ever carried is already
 * URL-safe — a location id is data, and data does not get to decide where a
 * link points.
 */
export function localityHref(id: string): string {
  return `/search?locality=${encodeURIComponent(id)}`;
}

/**
 * Where "+N more localities" goes.
 *
 * ASSUMPTION: the main listings page. There is no all-localities route, and
 * this page is served only the top handful of localities — `getHomepage`
 * returns six — so there is nothing held back that a control could expand.
 */
export const ALL_LOCALITIES_HREF = "/search";

/** "New Town, 7 listings" — the link's accessible name. */
export function localityLinkLabel(name: string, count: number): string {
  return `${name}, ${listingCountLabel(count)}`;
}
