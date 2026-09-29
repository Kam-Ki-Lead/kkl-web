import type {
  BuilderAccount,
  BuilderAlertPreferences,
  BuilderEnquiry,
  ContactAccessMode,
  KycStatus,
  KycSubmission,
  KycTimelineEntry,
  LedgerEntry,
  ListingDraft,
  ListingSectionId,
  ListingSectionState,
  ListingStatus,
  ListingSummary,
  PropertyMedia,
  PublishBlocker,
} from "@/lib/domain/types";
import type {
  ListingActionOutcome,
  SubscriptionOutcome,
} from "@/lib/services/contracts";
import { processState } from "./process-state";
import { reviewCoverFor } from "./review-imagery";
import { formatAreaPath, formatPriceRange } from "@/lib/format";
import { displayPath } from "./locations";

/**
 * In-process Builder state for a review session.
 *
 * Deliberately separate from seller-store.ts. A Builder and a Seller are two
 * accounts: separate credit balances, separate ledgers, separate purchased
 * leads, separate tickets. Sharing any of them to save a file would be a data
 * leak dressed up as convenience, and it would make the two consoles
 * indistinguishable in exactly the way the access model says they are not.
 *
 * WHAT IT IS NOT — the same list as seller-store.ts, and it applies here too:
 * no sign-in, no authorization, no money, no durability, no transactions. One
 * sample Builder is shared by every visitor to this process. Verification is a
 * value that can be switched for review; no document is checked and no
 * administrator has approved anything.
 *
 * Publishing a listing does reach the public portal in sample mode, because
 * that rule is defined: an active subscription is needed to publish, and a
 * published listing is on the portal. What happens to a listing that is already
 * live when a subscription lapses (D-02), and whether listings are reviewed
 * before or after publishing (D-10), are not defined — so nothing here decides
 * them.
 */

// ------------------------------------------------------------------ account --

const SEED_ACCOUNT: BuilderAccount = {
  id: "U-20771",
  contactName: "Sandeep Barua",
  companyName: "Sample Builders Pvt Ltd",
  mobile: "9830072210",
  email: "sandeep@samplebuilders.example.invalid",
  reraId: "WBRERA/P/KOL/2026/000482",
  kycStatus: "approved",
  accountStatus: "active",
  subscription: {
    state: "active",
    startedAt: "2026-09-14T06:00:00.000Z",
    renewsAt: "2026-10-14T06:00:00.000Z",
    // Null, always. D-01 leaves the price and billing cycle unset.
    priceInr: null,
  },
  alerts: { newEnquiry: true, siteVisitRequest: true, subscriptionReminders: true },
};

const SEED_KYC: KycSubmission = {
  status: "approved",
  submittedAt: "2026-09-13T09:20:00.000Z",
  decidedAt: "2026-09-14T05:40:00.000Z",
  rejectionReason: null,
  panMasked: "AAACS••••Q",
  aadhaarMasked: null,
};

// ----------------------------------------------------------------- listings --

const SECTION_LABELS: ReadonlyArray<{ id: ListingSectionId; label: string }> = [
  { id: "basics", label: "Basics" },
  { id: "location", label: "Location" },
  { id: "pricing", label: "Pricing" },
  { id: "specifications", label: "Specifications" },
  { id: "media", label: "Media" },
  { id: "preview", label: "Preview" },
];

export const LISTING_SECTIONS = SECTION_LABELS;

function emptyDraft(id: string): ListingDraft {
  return {
    id,
    status: "draft",
    title: "",
    propertyType: null,
    possessionTarget: null,
    description: "",
    localityId: null,
    addressLine: "",
    configurations: [],
    priceMinInr: null,
    priceMaxInr: null,
    areaMin: "",
    areaMax: "",
    totalUnits: "",
    amenities: [],
    reraRegistered: false,
    reraNumber: null,
    media: [],
    videoUrl: null,
    publishedAt: null,
    updatedAt: new Date().toISOString(),
    enquiryCount: 0,
  };
}

/**
 * Seed listings, matching the approved B-07: two published, one unpublished,
 * one part-finished draft.
 *
 * The published two are the same projects the public portal already lists in
 * fixtures.ts, which is what makes the continuity visible: unpublishing
 * Greenview Residency in the console removes it from `/search`.
 */
