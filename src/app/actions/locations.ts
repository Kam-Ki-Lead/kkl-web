"use server";

import { getServices } from "@/lib/services";

/**
 * Area lookup for the picker (CR05).
 *
 * WHY THIS EXISTS
 * Every screen with an area picker preloads a page of areas and the combobox
 * filters that page in the browser. On the sample records — a few dozen
 * localities — the page held all of them and the filtering was the whole
 * story. It is not: the preload asks for 100, and Kolkata has more localities
 * than that. A record past the hundredth was unreachable through the picker
 * and missing from the no-JavaScript select, silently, with "No area matches
 * — check the spelling" as the only explanation offered.
 *
 * So typing now also asks the service, which ranks across every record rather
 * than the page the screen happened to receive. The preloaded set stays: it
 * is what renders before the first keystroke, what the no-JavaScript fallback
 * offers, and what the list falls back to if this lookup fails.
 *
 * It reads active location records, which are public on kkl-backend — no
 * account data passes through here and none is returned.
 */
export async function searchAreas(
  query: string,
): Promise<readonly { id: string; label: string }[]> {
  const q = String(query ?? "").trim();
  if (q.length < 2) return [];
  return getServices().locations.areaOptions({ cityId: "in-wb-kol", query: q });
}
