/**
 * The property search's filter vocabulary and its validation, in one place.
 *
 * WHY THIS EXISTS
 *
 * `property-search-query.ts` maps the homepage card's controls onto a query
 * string. This module is the other half: it is what turns an arbitrary query
 * string — from the hero bar, from a bookmark, from anything — into a filter
 * object, and it is what refuses the ones that make no sense.
 *
 * It is the single source of truth for the two endpoints and for the bar, so
 * the number on the Search button cannot be computed from different rules
 * than the results page uses. It is pure: no React, no DOM, no service, no
 * database, so every rule below is testable without any of them.
 *
 * THE RULE THAT GOVERNS EVERY RANGE
 *
 * Inclusive at both ends. A listing with exactly 500 leads in its area is in
 * "0–500" and in "500–1,000". A null upper bound is open-ended. This is said
 * once here rather than re-derived at each call site, because the boundary is
 * exactly where range filters disagree with each other.
 */

import type { PropertySearchFilters, PropertyTransaction } from "./types";

/* ------------------------------------------------------------- vocabulary -- */

/** A closed or open-ended range. `null` as the upper bound means no limit. */
export type Band = readonly [number, number | null];

/**
 * Budget bands, in rupees.
 *
 * These are the bands the brief names. They are not the homepage card's
 * previous "Up to …" labels, which overlapped each other and could not be
 * expressed as a single query token — see the delivery note.
 */
export const BUDGET: Readonly<Record<string, Band>> = Object.freeze({
  u50l: [0, 5_000_000],
  "50l-1cr": [5_000_000, 10_000_000],
  "1cr-2cr": [10_000_000, 20_000_000],
  "2crplus": [20_000_000, null],
});

export const BUDGET_LABELS: Readonly<Record<string, string>> = Object.freeze({
  u50l: "Under ₹50L",
  "50l-1cr": "₹50L–₹1Cr",
  "1cr-2cr": "₹1Cr–₹2Cr",
  "2crplus": "₹2Cr+",
});

/**
 * Monthly bands, for lettings.
 *
 * A rent listing's price is a monthly amount. Matched against the capital
 * bands above, every flat in Kolkata is "Under ₹50L" — true, meaningless,
 * and the filter silently stops filtering. So rent has its own scale, and a
 * band only ever matches listings on the scale it belongs to.
 */
export const BUDGET_RENT: Readonly<Record<string, Band>> = Object.freeze({
  "u20k": [0, 20_000],
  "20k-40k": [20_000, 40_000],
  "40k-75k": [40_000, 75_000],
  "75kplus": [75_000, null],
});

export const BUDGET_RENT_LABELS: Readonly<Record<string, string>> = Object.freeze({
  "u20k": "Under ₹20,000",
  "20k-40k": "₹20,000–₹40,000",
  "40k-75k": "₹40,000–₹75,000",
  "75kplus": "₹75,000+",
});

/** Which scale a budget band is measured on. */
export type BudgetScale = "sale" | "rent";

/** The bands on offer for a mode. Rent gets monthly ones; everything else capital. */
export function budgetBandsFor(mode: string | undefined): {
  scale: BudgetScale;
  bands: Readonly<Record<string, Band>>;
  labels: Readonly<Record<string, string>>;
} {
  return mode === "rent"
    ? { scale: "rent", bands: BUDGET_RENT, labels: BUDGET_RENT_LABELS }
    : { scale: "sale", bands: BUDGET, labels: BUDGET_LABELS };
}

/**
 * The quantity presets, generated from one step.
 *
 * Change `QTY_STEP` or `QTY_BANDS` and the keys, the labels and the server's
 * accepted vocabulary all move together. Writing the five bands out by hand is
 * how a control ends up offering a value the server rejects.
 */
export const QTY_STEP = 500;
export const QTY_BANDS = 4;

/** The largest quantity anybody may type. Above this is a typo, not a filter. */
export const MAX_QTY = 1_000_000;

