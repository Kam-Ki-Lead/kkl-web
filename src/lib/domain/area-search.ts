/**
 * Ranking areas against what somebody typed.
 *
 * WHY THIS IS RANKED AND NOT MERELY FILTERED
 *
 * An area's label is "<area>, <parent>" — "Action Area I, New Town". So a
 * substring match on "new town" hits the three Action Areas, whose labels all
 * end in it, as well as New Town itself. Unordered, the first Action Area was
 * highlighted, so typing a locality's own name and pressing Enter selected
 * one of its sub-localities instead. An exact label sorts first, then a label
 * the query starts, then anything that merely contains it.
 *
 * Extracted so the homepage bar's Location dropdown and the area picker used
 * on the filter row and the posting forms rank identically. Two orderings for
 * one list of records is how "the same search gave me a different first
 * result over there" starts.
 *
 * Pure: no React, no DOM, no service.
 */

export type Area = {
  readonly id: string;
  readonly label: string;
};

/**
 * The preloaded page merged with whatever the service found.
 *
 * The preloaded entry wins a collision. It is the same record either way, and
 * taking one side consistently stops the list reordering under the cursor
 * when a lookup lands.
 */
export function mergeAreas(
  preloaded: readonly Area[],
  found: readonly Area[],
): readonly Area[] {
  if (found.length === 0) return preloaded;
  return [...preloaded, ...found.filter((f) => !preloaded.some((a) => a.id === f.id))];
}

/** The areas matching a query, best first. */
export function rankAreas(pool: readonly Area[], query: string): readonly Area[] {
  const q = query.trim().toLowerCase();
  return pool
    .filter((area) => area.label.toLowerCase().includes(q))
    .map((area) => {
      const label = area.label.toLowerCase();
      return { area, rank: label === q ? 0 : label.startsWith(q) ? 1 : 2 };
    })
    .sort((x, y) => x.rank - y.rank || x.area.label.localeCompare(y.area.label))
    .map((m) => m.area);
}

/**
 * The options a picker shows: the ranked matches, with the "everything"
 * choice first — but only while nothing is typed.
 *
 * "All of Kolkata" is not an answer to "rajar". Leaving it in the list while
 * somebody is narrowing means the first row, the one Enter takes, is the one
 * that clears their filter.
 */
export function areaOptionsFor(
  pool: readonly Area[],
  query: string,
  allLabel?: string,
): readonly Area[] {
  const matches = rankAreas(pool, query);
  const showAll = allLabel !== undefined && query.trim() === "";
  return showAll ? [{ id: "", label: allLabel }, ...matches] : matches;
}

/** The label for a chosen area id, or the "everything" label for "". */
export function areaLabel(
  id: string,
  pool: readonly Area[],
  allLabel = "",
): string {
  if (id === "") return allLabel;
  return pool.find((area) => area.id === id)?.label ?? "";
}

/** Below this many characters, asking the service is not worth a round trip. */
export const AREA_QUERY_MIN = 2;
