import { ServiceError } from "@/lib/services/contracts";
import { callAs } from "./session";
import {
  ADMIN_QUEUE_LIMIT,
  type KycApplicationView,
  type KycFilter,
  type KycPageView,
  type ModeratedPropertyView,
  type PropertyFilter,
  type PropertyPageView,
  isKycFilter,
  isPropertyFilter,
  readKycApplication,
  readKycPage,
  readModeratedProperty,
  readPropertyPage,
} from "./admin-queue-reading";

/**
 * Staff KYC applications and live-property moderation.
 *
 * KYC moves with `KKL_VERIFICATION`. The rows are required-action
 * verification cases from `GET /v1/admin/kyc/applications`.
 * `/admin/verification` stays the case workflow.
 *
 * Property review moves with `KKL_LISTINGS`. The rows are published and
 * unpublished listings from `GET /v1/admin/properties`. Drafts and owner
 * submissions stay on `/admin/owner-listings`.
 *
 * A failed read is a failure. It does not return the sample queues.
 */

export type QueueResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly message: string };

const SAMPLE_HIDDEN = "Sample records are not shown in their place.";

function failed(status: number, error: string | undefined, fallback: string): QueueResult<never> {
  return {
    ok: false,
    message: `${error ?? fallback} The service returned ${status}. ${SAMPLE_HIDDEN}`,
  };
}

function fromThrown(error: unknown): QueueResult<never> {
  if (typeof error === "object" && error !== null && "digest" in error) throw error;
  if (error instanceof ServiceError) {
    return { ok: false, message: `${error.message} ${SAMPLE_HIDDEN}` };
  }
  return { ok: false, message: `The queue could not be read. ${SAMPLE_HIDDEN}` };
}

function kycPath(filter: KycFilter, offset: number): string {
  const params = new URLSearchParams({
    filter,
    limit: String(ADMIN_QUEUE_LIMIT),
    offset: String(Math.max(0, offset)),
  });
  return `/v1/admin/kyc/applications?${params}`;
}

function propertyPath(filter: PropertyFilter, offset: number): string {
  const params = new URLSearchParams({
    filter,
    limit: String(ADMIN_QUEUE_LIMIT),
    offset: String(Math.max(0, offset)),
  });
  return `/v1/admin/properties?${params}`;
}

export async function loadKycApplications(
  filter: KycFilter,
  offset: number,
): Promise<QueueResult<KycPageView>> {
  try {
    const { status, body } = await callAs<unknown>("staff", kycPath(filter, offset));
    if (status !== 200) return failed(status, body.error, "The KYC queue could not be read.");
    const page = readKycPage(body);
    if (!page) {
      return { ok: false, message: `The KYC queue response could not be read. ${SAMPLE_HIDDEN}` };
    }
    return { ok: true, value: page };
  } catch (error) {
    return fromThrown(error);
  }
}

export async function loadKycApplication(
  reference: string,
): Promise<QueueResult<KycApplicationView | null>> {
  try {
    const { status, body } = await callAs<unknown>(
      "staff",
      `/v1/admin/kyc/applications/${encodeURIComponent(reference)}`,
    );
    if (status === 404) return { ok: true, value: null };
    if (status !== 200) return failed(status, body.error, "That application could not be read.");
    const application = readKycApplication(body);
    if (!application) {
      return { ok: false, message: `That application response could not be read. ${SAMPLE_HIDDEN}` };
    }
    return { ok: true, value: application };
  } catch (error) {
    return fromThrown(error);
  }
}

export async function decideKycApplication(input: {
  reference: string;
  decision: "rejected" | "resubmit" | "approved";
  reason: string;
}): Promise<QueueResult<KycApplicationView>> {
  try {
    const { status, body } = await callAs<unknown>(
      "staff",
      `/v1/admin/kyc/applications/${encodeURIComponent(input.reference)}/decision`,
      { method: "POST", body: { decision: input.decision, reason: input.reason } },
    );
    if (status !== 200) return failed(status, body.error, "That decision was not accepted.");
    const application = readKycApplication(body);
    if (!application) {
      return { ok: false, message: `The decision response could not be read. ${SAMPLE_HIDDEN}` };
    }
    return { ok: true, value: application };
  } catch (error) {
    return fromThrown(error);
  }
}

