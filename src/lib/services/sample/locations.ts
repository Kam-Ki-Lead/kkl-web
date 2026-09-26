import type { LocationNode } from "@/lib/domain/types";

/**
 * The launch location records (CR05): India → West Bengal → Kolkata → Area.
 *
 * This module is the one place location records live in the sample build.
 * Components never carry their own city or locality lists: they ask the
 * location service, which reads these records, so adding a state, city or
 * locality is a record edit here — not a change scattered across screens.
 *
 * Identifiers are stable. The six areas the approved baseline already used
 * keep their original ids (`new-town`, `rajarhat`, `salt-lake`,
 * `action-area-i` to `iii`) because URLs, saved filters and tests already
 * refer to them; a "stable identifier" that changes is not one.
 *
 * The client specification asks for a searchable picker over a hundred-plus
 * Kolkata localities. The sample carries a representative launch set; the
 * durable record set — and who may maintain it — is a kkl-backend
 * responsibility recorded in service-contract.md (decision 8 of the change
 * confirmation is open). Nothing here is the full list, and nothing in the
 * frontend assumes how many records exist.
 */

const COUNTRY: LocationNode = {
  id: "in",
  name: "India",
  level: "country",
  parentId: null,
};

const STATE: LocationNode = {
  id: "in-wb",
  name: "West Bengal",
  level: "state",
  parentId: COUNTRY.id,
};

const CITY: LocationNode = {
  id: "in-wb-kol",
  name: "Kolkata",
  level: "city",
  parentId: STATE.id,
};

/** Localities directly under Kolkata. Ids are slugs; names are display text. */
const LOCALITIES: ReadonlyArray<readonly [id: string, name: string]> = [
  // The three the approved baseline already used — ids unchanged.
  ["new-town", "New Town"],
  ["rajarhat", "Rajarhat"],
  ["salt-lake", "Salt Lake"],
  // The wider launch set, alphabetical.
  ["alipore", "Alipore"],
  ["ballygunge", "Ballygunge"],
  ["bansdroni", "Bansdroni"],
  ["baranagar", "Baranagar"],
  ["baruipur", "Baruipur"],
  ["behala", "Behala"],
  ["belgachia", "Belgachia"],
  ["beliaghata", "Beliaghata"],
  ["bhawanipur", "Bhawanipur"],
  ["bowbazar", "Bowbazar"],
  ["burrabazar", "Burrabazar"],
  ["chetla", "Chetla"],
  ["cossipore", "Cossipore"],
  ["dum-dum", "Dum Dum"],
  ["entally", "Entally"],
  ["esplanade", "Esplanade"],
  ["garia", "Garia"],
  ["gariahat", "Gariahat"],
  ["golf-green", "Golf Green"],
  ["hastings", "Hastings"],
  ["jadavpur", "Jadavpur"],
  ["jorasanko", "Jorasanko"],
  ["kalighat", "Kalighat"],
  ["kankurgachi", "Kankurgachi"],
  ["kasba", "Kasba"],
  ["kestopur", "Kestopur"],
  ["khidirpur", "Khidirpur"],
  ["kidderpore", "Kidderpore"],
  ["lake-gardens", "Lake Gardens"],
  ["lake-town", "Lake Town"],
  ["madhyamgram", "Madhyamgram"],
  ["maniktala", "Maniktala"],
  ["metiabruz", "Metiabruz"],
  ["new-alipore", "New Alipore"],
  ["paikpara", "Paikpara"],
  ["park-circus", "Park Circus"],
  ["park-street", "Park Street"],
  ["phoolbagan", "Phoolbagan"],
  ["rajabazar", "Rajabazar"],
  ["regent-park", "Regent Park"],
  ["santoshpur", "Santoshpur"],
  ["sealdah", "Sealdah"],
  ["shyambazar", "Shyambazar"],
  ["sinthee", "Sinthee"],
  ["sonarpur", "Sonarpur"],
  ["southern-avenue", "Southern Avenue"],
  ["tangra", "Tangra"],
  ["tollygunge", "Tollygunge"],
  ["ultadanga", "Ultadanga"],
];

/** Sub-localities — the Action Areas sit inside New Town. */
const SUB_LOCALITIES: ReadonlyArray<readonly [id: string, name: string, parent: string]> = [
  ["action-area-i", "Action Area I", "new-town"],
  ["action-area-ii", "Action Area II", "new-town"],
  ["action-area-iii", "Action Area III", "new-town"],
];

export const LOCATION_RECORDS: readonly LocationNode[] = [
  COUNTRY,
  STATE,
  CITY,
  ...LOCALITIES.map(
    ([id, name]): LocationNode => ({
      id,
      name,
      level: "locality",
      parentId: CITY.id,
    }),
  ),
  ...SUB_LOCALITIES.map(
    ([id, name, parent]): LocationNode => ({
      id,
      name,
      level: "sub_locality",
      parentId: parent,
    }),
  ),
];