function seedListings(): ListingDraft[] {
  const photo = (id: string, alt: string): PropertyMedia[] => [
    { id, url: "", kind: "image", alt, attribution: null },
  ];

  return [
    {
      ...emptyDraft("bl-greenview"),
      status: "published",
      title: "Greenview Residency",
      propertyType: "Apartment",
      possessionTarget: "Dec 2028",
      description:
        "A landscaped development within reach of the Biswa Bangla Convention Centre, with a sample flat open on site.",
      localityId: "action-area-ii",
      addressLine: "Plot 22, Street 8, Action Area II",
      configurations: ["2", "3"],
      priceMinInr: 78 * 100_000,
      priceMaxInr: 1.4 * 10_000_000,
      areaMin: "985 sq ft",
      areaMax: "1,420 sq ft",
      totalUnits: "184",
      amenities: ["Lift", "Power backup", "Covered parking", "Children's play area"],
      reraRegistered: true,
      reraNumber: "WBRERA/P/KOL/2026/000482",
      media: photo("bl-greenview-1", "Greenview Residency"),
      publishedAt: "2026-08-02T06:00:00.000Z",
      updatedAt: "2026-08-02T06:00:00.000Z",
      enquiryCount: 14,
    },
    {
      ...emptyDraft("bl-lakeshore"),
      status: "published",
      title: "Lakeshore Heights",
      propertyType: "Apartment",
      possessionTarget: null,
      description: "Ready-to-move apartments overlooking the central lake.",
      localityId: "action-area-i",
      addressLine: "Plot 4, Street 21, Action Area I",
      configurations: ["3", "4"],
      priceMinInr: 1.1 * 10_000_000,
      priceMaxInr: 2.2 * 10_000_000,
      areaMin: "1,540 sq ft",
      areaMax: "2,180 sq ft",
      totalUnits: "96",
      amenities: ["Lift", "Power backup", "Community hall", "24×7 security"],
      reraRegistered: false,
      reraNumber: null,
      media: photo("bl-lakeshore-1", "Lakeshore Heights"),
      publishedAt: "2026-06-14T06:00:00.000Z",
      updatedAt: "2026-06-14T06:00:00.000Z",
      enquiryCount: 9,
    },
    {
      ...emptyDraft("bl-orchid"),
      status: "unpublished",
      title: "Orchid Grove",
      propertyType: "Apartment",
      possessionTarget: "Jun 2029",
      description: "Two- and three-bedroom homes beside the Action Area III park.",
      localityId: "action-area-iii",
      addressLine: "Plot 9, Street 3, Action Area III",
      configurations: ["2", "3"],
      priceMinInr: 64 * 100_000,
      priceMaxInr: 1.05 * 10_000_000,
      areaMin: "745 sq ft",
      areaMax: "1,310 sq ft",
      totalUnits: "120",
      amenities: ["Lift", "Landscaped garden"],
      reraRegistered: true,
      reraNumber: "WBRERA/P/KOL/2026/000512",
      media: photo("bl-orchid-1", "Orchid Grove"),
      publishedAt: null,
      updatedAt: "2026-09-01T06:00:00.000Z",
      enquiryCount: 3,
    },
    {
      ...emptyDraft("bl-sundew-2"),
      status: "draft",
      title: "Sundew Enclave — Phase 2",
      propertyType: "Apartment",
      possessionTarget: "Mar 2029",
      description: "",
      localityId: "rajarhat",
      addressLine: "",
      configurations: ["1", "2", "3"],
      priceMinInr: null,
      priceMaxInr: null,
      areaMin: "610 sq ft",
      areaMax: "1,180 sq ft",
      totalUnits: "",
      amenities: [],
      reraRegistered: false,
      reraNumber: null,
      media: [],
      publishedAt: null,
      updatedAt: "2026-09-15T06:00:00.000Z",
      enquiryCount: 0,
    },
  ];
}

// ---------------------------------------------------------------- enquiries --

/**
 * Seed enquiries on the Builder's own listings.
 *
 * `phone` sits on the seed, not on `BuilderEnquiry`, for the same reason the
 * Seller's lead contact does: under alternative B a locked enquiry must have no
 * number in the response at all, and the only reliable way to guarantee that is
 * for the projection to be unable to include one.
 */
type SeedEnquiry = {
  readonly id: string;
  readonly listingId: string;
  readonly kind: "enquiry" | "site_visit";
  readonly buyerName: string;
  readonly phone: string;
  readonly message: string | null;
  readonly requirement: string;
  readonly budgetBand: string | null;
  readonly timeline: string | null;
  readonly source: string;
  readonly receivedAt: string;
  readonly read: boolean;
};

