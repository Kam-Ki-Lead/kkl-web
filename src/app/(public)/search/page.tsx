import { Suspense } from "react";
import type { Metadata } from "next";
import { getServices } from "@/lib/services";
import type { PropertySearchFilters, PropertySortKey } from "@/lib/domain/types";
import { PropertyCard } from "@/components/property/property-card";
import { SearchFilters, SearchSort } from "@/components/search/search-filters";
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

function toFilters(params: SearchParams): PropertySearchFilters {
  const budget = BUDGET_BANDS[one(params.budget) ?? ""] ?? {};
  const possession = one(params.possession);
  const bhk = one(params.bhk);

  return {
    locationId: one(params.locality),
    propertyType: one(params.type),
    configurations: bhk ? [bhk] : undefined,
    minBudgetInr: budget.min,
    maxBudgetInr: budget.max,
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
  const localities = (await services.properties.getHomepage()).localities;

  const localityName = localities.find((l) => l.id === one(params.locality))?.name;

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
          <SearchFilters localities={localities} />
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
