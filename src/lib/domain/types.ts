/**
 * Domain types for kkl-web.
 *
 * These describe the shapes kkl-web renders. They are deliberately narrower than
 * kkl-backend's own model: kkl-web sees only what the API chooses to send it.
 *
 * Once kkl-backend publishes its versioned OpenAPI spec, the transport-facing
 * subset of this file is expected to be generated from that spec rather than
 * hand-maintained (see kkl-backend/docs/architecture.md §7). Until then these are
 * written by hand from the approved requirements.
 */

// ---------------------------------------------------------------- accounts --

export type Role = "buyer" | "seller" | "builder" | "admin";

export type AccountStatus = "active" | "pending_kyc" | "suspended";

export type KycStatus = "not_submitted" | "pending" | "approved" | "rejected";

export type SubscriptionStatus = "inactive" | "active" | "lapsed";

/**
 * The viewer, as reported by the server.
 *
 * kkl-web renders according to this, but never treats it as access control: the
 * server authorises every request independently and may refuse one this object
 * appears to permit. Hiding UI is presentation, not enforcement.
 */
export type Viewer = {
  readonly id: string;
  readonly role: Role;
  readonly displayName: string;
  readonly accountStatus: AccountStatus;
  readonly kycStatus: KycStatus;
  readonly subscriptionStatus: SubscriptionStatus;
};

// --------------------------------------------------------------- locations --

/**
 * India → West Bengal → Kolkata → New Town → Action Area → Project.
 * Modelled as a parented tree so the hierarchy can extend past the initial
 * Kolkata/New Town scope without a shape change.
 */
export type LocationNode = {
  readonly id: string;
  readonly name: string;
  readonly level: "country" | "state" | "city" | "locality" | "sub_locality" | "project";
  readonly parentId: string | null;
};

// -------------------------------------------------------------- properties --

export type PropertyStatus = "draft" | "published" | "unpublished";

export type PropertyMedia = {
  readonly id: string;
  /**
   * Media lives behind kkl-backend. Builder uploads are uncontrolled: expect
   * inconsistent aspect ratios, portrait phone photos, and listings with no
   * media at all. Rendering must tolerate all three.
   */
  readonly url: string;
  readonly kind: "image" | "video";
  readonly alt: string;
  /**
   * Credit line to display over the image, when the source requires or deserves
   * one. Null for ordinary builder uploads; set for the illustrative stand-in
   * photography used in review.
   */
  readonly attribution?: string | null;
};

export type PriceRange = {
  readonly minInr: number | null;
  readonly maxInr: number | null;
};

export type PropertySummary = {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly locationPath: readonly string[];
  readonly configurations: readonly string[];
  /** Carpet-area range as the builder stated it, e.g. "985–1,420 sq ft". */
  readonly areaSummary: string | null;
  readonly price: PriceRange;
  readonly possession: string | null;
  readonly construction: "under_construction" | "ready_to_move";
  readonly reraRegistered: boolean;
  /** A new launch is a distinct status from construction stage — the approved
   *  homepage badges them differently. */
  readonly newLaunch: boolean;
  readonly featured: boolean;
  readonly coverImage: PropertyMedia | null;
};

export type ConfigurationPrice = {
  readonly configuration: string;
  readonly carpetArea: string;
  /** Null when the builder has not published a price for this configuration. */
  readonly priceInr: number | null;
};

export type PropertyDetail = PropertySummary & {
  readonly description: string;
  readonly media: readonly PropertyMedia[];
  /** Floor plans are a separate media set; empty until the builder supplies them. */
  readonly floorPlans: readonly PropertyMedia[];
  readonly amenities: readonly string[];
  readonly specifications: ReadonlyArray<{ readonly label: string; readonly value: string }>;
  readonly pricingByConfiguration: readonly ConfigurationPrice[];
  readonly address: string;
  readonly builderName: string;
  readonly status: PropertyStatus;
};

