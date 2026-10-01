import type { StaffRef } from "@/lib/domain/identity";
import type {
  AdminAccount,
  AdminActionResult,
  AdminLead,
  AdminLeadRequest,
  AdminOwnerListing,
  AdminLedgerRow,
  AdminOrder,
  AdminSubscription,
  AdminThread,
  AdminTicket,
  AdminTicketFilter,
  AdminWallet,
  AuditCategory,
  AuditEntry,
  ConsentBasis,
  DashboardAlert,
  Integration,
  IntakeRejection,
  IntakeRun,
  JobFailure,
  KycApplication,
  ModeratedListing,
  NotificationRecord,
  QueueTile,
  RefundRequest,
  SuppressionEntry,
  VoiceCall,
  WhatsAppConversation,
  WhatsAppStep,
} from "@/lib/domain/admin";
import type {
  BillingDetails,
  BuyerEnquiry,
  BuyerNotification,
  BuilderAccount,
  BuilderAlertPreferences,
  BuilderEnquiry,
  BuilderSubscription,
  BuyerProfile,
  CommerceAvailability,
  ContactAccessState,
  Invoice,
  ListingDraft,
  ListingSectionId,
  ListingSectionState,
  ListingStatus,
  ListingSummary,
  PublishBlocker,
  InvoiceDetail,
  KycStatus,
  KycSubmission,
  KycTimelineEntry,
  LedgerEntry,
  GatedAction,
  LeadOrder,
  LeadRequest,
  LeadRequestStatus,
  OwnerListing,
  OwnerListingBlocker,
  OwnerListingStatus,
  OwnerListingStepId,
  OwnerListingSummary,
  VerificationCase,
  VerificationRequirement,
  LocationNode,
  MarketplaceLead,
  MarketplaceLeadDetail,
  PurchasedLead,
  SellerAccount,
  SellerAlertPreferences,
  SellerBusinessType,
  SupportThread,
  SupportTicket,
  WalletSummary,
  BuyerRequirement,
  MatchedProperty,
  PropertyDetail,
  PropertySearchFilters,
  PropertySortKey,
  PropertySummary,
} from "@/lib/domain/types";

/**
 * The service boundary.
 *
 * Screens depend on these interfaces, never on a concrete implementation. Two
 * implementations exist: sample fixtures (development and review) and the real
 * kkl-backend API client. Neither is chosen by a component — `getServices()`
 * resolves it once from runtime configuration.
 *
 * Nothing here enforces permissions. kkl-backend authorises every request; if a
 * caller asks for something they may not have, the server refuses and the service
 * surfaces that refusal as `ServiceError` with `kind: "forbidden"`. The UI renders
 * the C-09 access panel — it does not decide the answer.
 */

export type ServiceErrorKind =
  | "not_found"
  | "forbidden"
  | "unauthenticated"
  | "validation"
  | "unavailable";

export class ServiceError extends Error {
  readonly kind: ServiceErrorKind;
  constructor(kind: ServiceErrorKind, message: string) {
    super(message);
    this.name = "ServiceError";
    this.kind = kind;
  }
}

export type Paged<T> = {
  readonly items: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
};

export type LocalitySummary = {
  readonly id: string;
  readonly name: string;
  readonly listingCount: number;
};

export type HomepageContent = {
  readonly featuredHero: PropertySummary | null;
  readonly featuredProperties: readonly PropertySummary[];
  readonly featuredProjects: readonly PropertySummary[];
  readonly localities: readonly LocalitySummary[];
  readonly totalPublishedListings: number;
};

export interface PropertyService {
  getHomepage(): Promise<HomepageContent>;
  search(input: {
    filters: PropertySearchFilters;
    sort: PropertySortKey;
    page: number;
  }): Promise<Paged<PropertySummary>>;
  getBySlug(slug: string): Promise<PropertyDetail>;
  countMatching(filters: PropertySearchFilters): Promise<number>;
  /** Scores published listings against a buyer requirement. Server-side only. */
  match(requirement: BuyerRequirement): Promise<readonly MatchedProperty[]>;
}

/**
 * Buyer enquiries.
 *
 * `submitEnquiry` is deliberately not "send a message to the builder" — it asks
 * kkl-backend to record an enquiry. Whether a notification is delivered, and what
 * it contains, is the backend's business and is not implied by the UI.
 */