function buildQtyPresets(step: number, bands: number): Readonly<Record<string, Band>> {
  const out: Record<string, Band> = {};
  for (let i = 0; i < bands; i += 1) {
    out[`${i * step}-${(i + 1) * step}`] = [i * step, (i + 1) * step];
  }
  out[`${bands * step}plus`] = [bands * step, null];
  return Object.freeze(out);
}

export const QTY: Readonly<Record<string, Band>> = buildQtyPresets(QTY_STEP, QTY_BANDS);

/** The token used for the custom-range option. */
export const QTY_CUSTOM = "custom";

const group = (n: number) => n.toLocaleString("en-IN");

/** The label for a preset key, e.g. "500–1,000" or "2,000+". */
export function qtyLabel(key: string): string {
  const band = QTY[key];
  if (!band) return "";
  const [lo, hi] = band;
  return hi === null ? `${group(lo)}+` : `${group(lo)}–${group(hi)}`;
}

/** Every quantity option the control offers, presets first. */
export const QTY_OPTIONS: ReadonlyArray<{ value: string; label: string }> = Object.freeze([
  { value: "", label: "Any quantity" },
  ...Object.keys(QTY).map((value) => ({ value, label: qtyLabel(value) })),
  { value: QTY_CUSTOM, label: "Custom range…" },
]);

export const BHK_VALUES = Object.freeze(["1", "2", "3", "4plus"] as const);
export const MODE_VALUES = Object.freeze(["buy", "rent"] as const);

/** The bedroom count at which "4+" begins. Derived from the last BHK value. */
export const BHK_PLUS_FROM = 4;

export const BHK_OPTIONS: ReadonlyArray<{ value: string; label: string }> = Object.freeze([
  { value: "", label: "Any BHK" },
  { value: "1", label: "1 BHK" },
  { value: "2", label: "2 BHK" },
  { value: "3", label: "3 BHK" },
  { value: "4plus", label: "4+ BHK" },
]);

/**
 * Buy or rent.
 *
 * The query says `buy`; the record says `sale`. `listings.transaction` in
 * kkl-backend has carried `sale` since the owner posting flow was built, and
 * renaming a stored value to match a query token would be the wrong way round.
 */
export const MODE_OPTIONS: ReadonlyArray<{ value: string; label: string }> = Object.freeze([
  { value: "", label: "Buy or rent" },
  { value: "buy", label: "Buy" },
  { value: "rent", label: "Rent" },
]);

const MODE_TO_TRANSACTION: Readonly<Record<string, PropertyTransaction>> = Object.freeze({
  buy: "sale",
  rent: "rent",
});

export const MAX_LOCATION_LENGTH = 80;

/* ------------------------------------------------------------------ errors -- */

/**
 * A rejected request.
 *
 * It carries its own status so a route handler can answer without a table of
 * message-to-status guesses, and so an unexpected throw stays a 500 rather
 * than being reported to the caller as their mistake.
 */
export class FilterError extends Error {
  readonly status = 400;
  constructor(message: string) {
    super(message);
    this.name = "FilterError";
  }
}

const bad = (message: string) => new FilterError(message);

/* -------------------------------------------------------------- the parse -- */

/** What a parsed query means. Every field is optional; absent means unfiltered. */
export type ParsedFilters = {
  /** Free text, matched against the locality path and the project name. */
  readonly location?: string;
  /** A location-record id, from the area picker. Hierarchical. */
  readonly locality?: string;
  readonly mode?: "buy" | "rent";
  readonly bhk?: (typeof BHK_VALUES)[number];
  readonly budget?: Band;
  /** Which scale `budget` is measured on; a band matches only its own scale. */
  readonly budgetScale?: BudgetScale;
  readonly qty?: Band;
};

/** The parameters the filter understands. Anything else is a mistake. */
export const FILTER_PARAMS = Object.freeze([
  "location",
  "locality",
  "mode",
  "bhk",
  "budget",
  "qty",
  "qtyMin",
  "qtyMax",
] as const);

/** The paging parameters, accepted only by the listing endpoint. */
export const PAGE_PARAMS = Object.freeze(["page", "pageSize"] as const);

/** A query string as any of the shapes this application hands around. */
export type QueryLike =
  | URLSearchParams
  | Record<string, string | string[] | undefined>;