export type PropertySearchFilters = {
  readonly locationId?: string;
  readonly propertyType?: string;
  readonly configurations?: readonly string[];
  readonly minBudgetInr?: number;
  readonly maxBudgetInr?: number;
  readonly construction?: PropertySummary["construction"];
  readonly newLaunchOnly?: boolean;
  readonly reraOnly?: boolean;
};

export type PropertySortKey = "relevance" | "price_asc" | "price_desc" | "newest";

// --------------------------------------------------------------- enquiries --

export type EnquiryStatus = "open" | "contacted" | "closed";

export type EnquiryKind = "enquiry" | "site_visit";

/** A Buyer's view of their own enquiry. */
export type BuyerEnquiry = {
  readonly id: string;
  readonly propertyId: string;
  readonly propertyTitle: string;
  readonly locationPath: readonly string[];
  readonly kind: EnquiryKind;
  readonly status: EnquiryStatus;
  readonly message: string | null;
  readonly createdAt: string;
};

/**
 * A Builder's view of an enquiry on their own listing.
 *
 * `buyerContact` is nullable because whether it is revealed immediately or
 * requires a paid unlock is an UNRESOLVED client decision — the two source
 * documents contradict each other (design-brief/04-confirmed-vs-unresolved.md
 * §B4). The nullable shape lets the UI render both states without this code
 * picking a winner. When it is null, the server withheld it; the UI must not
 * infer why, and must not fabricate a placeholder that looks like a real number.
 */
export type BuilderEnquiry = {
  readonly id: string;
  readonly propertyId: string;
  readonly propertyTitle: string;
  readonly kind: EnquiryKind;
  readonly status: EnquiryStatus;
  readonly message: string | null;
  readonly createdAt: string;
  readonly buyerName: string | null;
  readonly buyerContact: string | null;
};

// -------------------------------------------------- profile & notifications --

export type BuyerProfile = {
  readonly fullName: string;
  /** Verified by OTP at registration, so it is changed through re-verification. */
  readonly mobile: string;
  readonly email: string | null;
  readonly preferredLocalityId: string | null;
  readonly notifyByWhatsApp: boolean;
  readonly notifyByEmail: boolean;
};

export type NotificationCategory = "enquiry" | "match" | "account";

export type BuyerNotification = {
  readonly id: string;
  readonly category: NotificationCategory;
  readonly title: string;
  readonly body: string;
  readonly createdAt: string;
  readonly readAt: string | null;
  /** In-app destination, when the notification points somewhere. */
  readonly href: string | null;
};

// -------------------------------------------- buyer requirement & shortlist --

export type PurchaseIntent = "end_use" | "investment";

export type BuyerRequirement = {
  readonly locationId: string | null;
  readonly configurations: readonly string[];
  readonly minBudgetInr: number | null;
  readonly maxBudgetInr: number | null;
  readonly handoverTiming: string | null;
  readonly intent: PurchaseIntent | null;
};

export type MatchedProperty = {
  readonly property: PropertySummary;
  /** 0–100, computed server-side. Never computed in kkl-web. */
  readonly matchScore: number;
};

// -------------------------------------------------------------- lead market --

export type LeadLifecycleStatus =
  | "new"
  | "qualifying"
  | "qualified"
  | "listed"
  | "on_sale"
  | "sold"
  | "delivered"
  | "disqualified";

export type LeadIntentBand = "hot" | "warm" | "mild";

/**
 * A marketplace lead as shown BEFORE purchase.
 *
 * There is deliberately no contact field on this type. The server does not send
 * buyer name, phone or email for an unpurchased lead — they are omitted from the
 * response, not included-and-hidden. Masking is therefore a content state to be
 * designed, never a blur or overlay applied to real values present in the client
 * (design-brief/05-implementation-constraints.md §3).
 *
 * Keeping the fields off the type makes the leak impossible to write by accident.
 */
