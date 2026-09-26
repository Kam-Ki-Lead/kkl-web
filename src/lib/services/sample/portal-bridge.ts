import type { PropertySummary } from "@/lib/domain/types";
import { SAMPLE_PROPERTIES } from "./fixtures";
import { displayPath } from "./locations";
import * as builderStore from "./builder-store";
import * as enquiryStore from "./enquiry-store";

/**
 * The two joins the approved prototype leaves disconnected.
 *
 * C-10 records them as deliberate gaps in the design: publishing a listing does
 * not reach the portal, and a Buyer's enquiry does not reach the Builder. Both
 * are implemented here, at the service layer, so each surface reads one source
 * rather than each pretending separately.
 *
 * It lives in its own module so the dependency runs one way. builder-store and
 * enquiry-store do not know about each other or about the portal fixtures; this
 * file knows about all three and nothing imports it except the service object.
 */

/**
 * Which portal listing a Builder listing owns.
 *
 * Three of the portal's sample properties belong to the sample Builder. The
 * rest — Ivy Court, Sundew Enclave and the others — belong to builders who are
 * not this account, which is why they stay on the portal no matter what this
 * console does. A portal where one console could unpublish everything would not
 * be modelling a marketplace.
 */
const OWNED: Readonly<Record<string, string>> = {
  "bl-greenview": "p-greenview",
  "bl-lakeshore": "p-lakeshore",
  "bl-orchid": "p-orchid-grove",
};

const OWNED_PROPERTY_IDS = new Set(Object.values(OWNED));

/**
 * The properties the public portal should show.
 *
 * A fixture owned by the sample Builder appears only while that Builder's
 * listing is live; a listing this Builder created and published appears as a
 * new property. Everything else is untouched.
 *
 * The rule applied is the defined one: a listing is on the portal because it is
 * published. The subscription gates publishing, not continued visibility — what
 * should happen to a live listing when a subscription lapses is D-02 and is not
 * decided, so nothing here hides anything on expiry. B-05 puts the three
 * alternatives to the client instead.
 */
export function livePortalProperties(): readonly PropertySummary[] {
  const live = builderStore.portalListings();
  const livePropertyIds = new Set(
    live.map((l) => OWNED[l.id]).filter((id): id is string => id !== undefined),
  );

  const fromFixtures = SAMPLE_PROPERTIES.filter(
    (p) => !OWNED_PROPERTY_IDS.has(p.id) || livePropertyIds.has(p.id),
  );

  // Listings this Builder created in the console and published. They have no
  // fixture, so one is derived from what the editor collected.
  const fromConsole = live
    .filter((l) => OWNED[l.id] === undefined)
    .map(toPortalSummary);

  return [...fromConsole, ...fromFixtures];
}

function toPortalSummary(listing: ReturnType<typeof builderStore.portalListings>[number]): PropertySummary {
  // The listing stores a location-record id (CR05); the portal summary carries
  // the id for filtering and the derived display path for rendering. A listing
  // whose locality was never chosen cannot be published, so the fallback id is
  // unreachable for a live listing — but the summary still has to typecheck.
  const locationId = listing.localityId ?? "new-town";

  return {
    id: listing.id,
    slug: slugify(listing.title || `listing-${listing.id}`),
    title: listing.title || "Untitled project",
    locationId,
    locationPath: displayPath(locationId),
    configurations: listing.configurations,
    areaSummary:
      listing.areaMin && listing.areaMax ? `${listing.areaMin}–${listing.areaMax}` : null,
    price: { minInr: listing.priceMinInr, maxInr: listing.priceMaxInr },
    possession: listing.possessionTarget,
    construction: listing.possessionTarget ? "under_construction" : "ready_to_move",
    reraRegistered: listing.reraRegistered,
    newLaunch: true,
    featured: false,
    // The editor records that photographs were chosen without keeping bytes, so
    // there is no URL to render. The designed no-image fallback is the honest
    // result, and it is the same one an unphotographed fixture gets.
    coverImage: null,
  };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Buyer enquiries that belong to this Builder, in the shape its console reads.
 *
 * A Buyer enquiring through the public portal about one of this Builder's
 * listings appears in B-16 alongside the seeded ones. Enquiries about anyone
 * else's property are not this Builder's and are filtered out — the join is by
 * listing ownership, not by "every enquiry in the process".
 */
export function buyerEnquiriesForBuilder(): readonly builderStore.BuilderSeedEnquiry[] {
  const propertyToListing = new Map(
    Object.entries(OWNED).map(([listingId, propertyId]) => [propertyId, listingId]),
  );

  return enquiryStore
    .submittedForBuilder()
    .filter((e) => propertyToListing.has(e.propertyId))
    .map((e) => ({
      id: e.id,
      listingId: propertyToListing.get(e.propertyId) as string,
      kind: e.kind,
      buyerName: e.name,
      phone: `+91 ${e.mobile.slice(0, 5)} ${e.mobile.slice(5)}`,
      message: e.message,
      // The portal's enquiry form does not collect a requirement or a budget
      // band; inventing one here would put words in a Buyer's mouth.
      requirement: "Not specified",
      budgetBand: null,
      timeline: null,
      source: "Property enquiry form",
      receivedAt: e.createdAt,
      read: false,
    }));
}
