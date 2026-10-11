import type {
  BuyerEnquiry,
  PropertyDetail,
  PropertyMedia,
  PropertySummary,
} from "@/lib/domain/types";
import type { LocalitySummary } from "@/lib/services/contracts";
import { reviewCoverFor, reviewGalleryFor } from "./review-imagery";
import { displayPath, getLocation, isWithin } from "./locations";

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
  input: Omit<PropertySummary, "coverImage" | "locationPath" | "transaction"> &
    Partial<Pick<PropertySummary, "coverImage" | "transaction">>,
): PropertySummary {
  // The display path is derived from the location record (CR05) — a fixture
  // states *which area* and the record says how the path reads.
  const locationPath = displayPath(input.locationId);
  // Null unless review imagery is switched on, so the designed no-image
  // fallback is the default everywhere.
  // Sale unless a fixture says otherwise. Most published inventory is for
  // sale, and defaulting here means a fixture only states the interesting
  // case rather than repeating "sale" nine times.
  return {
    transaction: "sale" as const,
    coverImage: reviewCoverFor(input.id, input.title),
    locationPath,
    ...input,
  };
}

/**
 * The sample inventory.
 *
 * SAMPLE, NOT REAL. Every row here is invented. The names are not real
 * projects, the prices are not quotes, and nothing has been checked against
 * a real listing. What is real is the shape: Kolkata localities from the
 * approved taxonomy, prices in the range those localities actually trade in,
 * and a spread wide enough that every budget band returns something rather
 * than the filter looking broken. The SAMPLE DATA banner stays on every
 * screen that renders it.
 *
 * TWO SCALES
 *
 * A sale carries a capital value and a letting carries a MONTHLY rent. They
 * share the `price` field, which is why `budgetScale` exists — see
 * `property-filters.ts`. A rent row's price is what a tenant pays each
 * month, so Sundew Enclave is ₹32,000–₹45,000/month, not ₹52L–₹85L.
 *
 * PRICING BY LOCALITY
 *
 * Roughly how Kolkata sorts itself: Alipore and Ballygunge at the top, New
 * Town and Rajarhat mid-market and where most new launches are, Behala,
 * Garia and Sonarpur at the affordable end. It is a plausible distribution,
 * not a market report.
 */
/**
 * Project imagery supplied for the review build.
 *
 * These are architectural RENDERS, not photographs of finished buildings —
 * three of the five sit on projects that are still under construction, so a
 * photograph could not exist. The alt text says so and the card keeps its
 * "Illustration" badge: a render presented as a photograph of a completed
 * development is the oldest misrepresentation in this industry, and the
 * labelling is what keeps this the right side of it.
 *
 * Anything without an entry here falls back to the designed no-image state,
 * which is deliberate — see review-imagery.ts.
 */
function supplied(file: string, title: string): PropertyMedia {
  return {
    id: `supplied-${file}`,
    url: `/projects/${file}.webp`,
    kind: "image",
    alt: `Artist's impression of ${title}. A render, not a photograph of a completed building.`,
    // The caption a visitor reads. "Artist's impression" is the industry's
    // own term and the honest one: three of these projects are still under
    // construction, so a photograph of them cannot exist. "Supplied for
    // review" was internal language that had no business on a public card.
    attribution: "Artist's impression",
  };
}