/**
 * One value per key, or a rejection.
 *
 * A repeated parameter is refused rather than resolved to the first or the
 * last: `?mode=buy&mode=rent` is not a search anybody meant, and silently
 * picking one of them produces a result the caller cannot explain.
 */
function readOne(query: QueryLike, key: string): string | undefined {
  if (query instanceof URLSearchParams) {
    const all = query.getAll(key);
    if (all.length > 1) throw bad(`repeated parameter: ${key}`);
    return all[0];
  }
  const raw = query[key];
  if (raw === undefined) return undefined;
  if (Array.isArray(raw)) {
    if (raw.length > 1) throw bad(`repeated parameter: ${key}`);
    return raw[0];
  }
  if (typeof raw !== "string") throw bad(`invalid parameter: ${key}`);
  return raw;
}

function keysOf(query: QueryLike): string[] {
  return query instanceof URLSearchParams
    ? [...new Set(query.keys())]
    : Object.keys(query);
}

/** A whole number within the cap, or a rejection naming the field. */
export function wholeNumber(value: string, name: string): number {
  if (!/^\d{1,9}$/.test(value)) throw bad(`${name} must be a whole number`);
  const n = Number(value);
  if (n > MAX_QTY) throw bad(`${name} is too large`);
  return n;
}

/**
 * A query string as a filter, or a `FilterError`.
 *
 * `allow` widens the accepted parameter set; the listing endpoint passes the
 * paging keys. Everything outside it is refused by name, because a filter that
 * silently ignores `?bkh=3` returns the wrong results and says nothing.
 */
export function parseFilters(
  query: QueryLike,
  { allow = [] as readonly string[] } = {},
): ParsedFilters {
  const known = new Set<string>([...FILTER_PARAMS, ...allow]);
  for (const key of keysOf(query)) {
    if (!known.has(key)) throw bad(`unknown parameter: ${key}`);
  }

  const f: {
    location?: string;
    locality?: string;
    mode?: "buy" | "rent";
    bhk?: (typeof BHK_VALUES)[number];
    budget?: Band;
    budgetScale?: BudgetScale;
    qty?: Band;
  } = {};

  const location = (readOne(query, "location") ?? "").trim();
  if (location.length > MAX_LOCATION_LENGTH) throw bad("location is too long");
  if (location) f.location = location;

  const locality = (readOne(query, "locality") ?? "").trim();
  if (locality.length > MAX_LOCATION_LENGTH) throw bad("locality is too long");
  if (locality) f.locality = locality;

  const mode = readOne(query, "mode");
  if (mode) {
    if (!(MODE_VALUES as readonly string[]).includes(mode)) throw bad("invalid mode");
    f.mode = mode as "buy" | "rent";
  }

  const bhk = readOne(query, "bhk");
  if (bhk) {
    if (!(BHK_VALUES as readonly string[]).includes(bhk)) throw bad("invalid bhk");
    f.bhk = bhk as (typeof BHK_VALUES)[number];
  }

  const budget = readOne(query, "budget");
  if (budget) {
    // Which scale applies is decided by the mode, so ?mode=rent&budget=20k-40k
    // is a monthly band and ?budget=1cr-2cr is a capital one. A key from the
    // wrong scale is refused rather than quietly matching nothing.
    const { scale, bands } = budgetBandsFor(f.mode);
    const band = bands[budget];
    if (!band) throw bad("invalid budget");
    f.budget = band;
    f.budgetScale = scale;
  }

  const qty = readOne(query, "qty");
  const qtyMin = readOne(query, "qtyMin");
  const qtyMax = readOne(query, "qtyMax");
  if (qty) {
    if (qty === QTY_CUSTOM) {
      const hasMin = Boolean(qtyMin && qtyMin.trim());
      const hasMax = Boolean(qtyMax && qtyMax.trim());
      if (!hasMin && !hasMax) throw bad("custom quantity needs qtyMin, qtyMax or both");
      const min = hasMin ? wholeNumber((qtyMin as string).trim(), "qtyMin") : 0;
      const max = hasMax ? wholeNumber((qtyMax as string).trim(), "qtyMax") : null;
      if (max !== null && min > max) throw bad("qtyMin cannot be greater than qtyMax");
      f.qty = [min, max];
    } else {
      const band = QTY[qty];
      if (!band) throw bad("invalid qty");
      f.qty = band;
    }
  }

  return f;
}

