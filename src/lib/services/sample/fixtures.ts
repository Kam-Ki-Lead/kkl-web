import type { BuyerEnquiry, PropertyDetail, PropertySummary } from "@/lib/domain/types";
import type { LocalitySummary } from "@/lib/services/contracts";

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
 * No photography ships with these fixtures. `coverImage: null` makes every card
 * render its designed no-image fallback, which is the honest state until licensed
 * project photography exists.
 */

const L = 100_000;
const CR = 10_000_000;

function property(
  input: Omit<PropertySummary, "coverImage"> & Partial<Pick<PropertySummary, "coverImage">>,
): PropertySummary {
  return { coverImage: null, ...input };
}

export const SAMPLE_PROPERTIES: readonly PropertySummary[] = [
  property({
    id: "p-ivy-court",
    slug: "ivy-court-action-area-i",
    title: "Ivy Court, Action Area I",
    locationPath: ["Kolkata", "New Town", "Action Area I"],
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
    locationPath: ["Kolkata", "New Town", "Action Area II"],
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
    locationPath: ["Kolkata", "New Town", "Action Area I"],
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
    locationPath: ["Kolkata", "Rajarhat"],
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
    locationPath: ["Kolkata", "New Town", "Action Area III"],
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
    locationPath: ["Kolkata", "Salt Lake"],
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
    locationPath: ["Kolkata", "New Town", "Action Area III"],
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
    locationPath: ["Kolkata", "New Town", "Action Area II"],
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
    locationPath: ["Kolkata", "New Town", "Action Area II"],
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

const DETAIL_EXTRAS: Record<string, Omit<PropertyDetail, keyof PropertySummary>> = {
  default: {
    description:
      "A landscaped development a short drive from the Biswa Bangla Convention Centre, with a sample flat open on site. This description is synthetic sample copy for development and review.",
    media: [],
    amenities: [
      "Swimming pool",
      "Gymnasium",
      "Landscaped garden",
      "Covered parking",
      "24×7 security",
      "Children's play area",
      "Power backup",
      "Clubhouse",
    ],
    specifications: [
      { label: "Carpet area", value: "985–1,420 sq ft" },
      { label: "Towers", value: "4 towers, G+14" },
      { label: "Total units", value: "312" },
      { label: "Land area", value: "2.4 acres" },
    ],
    address: "Action Area II, New Town, Kolkata 700156",
    builderName: "Elysian Landmarks",
    status: "published",
  },
};

export function sampleDetailFor(summary: PropertySummary): PropertyDetail {
  const extras = DETAIL_EXTRAS[summary.slug] ?? DETAIL_EXTRAS.default;
  return {
    ...summary,
    ...(extras as Omit<PropertyDetail, keyof PropertySummary>),
    specifications: [
      ...(extras as Omit<PropertyDetail, keyof PropertySummary>).specifications.filter(
        (s) => s.label !== "Carpet area",
      ),
      ...(summary.areaSummary
        ? [{ label: "Carpet area", value: summary.areaSummary }]
        : []),
      ...(summary.reraRegistered
        ? [{ label: "RERA", value: "Registered — number issued by the builder" }]
        : []),
      ...(summary.possession ? [{ label: "Possession", value: summary.possession }] : []),
    ],
  };
}

/**
 * Locality counts are derived from the fixtures above, never written by hand.
 *
 * The baseline prototype showed illustrative totals (244 listings, 128 in New
 * Town) against a much smaller sample set. Those numbers cannot be carried over:
 * a homepage claiming 128 listings that searches to six is incoherent, and
 * cross-screen consistency is a requirement. The layout is identical; only the
 * magnitudes follow the data.
 */
const LOCALITY_ORDER: ReadonlyArray<{ id: string; name: string }> = [
  { id: "new-town", name: "New Town" },
  { id: "rajarhat", name: "Rajarhat" },
  { id: "salt-lake", name: "Salt Lake" },
  { id: "action-area-i", name: "Action Area I" },
  { id: "action-area-ii", name: "Action Area II" },
  { id: "action-area-iii", name: "Action Area III" },
];

export const SAMPLE_LOCALITIES: readonly LocalitySummary[] = LOCALITY_ORDER.map(
  ({ id, name }) => ({
    id,
    name,
    listingCount: SAMPLE_PROPERTIES.filter((p) =>
      p.locationPath.some((segment) => segment === name),
    ).length,
  }),
);

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
