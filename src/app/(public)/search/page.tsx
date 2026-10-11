import { Suspense } from "react";
import type { Metadata } from "next";
import { getServices } from "@/lib/services";
import type { PropertySearchFilters, PropertySortKey } from "@/lib/domain/types";
import { PropertyCard } from "@/components/property/property-card";
import { SearchFilters, SearchSort } from "@/components/search/search-filters";
import { propertySearchFilters } from "@/lib/domain/property-search-query";
import {
  budgetBandsFor,
  FilterError,
  parseFilters,
  toPropertySearchFilters,
} from "@/lib/domain/property-filters";
import { ButtonLink } from "@/components/ui/button";
import { SkeletonBlock, SkeletonRows, StateMessage } from "@/components/ui/states";

export const metadata: Metadata = { title: "Search properties" };

type SearchParams = Record<string, string | string[] | undefined>;

const BUDGET_BANDS: Record<string, { min?: number; max?: number }> = {
  "Up to ₹50L": { max: 5_000_000 },
  "Up to ₹1Cr": { max: 10_000_000 },
  "Up to ₹1.5Cr": { max: 15_000_000 },
  "₹1.5Cr and above": { min: 15_000_000 },
};

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * The hero bar's parameters, layered over this page's own.
 *
 * The bar speaks the endpoints' vocabulary — `mode`, `bhk`, `budget` as a
 * band token, and the quantity trio — because that is the published contract
 * and the same module parses both. This page's filter row speaks its own,
 * older set, and links to it exist.
 *
 * So these are layered, not chosen between: the legacy reading runs first,
 * then any bar parameter that is actually present overrides it. Choosing one
 * reading wholesale dropped `transaction` from `/search?locality=x&transaction=rent`,
 * because that link carries one name from each set.
 *
 * A malformed bar parameter is not an error page. The endpoints answer 400,
 * because a caller can fix the request; somebody arriving from a stale
 * bookmark is better served by results than by validation text, so an
 * unparseable set is simply not layered.
 */
const BAR_PARAMS = ["location", "mode", "bhk", "qty", "qtyMin", "qtyMax"] as const;

function barFilters(params: SearchParams): PropertySearchFilters | null {
  const present: Record<string, string | string[] | undefined> = {};
  for (const key of BAR_PARAMS) {
    if (params[key] !== undefined) present[key] = params[key];
  }
  // `budget` is shared: the bar sends a band token, the filter row sends a
  // label. Only a token belongs to the bar's reading — and which tokens are
  // valid depends on the mode, because a letting's bands are monthly. Looking
  // only in the sale bands dropped `?mode=rent&budget=20k-40k` on the floor,
  // so the page returned every letting while the button said six.
  const budget = one(params.budget);
  if (budget && budgetBandsFor(one(params.mode)).bands[budget]) present.budget = budget;
  // `locality` is shared too, and means the same thing in both, so it is left
  // to the legacy reading rather than parsed twice.

  if (Object.keys(present).length === 0) return null;
  try {
    return toPropertySearchFilters(parseFilters(present));
  } catch (error) {
    if (error instanceof FilterError) return null;
    throw error;
  }
}

/** Only the keys a filter actually set, so a layer cannot blank one below it. */
function defined(filters: PropertySearchFilters): Partial<PropertySearchFilters> {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined),
  );
}

function toFilters(params: SearchParams): PropertySearchFilters {
  const budget = BUDGET_BANDS[one(params.budget) ?? ""] ?? {};
  const possession = one(params.possession);

  const legacy: PropertySearchFilters = {
    // Shared with the homepage card, so the count it shows and the results
    // this page returns can never come from different filters.
    ...propertySearchFilters({
      locality: one(params.locality),
      transaction: one(params.transaction),
      bhk: one(params.bhk),
      budget: { min: budget.min, max: budget.max },
    }),
    // `q` is the header search panel's parameter.
    text: one(params.q)?.trim() || undefined,
    propertyType: one(params.type),
    ...possessionFilters(possession),
  };

  const bar = barFilters(params);
  return bar ? { ...legacy, ...defined(bar) } : legacy;
}