/** `page` and `pageSize`, clamped. Defaults 1 and 12, and 50 is the ceiling. */
export const PAGE_SIZE_DEFAULT = 12;
export const PAGE_SIZE_MAX = 50;

export function parsePaging(query: QueryLike): { page: number; pageSize: number } {
  const readInt = (key: string, fallback: number) => {
    const raw = readOne(query, key);
    if (raw === undefined || raw.trim() === "") return fallback;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : fallback;
  };
  return {
    page: Math.max(1, readInt("page", 1)),
    pageSize: Math.min(PAGE_SIZE_MAX, Math.max(1, readInt("pageSize", PAGE_SIZE_DEFAULT))),
  };
}

/* ------------------------------------------------- onto the service's type -- */

/**
 * A parsed query as the filter the property service takes.
 *
 * The two vocabularies stay separate on purpose. The query is a public
 * contract — `mode=buy`, `bhk=4plus` — and the service's filter is the
 * application's own shape. Mapping here means neither has to bend to the
 * other, and a change to one is a change to this function.
 */
export function toPropertySearchFilters(f: ParsedFilters): PropertySearchFilters {
  return {
    text: f.location,
    locationId: f.locality,
    transaction: f.mode ? MODE_TO_TRANSACTION[f.mode] : undefined,
    configurations: f.bhk && f.bhk !== "4plus" ? [f.bhk] : undefined,
    minBedrooms: f.bhk === "4plus" ? BHK_PLUS_FROM : undefined,
    minBudgetInr: f.budget?.[0],
    maxBudgetInr: f.budget?.[1] ?? undefined,
    budgetScale: f.budgetScale,
    minLeadsAvailable: f.qty?.[0],
    maxLeadsAvailable: f.qty?.[1] ?? undefined,
  };
}

/** Inclusive at both ends; a null upper bound is open-ended. */
export function inBand(value: number, [lo, hi]: Band): boolean {
  return value >= lo && (hi === null || value <= hi);
}

/* ------------------------------------------------------ the SQL this means -- */

/**
 * The same filter as a parameterised statement.
 *
 * kkl-web's public property search is served by the sample service today —
 * `services.properties` is the one domain `getServices()` never swaps for a
 * backend implementation — so nothing in this repository executes SQL. This
 * function exists so that the day kkl-backend serves the search, the query is
 * already written, already parameterised and already tested against the same
 * filter object the sample service matches on.
 *
 * Every value is a placeholder. There is no interpolation of caller input
 * anywhere in it, including the LIKE pattern, whose wildcards are escaped and
 * whose escape character is declared.
 *
 * The lead count is a correlated subquery rather than a denormalised column:
 * leads belong to an area, not to a listing, and a stored per-listing count
 * would be wrong the moment a lead is sold. See the delivery note.
 */
/** A lead count for the listing's area, as a scalar subquery. */
const LEAD_COUNT_SUBQUERY =
  "(SELECT count(*) FROM leads ld WHERE ld.area_id = l.area_id " +
  "AND ld.status IN ('listed','on_sale') AND ld.consent_status = 'granted')";

type Placeholder = (value: unknown) => string;

/** `col BETWEEN lo AND hi`, or `col >= lo` when the band is open-ended. */
function rangeClause(col: string, [lo, hi]: Band, p: Placeholder): string {
  return hi === null ? `${col} >= ${p(lo)}` : `${col} BETWEEN ${p(lo)} AND ${p(hi)}`;
}

/**
 * The WHERE clauses for a filter, every caller value as a placeholder.
 *
 * `%`, `_` and the escape character itself are escaped in the LIKE pattern,
 * so a search for "100%" is a search for the text and not for every row, and
 * the escape character is declared rather than assumed.
 */