export interface EnquiryService {
  /**
   * Records an enquiry.
   *
   * `idempotencyKey` identifies the attempt, not the content: submitting the same
   * key twice must return the first result and record nothing new, while two
   * different people enquiring about the same property must produce two distinct
   * enquiries. Implementations must not derive the reference from the payload.
   */
  submitEnquiry(input: {
    idempotencyKey: string;
    propertyId: string;
    kind: "enquiry" | "site_visit";
    name: string;
    mobile: string;
    message?: string;
    preferredDate?: string;
  }): Promise<{ readonly enquiryId: string; readonly duplicate: boolean }>;
  listMine(): Promise<readonly BuyerEnquiry[]>;
  getMine(id: string): Promise<BuyerEnquiry>;
  /**
   * The enquiry a submission receipt refers to, for the confirmation screen.
   *
   * The receipt is the submission token, not the human reference. References are
   * for people to quote; they are short and predictable, so addressing the
   * confirmation screen by one would let anyone read another person's enquiry by
   * guessing. Implementations must still authorize the read — an unguessable
   * identifier is not permission.
   */
  getByReceipt(receipt: string): Promise<BuyerEnquiry | null>;
}

/**
 * Buyer profile (P-15).
 *
 * `save` returns the stored profile so the screen renders what was actually
 * kept, not what was typed. Field-level problems come back as `ValidationError`
 * rather than a thrown string, because the form has to place them.
 */
export type FieldErrors = Readonly<Record<string, string>>;

export class ValidationError extends Error {
  readonly fields: FieldErrors;
  constructor(fields: FieldErrors) {
    super("The details could not be saved.");
    this.name = "ValidationError";
    this.fields = fields;
  }
}

export interface ProfileService {
  get(): Promise<BuyerProfile>;
  save(input: {
    fullName: string;
    email: string | null;
    preferredLocalityId: string | null;
    notifyByWhatsApp: boolean;
    notifyByEmail: boolean;
  }): Promise<BuyerProfile>;
}

/** Notifications (P-16). */
export interface NotificationService {
  list(): Promise<readonly BuyerNotification[]>;
  markRead(id: string): Promise<void>;
  markAllRead(): Promise<void>;
  unreadCount(): Promise<number>;
}

// ------------------------------------------------------------------ seller --

/**
 * The Seller's own account (S-01 to S-05, S-21, S-25).
 *
 * Nothing here authenticates or authorises. `get()` returns the account the
 * request is already scoped to; in sample mode there is only one and no sign-in
 * gate in front of it. KYC state is reported, never decided: an implementation
 * must not let a client-supplied value change whether an account is verified.
 */
export interface SellerAccountService {
  get(): Promise<SellerAccount>;
  /** S-02. Returns the stored account so the screen shows what was kept. */
  saveBusiness(input: {
    agencyName: string;
    businessType: SellerBusinessType;
    areas: readonly string[];
    gstin: string | null;
  }): Promise<SellerAccount>;
  /**
   * S-03. Submitting moves the account to `pending`; it never approves it.
   *
   * Document bytes are deliberately not part of this contract. Uploads go
   * straight to kkl-backend, which is the only thing that should ever hold a PAN
   * or Aadhaar image, and this returns only the resulting status.
   */
  submitKyc(input: { panNumber: string; hasPanDocument: boolean; hasAadhaarDocument: boolean }): Promise<KycSubmission>;
  /** S-04 timeline. Entries the server has, with no invented timestamps. */
  kycTimeline(): Promise<readonly KycTimelineEntry[]>;
  saveProfile(input: {
    contactName: string;
    agencyName: string;
    alerts: SellerAlertPreferences;
  }): Promise<SellerAccount>;
  billingDetails(): Promise<BillingDetails>;
  saveBillingDetails(input: BillingDetails): Promise<BillingDetails>;
}

export type LeadSort = "newest" | "price" | "score";

export type LeadMarketQuery = {
  /**
   * A location-record id (CR05), never a name. Selecting a locality includes
   * its sub-localities — "New Town" covers the Action Areas.
   */
  readonly areaId?: string;
  readonly budgetBand?: string;
  readonly configuration?: string;
  readonly minScore?: number;
  readonly sort?: LeadSort;
  /** The "Sale · aged leads" tab. */
  readonly onSaleOnly?: boolean;
};

