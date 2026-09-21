"use server";

import { getServices } from "@/lib/services";
import type { PropertySearchFilters } from "@/lib/domain/types";

/**
 * Backs the homepage search card's live count ("Results update as you change a
 * field"). The count is computed by the service, not guessed in the browser, so
 * the number on the button is the number the search will return.
 */
export async function countMatchingProperties(
  filters: PropertySearchFilters,
): Promise<number> {
  return getServices().properties.countMatching(filters);
}
