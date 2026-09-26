import type { BuyerEnquiry, PropertyDetail, PropertySummary } from "@/lib/domain/types";
import type { LocalitySummary } from "@/lib/services/contracts";
import { reviewCoverFor, reviewGalleryFor } from "./review-imagery";
import { displayPath, getLocation, isWithin, FEATURED_AREA_IDS } from "./locations";

/**
 * Deterministic synthetic fixtures.
 *
 * Every name, project, phone number and amount here is invented. None of it
 * describes real inventory, real people or real prices. Nothing is randomised:
 * the same input always produces the same output, so screenshots and tests are
 * stable.
 *
 * Property names and localities follow the approved prototype's sample set so a
 * visual comparison against the baseline lines up. Prices are sample values, not
 * a price list — the lead price list and subscription price are unresolved client
 * decisions (D-01, D-03) and are never sourced from here.
 *
 * No photography is vendored with these fixtures. By default every card renders
 * its designed no-image fallback, which is the honest state until licensed
 * project photography exists. Setting NEXT_PUBLIC_KKL_REVIEW_IMAGERY=on swaps in
 * the baseline's illustrative Unsplash stand-ins for a review session — see
 * `review-imagery.ts` for what that does and does not guarantee. Two listings are
 * deliberately excluded from that set so the missing-media state stays visible.
 */

const L = 100_000;
const CR = 10_000_000;

function property(
  input: Omit<PropertySummary, "coverImage" | "locationPath"> &
    Partial<Pick<PropertySummary, "coverImage">>,
): PropertySummary {
  // The display path is derived from the location record (CR05) — a fixture
  // states *which area* and the record says how the path reads.
  const locationPath = displayPath(input.locationId);
  // Null unless review imagery is switched on, so the designed no-image
  // fallback is the default everywhere.
  return { coverImage: reviewCoverFor(input.id, input.title), locationPath, ...input };
}

export const SAMPLE_PROPERTIES: readonly PropertySummary[] = [
  property({
    id: "p-ivy-court",
    slug: "ivy-court-action-area-i",
    title: "Ivy Court, Action Area I",
    locationId: "action-area-i",
    configurations: ["3"],
    areaSummary: "1,320–1,690 sq ft",
    price: { minInr: 1.05 * CR, maxInr: 1.6 * CR },
    possession: "Jun 2029",
    construction: "under_construction",
    reraRegistered: true,
    newLaunch: true,
    featured: true,
  }),
  property({
    id: "p-greenview",
    slug: "greenview-residency",
    title: "Greenview Residency",
    locationId: "action-area-ii",
    configurations: ["2", "3"],
    areaSummary: "985–1,420 sq ft",
    price: { minInr: 78 * L, maxInr: 1.4 * CR },
    possession: "Dec 2028",
    construction: "under_construction",
    reraRegistered: true,
    newLaunch: false,
    featured: true,
  }),
  property({
    id: "p-lakeshore",
    slug: "lakeshore-heights",
    title: "Lakeshore Heights",
    locationId: "action-area-i",
    configurations: ["3", "4"],
    areaSummary: "1,540–2,180 sq ft",
    price: { minInr: 1.1 * CR, maxInr: 2.2 * CR },
    possession: null,
    construction: "ready_to_move",
    reraRegistered: false,
    newLaunch: false,
    featured: false,
  }),
  property({
    id: "p-sundew",
    slug: "sundew-enclave",
    title: "Sundew Enclave",
    locationId: "rajarhat",
    configurations: ["1", "2", "3"],
    areaSummary: "610–1,180 sq ft",
    price: { minInr: 52 * L, maxInr: 85 * L },
    possession: "Mar 2028",
    construction: "under_construction",
    reraRegistered: false,
    newLaunch: false,
    featured: false,
  }),
  property({
    id: "p-orchid-grove",
    slug: "orchid-grove",
    title: "Orchid Grove",
    locationId: "action-area-iii",
    configurations: ["2", "3"],
    areaSummary: "745–1,310 sq ft",
    price: { minInr: 64 * L, maxInr: 1.05 * CR },
    possession: "Jun 2029",
    construction: "under_construction",
    reraRegistered: true,
    newLaunch: true,
    featured: false,
  }),
  property({
    id: "p-riverside-commons",
    slug: "riverside-commons",
    title: "Riverside Commons",
    locationId: "salt-lake",
    configurations: ["3"],
    areaSummary: "1,290–1,880 sq ft",
    price: { minInr: 95 * L, maxInr: 1.7 * CR },
    possession: "Sep 2028",
    construction: "under_construction",
    reraRegistered: true,
    newLaunch: false,
    featured: false,
  }),
  property({
    id: "p-palm-meadows",
    slug: "palm-meadows",
    title: "Palm Meadows",
    locationId: "action-area-iii",
    configurations: ["2", "3"],
    areaSummary: "910–1,365 sq ft",
    price: { minInr: 95 * L, maxInr: 1.6 * CR },
    possession: null,
    construction: "ready_to_move",
    reraRegistered: true,
    newLaunch: false,
    featured: false,
  }),
  property({
    id: "p-the-pinnacle",
    slug: "the-pinnacle",
    title: "The Pinnacle",
    locationId: "action-area-ii",
    configurations: ["3", "4"],
    areaSummary: "1,610–2,240 sq ft",
    price: { minInr: 1.3 * CR, maxInr: 2.4 * CR },
    possession: null,
    construction: "ready_to_move",
    reraRegistered: true,
    newLaunch: false,
    featured: false,
  }),
  property({
    id: "p-willow-court",
    slug: "willow-court",
    title: "Willow Court",
    locationId: "action-area-ii",
    configurations: ["2"],
    areaSummary: "720–960 sq ft",
    price: { minInr: 65 * L, maxInr: 90 * L },
    possession: "Jan 2029",
    construction: "under_construction",
    reraRegistered: false,
    newLaunch: false,
    featured: false,
  }),
];