function seedEnquiries(): SeedEnquiry[] {
  return [
    {
      id: "E-8801",
      listingId: "bl-greenview",
      kind: "enquiry",
      buyerName: "Rina Sen",
      phone: "+91 98300 51134",
      message:
        "Are any 3 BHK units on the higher floors still available? We would also like to know about covered parking.",
      requirement: "3 BHK",
      budgetBand: "₹1Cr – ₹1.5Cr",
      timeline: "Within 6 months",
      source: "Property search",
      receivedAt: "2026-09-21T05:34:00.000Z",
      read: false,
    },
    {
      id: "E-8794",
      listingId: "bl-lakeshore",
      kind: "site_visit",
      buyerName: "Arun Das",
      phone: "+91 90514 22207",
      message: "Could we visit on Saturday afternoon?",
      requirement: "3 BHK",
      budgetBand: "₹1Cr – ₹1.5Cr",
      timeline: "1–2 years",
      source: "Property detail",
      receivedAt: "2026-09-20T12:50:00.000Z",
      read: false,
    },
    {
      id: "E-8770",
      listingId: "bl-greenview",
      kind: "enquiry",
      buyerName: "Manish Kapoor",
      phone: "+91 99031 47781",
      message: "What is the carpet area on the 2 BHK?",
      requirement: "2 BHK",
      budgetBand: "₹80L – ₹1Cr",
      timeline: "Timeline open",
      source: "Requirement match",
      receivedAt: "2026-09-12T09:15:00.000Z",
      read: true,
    },
    {
      id: "E-8741",
      listingId: "bl-orchid",
      kind: "enquiry",
      buyerName: "Sharmila Bose",
      phone: "+91 87772 30026",
      message: null,
      requirement: "3 BHK",
      budgetBand: "₹64L – ₹1.05Cr",
      timeline: "Within 6 months",
      source: "Property search",
      receivedAt: "2026-09-05T11:02:00.000Z",
      read: true,
    },
  ];
}

/** Builds the mask from a name and number the projection will then drop. */
function maskFor(name: string, phone: string): string {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((part, i) => (i === 0 ? `${part[0]}•••` : `${part[0]}••`))
    .join(" ");
  const digits = phone.replace(/\D/g, "");
  return `${initials} · +91 ${digits.slice(-10, -8)}••• ••${digits.slice(-2)}`;
}

// -------------------------------------------------------------------- state --

const SEED_CREDIT_OPENING = 0;
const SEED_UNLOCK_PRICE = 250;

/**
 * The Builder's own ledger. Distinct entries, distinct references, and the same
 * invariant as the Seller's: opening balance plus every delta equals the
 * reported balance, and the running column chains.
 *
 * Recharges 3,000; purchases 1,150; net 1,850.
 */
type SeedLedgerEntry = Omit<LedgerEntry, "balanceAfterCredits">;

function seedLedgerEntries(): SeedLedgerEntry[] {
  return [
    {
      id: "PAY-90114",
      occurredAt: "2026-09-03T08:10:00.000Z",
      type: "recharge",
      description: "Credit recharge",
      deltaCredits: 3_000,
      expiresAt: null,
    },
    {
      id: "ORD-20411",
      occurredAt: "2026-09-10T10:40:00.000Z",
      type: "lead_purchase",
      description: "Lead purchase L-4512",
      deltaCredits: -1_150,
      expiresAt: null,
    },
  ];
}

function withRunningBalance(
  entries: readonly SeedLedgerEntry[],
  opening: number,
): LedgerEntry[] {
  let running = opening;
  return entries.map((entry) => {
    running += entry.deltaCredits;
    return { ...entry, balanceAfterCredits: running };
  });
}

/** One description of a clean Builder, for both initialisation and reset. */
function freshState() {
  return {
    account: SEED_ACCOUNT,
    kyc: SEED_KYC,
    listings: seedListings(),
    enquiries: seedEnquiries(),
    /** enquiry id -> true, under alternative B only. */
    unlocked: new Set<string>(),
    unlockTokens: new Map<string, string>(),
    contactAccess: "included" as ContactAccessMode,
    openingBalance: SEED_CREDIT_OPENING,
    ledger: withRunningBalance(seedLedgerEntries(), SEED_CREDIT_OPENING),
    listingSequence: 0,
    subscriptionSequence: 40_118,
    subscriptionOutcome: "active" as "active" | "pending" | "failed",
    /** Staff credit adjustments (A-19). Reset with everything else. */
    adjustmentSequence: 0,
  };
}

