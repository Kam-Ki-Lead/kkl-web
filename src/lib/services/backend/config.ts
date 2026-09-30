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

// ---------------------------------------------------------------------------
// Slice B — where location records come from.
//
// A second narrow switch, for the same reason the first one exists: kkl-backend
// now serves locations, and nothing else that kkl-web needs. Moving the whole
// application to `api` would take the public portal, the marketplace and the
// wallet with it, and those services do not exist yet.
//
// There is no fallback here either. If the switch says backend and the backend
// cannot be reached, location pickers fail loudly. A picker that quietly serves
// a stale in-memory list while staff believe they are maintaining the real one
// is the same class of lie as a simulated purchase.
// ---------------------------------------------------------------------------

export type LocationStoreKind = "sample" | "backend";

export type LocationBackendConfig = {
  readonly baseUrl: string;
  /**
   * The city the portal launches in. Configuration, not a constant: the tree
   * has a country and a state above it and other cities beside it, and none of
   * that is compiled in.
   */
  readonly launchCityId: string;
};

export function locationStoreKind(): LocationStoreKind {
  return read("KKL_LOCATIONS") === "backend" ? "backend" : "sample";
}

export function locationBackendConfig(): LocationBackendConfig {
  const baseUrl = read("KKL_LOCATIONS_BASE_URL") ?? read("KKL_LEAD_REQUESTS_BASE_URL");
  if (baseUrl === undefined) {
    throw new Error(
      "KKL_LOCATIONS=backend requires KKL_LOCATIONS_BASE_URL (or KKL_LEAD_REQUESTS_BASE_URL) " +
        "pointing at kkl-backend. kkl-web does not fall back to the sample location records " +
        "when the backend is unconfigured — staff would be maintaining records nobody reads.",
    );
  }
  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    launchCityId: read("KKL_LOCATIONS_LAUNCH_CITY") ?? "in-wb-kol",
  };
}

// ---------------------------------------------------------------------------
// Slices B and C — profiles and listings.
//
// Two more narrow switches, on the same principle: a domain moves to
// kkl-backend when kkl-backend serves it, and the platform-wide `api` flag
// stays off until every service exists. Each is explicit, each is documented
// in kkl-backend/docs/phase-3/integration.md, and none of them falls back to
// sample data when the real service is unreachable.
// ---------------------------------------------------------------------------

export function profileStoreKind(): "sample" | "backend" {
  return read("KKL_PROFILES") === "backend" ? "backend" : "sample";
}

export function listingStoreKind(): "sample" | "backend" {
  return read("KKL_LISTINGS") === "backend" ? "backend" : "sample";
}

export function enquiryStoreKind(): "sample" | "backend" {
  return read("KKL_ENQUIRIES") === "backend" ? "backend" : "sample";
}

// ---------------------------------------------------------------------------
// Slices E and F — the marketplace, the wallet and orders; and the recipient's
// enquiry inbox.
//
// Two more narrow switches, for the same reason as the five before them. What
// is different about these is what moving them buys: the commercial actions
// behind them refuse, because no lead price is configured (Q-1a) and no
// payment credentials exist (Q-5).
//
// That is the point of connecting them anyway. A screen wired to kkl-backend
// says "not priced yet" because the service said so; the same screen on
// fixtures shows a plausible ₹1,200 that somebody will eventually quote back
// as a decision. Sample mode stays available and stays labelled, for review;
// backend mode is the one that tells the truth about what is settled.
// ---------------------------------------------------------------------------

export function marketplaceStoreKind(): "sample" | "backend" {
  return read("KKL_MARKETPLACE") === "backend" ? "backend" : "sample";
}

export function builderEnquiryStoreKind(): "sample" | "backend" {
  return read("KKL_BUILDER_ENQUIRIES") === "backend" ? "backend" : "sample";
}

// ---------------------------------------------------------------------------
// Slice G — support tickets and in-app notifications.
//
// Two more narrow switches. What is different about these: they need no open
// decision and no missing credential to be useful. A ticket is a durable
// conversation, and a notification record is a durable record; neither waits
// on a price or a provider.
//
// Delivery does wait on a provider (Q-7), and it is a separate thing from
// both of them — the queue is visible through the same service and reports
// honestly that nothing has been sent.
// ---------------------------------------------------------------------------

export function supportStoreKind(): "sample" | "backend" {
  return read("KKL_SUPPORT") === "backend" ? "backend" : "sample";
}

export function notificationStoreKind(): "sample" | "backend" {
  return read("KKL_NOTIFICATIONS") === "backend" ? "backend" : "sample";
}

// ---------------------------------------------------------------------------
// Slice G — verification cases.
//
// One switch, moving both sides at once: the customer's own case screens and
// the staff queues. Half of it would be worse than neither, because a person
// waiting on a durable case that staff read in a sample queue is waiting on
// nobody.
//
// What this does not need is a provider. The case, its history, the policy it
// was judged under and the staff workflow are all real without one; what a
// provider would add is the ability for a case to *pass*, which is Q-4.
// ---------------------------------------------------------------------------

export function verificationStoreKind(): "sample" | "backend" {
  return read("KKL_VERIFICATION") === "backend" ? "backend" : "sample";
}
