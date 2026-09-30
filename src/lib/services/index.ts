import { runtimeConfig } from "@/lib/config/runtime";
import type { Services } from "./contracts";
import { sampleReviewControls, sampleServices } from "./sample/sample-services";
import {
  builderEnquiryStoreKind,
  enquiryStoreKind,
  leadRequestStoreKind,
  listingStoreKind,
  locationStoreKind,
  marketplaceStoreKind,
  notificationStoreKind,
  profileStoreKind,
  supportStoreKind,
  verificationStoreKind,
  adminOperationsStoreKind,
} from "./backend/config";
import { backendAdminLeadRequests, backendLeadRequests } from "./backend/lead-requests";
import { backendLocations } from "./backend/locations";
import { backendProfile } from "./backend/profile";
import { backendEnquiries } from "./backend/enquiries";
import { backendAdminOwnerListings, backendOwnerListings } from "./backend/owner-listings";
import { backendCredits, backendLeadMarket } from "./backend/commerce";
import { backendBuilderEnquiries } from "./backend/builder-enquiries";
import { backendSupport } from "./backend/support";
import { backendAdminAudit, backendAdminSupport } from "./backend/admin-support";
import { backendNotifications } from "./backend/notifications";
import { backendVerification } from "./backend/verification";
import { backendAdminVerification } from "./backend/admin-verification";
import { backendAdminOperations } from "./backend/admin-operations";

/**
 * Resolves the service implementation once, from runtime configuration.
 *
 * There is no fallback. If the deployment asks for the real API, it gets the real
 * API or it fails — sample data never stands in for an unreachable backend,
 * because a simulated purchase or contact reveal presented as real is worse than
 * an outage.
 *
 * The API implementation does not exist yet: kkl-backend has not published its
 * versioned OpenAPI spec (see kkl-backend/docs/architecture.md §7). Until it does,
 * selecting `api` throws here rather than silently degrading.
 */
/**
 * The domains that may be served by kkl-backend, each behind its own switch.
 *
 * A list rather than nested calls. It was nine levels of parentheses by the
 * time slice G arrived, which is a shape that guarantees the next person
 * closes a bracket in the wrong place — as this one did. Order is
 * irrelevant: each decorator replaces the domains it owns and touches
 * nothing else.
 */
const BACKEND_DOMAINS = [
  withLeadRequestStore,
  withLocationStore,
  withProfileStore,
  withListingStore,
  withEnquiryStore,
  withMarketplaceStore,
  withBuilderEnquiryStore,
  withSupportStore,
  withNotificationStore,
  withVerificationStore,
  withAdminOperationsStore,
] as const;

export function getServices(): Services {
  if (runtimeConfig.dataSource === "sample") {
    return BACKEND_DOMAINS.reduce<Services>((services, apply) => apply(services), sampleServices);
  }

  throw new Error(
    "NEXT_PUBLIC_KKL_DATA_SOURCE=api, but the kkl-backend API client is not implemented yet. " +
      "It is blocked on kkl-backend publishing its versioned OpenAPI spec. kkl-web does not " +
      "fall back to sample data.",
  );
}

/**
 * CR03 — lead requests, and only lead requests, may come from kkl-backend while
 * every other service is still sample.
 *
 * The binary above is about the platform: `api` means kkl-backend serves
 * everything, and it does not yet serve anything else. CR03 is the one domain
 * the client requires to be *stored*, and no arrangement of frontend code can
 * satisfy that, so it is allowed to move on its own.
 *
 * This is a swap, not a fallback. When KKL_LEAD_REQUESTS=backend and the
 * backend cannot be reached, the screens report an error; they do not quietly
 * serve process memory and call the records stored.
 */
function withLeadRequestStore(services: Services): Services {
  if (leadRequestStoreKind() !== "backend") return services;
  return {
    ...services,
    leadRequests: backendLeadRequests,
    admin: { ...services.admin, ...backendAdminLeadRequests },
  };
}