type BuilderState = ReturnType<typeof freshState>;

let holder: BuilderState | null = null;

/** Resolved lazily, so declaration order in this file does not matter. */
function state(): BuilderState {
  holder ??= processState("builder", freshState);
  return holder;
}

// ------------------------------------------------------------------ account --

export function getAccount(): BuilderAccount {
  return state().account;
}

export function saveCompany(input: {
  companyName: string;
  contactName: string;
  email: string | null;
  reraId: string | null;
}): BuilderAccount {
  state().account = { ...state().account, ...input };
  return state().account;
}

export function saveAlerts(alerts: BuilderAlertPreferences): BuilderAccount {
  state().account = { ...state().account, alerts };
  return state().account;
}

export function getKyc(): KycSubmission {
  return state().kyc;
}

export function submitVerification(input: {
  hasPanDocument: boolean;
  hasAadhaarDocument: boolean;
  hasCompanyDocument: boolean;
  hasReraDocument: boolean;
}): KycSubmission {
  // The approved B-02 collects no PAN number, so a fresh submission records
  // no masked PAN. The seeded history may still carry one. The document flags
  // are validated in the action; the sample store keeps no per-document
  // record — only the status transition — because KycSubmission has no field
  // for them and inventing one would imply a backend shape D-15 has not set.
  void input;
  state().kyc = {
    status: "pending",
    submittedAt: new Date().toISOString(),
    decidedAt: null,
    rejectionReason: null,
    panMasked: null,
    aadhaarMasked: null,
  };
  state().account = { ...state().account, kycStatus: "pending" };
  return state().kyc;
}

export function verificationTimeline(): readonly KycTimelineEntry[] {
  const kyc = state().kyc;
  const entries: KycTimelineEntry[] = [{ label: "Documents submitted", at: kyc.submittedAt }];
  if (kyc.status === "approved") {
    entries.push({ label: "Approved by administrator", at: kyc.decidedAt });
    entries.push({ label: "Publishing unlocked", at: kyc.decidedAt });
  } else if (kyc.status === "rejected") {
    entries.push({ label: "Rejected by administrator", at: kyc.decidedAt });
  } else if (kyc.status === "pending") {
    entries.push({ label: "Awaiting administrator review", at: null });
  }
  return entries;
}

const subscriptionTokens = new Map<string, SubscriptionOutcome>();

export function startSubscription(input: { idempotencyKey: string }): SubscriptionOutcome {
  const replayed = subscriptionTokens.get(input.idempotencyKey);
  if (replayed) {
    return replayed.kind === "active" ? { ...replayed, duplicate: true } : replayed;
  }

  const account = state().account;
  if (account.accountStatus === "suspended") return { kind: "account_suspended" };
  if (account.kycStatus !== "approved") {
    return { kind: "not_verified", kycStatus: account.kycStatus };
  }

  state().subscriptionSequence += 1;
  const reference = `SUB-${state().subscriptionSequence}`;

  if (state().subscriptionOutcome === "pending") {
    const outcome: SubscriptionOutcome = { kind: "pending", reference };
    subscriptionTokens.set(input.idempotencyKey, outcome);
    return outcome;
  }
  if (state().subscriptionOutcome === "failed") {
    const outcome: SubscriptionOutcome = {
      kind: "failed",
      message: "The payment was not completed. No subscription was started and nothing was charged.",
    };
    subscriptionTokens.set(input.idempotencyKey, outcome);
    return outcome;
  }

  const startedAt = new Date().toISOString();
  const subscription = {
    state: "active" as const,
    startedAt,
    // A month out, because the term has to show something; the CYCLE is not
    // agreed (D-01), which is why no price accompanies it and the screens say
    // the figure is a sample.
    renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    priceInr: null,
  };
  state().account = { ...state().account, subscription };
  const outcome: SubscriptionOutcome = {
    kind: "active",
    subscription,
    reference,
    duplicate: false,
  };
  subscriptionTokens.set(input.idempotencyKey, outcome);
  return outcome;
}

// ----------------------------------------------------------------- listings --

function find(id: string): ListingDraft | undefined {
  return state().listings.find((l) => l.id === id);
}

function replace(next: ListingDraft): ListingDraft {
  const index = state().listings.findIndex((l) => l.id === next.id);
  if (index >= 0) state().listings[index] = next;
  return next;
}

/**
 * Whether each section has enough in it to count as done.
 *
 * "Complete" is not the same as "publishable": a draft can be saved with any
 * section incomplete, which is the point of a six-section editor. Publishing
 * has its own, stricter set of requirements below.
 */