export type LeadMarketPage = {
  readonly leads: readonly MarketplaceLead[];
  readonly total: number;
  /**
   * Qualified leads the server refused to list, and why, as a sentence.
   *
   * The approved design surfaces this rather than silently shortening the list:
   * a lead whose qualification call captured no consent cannot be sold (D-14),
   * and the Seller is told the count without being told which.
   */
  readonly withheld: { readonly count: number; readonly reason: string } | null;
  readonly filterOptions: {
    /**
     * Areas with at least one listed lead, as location-record id + name + a
     * composed picker label ("Action Area I, New Town") (CR05).
     */
    readonly areas: ReadonlyArray<{
      readonly id: string;
      readonly name: string;
      readonly label: string;
    }>;
    readonly budgetBands: readonly string[];
    readonly configurations: readonly string[];
  };
};

/** The outcome of asking to buy a lead. Every case is a designed screen. */
export type PurchaseOutcome =
  | { readonly kind: "purchased"; readonly lead: PurchasedLead; readonly duplicate: boolean }
  | { readonly kind: "insufficient_credits"; readonly priceCredits: number; readonly balanceCredits: number }
  | { readonly kind: "already_sold" }
  | { readonly kind: "not_verified"; readonly kycStatus: KycStatus }
  | { readonly kind: "account_suspended" }
  | { readonly kind: "deduction_failed"; readonly message: string };

/**
 * The lead marketplace and purchase (S-07 to S-13).
 *
 * `purchase` takes an idempotency key for the same reason the enquiry flow does:
 * a retried request, a second tab or a double submit must not spend credits
 * twice. One lead is released to one purchaser only, so a second caller must get
 * `already_sold` rather than a second copy.
 *
 * The ordering matters and belongs to kkl-backend, inside one transaction:
 * deduct, then release. A failed deduction must release nothing. kkl-web cannot
 * enforce that and does not pretend to — it renders whichever outcome it is
 * handed.
 */
export interface LeadMarketService {
  list(query: LeadMarketQuery): Promise<LeadMarketPage>;
  /** Masked view. Contact values are not in the response at all. */
  get(id: string): Promise<MarketplaceLeadDetail | null>;
  purchase(input: { leadId: string; idempotencyKey: string }): Promise<PurchaseOutcome>;
  listPurchased(): Promise<readonly PurchasedLead[]>;
  getPurchased(id: string): Promise<PurchasedLead | null>;
  /**
   * CR04 — the caller's own orders, newest first. Never another account's: the
   * service reads the identity from the session, and there is no filter
   * parameter that could ask for somebody else's.
   */
  listOrders(): Promise<readonly LeadOrder[]>;
  /**
   * One of the caller's own orders. Null when the reference does not exist
   * **or belongs to somebody else** — indistinguishable on purpose.
   */
  getOrder(reference: string): Promise<LeadOrder | null>;
  /** Export of the caller's own purchased leads, as a file body. */
  exportPurchased(input: { format: "csv"; ids?: readonly string[] }): Promise<{
    readonly filename: string;
    readonly contentType: string;
    readonly body: string;
  }>;
}

export type RechargeOutcome =
  | { readonly kind: "credited"; readonly amountInr: number; readonly balanceCredits: number; readonly paymentReference: string; readonly invoiceId: string; readonly duplicate: boolean }
  | { readonly kind: "pending"; readonly paymentReference: string }
  | { readonly kind: "failed"; readonly message: string };

export type UsageMonth = { readonly label: string; readonly spentInr: number };

/**
 * Credits, ledger and invoices (S-14 to S-21).
 *
 * Read-only for balances. kkl-web never computes an authoritative balance: every
 * figure is derived server-side from the append-only ledger, which is why
 * `ledger` returns `balanceAfterCredits` per entry rather than leaving the client
 * to add up.
 *
 * `recharge` simulates nothing about money in sample mode — it moves a number in
 * a process. Real payment capture, reconciliation and invoice issue are
 * kkl-backend's, behind a gateway, and must never be initiated from here.
 */
export interface CreditService {
  wallet(): Promise<WalletSummary>;
  /**
   * What each money action may do right now, and why not — as data, before
   * anybody presses anything.
   *
   * A screen that discovers "recharge is unavailable" by attempting a
   * recharge has already told the person the wrong thing, and a screen that
   * hard-codes the reason goes stale the day the reason changes.
   */
  availability(): Promise<CommerceAvailability>;
  usageByMonth(): Promise<readonly UsageMonth[]>;
  ledger(filter?: { readonly type?: "recharge" | "purchase" }): Promise<readonly LedgerEntry[]>;
  recharge(input: { amountInr: number; idempotencyKey: string }): Promise<RechargeOutcome>;
  invoices(): Promise<readonly Invoice[]>;
  invoice(id: string): Promise<InvoiceDetail | null>;
}