/**
 * Slice B — location records may come from kkl-backend while everything else
 * is still sample, for the same reason lead requests may: kkl-backend serves
 * them, and moving the whole application to `api` would take the marketplace
 * and the wallet with it.
 *
 * A swap, not a fallback. With KKL_LOCATIONS=backend and the backend
 * unreachable, pickers fail; they do not quietly serve the sample records
 * while staff maintain the real ones.
 */
function withLocationStore(services: Services): Services {
  if (locationStoreKind() !== "backend") return services;
  return { ...services, locations: backendLocations };
}

/**
 * P-15's profile, served by kkl-backend when KKL_PROFILES=backend.
 *
 * The record moves; the identity in front of it does not. kkl-web still
 * identifies itself to kkl-backend through the development issuer, so this
 * makes the profile durable and account-scoped without making anybody
 * authenticated.
 */
function withProfileStore(services: Services): Services {
  if (profileStoreKind() !== "backend") return services;
  return { ...services, profile: backendProfile };
}

/**
 * CR02's owner journey and the Admin review of it, served by kkl-backend when
 * KKL_LISTINGS=backend. Both sides move together: an owner submitting into a
 * durable queue while staff read a sample one would be worse than either.
 */
function withListingStore(services: Services): Services {
  if (listingStoreKind() !== "backend") return services;
  return {
    ...services,
    ownerListings: backendOwnerListings,
    admin: { ...services.admin, ...backendAdminOwnerListings },
  };
}

/**
 * Buyer enquiries, served by kkl-backend when KKL_ENQUIRIES=backend.
 *
 * The record is durable and account-scoped. What it points at is still a
 * portal property, because nothing publishes, so kkl-backend marks the
 * enquiry unrouted rather than inventing a recipient — and no notification is
 * sent, because no channel exists.
 */
function withEnquiryStore(services: Services): Services {
  if (enquiryStoreKind() !== "backend") return services;
  return { ...services, enquiries: backendEnquiries };
}

/**
 * The marketplace, wallet and orders, served by kkl-backend when
 * KKL_MARKETPLACE=backend.
 *
 * Seller and Builder get separate instances over separate accounts, because
 * that is what they are: two accounts with two wallets and two order lists,
 * and a shared one would be a data leak wearing a convenience’s clothes.
 *
 * Every commercial action refuses today, by name and with its reason. That is
 * the service being honest, not the integration being incomplete.
 */
function withMarketplaceStore(services: Services): Services {
  if (marketplaceStoreKind() !== "backend") return services;
  return {
    ...services,
    leadMarket: backendLeadMarket("seller"),
    credits: backendCredits("seller"),
    builder: {
      ...services.builder,
      leadMarket: backendLeadMarket("builder"),
      credits: backendCredits("builder"),
    },
  };
}

/**
 * The recipient’s enquiry inbox, served by kkl-backend when
 * KKL_BUILDER_ENQUIRIES=backend.
 *
 * It renders the requirement and an explicit undecided contact state. No
 * mask, no unlock, no name — Q-2a has three candidate rules and none is
 * selected, and each of those three would be a different screen.
 */
function withBuilderEnquiryStore(services: Services): Services {
  if (builderEnquiryStoreKind() !== "backend") return services;
  return {
    ...services,
    builder: { ...services.builder, enquiries: backendBuilderEnquiries },
  };
}

/**
 * Support tickets, served by kkl-backend when KKL_SUPPORT=backend.
 *
 * Both sides move together — the requester’s screens and the staff queue.
 * A user raising a durable ticket that staff read in a sample queue would be
 * worse than either half alone, because the person would be waiting on a
 * reply nobody can see they are waiting for.
 */
function withSupportStore(services: Services): Services {
  if (supportStoreKind() !== "backend") return services;
  return {
    ...services,
    support: backendSupport("seller"),
    builder: { ...services.builder, support: backendSupport("builder") },
    admin: { ...services.admin, ...backendAdminSupport, ...backendAdminAudit },
  };
}