export async function loadModeratedProperties(
  filter: PropertyFilter,
  offset: number,
): Promise<QueueResult<PropertyPageView>> {
  try {
    const { status, body } = await callAs<unknown>("staff", propertyPath(filter, offset));
    if (status !== 200) return failed(status, body.error, "Property review could not be read.");
    const page = readPropertyPage(body);
    if (!page) {
      return { ok: false, message: `The property-review response could not be read. ${SAMPLE_HIDDEN}` };
    }
    return { ok: true, value: page };
  } catch (error) {
    return fromThrown(error);
  }
}

export async function loadModeratedProperty(
  listingId: string,
): Promise<QueueResult<ModeratedPropertyView | null>> {
  try {
    const { status, body } = await callAs<unknown>(
      "staff",
      `/v1/admin/properties/${encodeURIComponent(listingId)}`,
    );
    if (status === 404) return { ok: true, value: null };
    if (status !== 200) return failed(status, body.error, "That listing could not be read.");
    const listing = readModeratedProperty(body);
    if (!listing) {
      return { ok: false, message: `That listing response could not be read. ${SAMPLE_HIDDEN}` };
    }
    return { ok: true, value: listing };
  } catch (error) {
    return fromThrown(error);
  }
}

export async function moderateLiveProperty(input: {
  listingId: string;
  action: "unpublish" | "dismiss_report";
  reason: string;
}): Promise<QueueResult<ModeratedPropertyView>> {
  try {
    const { status, body } = await callAs<unknown>(
      "staff",
      `/v1/admin/properties/${encodeURIComponent(input.listingId)}/moderation`,
      { method: "POST", body: { action: input.action, reason: input.reason } },
    );
    if (status !== 200) return failed(status, body.error, "That moderation action was not accepted.");
    const listing = readModeratedProperty(body);
    if (!listing) {
      return { ok: false, message: `The moderation response could not be read. ${SAMPLE_HIDDEN}` };
    }
    return { ok: true, value: listing };
  } catch (error) {
    return fromThrown(error);
  }
}

export function selectedKycFilter(raw: string): KycFilter {
  return isKycFilter(raw) ? raw : "pending";
}

export function selectedPropertyFilter(raw: string): PropertyFilter {
  return isPropertyFilter(raw) ? raw : "published";
}

/**
 * Open-case total, and the ageing total when that second read succeeds.
 * A failed open-case read is not zero. A failed ageing read leaves the
 * open total in place and does not invent an age of zero.
 */
export async function loadKycCounts(): Promise<
  { ok: false } | { ok: true; open: number; ageing: number | null }
> {
  const [open, ageing] = await Promise.all([
    loadKycApplications("pending", 0),
    loadKycApplications("ageing", 0),
  ]);
  if (!open.ok) return { ok: false };
  return { ok: true, open: open.value.total, ageing: ageing.ok ? ageing.value.total : null };
}

export async function loadPropertyCount(): Promise<{ ok: false } | { ok: true; total: number }> {
  const page = await loadModeratedProperties("all", 0);
  if (!page.ok) return { ok: false };
  return { ok: true, total: page.value.total };
}

function sampleHidden(what: string): never {
  throw new ServiceError("unavailable", `${what} ${SAMPLE_HIDDEN}`);
}

/** Replaces the sample KYC methods so a missed branch cannot list fixture cases. */
export const backendAdminKycGuard = {
  async listApplications(): Promise<never> {
    sampleHidden("The KYC queue is read from verification cases.");
  },
  async getApplication(): Promise<never> {
    sampleHidden("That KYC application is read from its verification case.");
  },
  async setDocumentVerdict(): Promise<never> {
    sampleHidden("No identity document is collected, so a document cannot be marked.");
  },
  async toggleCheck(): Promise<never> {
    sampleHidden("No document checklist is confirmed, so a check cannot be ticked.");
  },
  async decideApplication(): Promise<never> {
    sampleHidden("A KYC decision is sent to the verification case.");
  },
};

/** Replaces the sample property-review methods so a missed branch cannot list fixture listings. */
export const backendAdminPropertyGuard = {
  async listListings(): Promise<never> {
    sampleHidden("Property review is read from published and unpublished listings.");
  },
  async getListing(): Promise<never> {
    sampleHidden("That listing is read from the live-property record.");
  },
  async moderateListing(): Promise<never> {
    sampleHidden("A takedown is sent to the live-property moderation path.");
  },
};