function sectionComplete(listing: ListingDraft, section: ListingSectionId): boolean {
  switch (section) {
    case "basics":
      return listing.title.trim().length > 0 && listing.propertyType !== null;
    case "location":
      return listing.localityId !== null && listing.addressLine.trim().length > 0;
    case "pricing":
      return listing.configurations.length > 0 && listing.priceMinInr !== null;
    case "specifications":
      return listing.areaMin.trim().length > 0 && listing.totalUnits.trim().length > 0;
    case "media":
      return listing.media.length > 0;
    case "preview":
      return publishBlockers(listing).length === 0;
  }
}

export function sections(id: string): readonly ListingSectionState[] {
  const listing = find(id);
  if (!listing) return [];
  return SECTION_LABELS.map((s) => ({
    id: s.id,
    label: s.label,
    complete: sectionComplete(listing, s.id),
  }));
}

/**
 * What stops this listing being published.
 *
 * Each blocker names its section so B-13 can link to it. These are the minimum
 * a buyer needs to make sense of a listing — a name, where it is, what it costs
 * and at least one photograph — not every field in the editor.
 */
export function publishBlockers(listing: ListingDraft): readonly PublishBlocker[] {
  const blockers: PublishBlocker[] = [];
  if (listing.title.trim().length === 0) {
    blockers.push({ section: "basics", sectionNumber: 1, message: "Project name is missing" });
  }
  if (listing.propertyType === null) {
    blockers.push({ section: "basics", sectionNumber: 1, message: "Property type is not chosen" });
  }
  if (listing.addressLine.trim().length === 0) {
    blockers.push({ section: "location", sectionNumber: 2, message: "Street address is missing" });
  }
  if (listing.localityId === null) {
    blockers.push({ section: "location", sectionNumber: 2, message: "Locality is not chosen" });
  }
  if (listing.configurations.length === 0) {
    blockers.push({
      section: "pricing",
      sectionNumber: 3,
      message: "At least one configuration is required",
    });
  }
  if (listing.media.length === 0) {
    blockers.push({
      section: "media",
      sectionNumber: 5,
      message: "At least one photograph is required",
    });
  }
  return blockers;
}

/**
 * Which portal fixture a seeded Builder listing stands in for, for review
 * imagery only. This duplicates portal-bridge.ts's OWNED map on purpose:
 * portal-bridge imports this store, so the store must not import it back.
 * Keep the three entries in step with OWNED.
 */
const PORTAL_COUNTERPART: Readonly<Record<string, string>> = {
  "bl-greenview": "p-greenview",
  "bl-lakeshore": "p-lakeshore",
  "bl-orchid": "p-orchid-grove",
};

export function listSummaries(filter?: { status?: ListingStatus }): readonly ListingSummary[] {
  return state()
    .listings.filter((l) => (filter?.status ? l.status === filter.status : true))
    .map((listing) => {
      const done = SECTION_LABELS.filter((s) => sectionComplete(listing, s.id)).length;
      const price =
        listing.priceMinInr === null && listing.priceMaxInr === null
          ? "Pricing not entered"
          : (formatPriceRange({ minInr: listing.priceMinInr, maxInr: listing.priceMaxInr }) ??
            "Pricing not entered");
      const title = listing.title || "Untitled project";

      return {
        id: listing.id,
        title,
        status: listing.status,
        locationLabel: listing.localityId
          ? formatAreaPath(displayPath(listing.localityId))
          : "Location not entered",
        configurationLabel:
          listing.configurations.length > 0
            ? `${listing.configurations.join(", ")} BHK`
            : "Configuration not entered",
        priceLabel: price,
        detailLine: detailLineFor(listing),
        enquiryCount: listing.enquiryCount,
        hasMedia: listing.media.length > 0,
        // A real photograph wins; in a review session the approved baseline's
        // stand-in imagery fills the seeded listings' slots so the
        // image-bearing card can be compared at all. A listing whose photos
        // were "chosen" in sample mode has no bytes, so no cover.
        coverImage:
          listing.media.find((m) => m.kind === "image" && m.url !== "") ??
          reviewCoverFor(PORTAL_COUNTERPART[listing.id] ?? "", title),
        sectionsComplete: done,
        sectionsTotal: SECTION_LABELS.length,
      };
    });
}

