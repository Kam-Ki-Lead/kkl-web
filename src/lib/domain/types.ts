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
  /**
   * The property's area as a location-record id (CR05). Filtering matches on
   * this, never on a display name; selecting a locality includes its
   * sub-localities.
   */
  readonly locationId: string;
  /** Display path of names, city-first — derived from `locationId`'s record. */
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
  /**
   * Null when nothing has scored this lead. Qualification scoring belongs to
   * the voice phase; kkl-backend has no score today, and a default of 0 or
   * "warm" would be a claim about a person nobody has spoken to.
   */
  readonly intentBand: LeadIntentBand | null;
  readonly intentScore: number | null;
  readonly status: Extract<LeadLifecycleStatus, "listed" | "on_sale">;
  readonly ageDays: number;
  /**
   * Null when no lead price is configured (Q-1a). A zero would read as free,
   * and a made-up number would read as agreed.
   */
  readonly priceCredits: number | null;
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
   *
   * **Null when the server composes no mask.** kkl-backend does not: the
   * contact lives in a table it has not read, so it has nothing to mask and
   * will not invent digits to stand in for it. Screens render `contactState`
   * instead, which is a sentence. Sample mode keeps its masks — they are
   * fixtures, and labelled as such.
   */
  readonly contactMask: string | null;
  /**
   * What is true about this lead's contact right now, as a state rather than
   * a placeholder. Always present, so a screen never has to decide what a
   * null mask means.
   */
  readonly contactState: {
    readonly state: "masked_preview" | "released_on_purchase";
    readonly label: string;
  };
  /** Why this lead cannot be bought, if it cannot. Empty when it can. */
  readonly blockers: readonly { readonly code: string; readonly reason: string }[];
  readonly purchasable: boolean;
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
  /**
   * Null when no qualification call has happened. kkl-backend records leads
   * that nobody has called — voice is Phase 4 — and a qualification block
   * filled with plausible sentences would be the most convincing lie on the
   * screen.
   */
  readonly qualification: LeadQualification | null;
};

/** A lead the viewer has purchased. Contact details exist only on this type. */
export type PurchasedLead = {
  readonly id: string;
  readonly orderId: string;
  readonly purchasedAt: string;
  readonly locationPath: readonly string[];
  readonly configuration: string;
  readonly budgetBand: string;
  /** Null for the same reason it is null on a marketplace lead: no call. */
  readonly intentBand: LeadIntentBand | null;
  readonly intentScore: number | null;
  readonly pricePaidCredits: number;
  readonly requirement: string;
  readonly contact: {
    readonly name: string;
    readonly phone: string;
    readonly email: string | null;
    /** Free text the buyer gave during qualification, or null. */
    readonly bestTimeToCall: string | null;
  };
  /** Null when no qualification call has happened. */
  readonly qualification: LeadQualification | null;
};

/**
 * CR04 — a lead purchase as an order.
 *
 * The order already existed in the data: `PurchasedLead.orderId` has carried a
 * reference since the purchase flow was built. What it did not have was a
 * record of its own, so there was nowhere to answer "what did I order, what did
 * I pay, and where is the paperwork" without going through the lead.
 *
 * `status` has two cases and no third. A purchase either deducted and released
 * or it did not; there is no `refunded`, because refund eligibility and
 * destination are undecided (D-14) and a status nobody has agreed to would be
 * read as a promise.
 */
export type LeadOrderStatus = "paid" | "failed";

/**
 * What paid for the order.
 *
 * One case today, deliberately. The confirmed CR04 decision is a direct order
 * settled from wallet credits; a payment-gateway alternative is a later
 * addition, so there is no `gateway` case to render a half-built journey
 * against, and no gateway is named anywhere.
 */
export type LeadOrderPayment = {
  readonly method: "wallet_credits";
  readonly label: string;
  /** The ledger entry the deduction wrote, so the money can be traced. */
  readonly ledgerReference: string;
  readonly amountCredits: number;
};