/**
 * Detail-only content. Specifications and pricing rows are synthesised from the
 * summary so every listing is internally consistent — the carpet areas in the
 * pricing table are the ends of the listing's own area range, and the prices are
 * the ends of its own price range.
 */
export function sampleDetailFor(summary: PropertySummary): PropertyDetail {
  // "985–1,420 sq ft" → ["985 sq ft", "1,420 sq ft"]; the unit sits on the high
  // end only, so the low end has to carry it over.
  const [rawLow, areaHigh] = (summary.areaSummary ?? "").split("–");
  const unit = (areaHigh ?? "").replace(/^[\d,.\s]+/, "").trim();
  const areaLow = rawLow && unit ? `${rawLow.trim()} ${unit}` : rawLow?.trim();
  const configs = summary.configurations;

  const pricingByConfiguration = configs.map((config, index) => {
    const isFirst = index === 0;
    const isLast = index === configs.length - 1;
    const price = isFirst
      ? summary.price.minInr
      : isLast
        ? summary.price.maxInr
        : null;
    return {
      configuration: `${config} BHK`,
      carpetArea: (isFirst ? areaLow : isLast ? areaHigh : "") || "—",
      priceInr: price,
    };
  });

  return {
    ...summary,
    description:
      "Synthetic sample copy for development and review. A landscaped development within reach of the Biswa Bangla Convention Centre, with a sample flat open on site.",
    media: reviewGalleryFor(summary.id, summary.title),
    floorPlans: [],
    amenities: [
      "Lift",
      "Power backup",
      "Covered parking",
      "Children's play area",
      "Community hall",
      "Rainwater harvesting",
      "24×7 security",
      "Landscaped garden",
    ],
    specifications: [
      { label: "Configuration", value: formatConfigList(configs) },
      { label: "Carpet area", value: summary.areaSummary ?? "Not published" },
      { label: "Total units", value: "184" },
      { label: "Towers", value: "3" },
      { label: "Floors", value: "G+14" },
      { label: "Facing", value: "East, North-east" },
    ],
    pricingByConfiguration,
    address: `Plot 22, Street 8, ${summary.locationPath.slice(-1)[0]}, ${summary.locationPath.slice(-2, -1)[0] ?? "New Town"}, Kolkata 700161`,
    builderName: "Sample Builders Pvt Ltd",
    status: "published",
  };
}

function formatConfigList(configs: readonly string[]): string {
  return configs.length ? `${configs.join(", ")} BHK` : "Not published";
}

/**
 * The featured areas on the approved homepage grid (P-01), with counts derived
 * from the fixtures above, never written by hand.
 *
 * The baseline prototype showed illustrative totals (244 listings, 128 in New
 * Town) against a much smaller sample set. Those numbers cannot be carried over:
 * a homepage claiming 128 listings that searches to six is incoherent, and
 * cross-screen consistency is a requirement. The layout is identical; only the
 * magnitudes follow the data.
 *
 * Since CR05 the areas come from the central location records — this is the
 * featured subset (FEATURED_AREA_IDS), not a list of its own. The search
 * pickers offer every area in the launch city through the location service.
 */
export const SAMPLE_LOCALITIES: readonly LocalitySummary[] = FEATURED_AREA_IDS.map((id) => {
  const record = getLocation(id);
  if (!record) throw new Error(`Featured area ${id} is not a location record.`);
  return {
    id,
    name: record.name,
    // A locality counts its sub-localities, as the approved grid does: New
    // Town's figure includes the Action Areas.
    listingCount: SAMPLE_PROPERTIES.filter((p) => isWithin(p.locationId, id)).length,
  };
});

export const SAMPLE_TOTAL_LISTINGS = SAMPLE_PROPERTIES.length;

/** Synthetic enquiries for the signed-in Buyer sample account. */
export const SAMPLE_ENQUIRIES: readonly BuyerEnquiry[] = [
  {
    id: "e-40118",
    propertyId: "p-greenview",
    propertyTitle: "Greenview Residency",
    locationPath: ["Kolkata", "New Town", "Action Area II"],
    kind: "enquiry",
    status: "contacted",
    message: "Interested in a 3 BHK, looking to move within six months.",
    createdAt: "2026-09-19T10:24:00.000Z",
  },
  {
    id: "e-40122",
    propertyId: "p-lakeshore",
    propertyTitle: "Lakeshore Heights",
    locationPath: ["Kolkata", "New Town", "Action Area I"],
    kind: "site_visit",
    status: "open",
    message: null,
    createdAt: "2026-09-20T14:05:00.000Z",
  },
  {
    id: "e-39884",
    propertyId: "p-sundew",
    propertyTitle: "Sundew Enclave",
    locationPath: ["Kolkata", "Rajarhat"],
    kind: "enquiry",
    status: "closed",
    message: "Asked about 2 BHK availability.",
    createdAt: "2026-08-30T09:12:00.000Z",
  },
];