function detailLineFor(listing: ListingDraft): string {
  if (listing.status === "draft") {
    const done = SECTION_LABELS.filter((s) => sectionComplete(listing, s.id)).length;
    return `Last edited ${shortDate(listing.updatedAt)} · ${done} of 6 sections complete`;
  }
  if (listing.status === "unpublished") {
    return `Unpublished ${shortDate(listing.updatedAt)} · hidden from search`;
  }
  const units = listing.totalUnits ? ` · ${listing.totalUnits} units` : "";
  const possession = listing.possessionTarget
    ? ` · possession ${listing.possessionTarget}`
    : " · ready to move";
  return `Published ${shortDate(listing.publishedAt ?? listing.updatedAt)}${units}${possession}`;
}

function shortDate(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(iso));
}

export function getListing(id: string): ListingDraft | null {
  return find(id) ?? null;
}

export function createListing(): ListingDraft {
  state().listingSequence += 1;
  const listing = emptyDraft(`bl-new-${state().listingSequence}`);
  state().listings.unshift(listing);
  return listing;
}

export function saveSection(input: {
  id: string;
  section: ListingSectionId;
  values: Readonly<Record<string, string | readonly string[] | boolean | null>>;
}): ListingDraft {
  const listing = find(input.id);
  if (!listing) throw new Error(`No listing ${input.id}`);

  const v = input.values;
  const str = (key: string, fallback: string) =>
    typeof v[key] === "string" ? (v[key] as string) : fallback;
  const nullable = (key: string, fallback: string | null) =>
    key in v ? ((v[key] as string | null) || null) : fallback;
  const num = (key: string, fallback: number | null) => {
    if (!(key in v)) return fallback;
    const raw = String(v[key] ?? "").replace(/[^\d.]/g, "");
    return raw === "" ? null : Number(raw);
  };

  const next: ListingDraft = {
    ...listing,
    title: str("title", listing.title),
    propertyType: nullable("propertyType", listing.propertyType),
    possessionTarget: nullable("possessionTarget", listing.possessionTarget),
    description: str("description", listing.description),
    localityId: nullable("locality", listing.localityId),
    addressLine: str("addressLine", listing.addressLine),
    configurations: Array.isArray(v.configurations)
      ? (v.configurations as readonly string[])
      : listing.configurations,
    priceMinInr: num("priceMinInr", listing.priceMinInr),
    priceMaxInr: num("priceMaxInr", listing.priceMaxInr),
    areaMin: str("areaMin", listing.areaMin),
    areaMax: str("areaMax", listing.areaMax),
    totalUnits: str("totalUnits", listing.totalUnits),
    amenities: Array.isArray(v.amenities) ? (v.amenities as readonly string[]) : listing.amenities,
    reraRegistered:
      typeof v.reraRegistered === "boolean" ? v.reraRegistered : listing.reraRegistered,
    reraNumber: nullable("reraNumber", listing.reraNumber),
    videoUrl: nullable("videoUrl", listing.videoUrl),
    // A photograph "upload" records that one was chosen, with no bytes. Media
    // storage is kkl-backend's; see the media section of the editor, which says
    // so on screen rather than pretending a file was kept.
    media:
      typeof v.photoCount === "string"
        ? Array.from({ length: Number(v.photoCount) || 0 }, (_, i) => ({
            id: `${listing.id}-m${i + 1}`,
            url: "",
            kind: "image" as const,
            alt: `${str("title", listing.title) || "Listing"} photograph ${i + 1}`,
            attribution: null,
          }))
        : listing.media,
    updatedAt: new Date().toISOString(),
  };

  return replace(next);
}

/** Why a publish or unpublish is refused, in the order a Builder would hit it. */
function listingBlock(listing: ListingDraft): ListingActionOutcome | null {
  const account = state().account;
  if (account.accountStatus === "suspended") {
    return { kind: "blocked", reason: "account_suspended", blockers: [] };
  }
  if (account.kycStatus !== "approved") {
    return { kind: "blocked", reason: "not_verified", blockers: [] };
  }
  if (account.subscription.state === "none") {
    return { kind: "blocked", reason: "no_subscription", blockers: [] };
  }
  if (account.subscription.state === "expired") {
    return { kind: "blocked", reason: "subscription_expired", blockers: [] };
  }
  const blockers = publishBlockers(listing);
  if (blockers.length > 0) {
    return { kind: "blocked", reason: "incomplete", blockers };
  }
  return null;
}