export const SAMPLE_PROPERTIES: readonly PropertySummary[] = [
  // ---------------------------------------------- New Town & the Action Areas
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
    coverImage: supplied("greenview-residency", "Greenview Residency"),
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
    coverImage: supplied("lakeshore-heights", "Lakeshore Heights"),
    slug: "lakeshore-heights",
    title: "Lakeshore Heights",
    locationId: "action-area-i",
    configurations: ["3", "4"],
    areaSummary: "1,540–2,180 sq ft",
    price: { minInr: 1.1 * CR, maxInr: 2.2 * CR },
    possession: null,
    construction: "ready_to_move",
    reraRegistered: true,
    newLaunch: false,
    featured: true,
  }),
  property({
    id: "p-eco-crest",
    slug: "eco-crest-action-area-iii",
    title: "Eco Crest, Action Area III",
    locationId: "action-area-iii",
    configurations: ["2", "3"],
    areaSummary: "910–1,365 sq ft",
    price: { minInr: 62 * L, maxInr: 98 * L },
    possession: "Mar 2029",
    construction: "under_construction",
    reraRegistered: true,
    newLaunch: true,
    featured: false,
  }),
  property({
    id: "p-willow-court",
    slug: "willow-court",
    title: "Willow Court",
    locationId: "action-area-iii",
    configurations: ["2", "3"],
    areaSummary: "1,040–1,480 sq ft",
    // A letting: the price is per month.
    transaction: "rent",
    price: { minInr: 38_000, maxInr: 62_000 },
    possession: null,
    construction: "ready_to_move",
    reraRegistered: true,
    newLaunch: false,
    featured: false,
  }),
  property({
    id: "p-orchid-square",
    slug: "orchid-square-new-town",
    title: "Orchid Square",
    locationId: "new-town",
    configurations: ["1", "2"],
    areaSummary: "545–880 sq ft",
    price: { minInr: 34 * L, maxInr: 56 * L },
    possession: "Sep 2028",
    construction: "under_construction",
    reraRegistered: true,
    newLaunch: true,
    featured: false,
  }),
  property({
    id: "p-tulip-enclave",
    slug: "tulip-enclave-new-town",
    title: "Tulip Enclave",
    locationId: "new-town",
    configurations: ["2"],
    areaSummary: "760–940 sq ft",
    transaction: "rent",
    price: { minInr: 22_000, maxInr: 31_000 },
    possession: null,
    construction: "ready_to_move",
    reraRegistered: false,
    newLaunch: false,
    featured: false,
  }),

  // ------------------------------------------------------------- Rajarhat
  property({
    id: "p-sundew",
    coverImage: supplied("sundew-enclave", "Sundew Enclave"),
    slug: "sundew-enclave",
    title: "Sundew Enclave",
    locationId: "rajarhat",
    configurations: ["1", "2", "3"],
    areaSummary: "610–1,180 sq ft",
    transaction: "rent",
    price: { minInr: 16_500, maxInr: 34_000 },
    possession: "Mar 2028",
    construction: "under_construction",
    reraRegistered: false,
    newLaunch: false,
    featured: true,
  }),
  property({
    id: "p-cedar-park",
    slug: "cedar-park-rajarhat",
    title: "Cedar Park",
    locationId: "rajarhat",
    configurations: ["2", "3"],
    areaSummary: "875–1,310 sq ft",
    price: { minInr: 48 * L, maxInr: 82 * L },
    possession: "Jan 2029",
    construction: "under_construction",
    reraRegistered: true,
    newLaunch: true,
    featured: false,
  }),
  property({
    id: "p-maple-grove",
    slug: "maple-grove-rajarhat",
    title: "Maple Grove",
    locationId: "rajarhat",
    configurations: ["3"],
    areaSummary: "1,240–1,460 sq ft",
    price: { minInr: 88 * L, maxInr: 1.18 * CR },
    possession: null,
    construction: "ready_to_move",
    reraRegistered: true,
    newLaunch: false,
    featured: false,
  }),

  // ------------------------------------------------------------ Salt Lake
  property({
    id: "p-riverside",
    coverImage: supplied("riverside-commons", "Riverside Commons"),
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
    featured: true,
  }),
  property({
    id: "p-sector-v-residences",
    slug: "sector-v-residences",
    title: "Sector V Residences",
    locationId: "salt-lake",
    configurations: ["2", "3"],
    areaSummary: "1,020–1,390 sq ft",
    transaction: "rent",
    price: { minInr: 34_000, maxInr: 58_000 },
    possession: null,
    construction: "ready_to_move",
    reraRegistered: true,
    newLaunch: false,
    featured: false,
  }),
  property({
    id: "p-banyan-court",
    slug: "banyan-court-salt-lake",
    title: "Banyan Court",
    locationId: "salt-lake",
    configurations: ["4"],
    areaSummary: "2,250–2,640 sq ft",
    price: { minInr: 2.1 * CR, maxInr: 2.75 * CR },
    possession: null,
    construction: "ready_to_move",
    reraRegistered: true,
    newLaunch: false,
    featured: false,
  }),

  // ---------------------------------------------------- South Kolkata, premium
  property({
    id: "p-alipore-house",
    coverImage: supplied("the-alipore-house", "The Alipore House"),
    slug: "the-alipore-house",
    title: "The Alipore House",
    locationId: "alipore",
    configurations: ["4"],
    areaSummary: "3,100–3,850 sq ft",
    price: { minInr: 6.4 * CR, maxInr: 8.9 * CR },
    possession: null,
    construction: "ready_to_move",
    reraRegistered: true,
    newLaunch: false,
    featured: false,
  }),
  property({
    id: "p-ballygunge-place",
    coverImage: supplied("ballygunge-place", "Ballygunge Place"),
    slug: "ballygunge-place",
    title: "Ballygunge Place",
    locationId: "ballygunge",
    configurations: ["3", "4"],
    areaSummary: "1,980–2,540 sq ft",
    price: { minInr: 2.9 * CR, maxInr: 4.2 * CR },
    possession: null,
    construction: "ready_to_move",
    reraRegistered: true,
    newLaunch: false,
    featured: false,
  }),
  property({
    id: "p-southern-avenue-mansions",
    slug: "southern-avenue-mansions",
    title: "Southern Avenue Mansions",
    locationId: "southern-avenue",
    configurations: ["3"],
    areaSummary: "1,760–2,050 sq ft",
    transaction: "rent",
    price: { minInr: 82_000, maxInr: 1.15 * L },
    possession: null,
    construction: "ready_to_move",
    reraRegistered: true,
    newLaunch: false,
    featured: false,
  }),
  property({
    id: "p-gariahat-terraces",
    slug: "gariahat-terraces",
    title: "Gariahat Terraces",
    locationId: "gariahat",
    configurations: ["2", "3"],
    areaSummary: "1,180–1,520 sq ft",
    price: { minInr: 1.35 * CR, maxInr: 1.95 * CR },
    possession: null,
    construction: "ready_to_move",
    reraRegistered: false,
    newLaunch: false,
    featured: false,
  }),
  property({
    id: "p-lake-gardens-villas",
    slug: "lake-gardens-villas",
    title: "Lake Gardens Villas",
    locationId: "lake-gardens",
    configurations: ["3", "4"],
    areaSummary: "1,840–2,310 sq ft",
    price: { minInr: 1.72 * CR, maxInr: 2.4 * CR },
    possession: "Nov 2028",
    construction: "under_construction",
    reraRegistered: true,
    newLaunch: false,
    featured: false,
  }),

  // ----------------------------------------------------- South, mid and value
  property({
    id: "p-tollygunge-park",
    slug: "tollygunge-park",
    title: "Tollygunge Park",
    locationId: "tollygunge",
    configurations: ["2", "3"],
    areaSummary: "1,010–1,440 sq ft",
    price: { minInr: 82 * L, maxInr: 1.28 * CR },
    possession: "Jul 2028",
    construction: "under_construction",
    reraRegistered: true,
    newLaunch: false,
    featured: false,
  }),
  property({
    id: "p-golf-green-heights",
    slug: "golf-green-heights",
    title: "Golf Green Heights",
    locationId: "golf-green",
    configurations: ["2", "3"],
    areaSummary: "940–1,260 sq ft",
    price: { minInr: 68 * L, maxInr: 96 * L },
    possession: null,
    construction: "ready_to_move",
    reraRegistered: true,
    newLaunch: false,
    featured: false,
  }),
  property({
    id: "p-jadavpur-courtyard",
    slug: "jadavpur-courtyard",
    title: "Jadavpur Courtyard",
    locationId: "jadavpur",
    configurations: ["1", "2"],
    areaSummary: "520–810 sq ft",
    transaction: "rent",
    price: { minInr: 13_500, maxInr: 24_000 },
    possession: null,
    construction: "ready_to_move",
    reraRegistered: false,
    newLaunch: false,
    featured: false,
  }),
  property({
    id: "p-garia-greens",
    slug: "garia-greens",
    title: "Garia Greens",
    locationId: "garia",
    configurations: ["2", "3"],
    areaSummary: "780–1,150 sq ft",
    price: { minInr: 36 * L, maxInr: 62 * L },
    possession: "Feb 2029",
    construction: "under_construction",
    reraRegistered: true,
    newLaunch: true,
    featured: false,
  }),
  property({
    id: "p-behala-residency",
    slug: "behala-residency",
    title: "Behala Residency",
    locationId: "behala",
    configurations: ["1", "2"],
    areaSummary: "495–760 sq ft",
    price: { minInr: 24 * L, maxInr: 41 * L },
    possession: "Aug 2028",
    construction: "under_construction",
    reraRegistered: true,
    newLaunch: true,
    featured: false,
  }),
  property({
    id: "p-sonarpur-meadows",
    slug: "sonarpur-meadows",
    title: "Sonarpur Meadows",
    locationId: "sonarpur",
    configurations: ["1", "2"],
    areaSummary: "460–720 sq ft",
    price: { minInr: 18 * L, maxInr: 33 * L },
    possession: "Dec 2029",
    construction: "under_construction",
    reraRegistered: false,
    newLaunch: true,
    featured: false,
  }),
  property({
    id: "p-santoshpur-sunrise",
    slug: "santoshpur-sunrise",
    title: "Santoshpur Sunrise",
    locationId: "santoshpur",
    configurations: ["2"],
    areaSummary: "820–970 sq ft",
    transaction: "rent",
    price: { minInr: 18_000, maxInr: 26_500 },
    possession: null,
    construction: "ready_to_move",
    reraRegistered: false,
    newLaunch: false,
    featured: false,
  }),

  // --------------------------------------------------------- North and central
  property({
    id: "p-park-street-chambers",
    slug: "park-street-chambers",
    title: "Park Street Chambers",
    locationId: "park-street",
    configurations: ["2", "3"],
    areaSummary: "1,240–1,680 sq ft",
    price: { minInr: 2.2 * CR, maxInr: 3.1 * CR },
    possession: null,
    construction: "ready_to_move",
    reraRegistered: true,
    newLaunch: false,
    featured: false,
  }),
  property({
    id: "p-lake-town-crossing",
    slug: "lake-town-crossing",
    title: "Lake Town Crossing",
    locationId: "lake-town",
    configurations: ["2", "3"],
    areaSummary: "905–1,290 sq ft",
    price: { minInr: 56 * L, maxInr: 89 * L },
    possession: "Apr 2029",
    construction: "under_construction",
    reraRegistered: true,
    newLaunch: true,
    featured: false,
  }),
  property({
    id: "p-dum-dum-junction",
    slug: "dum-dum-junction",
    title: "Dum Dum Junction",
    locationId: "dum-dum",
    configurations: ["1", "2", "3"],
    areaSummary: "530–1,120 sq ft",
    price: { minInr: 29 * L, maxInr: 71 * L },
    possession: "Oct 2028",
    construction: "under_construction",
    reraRegistered: true,
    newLaunch: false,
    featured: false,
  }),
  property({
    id: "p-kankurgachi-courtyard",
    slug: "kankurgachi-courtyard",
    title: "Kankurgachi Courtyard",
    locationId: "kankurgachi",
    configurations: ["3"],
    areaSummary: "1,310–1,540 sq ft",
    transaction: "rent",
    price: { minInr: 42_000, maxInr: 56_000 },
    possession: null,
    construction: "ready_to_move",
    reraRegistered: true,
    newLaunch: false,
    featured: false,
  }),
  property({
    id: "p-ultadanga-heights",
    slug: "ultadanga-heights",
    title: "Ultadanga Heights",
    locationId: "ultadanga",
    configurations: ["2"],
    areaSummary: "710–920 sq ft",
    price: { minInr: 42 * L, maxInr: 58 * L },
    possession: null,
    construction: "ready_to_move",
    reraRegistered: false,
    newLaunch: false,
    featured: false,
  }),
  property({
    id: "p-kestopur-crossing",
    slug: "kestopur-crossing",
    title: "Kestopur Crossing",
    locationId: "kestopur",
    configurations: ["2", "3"],
    areaSummary: "840–1,190 sq ft",
    price: { minInr: 44 * L, maxInr: 74 * L },
    possession: "May 2029",
    construction: "under_construction",
    reraRegistered: true,
    newLaunch: true,
    featured: false,
  }),
  property({
    id: "p-new-alipore-court",
    slug: "new-alipore-court",
    title: "New Alipore Court",
    locationId: "new-alipore",
    configurations: ["3", "4"],
    areaSummary: "1,620–2,100 sq ft",
    price: { minInr: 1.55 * CR, maxInr: 2.35 * CR },
    possession: null,
    construction: "ready_to_move",
    reraRegistered: true,
    newLaunch: false,
    featured: false,
  }),
  property({
    id: "p-bhawanipur-mansion",
    slug: "bhawanipur-mansion",
    title: "Bhawanipur Mansion",
    locationId: "bhawanipur",
    configurations: ["4"],
    areaSummary: "2,380–2,900 sq ft",
    transaction: "rent",
    price: { minInr: 1.25 * L, maxInr: 1.8 * L },
    possession: null,
    construction: "ready_to_move",
    reraRegistered: true,
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
    /*
     * The card's render leads the gallery when there is one, so the detail
     * screen opens on the same picture the card showed. Without that, a
     * property with a supplied render fell back to the stock gallery and the
     * image changed under somebody who had just clicked it.
     */
    media: summary.coverImage
      ? [summary.coverImage, ...reviewGalleryFor(summary.id, summary.title)]
      : reviewGalleryFor(summary.id, summary.title),
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
/**
 * The browse-by-locality grid: the six localities with the most inventory.
 *
 * It used to be a fixed list of six — New Town, Rajarhat, Salt Lake and the
 * three Action Areas — which was right when those were the only places with
 * listings. With inventory in twenty-six localities it meant the grid offered
 * "Action Area II, 1 listing" while Alipore, Ballygunge and Tollygunge were
 * nowhere on the page. A browse shortcut that ignores most of what there is
 * to browse is not a shortcut.
 *
 * Ranked by count, then alphabetically so the order is stable rather than
 * depending on the order rows happen to be written in. Sub-localities are
 * left out: New Town's figure already includes its Action Areas, and listing
 * both reads as double counting.
 */
export const SAMPLE_LOCALITIES: readonly LocalitySummary[] = (() => {
  const localities = new Set(
    SAMPLE_PROPERTIES.map((p) => getLocation(p.locationId))
      .map((record) => (record?.level === "sub_locality" ? record.parentId : record?.id))
      .filter((id): id is string => Boolean(id)),
  );
  return [...localities]
    .map((id) => {
      const record = getLocation(id);
      if (!record) throw new Error(`Area ${id} is not a location record.`);
      return {
        id,
        name: record.name,
        // A locality counts its sub-localities, as the approved grid does:
        // New Town's figure includes the Action Areas.
        listingCount: SAMPLE_PROPERTIES.filter((p) => isWithin(p.locationId, id)).length,
      };
    })
    .sort((a, b) => b.listingCount - a.listingCount || a.name.localeCompare(b.name))
    .slice(0, 6);
})();

export const SAMPLE_TOTAL_LISTINGS = SAMPLE_PROPERTIES.length;

/**
 * How many distinct localities the inventory sits in.
 *
 * Counted, not stated, so it cannot disagree with the rows above.
 */
export const SAMPLE_LOCALITIES_COVERED = new Set(
  SAMPLE_PROPERTIES.map((p) => p.locationId),
).size;

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
