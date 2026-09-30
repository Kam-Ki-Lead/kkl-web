import type { LocationNode } from "@/lib/domain/types";
import { ServiceError } from "@/lib/services/contracts";
import type { LocationService } from "@/lib/services/contracts";
import { locationBackendConfig } from "./config";
import { isFrameworkSignal } from "./session";

/**
 * Slice B — location records served by kkl-backend.
 *
 * Reads are public there, so unlike the lead-request adapter this one carries
 * no session and no secret: the policy on `locations` returns active records
 * to anyone and retired ones only to staff, and the portal searches before
 * anybody has signed in.
 *
 * Ranking, subtree search and the composed "Action Area I, New Town" label all
 * happen in the database now. That is deliberate: the CR05 ordering was won by
 * a defect — typing "New Town" selected "Action Area I" because labels read
 * "<area>, <parent>" and matches were unordered — and a rule that has already
 * been got wrong once belongs in one place, not in each caller.
 *
 * When the backend cannot be reached these methods throw. They never return
 * the sample records instead.
 */

type BackendLocation = {
  id: string;
  parentId: string | null;
  kind: LocationNode["level"];
  name: string;
  status: "active" | "retired";
  label?: string;
};

type PathEntry = { id: string; name: string; kind: LocationNode["level"] };

/** What the service returns in one page; its own cap is the same number. */
const PAGE = 100;
/**
 * The point at which sending every area to the browser stops being sensible.
 * A city past it needs a picker that searches rather than one that filters,
 * and the log line above says so rather than letting records disappear.
 */
const MAX_AREA_OPTIONS = 2000;

const node = (row: BackendLocation): LocationNode => ({
  id: row.id,
  name: row.name,
  level: row.kind,
  parentId: row.parentId,
});

async function get<T>(path: string): Promise<T> {
  const { baseUrl } = locationBackendConfig();
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
  } catch (cause) {
    if (isFrameworkSignal(cause)) throw cause;
    console.error("[kkl-web] location service unreachable", cause);
    throw new ServiceError(
      "unavailable",
      "The location service is not responding. Location records come from kkl-backend and " +
        "are not served from this process.",
    );
  }
  if (response.status === 404) throw new ServiceError("not_found", "No such location.");
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new ServiceError("unavailable", body?.error ?? `Location service returned ${response.status}.`);
  }
  return (await response.json()) as T;
}

export const backendLocations: LocationService = {
  /**
   * The chain the portal shows above the city, read from the tree rather than
   * listed here: ask the launch city for its path and take everything down to
   * and including it.
   */
  async launchChain() {
    const { launchCityId } = locationBackendConfig();
    const city = await get<BackendLocation & { path: PathEntry[] }>(`/v1/locations/${launchCityId}`);
    return city.path.map((entry) => ({
      id: entry.id,
      name: entry.name,
      level: entry.kind,
      // The path is root-first, so each entry's parent is the one before it.
      parentId: city.path[city.path.indexOf(entry) - 1]?.id ?? null,
    }));
  },

  async children(parentId) {
    const { locations } = await get<{ locations: BackendLocation[] }>(
      `/v1/locations?parentId=${encodeURIComponent(parentId)}`,
    );
    return locations.map(node);
  },

  /**
   * Everything under the city, not only its direct children — Action Area I
   * sits under New Town — narrowed server-side by the query. The browser is
   * never the store of record, and with a few hundred localities it should not
   * be the filter either.
   */
  /**
   * A QUERY GETS THE BEST PAGE; NO QUERY GETS ALL OF THEM
   * With a query this is a search and one page of ranked matches is the
   * answer. Without one it is "every area in the city", which is what each
   * screen preloads and what the no-JavaScript select is built from — and
   * that has to be complete. It asked for 100 and Kolkata has more localities
   * than that, so forty of them were in no picker and in no select, with
   * nothing on screen to say a record had been left out. The service now
   * reports the total beside the page, so this pages to the end instead of
   * mistaking a page for the set.
   */
  async areaOptions({ cityId, query }) {
    const q = query?.trim() ?? "";
    const page = async (offset: number) => {
      const params = new URLSearchParams({
        under: cityId,
        limit: String(PAGE),
        offset: String(offset),
      });
      if (q) params.set("q", q);
      return get<{ locations: BackendLocation[]; total: number }>(
        `/v1/locations/search?${params.toString()}`,
      );
    };

    const first = await page(0);
    const rows = [...first.locations];
    if (!q) {
      // Bounded: a city with more areas than this is a data problem to be
      // seen, not a loop to be run. The count says what was left out.
      for (
        let at = rows.length;
        at < first.total && rows.length < MAX_AREA_OPTIONS && first.locations.length;
        at += PAGE
      ) {
        const next = await page(at);
        if (!next.locations.length) break;
        rows.push(...next.locations);
      }
      if (rows.length < first.total) {
        console.warn(
          `[kkl-web] ${first.total} areas under ${cityId}, showing ${rows.length}. `
            + `The picker cannot offer the rest and the no-JavaScript select does not carry them.`,
        );
      }
    }
    return rows.map((row) => ({ id: row.id, label: row.label ?? row.name }));
  },

  /** City-first, matching the approved baseline's paths: country and state are not shown. */
  async displayPath(locationId) {
    try {
      const found = await get<BackendLocation & { path: PathEntry[] }>(
        `/v1/locations/${encodeURIComponent(locationId)}`,
      );
      return found.path
        .filter((entry) => entry.kind === "city" || entry.kind === "locality" || entry.kind === "sub_locality")
        .map((entry) => entry.name);
    } catch (error) {
      if (error instanceof ServiceError && error.kind === "not_found") return [];
      throw error;
    }
  },

  /** Unknown ids are omitted by the backend, never invented, and not by this adapter either. */
  async getMany(ids) {
    const wanted = ids.filter((id) => id.trim() !== "");
    if (wanted.length === 0) return [];
    const { locations } = await get<{ locations: BackendLocation[] }>(
      `/v1/locations/resolve?ids=${wanted.map(encodeURIComponent).join(",")}`,
    );
    return locations.map(node);
  },
};