export function publishListing(id: string): ListingActionOutcome {
  const listing = find(id);
  if (!listing) return { kind: "blocked", reason: "incomplete", blockers: [] };

  const blocked = listingBlock(listing);
  if (blocked) return blocked;

  const now = new Date().toISOString();
  return {
    kind: "ok",
    listing: replace({
      ...listing,
      status: "published",
      publishedAt: listing.publishedAt ?? now,
      updatedAt: now,
    }),
  };
}

export function unpublishListing(id: string): ListingActionOutcome {
  const listing = find(id);
  if (!listing) return { kind: "blocked", reason: "incomplete", blockers: [] };

  const account = state().account;
  if (account.accountStatus === "suspended") {
    return { kind: "blocked", reason: "account_suspended", blockers: [] };
  }

  return {
    kind: "ok",
    listing: replace({
      ...listing,
      status: "unpublished",
      updatedAt: new Date().toISOString(),
    }),
  };
}

export function removeListing(id: string): { removed: boolean } {
  if (state().account.accountStatus === "suspended") return { removed: false };
  const before = state().listings.length;
  state().listings = state().listings.filter((l) => l.id !== id);
  return { removed: state().listings.length < before };
}

/**
 * The listings the public portal should show.
 *
 * The rule applied is the only one that is actually defined: **a listing is on
 * the portal because it is published.** The subscription gates *publishing* —
 * `listingBlock` refuses to publish without an active one — and that is a
 * different question from whether an already-live listing stays up when the
 * subscription lapses.
 *
 * That second question is D-02 and is undecided, so nothing here answers it. An
 * expired subscription deliberately does NOT remove anything from the portal.
 * Removing them would be choosing alternative B in code while B-05 tells the
 * client the decision is still theirs, which is the kind of quiet assumption
 * the whole unresolved-rules discipline exists to prevent.
 *
 * An earlier version of this function did gate on the subscription, and the
 * verification suite caught the contradiction between it and B-05.
 */
export function portalListings(): readonly ListingDraft[] {
  return state().listings.filter((l) => l.status === "published");
}

// ---------------------------------------------------------------- enquiries --

export function contactAccessMode(): ContactAccessMode {
  return state().contactAccess;
}

export function setContactAccessForReview(mode: ContactAccessMode): void {
  state().contactAccess = mode;
}

/**
 * Projects a seed enquiry for the current access alternative.
 *
 * Under "unlock", a locked enquiry's `contactPhone` is null — the number is not
 * in the returned object, so it cannot reach the HTML by accident.
 */
function projectEnquiry(seed: SeedEnquiry): BuilderEnquiry {
  const listing = find(seed.listingId);
  const mode = state().contactAccess;
  const accessible = mode === "included_free" || state().unlocked.has(seed.id);

  return {
    id: seed.id,
    listingId: seed.listingId,
    listingTitle: listing?.title ?? "Removed listing",
    kind: seed.kind,
    buyerName: seed.buyerName,
    contactMask: maskFor(seed.buyerName, seed.phone),
    contactPhone: accessible ? seed.phone : null,
    message: seed.message,
    requirement: seed.requirement,
    budgetBand: seed.budgetBand,
    timeline: seed.timeline,
    source: seed.source,
    receivedAt: seed.receivedAt,
    read: seed.read,
    unlockPriceCredits: mode === "paid_unlock" && !accessible ? SEED_UNLOCK_PRICE : null,
    // Sample mode exercises whichever alternative the reviewer selected, so
    // its state is `available` or `locked` — never `awaiting_decision`, which
    // is what the real service reports while Q-2a is open.
    contactAccess: {
      state: accessible ? "available" : "locked",
      selectedMode: mode,
      label: accessible
        ? "Contact details are available"
        : mode === "paid_unlock"
          ? "Unlock to see contact details"
          : "Contact details are not available on this plan",
      detail: "Sample data: the reviewer selected this alternative to see how it renders. "
        + "No rule has been confirmed.",
      question: "Q-2a",
      candidateModes: ["included_free", "included_with_subscription", "paid_unlock"],
      unlockPriceCredits: mode === "paid_unlock" && !accessible ? SEED_UNLOCK_PRICE : null,
    },
  };
}

/**
 * Enquiries on this Builder's listings, including any a Buyer submitted in this
 * session.
 *
 * This is the join the approved design implies and the prototype left
 * disconnected: a Buyer enquiring through the public portal appears here. The
 * caller passes them in rather than this module reaching into the Buyer store,
 * so the dependency runs one way and the stores stay separable.
 */