function whereClauses(f: ParsedFilters, p: Placeholder, t = "l"): string[] {
  const where: string[] = [];
  if (f.location) {
    const pattern = `%${f.location.replace(/[\\%_]/g, "\\$&")}%`;
    where.push(`(${t}.locality ILIKE ${p(pattern)} ESCAPE '\\' OR ${t}.name ILIKE ${p(pattern)} ESCAPE '\\')`);
  }
  if (f.locality) where.push(`${t}.area_id = ${p(f.locality)}`);
  if (f.mode) where.push(`${t}.transaction = ${p(MODE_TO_TRANSACTION[f.mode])}`);
  if (f.bhk) {
    where.push(f.bhk === "4plus" ? `${t}.bedrooms >= ${p(BHK_PLUS_FROM)}` : `${t}.bedrooms = ${p(Number(f.bhk))}`);
  }
  if (f.budget) where.push(rangeClause(`${t}.price`, f.budget, p));
  if (f.qty) where.push(rangeClause(LEAD_COUNT_SUBQUERY, f.qty, p));
  return where;
}

/**
 * The same filter as a parameterised statement.
 *
 * kkl-web's public property search is served by the sample service today —
 * `services.properties` is the one domain `getServices()` never swaps for a
 * backend implementation — so nothing in this repository executes SQL. This
 * exists so that the day kkl-backend serves the search, the query is already
 * written, already parameterised and already tested against the same filter
 * object the sample service matches on.
 *
 * The lead count is a correlated subquery rather than a denormalised column:
 * leads belong to an area, not to a listing, and a stored per-listing count
 * would be wrong the moment a lead in that area is sold.
 *
 * Suggested indexes:
 *   CREATE INDEX ON listings (city, transaction, bedrooms, price);
 *   CREATE INDEX ON leads (area_id, status, consent_status);
 */
export function toSql(
  f: ParsedFilters,
  { limit = PAGE_SIZE_DEFAULT, offset = 0, city = "Kolkata" } = {},
): { text: string; values: unknown[] } {
  const values: unknown[] = [city];
  const p: Placeholder = (value) => {
    values.push(value);
    return `$${values.length}`;
  };
  const where = ["l.city = $1", ...whereClauses(f, p)];
  const limitAt = p(limit);
  const offsetAt = p(offset);
  return {
    text:
      "SELECT l.id, l.name, l.locality, l.transaction, l.bedrooms, l.price " +
      `FROM listings l WHERE ${where.join(" AND ")} ORDER BY l.id LIMIT ${limitAt} OFFSET ${offsetAt}`,
    values,
  };
}

/* ----------------------------------------------------------------- facets -- */

/**
 * The dropdowns that carry result counts, and what each one offers.
 *
 * The same list drives the control, the endpoint and the tests, so a count
 * can never be requested for an option the parser would refuse.
 */
export const FACET_KEYS = Object.freeze(["mode", "bhk", "budget", "qty"] as const);
export type FacetKey = (typeof FACET_KEYS)[number];

/**
 * The options each dropdown offers.
 *
 * Budget depends on the mode, because its bands are on a different scale for
 * a letting. Everything else is fixed.
 */
export function facetOptionsFor(mode: string | undefined): Readonly<Record<FacetKey, readonly string[]>> {
  return {
    mode: MODE_VALUES,
    bhk: BHK_VALUES,
    budget: Object.keys(budgetBandsFor(mode).bands),
    qty: Object.keys(QTY),
  };
}

/** The signed-out default: capital budget bands. */
export const FACET_OPTIONS: Readonly<Record<FacetKey, readonly string[]>> = Object.freeze(
  facetOptionsFor(undefined),
);

/**
 * One dropdown's counting job.
 *
 * `base` is every OTHER active filter — the count for its "any" row, and the
 * set each option is counted within. This is the rule that makes the numbers
 * useful: with Rent chosen, the BHK counts are counts of rent listings, but
 * the Buy/Rent counts still show both, because that dropdown's own filter is
 * the one being varied.
 */
export type FacetGroup = {
  readonly key: FacetKey;
  readonly base: PropertySearchFilters;
  readonly options: ReadonlyArray<{ readonly key: string; readonly filters: PropertySearchFilters }>;
};

