/**
 * Staff reads and writes for the provisional lead-price matrix.
 * A failed call stays a failure. Sample price bands are not substituted.
 */

import { ServiceError } from "@/lib/services/contracts";
import { callAs } from "./session";
import {
  pricingApplyPath,
  pricingFailure,
  pricingImpactPath,
  readApplication,
  readConfiguration,
  readOverview,
  readPreview,
  readVersionPage,
  type PricingApplicationView,
  type PricingConfigurationView,
  type PricingOverviewView,
  type PricingPreviewBody,
  type PricingPreviewView,
  type PricingSaveBody,
  type PricingVersionSummary,
} from "./provisional-pricing-reading";

function throwProblem(status: number, body: { error?: unknown; code?: unknown; field?: unknown }): never {
  const problem = pricingFailure(status, body);
  if (status === 403) throw new ServiceError("forbidden", problem.error);
  if (status === 404) throw new ServiceError("not_found", problem.error);
  if (status === 409 || status === 422) throw new ServiceError("validation", problem.error);
  throw new ServiceError(
    "unavailable",
    problem.error === `The pricing service returned ${status}.`
      ? "That service is not responding. These records live in kkl-backend and are not served from this process."
      : problem.error,
  );
}

function refused(message: string): ServiceError {
  return new ServiceError(
    "unavailable",
    message,
  );
}

export async function readPricingOverview(): Promise<PricingOverviewView> {
  const result = await callAs<Record<string, unknown>>("staff", "/v1/admin/pricing");
  if (result.status !== 200) throwProblem(result.status, result.body);
  const overview = readOverview(result.body);
  if (!overview) {
    throw refused("The pricing service returned a response this screen does not show.");
  }
  return overview;
}

export async function listPricingVersions(): Promise<PricingVersionSummary[]> {
  const result = await callAs<Record<string, unknown>>("staff", "/v1/admin/pricing/configurations");
  if (result.status !== 200) throwProblem(result.status, result.body);
  const versions = readVersionPage(result.body);
  if (!versions) throw refused("The pricing service returned a response this screen does not show.");
  return versions;
}

export async function readPricingConfiguration(id: string): Promise<PricingConfigurationView> {
  const result = await callAs<Record<string, unknown>>(
    "staff",
    `/v1/admin/pricing/configurations/${id}`,
  );
  if (result.status !== 200) throwProblem(result.status, result.body);
  const configuration = readConfiguration(result.body);
  if (!configuration) throw refused("The pricing service returned a response this screen does not show.");
  return configuration;
}

export async function savePricingConfiguration(body: PricingSaveBody): Promise<PricingConfigurationView> {
  const result = await callAs<Record<string, unknown>>("staff", "/v1/admin/pricing/configurations", {
    method: "POST",
    body,
  });
  if (result.status !== 201) throwProblem(result.status, result.body);
  const configuration = readConfiguration(result.body);
  if (!configuration) throw refused("The pricing service returned a response this screen does not show.");
  return configuration;
}

export async function previewPricing(body: PricingPreviewBody): Promise<PricingPreviewView> {
  const result = await callAs<Record<string, unknown>>("staff", "/v1/admin/pricing/preview", {
    method: "POST",
    body,
  });
  if (result.status !== 200) throwProblem(result.status, result.body);
  const preview = readPreview(result.body);
  if (!preview) throw refused("The pricing service returned a response this screen does not show.");
  return preview;
}

/**
 * What applying one saved version would change. This writes nothing.
 */
export async function readPricingImpact(configurationId: string): Promise<PricingApplicationView> {
  const result = await callAs<Record<string, unknown>>("staff", pricingImpactPath(configurationId), {
    method: "POST",
  });
  if (result.status !== 200) throwProblem(result.status, result.body);
  const impact = readApplication(result.body);
  if (!impact || impact.applied || impact.configurationId !== configurationId) {
    throw refused("The pricing service returned a response this screen does not show.");
  }
  return impact;
}

/**
 * Apply one saved version to unsold, unreserved leads.
 *
 * This is not a save and not a preview. The body is empty, so the exact
 * quote is used. A response that is not that application is not shown as a
 * completed update.
 */
export async function applyPricingToUnsold(configurationId: string): Promise<PricingApplicationView> {
  const result = await callAs<Record<string, unknown>>("staff", pricingApplyPath(configurationId), {
    method: "POST",
  });
  if (result.status !== 200) throwProblem(result.status, result.body);
  const applied = readApplication(result.body);
  if (!applied || !applied.applied || applied.configurationId !== configurationId) {
    throw refused("The pricing service returned a response this screen does not show.");
  }
  return applied;
}