/** Support tickets (S-22 to S-24). */
export interface SupportService {
  listTickets(): Promise<readonly SupportTicket[]>;
  getThread(reference: string): Promise<SupportThread | null>;
  createTicket(input: { topic: string; subject: string; body: string }): Promise<SupportTicket>;
  reply(input: { reference: string; body: string }): Promise<SupportThread>;
  resolve(reference: string): Promise<SupportThread>;
}

// ----------------------------------------------------------------- builder --

/** The Builder's own account, verification and subscription (B-01 to B-05, B-24). */
export interface BuilderAccountService {
  get(): Promise<BuilderAccount>;
  saveCompany(input: {
    companyName: string;
    contactName: string;
    email: string | null;
    reraId: string | null;
  }): Promise<BuilderAccount>;
  /**
   * B-02. Moves to `pending`; never approves. Approval is A-06's.
   *
   * The approved screen collects no PAN number — only the documents — so the
   * contract records which files were chosen, nothing more.
   */
  submitVerification(input: {
    hasPanDocument: boolean;
    hasAadhaarDocument: boolean;
    hasCompanyDocument: boolean;
    hasReraDocument: boolean;
  }): Promise<KycSubmission>;
  verificationTimeline(): Promise<readonly KycTimelineEntry[]>;
  /**
   * B-03/B-04. Records the intent to subscribe and returns the gateway result.
   *
   * No price is passed, because none exists: D-01 leaves the subscription price
   * and billing cycle unset. A real implementation takes the plan from
   * kkl-backend and the money from a gateway, never from this argument.
   */
  startSubscription(input: { idempotencyKey: string }): Promise<SubscriptionOutcome>;
  saveAlerts(input: BuilderAlertPreferences): Promise<BuilderAccount>;
}

export type SubscriptionOutcome =
  | { readonly kind: "active"; readonly subscription: BuilderSubscription; readonly reference: string; readonly duplicate: boolean }
  | { readonly kind: "pending"; readonly reference: string }
  | { readonly kind: "failed"; readonly message: string }
  | { readonly kind: "not_verified"; readonly kycStatus: KycStatus }
  | { readonly kind: "account_suspended" };

/** Why a listing action was refused, each one a designed state in B-07 or B-19. */
export type ListingActionOutcome =
  | { readonly kind: "ok"; readonly listing: ListingDraft }
  | { readonly kind: "blocked"; readonly reason: ListingBlockReason; readonly blockers: readonly PublishBlocker[] };

export type ListingBlockReason =
  | "incomplete"
  | "not_verified"
  | "no_subscription"
  | "subscription_expired"
  | "account_suspended"
  | "publication_not_decided";

/**
 * Listings (B-07 to B-15).
 *
 * `publish` is the one operation that crosses into the public portal, and the
 * rule it applies is the one part of this that IS defined: an active
 * subscription is required to publish. Whether a listing that is ALREADY live
 * stays up when the subscription lapses is a different question, it is D-02, and
 * it is not decided — so nothing here hides or deletes anything on expiry, and
 * B-05 presents the three alternatives to the client instead.
 *
 * Whether listings are reviewed before or after publishing is D-10 and is also
 * open. This publishes directly and says so, rather than inventing a moderation
 * queue that nobody has agreed to staff.
 */
export interface ListingService {
  list(filter?: { status?: ListingStatus }): Promise<readonly ListingSummary[]>;
  get(id: string): Promise<ListingDraft | null>;
  create(): Promise<ListingDraft>;
  saveSection(input: {
    id: string;
    section: ListingSectionId;
    values: Readonly<Record<string, string | readonly string[] | boolean | null>>;
  }): Promise<ListingDraft>;
  sections(id: string): Promise<readonly ListingSectionState[]>;
  /** What stops this listing being published, in section order. */
  publishBlockers(id: string): Promise<readonly PublishBlocker[]>;
  publish(id: string): Promise<ListingActionOutcome>;
  unpublish(id: string): Promise<ListingActionOutcome>;
  remove(id: string): Promise<{ removed: boolean }>;
}