/**
 * The six areas the approved homepage (P-01) features in its browse-by-locality
 * grid. Featuring is presentation, not data: the search pickers offer every
 * area, and this list exists only so the approved grid keeps its shape.
 */
export const FEATURED_AREA_IDS: readonly string[] = [
  "new-town",
  "rajarhat",
  "salt-lake",
  "action-area-i",
  "action-area-ii",
  "action-area-iii",
];

const BY_ID = new Map(LOCATION_RECORDS.map((node) => [node.id, node]));

/** The launch city. State and city selection depend on it via `childrenOf`. */
export const LAUNCH_CITY_ID = CITY.id;

export function getLocation(id: string): LocationNode | null {
  return BY_ID.get(id) ?? null;
}

/** Direct children of a node — states of a country, cities of a state, areas of a city. */
export function childrenOf(parentId: string): readonly LocationNode[] {
  return LOCATION_RECORDS.filter((node) => node.parentId === parentId);
}

/**
 * Every selectable area under a city: its localities and their sub-localities,
 * sorted by name. Areas are what pickers offer; country, state and city are
 * the dependent chain above them.
 */
export function areasOfCity(cityId: string): readonly LocationNode[] {
  const localities = childrenOf(cityId).filter((n) => n.level === "locality");
  const subLocalities = localities.flatMap((l) => childrenOf(l.id));
  return [...localities, ...subLocalities].sort((a, b) => a.name.localeCompare(b.name));
}

/** Case-insensitive name search across a city's areas. Empty query returns all. */
export function searchAreas(cityId: string, query: string): readonly LocationNode[] {
  const all = areasOfCity(cityId);
  const q = query.trim().toLowerCase();
  if (!q) return all;
  return all.filter((area) => area.name.toLowerCase().includes(q));
}

/**
 * The display path of names, city-first: `["Kolkata", "New Town", "Action Area I"]`.
 *
 * Country and state are part of the record chain but not of the display path —
 * every screen in the launch scope renders from the city down, and the
 * approved baseline's paths have exactly this shape.
 */
export function displayPath(id: string): readonly string[] {
  const names: string[] = [];
  let node = BY_ID.get(id) ?? null;
  while (node) {
    if (node.level === "city" || node.level === "locality" || node.level === "sub_locality") {
      names.unshift(node.name);
    }
    node = node.parentId ? (BY_ID.get(node.parentId) ?? null) : null;
  }
  return names;
}

/**
 * True when `id` is `ancestorId` or sits below it. Selecting "New Town"
 * includes the Action Areas; selecting an Action Area includes only itself.
 */
export function isWithin(id: string, ancestorId: string): boolean {
  let node = BY_ID.get(id) ?? null;
  while (node) {
    if (node.id === ancestorId) return true;
    node = node.parentId ? (BY_ID.get(node.parentId) ?? null) : null;
  }
  return false;
}

/**
 * Resolves a stored area *name* to its record id, or null when no area carries
 * it. Exists for values recorded before ids were stored (a Builder listing
 * draft's locality, for instance); new writes store ids.
 */
export function areaIdForName(name: string): string | null {
  const wanted = name.trim().toLowerCase();
  const match = areasOfCity(CITY.id).find((area) => area.name.toLowerCase() === wanted);
  return match?.id ?? null;
}

/**
 * The filter options for a set of areas: each area, plus the parent locality
 * of any sub-locality (choosing "New Town" must be possible when the leads
 * sit in its Action Areas), sorted by name. Derived from records, never
 * written by hand — a hand-written list drifts from the data, and one did.
 */
export function areaOptionsFor(
  locationIds: readonly string[],
): ReadonlyArray<{ readonly id: string; readonly name: string; readonly label: string }> {
  const ids = new Set<string>();
  for (const id of locationIds) {
    const node = BY_ID.get(id);
    if (!node) continue;
    ids.add(node.id);
    if (node.level === "sub_locality" && node.parentId) ids.add(node.parentId);
  }
  return [...ids]
    .map((id) => BY_ID.get(id))
    .filter((n): n is LocationNode => n !== undefined)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((n) => ({ id: n.id, name: n.name, label: areaLabel(n.id) }));
}

/**
 * How an area reads in a picker: the deepest two segments, nearest first —
 * "Action Area I, New Town", "New Town, Kolkata", "Alipore, Kolkata".
 */
export function areaLabel(id: string): string {
  const path = displayPath(id);
  return path.slice(-2).reverse().join(", ");
}
