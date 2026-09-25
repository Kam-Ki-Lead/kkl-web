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
  /**
   * A display-only placeholder for the withheld contact, composed by the server.
   *
   * This is a string to render, not data to unmask. The unmasked values are
   * never sent for an unpurchased lead, so there is nothing in the client to
   * reverse. How much a mask may reveal is a disclosure policy that belongs to
   * kkl-backend, not to this layer — kkl-web renders whatever string it is
   * given and cannot widen it.
   */
  readonly contactMask: string;
  /** Requirement summary line — configuration and budget, as one phrase. */
  readonly requirement: string;
};

/** Qualification-call detail, shown on the masked lead screen (S-08). */
export type LeadQualification = {
  readonly summary: string;
  readonly intentScore: number;
  /** D-14: absent consent is never presented as present. */
  readonly consentCaptured: boolean;
  readonly channel: string;
  readonly timeline: string;
  readonly purpose: string;
  readonly financing: string;
};

export type MarketplaceLeadDetail = MarketplaceLead & {
  readonly qualification: LeadQualification;
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
  readonly requirement: string;
  readonly contact: {
    readonly name: string;
    readonly phone: string;
    readonly email: string | null;
    /** Free text the buyer gave during qualification, or null. */
    readonly bestTimeToCall: string | null;
  };
  readonly qualification: LeadQualification;
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
  /**
   * Credits past their validity date, held apart from the usable balance.
   *
   * Null — not zero — while D-04 is open. Zero would assert that no credits have
   * expired, which nobody can assert without an expiry period to measure
   * against. The screens render the unresolved state instead.
   */
  readonly expiredCredits: number | null;
};

// ----------------------------------------------------------------- billing --

export type Invoice = {
  readonly id: string;
  readonly number: string;
  readonly issuedAt: string;
  readonly amountInr: number;
  readonly status: "paid" | "pending" | "failed";
  readonly description: string;
};

export type InvoiceParty = {
  readonly name: string;
  readonly addressLines: readonly string[];
  /** Null when not provided; never invented. */
  readonly gstin: string | null;
};

export type InvoiceDetail = Invoice & {
  readonly billedTo: InvoiceParty;
  readonly issuedBy: InvoiceParty;
  readonly lines: readonly {
    readonly description: string;
    readonly quantity: number;
    readonly amountInr: number;
  }[];
  /**
   * Null while D-13 is open. A zero tax line would be a claim about GST
   * treatment that has not been made, so no tax row is rendered at all.
   */
  readonly taxInr: number | null;
  readonly totalInr: number;
};

/** The billing details that appear on an invoice (S-21). */
export type BillingDetails = {
  readonly billingName: string;
  readonly gstin: string | null;
  readonly addressLines: readonly string[];
  readonly invoiceEmail: string | null;
  readonly contactName: string | null;
};

// ----------------------------------------------------------------- support --