/**
 * In-app notifications, served by kkl-backend when KKL_NOTIFICATIONS=backend.
 *
 * The record is real. Whether a message reached anybody is a different claim,
 * and this service exposes no field that could be mistaken for it.
 */
function withNotificationStore(services: Services): Services {
  if (notificationStoreKind() !== "backend") return services;
  return { ...services, notifications: backendNotifications("buyer") };
}

/**
 * Verification cases, served by kkl-backend when KKL_VERIFICATION=backend.
 *
 * Both sides together: the customer’s cases and the staff queues. The
 * screens gain a real case with a real history; what they do not gain is a
 * way to pass one, because no provider is selected (Q-4) and no staff hand
 * may award it (undecided).
 */
function withVerificationStore(services: Services): Services {
  if (verificationStoreKind() !== "backend") return services;
  return {
    ...services,
    verification: backendVerification("seller"),
    admin: { ...services.admin, ...backendAdminVerification },
  };
}

/**
 * Wallet oversight, credit adjustments and the suppression list, served by
 * kkl-backend when KKL_ADMIN_OPERATIONS=backend.
 *
 * These are the staff consoles for capabilities that existed and that nothing
 * called. Lead intake (A-10, A-11) is not here on purpose: see
 * `adminOperationsStoreKind` for why connecting it would mean inventing
 * numbers the backend does not record.
 */
function withAdminOperationsStore(services: Services): Services {
  if (adminOperationsStoreKind() !== "backend") return services;
  return { ...services, admin: { ...services.admin, ...backendAdminOperations } };
}

export function adminOperationsStore(): "sample" | "backend" {
  return runtimeConfig.dataSource === "sample" ? adminOperationsStoreKind() : "backend";
}

export function verificationStore(): "sample" | "backend" {
  return runtimeConfig.dataSource === "sample" ? verificationStoreKind() : "backend";
}

export function supportStore(): "sample" | "backend" {
  return runtimeConfig.dataSource === "sample" ? supportStoreKind() : "backend";
}

export function notificationStore(): "sample" | "backend" {
  return runtimeConfig.dataSource === "sample" ? notificationStoreKind() : "backend";
}

/** Which store each backend-served domain is using, for the screens to say so. */
export function marketplaceStore(): "sample" | "backend" {
  return runtimeConfig.dataSource === "sample" ? marketplaceStoreKind() : "backend";
}

export function builderEnquiryStore(): "sample" | "backend" {
  return runtimeConfig.dataSource === "sample" ? builderEnquiryStoreKind() : "backend";
}

export function enquiryStore(): "sample" | "backend" {
  return runtimeConfig.dataSource === "sample" ? enquiryStoreKind() : "backend";
}

/** Which store each backend-served domain is using, for the screens to say so. */
export function profileStore(): "sample" | "backend" {
  return runtimeConfig.dataSource === "sample" ? profileStoreKind() : "backend";
}

export function listingStore(): "sample" | "backend" {
  return runtimeConfig.dataSource === "sample" ? listingStoreKind() : "backend";
}

/** Which store location records are coming from, for the screens to say so. */
export function locationStore(): "sample" | "backend" {
  return runtimeConfig.dataSource === "sample" ? locationStoreKind() : "backend";
}

/** Which store lead requests are currently coming from, for the screens to say so. */
export function leadRequestStore(): "sample" | "backend" {
  return runtimeConfig.dataSource === "sample" ? leadRequestStoreKind() : "backend";
}

/**
 * Review-only state controls, or null outside sample mode.
 *
 * Deliberately not part of the `Services` contract: a real implementation has no
 * equivalent and should not be asked to declare one. It is exported from here,
 * rather than imported from the sample store directly, because route handlers
 * and pages are bundled separately — two import paths to the same module gave
 * two module instances, and the review route's writes were invisible to the
 * pages. One path, one instance.
 */
export function getSampleReviewControls(): typeof sampleReviewControls | null {
  return runtimeConfig.isSampleMode ? sampleReviewControls : null;
}

export { ServiceError } from "./contracts";
export type * from "./contracts";