/** Enquiries on the Builder's own listings (B-16 to B-18). */
export interface BuilderEnquiryService {
  list(filter?: { unreadOnly?: boolean; kind?: "enquiry" | "site_visit" }): Promise<readonly BuilderEnquiry[]>;
  get(id: string): Promise<BuilderEnquiry | null>;
  markRead(id: string): Promise<void>;
  unreadCount(): Promise<number>;
  /**
   * The contact-access rule currently in force (D-05 / Q-2a), as a state.
   *
   * It returns a state rather than a mode because "no rule has been chosen"
   * is a real answer and not a missing one. `selectedMode` is null in that
   * case, and a screen renders `label` instead of picking an alternative to
   * display.
   */
  contactAccessMode(): Promise<ContactAccessState>;
  /** Alternative B only. Spends credits to reveal one enquiry's contact. */
  unlockContact(input: { id: string; idempotencyKey: string }): Promise<
    | { readonly kind: "unlocked"; readonly enquiry: BuilderEnquiry; readonly duplicate: boolean }
    | { readonly kind: "insufficient_credits"; readonly priceCredits: number; readonly balanceCredits: number }
    | { readonly kind: "not_applicable" }
  >;
}

/**
 * Centrally maintained location records (CR05).
 *
 * The hierarchy is India → State → City → Area, launching with India → West
 * Bengal → Kolkata → Area. Components never carry their own city or locality
 * lists: every picker is fed through this service, so adding a record is a
 * data change, not a code change across screens. Identifiers are stable —
 * a saved filter or URL refers to a record id, never a display name.
 *
 * The same model serves property search, listing forms, marketplace filters
 * and lead requests.
 */
export interface LocationService {
  /** The launch chain, root-first: country, state, city. */
  launchChain(): Promise<readonly LocationNode[]>;
  /** Direct children of a node — states of a country, cities of a state, areas of a city. */
  children(parentId: string): Promise<readonly LocationNode[]>;
  /**
   * Picker options for a city's areas: record id plus a composed display
   * label ("Action Area I, New Town"), optionally narrowed by a name query.
   *
   * The narrowing runs server-side. A small launch set may ship whole and be
   * filtered by the picker; a large record set must be narrowed here — the
   * browser is never the store of record.
   */
  areaOptions(input: {
    cityId: string;
    query?: string;
  }): Promise<ReadonlyArray<{ readonly id: string; readonly label: string }>>;
  /** The display path of names, city-first: ["Kolkata", "New Town", "Action Area I"]. */
  displayPath(locationId: string): Promise<readonly string[]>;
  /** Resolves ids to records. Unknown ids are omitted, never invented. */
  getMany(ids: readonly string[]): Promise<readonly LocationNode[]>;
}

/**
 * CR03 — "Request Leads": a Seller describes the leads they need.
 *
 * Separate from `LeadMarketService` on purpose: a request is not a purchase of
 * an available lead, not a paid order, and not an entitlement to contact
 * details. Whether an accepted request becomes a quote or an order is
 * change-confirmation decision 3 — open.
 *
 * The requester is never an input. The service associates the authenticated
 * account from the session server-side; a form that could name the account
 * would let one Seller file requests as another. In the sample build the
 * identity is the single sample Seller, and the screens say so.
 *
 * The field set and status names are the confirmation document's proposal
 * (decision 2), labelled as proposed on the screens.
 */
export interface LeadRequestService {
  /**
   * Files a request. Idempotent on `idempotencyKey`: a double submit or a
   * retried POST returns the first request's reference and records nothing
   * new. Validation failures throw a `ValidationError` naming the fields.
   */
  create(input: {
    idempotencyKey: string;
    /** At least one location-record id (CR05). Unknown ids are rejected. */
    areaIds: readonly string[];
    propertyType: string | null;
    configurations: readonly string[];
    budgetBand: string | null;
    intent: "buy" | "rent" | null;
    quantity: number | null;
    timing: string | null;
    notes: string | null;
  }): Promise<{ readonly requestId: string; readonly reference: string; readonly duplicate: boolean }>;
  /** The requester's own requests, newest first. */
  listMine(): Promise<readonly LeadRequest[]>;
  /**
   * One of the requester's own requests. Throws `not_found` when the id does
   * not exist **or belongs to somebody else** — the two are indistinguishable
   * to the caller, so ownership cannot be probed by guessing ids.
   */
  getMine(id: string): Promise<LeadRequest>;
}

/**
 * CR02 — the individual owner's posting journey.
 *
 * Separate from the Builder's listing service on purpose. An owner is not a
 * subscriber and not a lead buyer: there is no subscription to check, no
 * credit to spend, and no publish action, because nothing an owner submits
 * goes live by itself. `submit` moves a draft into the moderation queue and
 * does nothing else — it charges nothing and publishes nothing.
 *
 * The owner is never an input. The service associates the account from the
 * server-side identity; in this build that is the single sample owner, and the
 * screens say so.
 */
