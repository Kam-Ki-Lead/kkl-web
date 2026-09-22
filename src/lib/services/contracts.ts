import type {
  BuyerEnquiry,
  BuyerNotification,
  BuyerProfile,
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
  /** A recorded enquiry by reference, for the confirmation screen. */
  getByReference(id: string): Promise<BuyerEnquiry | null>;
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

export type Services = {
  readonly properties: PropertyService;
  readonly enquiries: EnquiryService;
  readonly profile: ProfileService;
  readonly notifications: NotificationService;
  /** True when these are fixtures. Screens use it to label simulated actions. */
  readonly isSample: boolean;
};