export function listEnquiries(
  fromBuyers: readonly SeedEnquiry[],
  filter?: { unreadOnly?: boolean; kind?: "enquiry" | "site_visit" },
): readonly BuilderEnquiry[] {
  const all = [...fromBuyers, ...state().enquiries]
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
    .map(projectEnquiry);

  return all.filter(
    (e) => (filter?.unreadOnly ? !e.read : true) && (filter?.kind ? e.kind === filter.kind : true),
  );
}

export function findSeedEnquiry(id: string): SeedEnquiry | undefined {
  return state().enquiries.find((e) => e.id === id);
}

export function projectOne(seed: SeedEnquiry): BuilderEnquiry {
  return projectEnquiry(seed);
}

export function markEnquiryRead(id: string): void {
  const index = state().enquiries.findIndex((e) => e.id === id);
  const existing = state().enquiries[index];
  if (existing) state().enquiries[index] = { ...existing, read: true };
}

export type BuilderSeedEnquiry = SeedEnquiry;

export function unlockPrice(): number {
  return SEED_UNLOCK_PRICE;
}

export function isUnlocked(id: string): boolean {
  return state().unlocked.has(id);
}

export function recordUnlock(input: { id: string; idempotencyKey: string }): boolean {
  const replayed = state().unlockTokens.get(input.idempotencyKey);
  if (replayed !== undefined) return false;
  state().unlocked.add(input.id);
  state().unlockTokens.set(input.idempotencyKey, input.id);
  return true;
}

// ------------------------------------------------------------------ credits --

export function ledger(): readonly LedgerEntry[] {
  return state().ledger;
}

export function openingBalance(): number {
  return state().openingBalance;
}

export function balance(): number {
  const last = state().ledger[state().ledger.length - 1];
  return last ? last.balanceAfterCredits : state().openingBalance;
}

export function postEntry(input: {
  type: LedgerEntry["type"];
  description: string;
  deltaCredits: number;
  reference: string;
}): LedgerEntry {
  const entry: LedgerEntry = {
    id: input.reference,
    occurredAt: new Date().toISOString(),
    type: input.type,
    description: input.description,
    deltaCredits: input.deltaCredits,
    balanceAfterCredits: balance() + input.deltaCredits,
    expiresAt: null,
  };
  state().ledger.push(entry);
  return entry;
}

/**
 * A staff credit adjustment (A-19) on the Builder's wallet.
 *
 * Same shape and same reasoning as the Seller's: an action by a named person
 * for a stated reason, posted as an entry so the Builder's own billing history
 * carries it, and moving no money because there is none to move.
 */
export function postStaffAdjustment(input: {
  deltaCredits: number;
  reason: string;
  staffLabel: string;
}): LedgerEntry {
  state().adjustmentSequence += 1;
  return postEntry({
    type: "adjustment",
    description: `Adjustment by ${input.staffLabel} — ${input.reason}`,
    deltaCredits: input.deltaCredits,
    reference: `LG-${state().adjustmentSequence + 55_600}`,
  });
}

// ------------------------------------------------------- review affordances --

export function setKycStatusForReview(status: KycStatus): void {
  const now = new Date().toISOString();
  state().kyc = {
    status,
    submittedAt: status === "not_submitted" ? null : (state().kyc.submittedAt ?? now),
    decidedAt: status === "approved" || status === "rejected" ? now : null,
    rejectionReason:
      status === "rejected"
        ? "The company incorporation document was not readable. Please re-upload a clear scan."
        : null,
    panMasked: status === "not_submitted" ? null : (state().kyc.panMasked ?? "AAACS••••Q"),
    aadhaarMasked: null,
  };
  state().account = { ...state().account, kycStatus: status };
}

export function setAccountStatusForReview(status: BuilderAccount["accountStatus"]): void {
  state().account = { ...state().account, accountStatus: status };
}

export function setSubscriptionStateForReview(next: BuilderAccount["subscription"]["state"]): void {
  const current = state().account.subscription;
  state().account = {
    ...state().account,
    subscription: {
      state: next,
      startedAt: next === "none" ? null : (current.startedAt ?? new Date().toISOString()),
      renewsAt: next === "none" ? null : (current.renewsAt ?? new Date().toISOString()),
      priceInr: null,
    },
  };
}

export function setSubscriptionOutcomeForReview(next: "active" | "pending" | "failed"): void {
  state().subscriptionOutcome = next;
}

export function resetForReview(): void {
  subscriptionTokens.clear();
  Object.assign(state(), freshState());
}
