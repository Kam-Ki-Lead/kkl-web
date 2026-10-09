/**
 * The property search's query string, in one place.
 *
 * WHY THIS EXISTS
 *
 * The homepage card carried a "Search type" box that sat in the row with the
 * real fields, looked like a control, and filtered nothing — it was a styled
 * `div` that only ever displayed which tab you were on. It was reported as
 * "the Search type is not working", which was exactly right.
 *
 * The lesson is not that it needed a better label. It is that a control on
 * that card has to reach a filter. So the card, the results page and the
 * filter bar now all read and write the query string through this module,
 * and `PROPERTY_SEARCH_CONTROLS` names every control the search honours.
 * A field that is not in that list has nothing to do on the card.
 *
 * It is pure, so the mapping can be tested without a browser or a service.
 */

import type { PropertySearchFilters, PropertyTransaction } from "./types";

/** Budget labels, and the range each one means. Shared with the results page. */
export type BudgetBand = { readonly min?: number; readonly max?: number };

/**
 * Every control the property search actually honours.
 *
 * Keep this list and the card's fields the same. If something belongs on the
 * card but not here, it filters nothing and should not be drawn as a field.
 */
export const PROPERTY_SEARCH_CONTROLS = Object.freeze([
  "locality",
  "transaction",
  "bhk",
  "budget",
] as const);

/**
 * The buy/rent control's options.
 *
 * The empty value is a real choice — "either" — not a prompt to pick one.
 * Most people searching do not want to rule either out.
 */
export const TRANSACTION_OPTIONS: ReadonlyArray<{ value: string; label: string }> =
  Object.freeze([
    { value: "", label: "Buy or rent" },
    { value: "sale", label: "Buy" },
    { value: "rent", label: "Rent" },
  ]);

/** Buy or rent, as the record holds it. */
export function readTransaction(value: string | null | undefined): PropertyTransaction | undefined {
  // Only the two values a listing can carry. Anything else is "no
  // preference", not a filter that matches nothing.
  return value === "sale" || value === "rent" ? value : undefined;
}

/** What the homepage card holds when somebody presses Search. */
export type PropertySearch = {
  /** A location record id, or "" for the whole city. */
  readonly locality: string;
  /** "sale", "rent", or "" for either. */
  readonly transaction: string;
  /** The BHK count as digits ("3"), or "" for any. */
  readonly bhk: string;
  /** A budget band label, or the "any" label. */
  readonly budget: string;
  /** The label that means no budget preference. */
  readonly anyBudgetLabel: string;
};

/** The query pairs for a search. Only fields that narrow anything appear. */
export function propertySearchParams(search: PropertySearch): Array<[string, string]> {
  const params: Array<[string, string]> = [];
  const locality = search.locality.trim();
  const transaction = readTransaction(search.transaction.trim());
  const bhk = search.bhk.trim();
  const budget = search.budget.trim();

  if (locality) params.push(["locality", locality]);
  if (transaction) params.push(["transaction", transaction]);
  if (bhk) params.push(["bhk", bhk]);
  if (budget && budget !== search.anyBudgetLabel) params.push(["budget", budget]);
  return params;
}

/** Where Search sends somebody. */
export function propertySearchHref(search: PropertySearch): string {
  const query = new URLSearchParams(propertySearchParams(search)).toString();
  return query ? `/search?${query}` : "/search";
}

/**
 * The filters a set of query values means.
 *
 * The results page and the live count on the card both go through this, so a
 * count can never be computed from different filters than the results.
 */
export function propertySearchFilters(input: {
  readonly locality?: string;
  readonly transaction?: string;
  readonly bhk?: string;
  readonly budget?: BudgetBand;
}): PropertySearchFilters {
  const bhk = input.bhk?.trim();
  return {
    locationId: input.locality?.trim() || undefined,
    transaction: readTransaction(input.transaction),
    configurations: bhk ? [bhk] : undefined,
    minBudgetInr: input.budget?.min,
    maxBudgetInr: input.budget?.max,
  };
}