export type MarketplaceLead = {
  readonly id: string;
  readonly locationPath: readonly string[];
  readonly configuration: string;
  readonly budgetBand: string;
  readonly intentBand: LeadIntentBand;
  readonly intentScore: number;
  readonly status: Extract<LeadLifecycleStatus, "listed" | "on_sale">;
  readonly ageDays: number;
  readonly priceCredits: number;
  /** Present only when the aging discount applies; the server computes it. */
  readonly originalPriceCredits: number | null;
};

/** A lead the viewer has purchased. Contact details exist only on this type. */
export type PurchasedLead = {
  readonly id: string;
  readonly orderId: string;
  readonly purchasedAt: string;
  readonly locationPath: readonly string[];
  readonly configuration: string;
  readonly budgetBand: string;
  readonly intentBand: LeadIntentBand;
  readonly intentScore: number;
  readonly pricePaidCredits: number;
  readonly contact: {
    readonly name: string;
    readonly phone: string;
    readonly email: string | null;
  };
};

export type MarketplaceFilters = {
  readonly locationIds?: readonly string[];
  readonly categories?: readonly string[];
  readonly intentBands?: readonly LeadIntentBand[];
  readonly onSaleOnly?: boolean;
};

// ------------------------------------------------------------------ wallet --

export type LedgerEntryType =
  | "recharge"
  | "lead_purchase"
  | "refund"
  | "credit_expired"
  | "adjustment";

export type LedgerEntry = {
  readonly id: string;
  readonly occurredAt: string;
  readonly type: LedgerEntryType;
  readonly description: string;
  /** Signed: negative for debits. */
  readonly deltaCredits: number;
  readonly balanceAfterCredits: number;
  /** Server-supplied ISO date, or null. kkl-web never computes an expiry date. */
  readonly expiresAt: string | null;
};

/**
 * Wallet state is read-only in kkl-web. Balances are derived server-side from an
 * append-only ledger; this client never computes, adjusts or caches an
 * authoritative balance.
 */
export type WalletSummary = {
  readonly balanceCredits: number;
  readonly expiringSoonCredits: number | null;
};

// ----------------------------------------------------------------- billing --

export type Invoice = {
  readonly id: string;
  readonly number: string;
  readonly issuedAt: string;
  readonly amountInr: number;
  readonly status: "paid" | "pending" | "failed";
};

// ----------------------------------------------------------------- support --

export type SupportTicket = {
  readonly id: string;
  readonly reference: string;
  readonly subject: string;
  readonly status: "open" | "awaiting_reply" | "resolved";
  readonly createdAt: string;
  readonly updatedAt: string;
};

// --------------------------------------------------------------------- kyc --

export type KycSubmission = {
  readonly status: KycStatus;
  readonly submittedAt: string | null;
  readonly decidedAt: string | null;
  /** Populated only on rejection. */
  readonly rejectionReason: string | null;
  /** Masked for display. kkl-web never receives or renders a full PAN/Aadhaar. */
  readonly panMasked: string | null;
  readonly aadhaarMasked: string | null;
};

/** Admin's view of a pending KYC submission. */
export type KycQueueItem = {
  readonly id: string;
  readonly applicantName: string;
  readonly companyName: string | null;
  readonly role: Extract<Role, "seller" | "builder">;
  readonly submittedAt: string;
  readonly panMasked: string;
  readonly aadhaarMasked: string;
};

// ---------------------------------------------------------- subscriptions --

export type Subscription = {
  readonly status: SubscriptionStatus;
  readonly planCode: string;
  readonly renewsAt: string | null;
  /**
   * Server-supplied display price. Null when no price is configured — which is
   * the current state, because no subscription price has been agreed with the
   * client (design-brief/04-confirmed-vs-unresolved.md §B1). The UI must render
   * the unresolved state rather than invent a figure.
   */
  readonly priceInr: number | null;
};

// ------------------------------------------------------------- pagination --

export type Page<T> = {
  readonly items: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
};
