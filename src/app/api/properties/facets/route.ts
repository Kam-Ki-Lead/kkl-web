import { NextResponse } from "next/server";
import { getServices } from "@/lib/services";
import {
  facetGroups,
  facetResponse,
  parseFilters,
  toPropertySearchFilters,
} from "@/lib/domain/property-filters";
import { problem } from "../count/route";

/**
 * GET /api/properties/facets -> { total, facets: { mode, bhk, budget, qty } }
 *
 * One request feeds the whole bar: the number on the Search button and the
 * count beside every option of every dropdown.
 *
 * THE COUNTING RULE
 *
 * Each dropdown's counts are computed with its own filter removed and every
 * other active filter kept. So with Rent chosen, the BHK counts are counts of
 * rent listings, while the Buy/Rent counts still show both — otherwise
 * choosing Rent would make the Buy row read 0 and the control would look
 * broken rather than informative. `any` is the count with that dropdown
 * cleared; `total` applies everything.
 *
 * It runs on every field change, so the service answers all of it in one
 * call — one pass per dropdown, not one per option.
 */
export const dynamic = "force-dynamic";

/**
 * A short shared cache, keyed by the normalised query.
 *
 * Next keys the route cache on the full URL, so parameters in a different
 * order would be two entries for one question. Sorting them first means a
 * burst of keystrokes that lands on the same filter set is one computation.
 * Five seconds: long enough to absorb typing, short enough that a newly
 * published listing shows up while somebody is still on the page.
 */
const CACHE_CONTROL = "public, max-age=0, s-maxage=5, stale-while-revalidate=20";

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams;
    const filters = parseFilters(query);

    const { total, facets } = await getServices().properties.facetCounts({
      total: toPropertySearchFilters(filters),
      groups: facetGroups(filters),
    });

    return NextResponse.json(
      { total, facets: facetResponse(facets) },
      { headers: { "cache-control": CACHE_CONTROL, vary: "accept-encoding" } },
    );
  } catch (error) {
    return problem(error);
  }
}
