import type {
  BillingDetails,
  BuyerEnquiry,
  BuyerNotification,
  BuilderAccount,
  BuilderAlertPreferences,
  BuilderEnquiry,
  BuilderSubscription,
  BuyerProfile,
  ContactAccessMode,
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
  readonly area?: string;
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
    readonly areas: readonly string[];
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
  /** B-02. Moves to `pending`; never approves. Approval is A-06's. */
  submitVerification(input: {
    panNumber: string;
    hasPanDocument: boolean;
    hasCompanyDocument: boolean;
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
  | "account_suspended";

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
  /** The contact-access alternative currently in force (D-05). */
  contactAccessMode(): Promise<ContactAccessMode>;
  /** Alternative B only. Spends credits to reveal one enquiry's contact. */
  unlockContact(input: { id: string; idempotencyKey: string }): Promise<
    | { readonly kind: "unlocked"; readonly enquiry: BuilderEnquiry; readonly duplicate: boolean }
    | { readonly kind: "insufficient_credits"; readonly priceCredits: number; readonly balanceCredits: number }
    | { readonly kind: "not_applicable" }
  >;
}

export type Services = {
  readonly properties: PropertyService;
  readonly enquiries: EnquiryService;
  readonly profile: ProfileService;
  readonly notifications: NotificationService;
  readonly sellerAccount: SellerAccountService;
  readonly leadMarket: LeadMarketService;
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
  /** True when these are fixtures. Screens use it to label simulated actions. */
  readonly isSample: boolean;
};
