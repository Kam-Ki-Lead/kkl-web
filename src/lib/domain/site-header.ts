/**
 * Everything the header decides, with no React and no DOM.
 *
 * WHY THIS EXISTS
 *
 * The homepage card once carried a "Search type" box that sat in the row with
 * the real fields, looked like a control, and filtered nothing. The rule that
 * came out of it is in `property-search-query.ts`: a control that is drawn has
 * to reach something real.
 *
 * A header is the same problem with more surface. The city selector, the
 * search panel, the shortlist badge and the active tab are each a claim about
 * the application's state, and each one is easy to fake. Keeping the decisions
 * here means they can be tested without a browser, and means the component is
 * only responsible for drawing what this module says.
 */

// ------------------------------------------------------------------ cities --

export type City = {
  /** Stable id. Persisted, so renaming a label must not change it. */
  readonly id: string;
  readonly label: string;
};

/**
 * The cities the selector offers.
 *
 * IMPORTANT — read `docs` note in the delivery report. Today the approved
 * location taxonomy only contains Kolkata (India → West Bengal → Kolkata →
 * New Town → Action Area → Project), so the other five have no inventory
 * behind them. The list is a parameter of the component rather than a
 * constant inside it, so it can be narrowed to the cities that actually
 * resolve without touching the component.
 */
export const CITIES: readonly City[] = Object.freeze([
  { id: "kolkata", label: "Kolkata" },
  { id: "mumbai", label: "Mumbai" },
  { id: "delhi-ncr", label: "Delhi NCR" },
  { id: "bengaluru", label: "Bengaluru" },
  { id: "pune", label: "Pune" },
  { id: "hyderabad", label: "Hyderabad" },
]);

export const DEFAULT_CITY_ID = "kolkata";

/** Where the chosen city is remembered. Versioned, so the shape can change. */
export const CITY_STORAGE_KEY = "kkl.header.city.v1";

/**
 * A stored or supplied value, as a city id — or null.
 *
 * Storage is attacker-writable and survives deploys, so a value that is no
 * longer offered has to fall back rather than render a city that does not
 * exist. Returning null lets the caller choose the default explicitly.
 */
export function readCityId(
  value: string | null | undefined,
  cities: readonly City[] = CITIES,
): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return cities.some((city) => city.id === trimmed) ? trimmed : null;
}

/** The label for a city id, falling back to the default city's label. */
export function cityLabel(id: string, cities: readonly City[] = CITIES): string {
  const found = cities.find((city) => city.id === id);
  if (found) return found.label;
  const fallback = cities.find((city) => city.id === DEFAULT_CITY_ID) ?? cities[0];
  return fallback ? fallback.label : "";
}

/** The accessible name for the selector button. The visible text is inside it
 *  (WCAG 2.5.3 Label in Name), so "click Kolkata" matches the control. */
export function cityButtonLabel(id: string, cities: readonly City[] = CITIES): string {
  return `City: ${cityLabel(id, cities)}. Change city`;
}

// --------------------------------------------------------------- the tabs --

/** Only what this module needs from a query string, so tests need no DOM. */
export type QueryLike = { get(key: string): string | null };

export type HeaderNavItem = {
  readonly href: string;
  readonly label: string;
  /** Whether this item is the page being shown. */
  readonly match: (pathname: string, query: QueryLike) => boolean;
};

const EMPTY_QUERY: QueryLike = { get: () => null };

/**
 * Where "Buy leads" goes, and why it is two routes.
 *
 * `/seller/leads` is the Seller console: its own shell, its own side rail,
 * its own current-item marking, and no public header. A tab that points
 * there can never be shown as current, because the header stops existing the
 * moment it is followed — which is exactly how it was reported.
 *
 * `/brokers` is the public "Buy qualified buyer leads" page. It is inside the
 * public shell, so the tab stays on screen and lights up.
 *
 * So the destination depends on who is asking: somebody signed in wants the
 * lead list, somebody signed out wants the page explaining what a lead is and
 * how to register. Both count as "Buy leads" for the active state, so the tab
 * is also correct on the console if the header is ever rendered there.
 */
export const BUY_LEADS_PUBLIC = "/brokers";
export const BUY_LEADS_CONSOLE = "/seller/leads";