export interface OwnerListingService {
  /** The owner's own listings, newest first — drafts and submitted alike. */
  listMine(): Promise<readonly OwnerListingSummary[]>;
  /**
   * One of the owner's own listings. Throws `not_found` when the id does not
   * exist **or belongs to somebody else**; the two are indistinguishable so
   * ownership cannot be probed by guessing ids.
   */
  getMine(id: string): Promise<OwnerListing>;
  /** Starts a new draft and returns it. Nothing is published and nothing is charged. */
  startDraft(input: { idempotencyKey: string }): Promise<OwnerListing>;
  /**
   * Saves one step's fields. Validation failures throw a `ValidationError`
   * naming the fields; a partly-filled draft is allowed, because an owner
   * filling in what they know first is the normal case.
   */
  saveStep(input: {
    listingId: string;
    step: OwnerListingStepId;
    values: Readonly<Record<string, string | readonly string[]>>;
  }): Promise<OwnerListing>;
  /** What still has to be filled in before the listing can be submitted. */
  blockers(listingId: string): Promise<readonly OwnerListingBlocker[]>;
  /**
   * Sends the listing for review. Idempotent on `idempotencyKey`: a double
   * submit or a retried POST returns the same listing rather than queueing it
   * twice. Refused, with the blockers, when anything required is missing.
   */
  submit(input: { listingId: string; idempotencyKey: string }): Promise<
    | { readonly ok: true; readonly listing: OwnerListing; readonly duplicate: boolean }
    | { readonly ok: false; readonly blockers: readonly OwnerListingBlocker[] }
  >;
  /** Takes a submitted listing back out of the queue. */
  withdraw(input: { listingId: string; reason: string }): Promise<OwnerListing>;
  /** The owner's reply to staff on their own listing. */
  reply(input: { listingId: string; body: string }): Promise<OwnerListing>;
}

/**
 * CR07 — verification, as a per-action question.
 *
 * Separate from the KYC submission service on purpose. That one is about a
 * document submission's state; this one answers "does this account need a check
 * for this action at all", which is the question the confirmed selective policy
 * turns on. `not_required` is an answer it can give, and it is never `verified`.
 *
 * The account is never an input. The service answers for the caller's own
 * identity; there is no parameter that could ask about somebody else.
 */
export interface VerificationService {
  /** What the caller needs, action by action, right now. */
  requirements(): Promise<readonly VerificationRequirement[]>;
  /** The caller's own cases. Empty for an account that has never needed one. */
  listMine(): Promise<readonly VerificationCase[]>;
  /**
   * Opens a case for an action that requires one. Throws when the action
   * requires nothing — a case that was never needed would put an account in a
   * queue it has no business being in.
   */
  start(action: GatedAction): Promise<VerificationCase>;
  /**
   * Sends the case to the verification service and records the answer. A result
   * that is unreadable, or a service that cannot be reached, becomes a case for
   * review — never a pass.
   */
  submit(reference: string): Promise<VerificationCase | null>;
}

export type Services = {
  readonly properties: PropertyService;
  readonly enquiries: EnquiryService;
  readonly profile: ProfileService;
  readonly notifications: NotificationService;
  readonly locations: LocationService;
  readonly sellerAccount: SellerAccountService;
  readonly leadMarket: LeadMarketService;
  readonly leadRequests: LeadRequestService;
  readonly ownerListings: OwnerListingService;
  readonly verification: VerificationService;
  readonly credits: CreditService;
  readonly support: SupportService;
  /**
   * The Builder console.
   *
   * Its marketplace, credits and support are the same interfaces the Seller
   * uses — the design says Builders get the same modules under Builder access —
   * but they are separate instances over separate records. A Builder and a
   * Seller are two accounts; sharing a ledger or a ticket list between them
   * would be a data leak wearing a convenience's clothes.
   */
  readonly builder: {
    readonly account: BuilderAccountService;
    readonly listings: ListingService;
    readonly enquiries: BuilderEnquiryService;
    readonly leadMarket: LeadMarketService;
    readonly credits: CreditService;
    readonly support: SupportService;
  };
  /**
   * The staff console (A-01 to A-31).
   *
   * One service rather than a tree, because Admin is one role looking at every
   * other role's records — splitting it by area would only mirror the
   * navigation, and the joins run across those areas anyway.
   */
  readonly admin: AdminService;
  /** True when these are fixtures. Screens use it to label simulated actions. */
  readonly isSample: boolean;
};

