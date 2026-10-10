import { NextResponse } from "next/server";
import { getServices } from "@/lib/services";
import {
  FilterError,
  parseFilters,
  toPropertySearchFilters,
} from "@/lib/domain/property-filters";

/**
 * GET /api/properties/count -> { count }
 *
 * Backs the hero bar's live "Search N". It is called on every keystroke and
 * every select change, debounced, so it does the least work that can answer:
 * a count, no rows, no media, no paging.
 *
 * Why a route handler and not the server action this card used before: the
 * bar cancels a stale request with an AbortController when the next keystroke
 * arrives. A server action cannot be cancelled, so the old card's count could
 * be overwritten by a slower earlier request — the classic out-of-order
 * autocomplete bug. An HTTP request can be aborted, so it is one.
 *
 * Public and unauthenticated by design: it counts published listings, which
 * are public. It reveals nothing a visitor cannot see by pressing Search.
 */
export const dynamic = "force-dynamic";

/**
 * A short shared cache.
 *
 * The count moves only when inventory changes, and the same handful of filter
 * combinations are requested constantly while somebody types. Ten seconds is
 * long enough to absorb a burst of keystrokes and short enough that a newly
 * published listing appears while the visitor is still on the page.
 */
const CACHE_CONTROL = "public, max-age=0, s-maxage=10, stale-while-revalidate=30";

export async function GET(request: Request) {
  try {
    const filters = parseFilters(new URL(request.url).searchParams);
    const count = await getServices().properties.countMatching(
      toPropertySearchFilters(filters),
    );
    return NextResponse.json({ count }, { headers: { "cache-control": CACHE_CONTROL } });
  } catch (error) {
    return problem(error);
  }
}

/**
 * The caller's mistake, named; anything else, not.
 *
 * A `FilterError` is a message somebody can act on ("invalid bhk"). Anything
 * else is ours, and saying so in detail would hand a stranger the shape of
 * the inside of the application, so it is logged here and generic there.
 */
export function problem(error: unknown): NextResponse {
  if (error instanceof FilterError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("[kkl-web] property search failed", error);
  return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}