/** The possession control, shared by both readings above. */
function possessionFilters(possession: string | undefined): PropertySearchFilters {
  return {
    construction:
      possession === "ready"
        ? "ready_to_move"
        : possession === "under_construction"
          ? "under_construction"
          : undefined,
    newLaunchOnly: possession === "new_launch" ? true : undefined,
  };
}

/** P-02 — search results. */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const services = getServices();
  // The picker's options are the launch city's area records (CR05), fetched
  // through the location service — not a list this page maintains.
  const areas = await services.locations.areaOptions({ cityId: "in-wb-kol" });

  const localityName = areas.find((l) => l.id === one(params.locality))?.label;

  return (
    <div className="mx-auto box-content max-w-[1280px] px-[32px] pb-[40px] pt-[24px] max-[1060px]:px-[18px]">
      <h1 className="t-title text-ink">
        Properties in {localityName ?? "Kolkata"}
      </h1>
      <p className="t-caption mt-[6px] max-w-[90ch] text-muted">
        A project matches a budget band when any unit in its published price range falls inside
        it.
      </p>

      <div className="mt-[18px]">
        <Suspense fallback={<SkeletonBlock className="h-[180px]" />}>
          <SearchFilters areas={areas} />
        </Suspense>
      </div>

      <Suspense key={JSON.stringify(params)} fallback={<ResultsLoading />}>
        <Results params={params} />
      </Suspense>
    </div>
  );
}

async function Results({ params }: { params: SearchParams }) {
  const services = getServices();
  const sortParam = one(params.sort);
  const sort: PropertySortKey =
    sortParam === "price_asc" || sortParam === "price_desc" || sortParam === "newest"
      ? sortParam
      : "relevance";

  const page = Number(one(params.page) ?? "1") || 1;

  let result;
  try {
    result = await services.properties.search({ filters: toFilters(params), sort, page });
  } catch {
    return (
      <div className="mt-[20px]">
        <StateMessage
          tone="error"
          title="We could not load these results"
          action={
            <ButtonLink href="/search" variant="secondary" size="sm">
              Try again
            </ButtonLink>
          }
        >
          Nothing about your search was lost. Reloading usually resolves it.
        </StateMessage>
      </div>
    );
  }

  const { items, total, pageSize } = result;
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <>
      <div className="mt-[20px] flex flex-wrap items-center justify-between gap-[12px]">
        <p className="text-[16px] text-body">
          <strong className="text-ink">{total}</strong> {total === 1 ? "property" : "properties"}
        </p>
        <Suspense fallback={null}>
          <SearchSort />
        </Suspense>
      </div>

      {items.length === 0 ? (
        <div className="mt-[18px]">
          <StateMessage
            title="No properties match these filters"
            action={
              <ButtonLink href="/search" size="sm">
                Clear filters
              </ButtonLink>
            }
          >
            The combination of location, configuration and budget you chose has no published
            listings. Widening the budget band or choosing a nearby locality usually helps.
          </StateMessage>
        </div>
      ) : (
        <>
          <div className="mt-[18px] grid grid-cols-3 gap-[18px] max-[900px]:grid-cols-2 max-[560px]:grid-cols-1">
            {items.map((property) => (
              <PropertyCard key={property.id} property={property} actions="buttons" />
            ))}
          </div>
          <p className="t-caption mt-[20px] text-center text-muted">
            Showing {first}–{last} of {total}
          </p>
        </>
      )}
    </>
  );
}

function ResultsLoading() {
  return (
    <div className="mt-[20px]">
      <p className="t-caption text-muted">Results loading…</p>
      <div className="mt-[18px] grid grid-cols-3 gap-[18px] max-[900px]:grid-cols-2 max-[560px]:grid-cols-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className="overflow-hidden rounded-[12px] border border-line bg-white">
            <SkeletonBlock className="aspect-[4/3] rounded-none" />
            <div className="p-[14px]">
              <SkeletonRows rows={3} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
