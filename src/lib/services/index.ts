import { runtimeConfig } from "@/lib/config/runtime";
import type { Services } from "./contracts";
import { sampleReviewControls, sampleServices } from "./sample/sample-services";
import { leadRequestStoreKind } from "./backend/config";
import { backendAdminLeadRequests, backendLeadRequests } from "./backend/lead-requests";

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
export function getServices(): Services {
  if (runtimeConfig.dataSource === "sample") {
    return withLeadRequestStore(sampleServices);
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
