import type {
  BuyerEnquiry,
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
}

/**
 * Buyer enquiries.
 *
 * `submitEnquiry` is deliberately not "send a message to the builder" — it asks
 * kkl-backend to record an enquiry. Whether a notification is delivered, and what
 * it contains, is the backend's business and is not implied by the UI.
 */
export interface EnquiryService {
  submitEnquiry(input: {
    propertyId: string;
    kind: "enquiry" | "site_visit";
    name: string;
    mobile: string;
    message?: string;
    preferredDate?: string;
  }): Promise<{ readonly enquiryId: string }>;
  listMine(): Promise<readonly BuyerEnquiry[]>;
  getMine(id: string): Promise<BuyerEnquiry>;
}

export type Services = {
  readonly properties: PropertyService;
  readonly enquiries: EnquiryService;
  /** True when these are fixtures. Screens use it to label simulated actions. */
  readonly isSample: boolean;
};
