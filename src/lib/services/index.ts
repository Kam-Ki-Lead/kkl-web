import { runtimeConfig } from "@/lib/config/runtime";
import type { Services } from "./contracts";
import { sampleServices } from "./sample/sample-services";

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
    return sampleServices;
  }

  throw new Error(
    "NEXT_PUBLIC_KKL_DATA_SOURCE=api, but the kkl-backend API client is not implemented yet. " +
      "It is blocked on kkl-backend publishing its versioned OpenAPI spec. kkl-web does not " +
      "fall back to sample data.",
  );
}

export { ServiceError } from "./contracts";
export type * from "./contracts";