// ------------------------------------------------------------------- admin --

/**
 * The staff console (A-01 to A-31).
 *
 * Every method that changes something takes the **actor** and the **subject**
 * explicitly. That is the shape the brief asks for and it is worth saying what
 * it does and does not buy:
 *
 * - It makes the account a service operates on a parameter rather than an
 *   ambient assumption, so a call site names whose records are about to change.
 * - It does **not** authorize anything. A `StaffRef` is a value, not a proven
 *   claim. A real implementation derives the actor from an authenticated
 *   session on the server and checks permissions on every call; it must never
 *   accept one from a request body, which is exactly what this signature would
 *   otherwise invite. See `src/lib/domain/identity.ts`.
 *
 * Mutations return a result rather than throwing, because every one of them can
 * fail for a reason the person can fix — usually that they did not say why.
 */
export interface AdminService {
  // A-02
  dashboard(): Promise<{
    readonly queues: readonly QueueTile[];
    readonly volumes: readonly { label: string; value: string }[];
    readonly alerts: readonly DashboardAlert[];
  }>;

  // A-03, A-04
  listAccounts(): Promise<readonly AdminAccount[]>;
  getAccount(accountId: string): Promise<AdminAccount | null>;
  setSuspension(input: {
    actor: StaffRef;
    accountId: string;
    suspended: boolean;
    reason: string;
    reasonCategory?: string;
  }): Promise<AdminActionResult>;

  // A-05, A-06, A-07
  listApplications(filter?: "pending" | "resubmitted" | "ageing"): Promise<readonly KycApplication[]>;
  getApplication(id: string): Promise<KycApplication | null>;
  setDocumentVerdict(input: {
    applicationId: string;
    documentKey: string;
    verdict: "ok" | "problem";
  }): Promise<void>;
  toggleCheck(input: { applicationId: string; checkKey: string }): Promise<void>;
  decideApplication(input: {
    actor: StaffRef;
    applicationId: string;
    decision: "approved" | "rejected" | "resubmit";
    reason: string;
  }): Promise<AdminActionResult>;

  // A-08, A-09
  listListings(filter?: "reported" | "published" | "unpublished"): Promise<readonly ModeratedListing[]>;
  getListing(id: string): Promise<ModeratedListing | null>;
  moderateListing(input: {
    actor: StaffRef;
    listingId: string;
    action: "unpublish" | "dismiss_report";
    reason: string;
  }): Promise<AdminActionResult>;

  // A-10 to A-14
  intake(): Promise<{
    readonly sources: readonly { value: number; label: string; note: string }[];
    readonly runs: readonly IntakeRun[];
  }>;
  getIntakeRun(id: string): Promise<{
    readonly run: IntakeRun;
    readonly rejections: readonly IntakeRejection[];
  } | null>;
  listLeads(state?: AdminLead["state"]): Promise<readonly AdminLead[]>;
  getLead(id: string): Promise<AdminLead | null>;
  priceBands(): Promise<readonly { band: string; priceInr: number; saleInr: number }[]>;

  /**
   * CR03 — the lead-requests queue. Staff see the same record the Seller sees,
   * plus the requester and the internal notes.
   *
   * `respondToLeadRequest` keeps the support console's rule: a public reply
   * lands on the requester's record; an internal note is stored for staff only
   * and no requester-facing type can carry one.
   *
   * `setLeadRequestStatus` appends to the status history rather than
   * overwriting, so the record shows how it arrived where it is. The status
   * names themselves are the confirmation document's proposal (decision 2).
   */
  listLeadRequests(filter?: {
    status?: LeadRequestStatus;
    areaId?: string;
  }): Promise<readonly AdminLeadRequest[]>;
  getLeadRequest(id: string): Promise<AdminLeadRequest | null>;
  respondToLeadRequest(input: {
    actor: StaffRef;
    requestId: string;
    body: string;
    internal: boolean;
  }): Promise<AdminActionResult>;
  setLeadRequestStatus(input: {
    actor: StaffRef;
    requestId: string;
    status: LeadRequestStatus;
    note?: string;
  }): Promise<AdminActionResult>;