/** The parsed filter with one dropdown cleared. */
export function withoutFacet(f: ParsedFilters, facet: FacetKey): ParsedFilters {
  const next: Record<string, unknown> = { ...f };
  delete next[facet];
  return next as ParsedFilters;
}

/** The parsed filter with one dropdown set to one of its options. */
export function withFacetOption(f: ParsedFilters, facet: FacetKey, key: string): ParsedFilters {
  const base = withoutFacet(f, facet);
  switch (facet) {
    case "mode":
      return { ...base, mode: key as "buy" | "rent" };
    case "bhk":
      return { ...base, bhk: key as (typeof BHK_VALUES)[number] };
    case "budget": {
      const { scale, bands } = budgetBandsFor(f.mode);
      return { ...base, budget: bands[key], budgetScale: scale };
    }
    case "qty":
      return { ...base, qty: QTY[key] };
    default:
      return base;
  }
}

/**
 * Everything the facets endpoint needs to count, as service-level filters.
 *
 * Built here rather than in the route so the counting rule is stated once and
 * tested without a service. The service's job is only to execute it — in one
 * pass per group, which is the shape `COUNT(*) FILTER (WHERE …)` takes.
 */
export function facetGroups(f: ParsedFilters): readonly FacetGroup[] {
  const options = facetOptionsFor(f.mode);
  return FACET_KEYS.map((key) => ({
    key,
    base: toPropertySearchFilters(withoutFacet(f, key)),
    options: options[key].map((option) => ({
      key: option,
      filters: toPropertySearchFilters(withFacetOption(f, key, option)),
    })),
  }));
}

/** The counts for one dropdown: `any`, then one per option. */
export type FacetCounts = Record<string, number | null>;

/**
 * The response shape, assembled from what the service counted.
 *
 * `qty.custom` is null rather than 0: a custom range has no preset to count,
 * and 0 would read as "no results", dimming a row that is perfectly usable.
 */
export function facetResponse(
  counts: Record<string, FacetCounts>,
): Record<FacetKey, FacetCounts> {
  const out = {} as Record<FacetKey, FacetCounts>;
  for (const key of FACET_KEYS) out[key] = { ...(counts[key] ?? {}) };
  if (out.qty) out.qty.custom = null;
  return out;
}

/**
 * The faceted counts as one statement per dropdown.
 *
 * Not executed here — see the note on `toSql`. It is the shape the user's
 * brief asks for, and it is written so that the day kkl-backend serves this,
 * every option's count comes from one pass over the index rather than from
 * one query per option.
 */
export function facetSql(f: ParsedFilters, facet: FacetKey, { city = "Kolkata" } = {}): {
  text: string;
  values: unknown[];
} {
  const others = withoutFacet(f, facet);
  const values: unknown[] = [city];
  const p = (value: unknown) => {
    values.push(value);
    return `$${values.length}`;
  };

  const clause = (key: FacetKey, option: string): string => {
    switch (key) {
      case "mode":
        return `l.transaction = ${p(MODE_TO_TRANSACTION[option])}`;
      case "bhk":
        return option === "4plus" ? `l.bedrooms >= ${p(BHK_PLUS_FROM)}` : `l.bedrooms = ${p(Number(option))}`;
      case "budget": {
        const band = BUDGET[option];
        return band ? rangeClause("l.price", band, p) : "FALSE";
      }
      case "qty": {
        const band = QTY[option];
        return band ? rangeClause(LEAD_COUNT_SUBQUERY, band, p) : "FALSE";
      }
      default:
        return "TRUE";
    }
  };

  const where = whereClauses(others, p, "l");
  const columns = [
    'COUNT(*) AS "any"',
    ...FACET_OPTIONS[facet].map((option) => `COUNT(*) FILTER (WHERE ${clause(facet, option)}) AS "${option}"`),
  ];
  return {
    text: `SELECT ${columns.join(", ")} FROM listings l WHERE ${["l.city = $1", ...where].join(" AND ")}`,
    values,
  };
}