/** The destination for the Buy leads tab. */
export function buyLeadsHref(signedIn: boolean): string {
  return signedIn ? BUY_LEADS_CONSOLE : BUY_LEADS_PUBLIC;
}

/**
 * The account control in the utility strip and the drawer.
 *
 * It said "Sign in" whether or not anybody was signed in, which is a link that
 * lies to half the people who read it. Same cookie read as `buyLeadsHref`: not
 * an authorisation, just what the control should say.
 */
export const ACCOUNT_SIGNED_OUT = { href: "/auth", label: "Sign in" } as const;
export const ACCOUNT_SIGNED_IN = { href: "/account", label: "My account" } as const;

export function accountLink(signedIn: boolean): { readonly href: string; readonly label: string } {
  return signedIn ? ACCOUNT_SIGNED_IN : ACCOUNT_SIGNED_OUT;
}

const under = (pathname: string, route: string) =>
  pathname === route || pathname.startsWith(`${route}/`);

/**
 * The segmented tabs.
 *
 * These are the routes that exist in this application. "New launches" is the
 * same route as "Projects" with a possession filter, which is why matching
 * needs the query string and not only the path — hard-coding `aria-current`
 * on the first tab, as the design prototype did, marks Home as current on
 * every page in the site.
 */
export function headerNav(buyLeads: string = BUY_LEADS_PUBLIC): readonly HeaderNavItem[] {
  return Object.freeze([
  {
    href: "/",
    label: "Home",
    match: (pathname) => pathname === "/",
  },
  {
    href: buyLeads,
    label: "Buy leads",
    match: (pathname) =>
      under(pathname, BUY_LEADS_PUBLIC) || under(pathname, BUY_LEADS_CONSOLE),
  },
  {
    href: "/search",
    label: "Projects",
    match: (pathname, query) =>
      (pathname === "/search" && query.get("possession") !== "new_launch") ||
      pathname.startsWith("/property/"),
  },
  {
    href: "/search?possession=new_launch",
    label: "New launches",
    match: (pathname, query) => pathname === "/search" && query.get("possession") === "new_launch",
  },
  ]);
}

/** The tabs as a signed-out visitor sees them. */
export const HEADER_NAV: readonly HeaderNavItem[] = headerNav();

/** The label of the current tab, or null when the route is not one of them. */
export function activeNavLabel(
  pathname: string,
  query: QueryLike = EMPTY_QUERY,
  nav: readonly HeaderNavItem[] = HEADER_NAV,
): string | null {
  // First match wins, so an item added later cannot quietly steal a route
  // from one above it.
  const found = nav.find((item) => item.match(pathname, query));
  return found ? found.label : null;
}

// ---------------------------------------------------------------- shortlist --

export type ShortlistBadge = {
  /** The digits on the badge, or null when there is no badge to draw. */
  readonly text: string | null;
  /** The whole control's accessible name. */
  readonly label: string;
};

/**
 * The shortlist badge.
 *
 * A badge is a count somebody will act on, so an unusable value must produce
 * no badge rather than "NaN" or "-1". Above 99 it caps, because the badge is
 * 17px wide and a four-digit number would break the bar it sits in.
 */
export function shortlistBadge(count: unknown): ShortlistBadge {
  const usable =
    typeof count === "number" && Number.isInteger(count) && count > 0 ? count : 0;
  if (usable === 0) return { text: null, label: "Shortlist, empty" };
  return {
    text: usable > 99 ? "99+" : String(usable),
    label: `Shortlist, ${usable} ${usable === 1 ? "property" : "properties"}`,
  };
}

// ------------------------------------------------------------- the search --

/** The query key the results page reads a text search from. */
export const SEARCH_TEXT_PARAM = "q";

export const SEARCH_PLACEHOLDER = "project, builder or locality";

/**
 * Where the header's search sends somebody.
 *
 * Empty or whitespace goes to the unfiltered results page rather than to
 * `?q=`, so an accidental Enter does not produce "no results for nothing".
 */
export function headerSearchHref(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "/search";
  return `/search?${new URLSearchParams([[SEARCH_TEXT_PARAM, trimmed]]).toString()}`;
}
