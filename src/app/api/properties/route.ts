import { NextResponse } from "next/server";
import { getServices } from "@/lib/services";
import {
  PAGE_PARAMS,
  parseFilters,
  parsePaging,
  toPropertySearchFilters,
} from "@/lib/domain/property-filters";
import { problem } from "./count/route";

/**
 * GET /api/properties -> { total, page, pageSize, items }
 *
 * The same filters as the count endpoint, through the same module, so the
 * number on the Search button and the rows behind it can never disagree.
 *
 * `page` defaults to 1 and `pageSize` to 12, capped at 50 — a cap rather than
 * a suggestion, so this cannot be turned into a bulk export of the listing
 * table by asking for a large page.
 *
 * Not cached. Unlike the count, each call here is a distinct page and the
 * payload is large enough that a shared cache would hold little and help less.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams;
    const filters = parseFilters(query, { allow: PAGE_PARAMS });
    const { page, pageSize } = parsePaging(query);

    const result = await getServices().properties.search({
      filters: toPropertySearchFilters(filters),
      sort: "relevance",
      page,
      pageSize,
    });

    return NextResponse.json({
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      items: result.items,
    });
  } catch (error) {
    return problem(error);
  }
}
