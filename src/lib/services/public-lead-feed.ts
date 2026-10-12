import { isFrameworkSignal } from "@/lib/services/backend/session";
import { authBackendBaseUrl, marketplaceStoreKind } from "@/lib/services/backend/config";
import { readFeaturedLeadFeed } from "@/lib/domain/featured-leads";
import {
  fromFeaturedLead,
  fromMarketplaceLead,
  type PublicLead,
} from "@/lib/domain/public-leads";
import { getServices } from "@/lib/services";

/**
 * The leads a signed-out visitor may see, whichever store this server runs.
 *
 * TWO SOURCES, ONE SHAPE
 *
 * With the marketplace switched to kkl-backend, this reads the PUBLIC feed —
 * `/v1/leads/featured`, the unauthenticated endpoint built for exactly this.
 * It does not call the console's lead service: that one answers as a signed-in
 * account, and a public page has none, so asking would either fail or, worse,
 * succeed as somebody.
 *
 * With the switch off, it reads the sample marketplace, which is what every
 * other screen on such a server does, and the review banner already says so.
 *
 * Both are narrowed to `PublicLead` before they leave here.
 *
 * KNOWN LIMIT, WORTH THE CLIENT KNOWING
 *
 * The public feed takes `limit` and `offset` and no filters, so the board
 * filters the page it fetched rather than the whole marketplace. That is fine
 * at today's volume and wrong at ten thousand leads; the fix is filter
 * parameters on `/v1/leads/featured`, not filtering in the browser. `hasMore`
 * is returned so the page can say when there is inventory beyond the fetch.
 */
export type PublicLeadFeed = {
  readonly leads: readonly PublicLead[];
  /** True when the source holds more than this fetch returned. */
  readonly hasMore: boolean;
  /** "sample" or "backend" — what the page is looking at. */
  readonly source: "sample" | "backend";
  /** Set when the configured source could not be read at all. */
  readonly unavailable: boolean;
};

/** One fetch, capped. Beyond this the board needs server-side filtering. */
const FETCH_LIMIT = 60;

export async function readPublicLeadFeed(): Promise<PublicLeadFeed> {
  if (marketplaceStoreKind() !== "backend") {
    const page = await getServices().leadMarket.list({ sort: "newest" });
    return {
      leads: page.leads.map(fromMarketplaceLead),
      hasMore: page.total > page.leads.length,
      source: "sample",
      unavailable: false,
    };
  }

  try {
    const response = await fetch(
      `${authBackendBaseUrl()}/v1/leads/featured?limit=${FETCH_LIMIT}`,
      { cache: "no-store", signal: AbortSignal.timeout(8000) },
    );
    if (!response.ok) return EMPTY;
    const feed = readFeaturedLeadFeed(await response.json());
    if (!feed) return EMPTY;
    return {
      leads: feed.leads.map(fromFeaturedLead),
      hasMore: feed.hasMore,
      source: "backend",
      unavailable: false,
    };
  } catch (error) {
    if (isFrameworkSignal(error)) throw error;
    return EMPTY;
  }
}

/**
 * Unreachable is not empty.
 *
 * An empty marketplace and a marketplace this server could not read are
 * different facts, and the page says different things about them.
 */
const EMPTY: PublicLeadFeed = {
  leads: [],
  hasMore: false,
  source: "backend",
  unavailable: true,
};