  /**
   * CR02 — the owner-submission queue.
   *
   * Staff see the listing the owner sees, plus the owner label and the staff
   * notes. There is no publish action here either: `clear` records that review
   * found nothing wrong, and stops. Publication is governed by the owner
   * policy (D-10, D-18) and is not staff's to grant while that is open.
   *
   * Every decision carries a reason, and each one appends to the listing's
   * history rather than overwriting it.
   */
  listOwnerListings(filter?: {
    status?: OwnerListingStatus;
  }): Promise<readonly AdminOwnerListing[]>;
  getOwnerListing(id: string): Promise<AdminOwnerListing | null>;
  respondToOwnerListing(input: {
    actor: StaffRef;
    listingId: string;
    body: string;
    internal: boolean;
  }): Promise<AdminActionResult>;
  decideOwnerListing(input: {
    actor: StaffRef;
    listingId: string;
    decision: "in_review" | "changes_requested" | "cleared" | "declined";
    reason: string;
  }): Promise<AdminActionResult>;

  /**
   * CR07 — verification cases, split.
   *
   * `attention` is what a person must act on; `routine` is what the provider is
   * still working on. Two lists rather than one with a filter, because a queue
   * that mixes them buries the cases that need someone — and because a routine
   * case must not look like a backlog.
   */
  verificationQueues(): Promise<{
    readonly attention: readonly VerificationCase[];
    readonly routine: readonly VerificationCase[];
  }>;
  getVerificationCase(reference: string): Promise<VerificationCase | null>;
  /**
   * A staff decision. The reason is mandatory: this is the screen where
   * somebody's identity is accepted or refused, and a decision nobody can
   * review later is not a decision.
   */
  decideVerificationCase(input: {
    actor: StaffRef;
    reference: string;
    outcome: "verified" | "failed" | "needs_review" | "expired";
    reason: string;
  }): Promise<AdminActionResult>;

  // A-16 to A-21
  listOrders(filter?: "delivered" | "failed"): Promise<readonly AdminOrder[]>;
  getOrder(id: string): Promise<AdminOrder | null>;
  listWallets(): Promise<readonly AdminWallet[]>;
  walletLedger(accountId: string): Promise<readonly AdminLedgerRow[]>;
  adjustCredits(input: {
    actor: StaffRef;
    accountId: string;
    direction: "credit" | "debit";
    amountInr: number;
    reason: string;
  }): Promise<AdminActionResult>;
  listRefunds(): Promise<readonly RefundRequest[]>;
  decideRefund(input: {
    actor: StaffRef;
    refundId: string;
    decision: "approved" | "declined";
    reason: string;
  }): Promise<AdminActionResult>;
  listSubscriptions(filter?: AdminSubscription["state"]): Promise<readonly AdminSubscription[]>;

  // A-22, A-23
  listTickets(filter?: AdminTicketFilter): Promise<readonly AdminTicket[]>;
  getThread(reference: string): Promise<AdminThread | null>;
  replyToTicket(input: {
    actor: StaffRef;
    reference: string;
    body: string;
    internal: boolean;
  }): Promise<AdminActionResult>;
  resolveTicket(input: {
    actor: StaffRef;
    reference: string;
    reason: string;
  }): Promise<AdminActionResult>;

  // A-24 to A-28
  voice(): Promise<{
    readonly stats: readonly { value: number; label: string; note: string }[];
    readonly calls: readonly VoiceCall[];
  }>;
  getCall(id: string): Promise<VoiceCall | null>;
  whatsapp(): Promise<{
    readonly funnel: readonly WhatsAppStep[];
    readonly conversations: readonly WhatsAppConversation[];
  }>;
  /**
   * A-28. Read-only, and there is no writing counterpart in this interface.
   *
   * The approved design makes consent and suppression a record staff consult,
   * not one they edit: a suppression is created by the person who refused, and
   * removing one is not a staff decision. There is deliberately no
   * `removeSuppression` here for a screen to reach for later.
   */
  consent(): Promise<{
    readonly suppression: readonly SuppressionEntry[];
    readonly effects: readonly string[];
    readonly bases: readonly ConsentBasis[];
  }>;
  listNotifications(filter?: NotificationRecord["state"]): Promise<readonly NotificationRecord[]>;

  // A-29 to A-31
  funnelReport(): Promise<readonly { label: string; value: number; percent: number }[]>;
  listAudit(category?: AuditCategory): Promise<readonly AuditEntry[]>;
  getAudit(id: string): Promise<AuditEntry | null>;
  system(): Promise<{
    readonly integrations: readonly Integration[];
    readonly failures: readonly JobFailure[];
  }>;
}
