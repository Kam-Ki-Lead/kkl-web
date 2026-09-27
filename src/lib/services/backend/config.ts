/**
 * CR03 — where lead requests are stored.
 *
 * kkl-web's data source is deliberately a binary: `sample` or `api`, with no
 * fallback, because a simulated purchase presented as real is worse than an
 * outage. That binary is about the *whole* platform, and kkl-backend has built
 * exactly one domain so far.
 *
 * CR03 is the domain the client asked to be stored permanently, so it gets its
 * own switch rather than waiting for every other service to have a backend. The
 * switch is narrow on purpose: it moves lead requests and nothing else.
 *
 * These variables have no `NEXT_PUBLIC_` prefix, so they are read from the
 * server process at request time and never inlined into a browser bundle. The
 * development-authenticator secret in particular must not reach a client.
 */

export type LeadRequestStoreKind = "sample" | "backend";

export type LeadRequestBackendConfig = {
  readonly baseUrl: string;
  /** Shared secret for kkl-backend's development authenticator, server-side only. */
  readonly devAuthSecret: string;
  readonly sellerRef: string;
  readonly staffRef: string;
};

function read(name: string): string | undefined {
  const raw = process.env[name];
  return raw === undefined || raw.trim() === "" ? undefined : raw.trim();
}

export function leadRequestStoreKind(): LeadRequestStoreKind {
  return read("KKL_LEAD_REQUESTS") === "backend" ? "backend" : "sample";
}

/**
 * Throws rather than returning null when the switch is on and the address is
 * missing. The alternative is falling back to process memory while the screens
 * say records are stored, which is the exact claim CR03 exists to stop.
 */
export function leadRequestBackendConfig(): LeadRequestBackendConfig {
  const baseUrl = read("KKL_LEAD_REQUESTS_BASE_URL");
  if (baseUrl === undefined) {
    throw new Error(
      "KKL_LEAD_REQUESTS=backend requires KKL_LEAD_REQUESTS_BASE_URL pointing at kkl-backend. " +
        "kkl-web does not fall back to the in-memory store when the lead-request backend is " +
        "unconfigured — that would report records as stored while they are not.",
    );
  }
  const devAuthSecret = read("KKL_LEAD_REQUESTS_DEV_SECRET");
  if (devAuthSecret === undefined) {
    throw new Error(
      "KKL_LEAD_REQUESTS=backend requires KKL_LEAD_REQUESTS_DEV_SECRET. kkl-backend has no " +
        "production authenticator yet (its architecture §4 specifies mobile OTP, which this " +
        "program's no-live-services boundary forbids), so kkl-web authenticates to it through " +
        "the development authenticator. This secret is server-side only and must never be " +
        "given a NEXT_PUBLIC_ prefix.",
    );
  }
  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    devAuthSecret,
    sellerRef: read("KKL_LEAD_REQUESTS_SELLER_REF") ?? "kkl-web:sample-seller",
    staffRef: read("KKL_LEAD_REQUESTS_STAFF_REF") ?? "kkl-web:sample-staff",
  };
}