export type SupportTicket = {
  readonly id: string;
  readonly reference: string;
  readonly subject: string;
  readonly status: "open" | "awaiting_reply" | "replied" | "resolved";
  readonly topic: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type TicketMessage = {
  readonly id: string;
  readonly author: "you" | "support";
  readonly authorLabel: string;
  readonly body: string;
  readonly sentAt: string;
};

export type SupportThread = SupportTicket & {
  readonly messages: readonly TicketMessage[];
};

// ------------------------------------------------------------ seller account --

export type SellerBusinessType =
  | "individual_broker"
  | "proprietorship"
  | "partnership"
  | "private_limited";

export type SellerAccountStatus = "active" | "suspended";

/**
 * The signed-in Seller's account.
 *
 * `kycStatus` and `accountStatus` are separate axes on purpose: the approved
 * prototype notes that suspending an account never rewrites its verification
 * state. An approved Seller can be suspended, and a suspended Seller keeps their
 * approval.
 *
 * None of this is authoritative in kkl-web. Whether an account may purchase is
 * decided by kkl-backend on every request; the flags here only decide what the
 * screens say.
 */
export type SellerAccount = {
  readonly id: string;
  readonly contactName: string;
  readonly agencyName: string;
  readonly mobile: string;
  readonly businessType: SellerBusinessType;
  readonly areas: readonly string[];
  readonly gstin: string | null;
  readonly kycStatus: KycStatus;
  readonly accountStatus: SellerAccountStatus;
  readonly alerts: SellerAlertPreferences;
};

export type SellerAlertPreferences = {
  readonly newLeadsInMyAreas: boolean;
  readonly viewedLeadOnSale: boolean;
  readonly lowBalance: boolean;
};

/** One step of the verification timeline shown on S-04. */
export type KycTimelineEntry = {
  readonly label: string;
  readonly at: string | null;
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

// ----------------------------------------------------------------- builder --

/**
 * The signed-in Builder's account.
 *
 * Three independent axes, and keeping them independent is the point:
 * `kycStatus` is a verification decision, `accountStatus` is an administrative
 * one, and `subscription` is a commercial one. Suspending an account does not
 * un-verify it; letting a subscription lapse does neither. B-19 depends on the
 * three being readable separately, and collapsing any two would make its table
 * unrepresentable.
 *
 * None of it is authoritative in kkl-web. What a Builder may actually do is
 * decided by kkl-backend on every request.
 */
export type BuilderAccount = {
  readonly id: string;
  readonly contactName: string;
  readonly companyName: string;
  readonly mobile: string;
  readonly email: string | null;
  readonly reraId: string | null;
  readonly kycStatus: KycStatus;
  readonly accountStatus: SellerAccountStatus;
  readonly subscription: BuilderSubscription;
  readonly alerts: BuilderAlertPreferences;
};

export type BuilderAlertPreferences = {
  readonly newEnquiry: boolean;
  readonly siteVisitRequest: boolean;
  readonly subscriptionReminders: boolean;
};

export type BuilderSubscriptionState = "none" | "active" | "due" | "grace" | "expired";

export type BuilderSubscription = {
  readonly state: BuilderSubscriptionState;
  readonly startedAt: string | null;
  readonly renewsAt: string | null;
  /**
   * Null always, while D-01 is open.
   *
   * No subscription price or billing cycle has been agreed, so there is no
   * figure to show. A number here would be an invented price on a screen that
   * asks someone to pay it.
   */
  readonly priceInr: number | null;
};

/** What a listing is doing, as the Builder sees it (B-07). */
export type ListingStatus = "draft" | "published" | "unpublished";

/** The six sections of the listing editor (B-08 to B-13). */
export type ListingSectionId =
  | "basics"
  | "location"
  | "pricing"
  | "specifications"
  | "media"
  | "preview";

export type ListingSectionState = {
  readonly id: ListingSectionId;
  readonly label: string;
  readonly complete: boolean;
};

/**
 * A reason a listing cannot be published yet, pointing at the section to fix.
 *
 * Carried as data rather than a rendered sentence so B-13 can link each one to
 * the section that owns it — "Project name is missing (section 1)" is only
 * useful if it can take you there.
 */
export type PublishBlocker = {
  readonly section: ListingSectionId;
  readonly sectionNumber: number;
  readonly message: string;
};

export type ListingDraft = {
  readonly id: string;
  readonly status: ListingStatus;
  readonly title: string;
  readonly propertyType: string | null;
  readonly possessionTarget: string | null;
  readonly description: string;
  readonly locality: string | null;
  readonly addressLine: string;
  readonly configurations: readonly string[];
  readonly priceMinInr: number | null;
  readonly priceMaxInr: number | null;
  readonly areaMin: string;
  readonly areaMax: string;
  readonly totalUnits: string;
  readonly amenities: readonly string[];
  readonly reraRegistered: boolean;
  readonly reraNumber: string | null;
  readonly media: readonly PropertyMedia[];
  readonly videoUrl: string | null;
  readonly publishedAt: string | null;
  readonly updatedAt: string;
  readonly enquiryCount: number;
};

export type ListingSummary = {
  readonly id: string;
  readonly title: string;
  readonly status: ListingStatus;
  readonly locationLabel: string;
  readonly configurationLabel: string;
  readonly priceLabel: string;
  readonly detailLine: string;
  readonly enquiryCount: number;
  readonly hasMedia: boolean;
  /**
   * The listing's first renderable photograph — B-07's thumbnail. Null when
   * the listing has no media, or when a file was chosen but no bytes were
   * kept (sample mode), in which case B-07 says so rather than faking one.
   */
  readonly coverImage: PropertyMedia | null;
  readonly sectionsComplete: number;
  readonly sectionsTotal: number;
};

/**
 * How much of a Buyer's contact a Builder can see on an enquiry for their own
 * listing.
 *
 * D-05 is open: the account-roles specification says a Builder is notified of
 * enquiries on their own listings and does not say whether the notification
 * carries contact details; the development proposal lists paid unlocking.
 * Neither is confirmed, so both are built and the screens say which is showing.
 */
export type ContactAccessMode = "included" | "unlock";

/**
 * A Builder's view of an enquiry on their own listing.
 *
 * `contactPhone` is nullable because whether contact is revealed immediately or
 * requires a paid unlock is unresolved (D-05) — the two source documents
 * contradict each other. When it is null the server withheld it; the UI must not
 * infer why, and must never fabricate a placeholder that looks like a real
 * number. `contactMask` is the placeholder, composed server-side.
 */
export type BuilderEnquiry = {
  readonly id: string;
  readonly listingId: string;
  readonly listingTitle: string;
  readonly kind: "enquiry" | "site_visit";
  readonly buyerName: string;
  /** The mask, always present. The unmasked number is a separate field. */
  readonly contactMask: string;
  /**
   * Present only when this enquiry's contact is currently accessible — under
   * alternative A always, under alternative B once unlocked. Absent otherwise,
   * so a locked enquiry has no number in the response to leak.
   */
  readonly contactPhone: string | null;
  readonly message: string | null;
  readonly requirement: string;
  readonly budgetBand: string | null;
  readonly timeline: string | null;
  readonly source: string;
  readonly receivedAt: string;
  readonly read: boolean;
  /** Credits it would cost to unlock, under alternative B. Null under A. */
  readonly unlockPriceCredits: number | null;
};