/**
 * Whether a document exists for this order, stated rather than implied.
 *
 * `not_issued` is the honest answer for a wallet-credit order in this build:
 * the money event that produced a tax document was the recharge, and whether a
 * separate per-order invoice is issued — and how it is taxed — are open
 * decisions (D-13). A screen that showed a "Download invoice" button leading
 * nowhere, or an invoice with a ₹0 tax line, would both answer a question
 * nobody has answered.
 */
export type LeadOrderInvoiceState =
  | { readonly kind: "issued"; readonly invoiceId: string; readonly number: string }
  | { readonly kind: "not_issued"; readonly reason: string };

export type LeadOrder = {
  /** The reference the buyer quotes, e.g. "ORD-10234". Also the id. */
  readonly reference: string;
  readonly status: LeadOrderStatus;
  readonly placedAt: string;
  /** The lead this order released. Null on a failed order — nothing was released. */
  readonly leadId: string | null;
  /** What the lead was, for a list that should not have to load each lead. */
  readonly itemLabel: string;
  readonly locationPath: readonly string[];
  readonly payment: LeadOrderPayment;
  readonly invoice: LeadOrderInvoiceState;
  /** Which marketplace it came from; the two pools are separate. */
  readonly scope: "seller" | "builder";
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
/**
 * Whether one money-shaped action can be taken right now, and why not.
 *
 * `reason` is a sentence for a person, composed by whoever knows — which is
 * the service, not the screen. A screen that had to compose these would be
 * guessing at conditions it cannot see, and would go stale the day one of
 * them is answered.
 */
export type CommerceAction = {
  readonly available: boolean;
  readonly reason: string | null;
  /** The machine-readable condition, for a screen that wants to branch. */
  readonly code: string | null;
};

/**
 * The four actions, separately.
 *
 * They are separate because their blockers are separate: a lead price, a set
 * of payment credentials, a refund policy and a tax treatment are four
 * decisions by four different people. Collapsing them into one "commerce
 * unavailable" would report four open questions as one.
 */
export type CommerceAvailability = {
  readonly purchase: CommerceAction;
  readonly recharge: CommerceAction;
  readonly refund: CommerceAction;
  readonly invoice: CommerceAction;
  /** Not an action: whether an expiry rule exists at all. */
  readonly creditExpiry: {
    readonly configured: boolean;
    readonly reason: string | null;
    readonly code: string | null;
  };
};

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

// ------------------------------------------------------------ verification --

/**
 * CR07 — what a verification check is doing, per action.
 *
 * Seven outcomes, and the first distinction is the one `KycStatus` cannot
 * express: **`not_required` is not `verified`**. An account that needs no check
 * for an action has not passed one, and showing it a verified badge would be a
 * claim nobody made. `KycStatus` stays as it is — the state of a document
 * submission — and this describes whether a check is needed at all.
 */
export type VerificationOutcome =
  /** No check is needed for this action on this account. Never shown as verified. */
  | "not_required"
  /** A check is needed before the action. The case has not started. */
  | "required"
  /** The case is with the provider. Routine processing, not a staff queue. */
  | "in_progress"
  /** The check completed successfully. */
  | "verified"
  /** The case needs a person: an unclear result, an incomplete submission, a provider error. */
  | "needs_review"
  /** The check completed and did not pass. Never an approval. */
  | "failed"
  /** A previously verified case no longer counts, where the policy sets an expiry. */
  | "expired";

/**
 * The actions the policy speaks about.
 *
 * Per action, not per person: the same account can need a check for one thing
 * and not for another, which is the whole point of the confirmed selective
 * policy. Browsing and enquiring need none; money and publication are where a
 * check applies.
 */
export type GatedAction =
  | "browse_properties"
  | "enquire_property"
  | "request_leads"
  | "purchase_lead"
  | "publish_owner_listing"
  | "publish_builder_listing";

/** One movement of a verification case. */
export type VerificationEvent = {
  readonly at: string;
  readonly outcome: VerificationOutcome;
  readonly actorLabel: string;
  /** Why. Required on every staff decision; null for provider-side transitions. */
  readonly note: string | null;
};

/**
 * A verification case: a check that was actually required, with a reference the
 * person can quote and a history that says how it got where it is.
 *
 * `provider` names who is doing the checking. In this build that is a clearly
 * labelled sample service — no provider has been selected, and nothing here
 * contacts one or collects a real identity document.
 */
export type VerificationCase = {
  readonly reference: string;
  readonly action: GatedAction;
  readonly actionLabel: string;
  readonly outcome: VerificationOutcome;
  /** Why the check was required, in the words the person reads. */
  readonly requiredBecause: string;
  /**
   * The provenance behind that rule — who decided it, when, and on what basis.
   * Staff-facing only. `AdminShell` screens render it; the requester's own views
   * never do, and no customer-facing type carries it.
   */
  readonly policyProvenance: {
    readonly note: string;
    readonly basis: string;
    readonly decidedBy: string | null;
  };
  readonly provider: {
    readonly label: string;
    /** The provider's own reference, once it has one. Null before then. */
    readonly reference: string | null;
    /** True while this is a labelled sample service rather than a real provider. */
    readonly isSample: boolean;
  };
  /**
   * True when the case is waiting on a person rather than on the provider.
   * Routine processing must not fill a staff queue, and a case that needs
   * attention must not be lost inside one.
   */
  readonly needsStaffAttention: boolean;
  readonly openedAt: string;
  readonly updatedAt: string;
  readonly events: readonly VerificationEvent[];
};

/**
 * What an account needs for one action, right now.
 *
 * `outcome` is `not_required` when the policy asks for nothing — and then
 * `caseReference` is null, because no case was opened. Registering does not
 * open one: an ordinary user never enters a verification queue by signing up.
 */
export type VerificationRequirement = {
  readonly action: GatedAction;
  readonly actionLabel: string;
  readonly outcome: VerificationOutcome;
  /** The sentence shown to the person: why a check is or is not needed. */
  readonly explanation: string;
  readonly caseReference: string | null;
  /** True when the action is blocked by this outcome today. */
  readonly blocksAction: boolean;
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

// ------------------------------------------------------ lead requests (CR03) --

/**
 * CR03 — a Seller's request for leads ("Request Leads").
 *
 * A request is not a purchase: it describes the leads a broker needs when no
 * suitable lead is currently listed, and it carries no entitlement to contact
 * details. Whether an accepted request converts into a quote or a purchase
 * order is change-confirmation decision 3 — open.
 *
 * The field set and the status names below are the confirmation document's
 * *proposal* (its decision 2), not settled rules; the screens built over them
 * say so.
 */
export type LeadRequestStatus =
  | "submitted"
  | "under_review"
  | "needs_clarification"
  | "fulfilled"
  | "closed";

/** One movement of a request through its statuses. */
export type LeadRequestStatusEntry = {
  readonly status: LeadRequestStatus;
  readonly at: string;
  /** Why it moved, when the staff member recorded one. Null when none was given. */
  readonly note: string | null;
};

/**
 * A reply the requester may read.
 *
 * There is deliberately no `internal` field and no internal-note type reachable
 * from this one. Staff internal notes exist only on the Admin view
 * (`AdminLeadRequest.internalNotes`), the same containment the support console
 * uses: a filter can be forgotten on the next screen, a missing field cannot.
 */
export type LeadRequestResponse = {
  readonly id: string;
  readonly authorLabel: string;
  readonly body: string;
  readonly at: string;
};

export type LeadRequest = {
  readonly id: string;
  /** The human reference the Seller quotes, e.g. "LR-1042". */
  readonly reference: string;
  readonly status: LeadRequestStatus;
  /**
   * Areas as location-record ids (CR05). An array because the confirmation
   * document asks whether more than one area is supported; the form currently
   * collects one.
   */
  readonly areaIds: readonly string[];
  /** Composed display labels for `areaIds`, derived from the records. */
  readonly areaLabels: readonly string[];
  readonly propertyType: string | null;
  readonly configurations: readonly string[];
  readonly budgetBand: string | null;
  /** Buy/rent interest where applicable — null when the requester did not say. */
  readonly intent: "buy" | "rent" | null;
  /** How many leads are needed. Null when not stated — whether it is required is unconfirmed. */
  readonly quantity: number | null;
  /** When the leads are needed, free text ("Within a month"). Null when not stated. */
  readonly timing: string | null;
  /** Additional requirements, free text. Never a promise of availability or delivery time. */
  readonly notes: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  /** Public replies only. Internal notes are not part of this type. */
  readonly responses: readonly LeadRequestResponse[];
  readonly history: readonly LeadRequestStatusEntry[];
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
  /**
   * The listing's area as a location-record id (CR05), null until chosen.
   * Display names are derived from the record; the draft never stores one.
   */
  readonly localityId: string | null;
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

/**
 * CR02 — an individual owner's own property, posted in their own name.
 *
 * Deliberately not `ListingDraft`. That type is a Builder's project: total
 * units, RERA registration, a possession target, a price *range* across
 * configurations. An owner has one flat and one price, and the client's change
 * confirmation is explicit that an individual owner is neither a Builder
 * subscriber nor a lead-buying broker. Reusing the Builder type would have
 * made them one in the data, whatever the screens said.
 *
 * The statuses are the confirmed decision: an owner saves drafts and submits;
 * a submission enters a moderation queue; nothing publishes by itself. There
 * is no `published` state here, because whether an owner's listing publishes —
 * and on what terms — is still governed by the owner policy (D-10, D-18) and
 * inventing one would settle that by implication.
 */
export type OwnerListingStatus =
  | "draft"
  /** The owner has sent it; it is waiting to be picked up. */
  | "submitted"
  /** Staff have it open. */
  | "in_review"
  /** Staff asked the owner for something; the owner can edit and resubmit. */
  | "changes_requested"
  /**
   * Review is finished and nothing is wrong with it. It is NOT live: whether,
   * when and on what terms an owner's listing publishes is not decided, so
   * this state says "cleared review" and stops there.
   */
  | "cleared"
  /** Staff declined it, with a reason the owner can read. */
  | "declined"
  /** The owner took it back. */
  | "withdrawn";

/** The steps of the owner's posting journey. */
export type OwnerListingStepId =
  | "basics"
  | "location"
  | "pricing"
  | "photos"
  | "contact"
  | "preview";

export type OwnerListingStepState = {
  readonly id: OwnerListingStepId;
  readonly label: string;
  readonly complete: boolean;
};

/** Something missing or wrong, pointing at the step that owns it. */
export type OwnerListingBlocker = {
  readonly step: OwnerListingStepId;
  readonly stepNumber: number;
  readonly message: string;
};

/** How an owner wants to be contacted about their own listing. */
export type OwnerContactPreference = "phone" | "whatsapp" | "either";

/** What the owner is offering. Renting is included because the client's own
 *  specification describes owners letting property; whether it is in the launch
 *  scope is D-18 and the screens say so. */
export type OwnerListingIntent = "sell" | "rent";

/**
 * A photograph an owner added.
 *
 * `retained` is the honest bit. In sample mode a chosen file's bytes are not
 * kept anywhere — media storage belongs to kkl-backend — so the record says
 * the photograph was chosen and that nothing was stored, and the screens
 * render that rather than a broken image or a stock photo standing in for
 * someone's flat.
 */
export type OwnerListingPhoto = {
  readonly id: string;
  readonly fileName: string;
  readonly sizeLabel: string;
  readonly retained: boolean;
};

/** One movement of an owner's listing through its statuses. */
export type OwnerListingEvent = {
  readonly at: string;
  readonly status: OwnerListingStatus;
  readonly actorLabel: string;
  /** Why. Null for the owner's own save/submit steps, where the action is the reason. */
  readonly note: string | null;
};

/**
 * A message between the owner and staff about the listing.
 *
 * There is no `internal` field, and no internal-note type reachable from this
 * one — the same containment the support console and CR03 use. Staff notes
 * live only on the Admin projection.
 */
export type OwnerListingMessage = {
  readonly id: string;
  readonly authorLabel: string;
  readonly body: string;
  readonly at: string;
};

export type OwnerListing = {
  readonly id: string;
  /** The reference the owner quotes, e.g. "OP-1041". */
  readonly reference: string;
  readonly status: OwnerListingStatus;
  readonly intent: OwnerListingIntent | null;
  readonly title: string;
  readonly propertyType: string | null;
  readonly configuration: string | null;
  readonly description: string;
  /** Area as a location-record id (CR05). Null until chosen; never a display name. */
  readonly localityId: string | null;
  readonly addressLine: string;
  /** Expected price, or monthly rent when the intent is to rent. */
  readonly priceInr: number | null;
  readonly carpetArea: string;
  readonly floorLabel: string;
  readonly furnishing: string | null;
  readonly availableFrom: string;
  readonly photos: readonly OwnerListingPhoto[];
  readonly contactPreference: OwnerContactPreference | null;
  readonly contactName: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly submittedAt: string | null;
  readonly events: readonly OwnerListingEvent[];
  readonly messages: readonly OwnerListingMessage[];
};

export type OwnerListingSummary = {
  readonly id: string;
  readonly reference: string;
  readonly title: string;
  readonly status: OwnerListingStatus;
  readonly locationLabel: string;
  readonly priceLabel: string;
  readonly detailLine: string;
  readonly photoCount: number;
  readonly stepsComplete: number;
  readonly stepsTotal: number;
  readonly updatedAt: string;
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
/**
 * The three candidate answers to Q-2a, named so a screen can render whichever
 * one is eventually chosen.
 *
 * Naming all three selects none of them. `included` and `unlock` were the two
 * the sample fixtures knew about; the third — entitlement through a
 * subscription — was in the question all along and had no name here, which
 * made it the option the code could not express.
 */
export type ContactAccessMode =
  | "included_free"
  | "included_with_subscription"
  | "paid_unlock";

/**
 * What a recipient may currently see of an enquirer's contact, and why.
 *
 * `awaiting_decision` is the state of every deployment today and is not a
 * temporary rendering convenience: no rule has been chosen, so there is
 * nothing to disclose, nothing to charge for, and nothing to mask. A screen
 * shows `label`; it does not infer a rule from the absence of one.
 */
export type ContactAccessState = {
  readonly state: "awaiting_decision" | "available" | "locked";
  readonly selectedMode: ContactAccessMode | null;
  readonly label: string;
  readonly detail: string;
  /** The open question, when there is one. Null once it is answered. */
  readonly question: string | null;
  readonly candidateModes: readonly ContactAccessMode[];
  /** Only ever a number under `paid_unlock`, and only once that is chosen. */
  readonly unlockPriceCredits: number | null;
};

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
  /**
   * Null when the server sends no name. kkl-backend sends none: a name is a
   * contact detail, and Q-2a has not said who may have one.
   */
  readonly buyerName: string | null;
  /**
   * The mask, when the server composes one. Null when it does not — and
   * kkl-backend does not, because it has read no contact to mask. Screens
   * render `contactAccess.label`.
   */
  readonly contactMask: string | null;
  /** Always present. What may be seen, and why not. */
  readonly contactAccess: ContactAccessState;
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
