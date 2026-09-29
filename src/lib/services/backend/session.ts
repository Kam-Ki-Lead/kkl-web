import { ServiceError } from "@/lib/services/contracts";
import { processState } from "@/lib/services/sample/process-state";

/**
 * One way to reach kkl-backend as one of the sample identities.
 *
 * Slice A built real authentication — mobile number, one-time code, hashed
 * sessions with rotation — and nobody can use it, because no provider delivers
 * a code (open-dependencies.md Q-7) and kkl-web has no sign-in screen. So
 * every adapter here obtains a session from kkl-backend's **development
 * identity issuer**, which invents an account for a name.
 *
 * That is worth restating wherever it is used: the isolation between these
 * accounts is real and enforced by the database, and the proof of identity in
 * front of it is not. Durable storage and row-level policies do not add up to
 * production authentication.
 *
 * Everything here runs on the server. The shared secret and the backend's
 * address never reach a browser.
 */


/**
 * Next throws from `fetch` to say "this route cannot be prerendered". That is
 * control flow, not an outage, and swallowing it turned a static-rendering
 * mistake into "the service is not responding" — which sent me looking at the
 * backend while the page was the problem.
 */
export function isFrameworkSignal(cause: unknown): boolean {
  const digest = (cause as { digest?: unknown } | null)?.digest;
  return typeof digest === "string"
    && (digest === "DYNAMIC_SERVER_USAGE" || digest.startsWith("NEXT_"));
}

export type BackendRole = "buyer" | "owner" | "seller" | "builder" | "staff";

export type BackendAccess = {
  readonly baseUrl: string;
  readonly devAuthSecret: string;
  readonly refs: Readonly<Record<BackendRole, string>>;
};

const LABELS: Record<BackendRole, string> = {
  buyer: "Ritwik Sen",
  owner: "Arindam Basu",
  seller: "Sujata Pal · Sen Properties",
  builder: "Ranjan Builders",
  staff: "A. Dutta · Operations",
};

function read(name: string): string | undefined {
  const raw = process.env[name];
  return raw === undefined || raw.trim() === "" ? undefined : raw.trim();
}

/**
 * Address and secret, shared by every domain that has moved. A domain may
 * point somewhere of its own, but in practice one backend serves all of them,
 * so the lead-request variables are the fallback rather than a second copy.
 */
export function backendAccess(): BackendAccess {
  const baseUrl = read("KKL_BACKEND_BASE_URL") ?? read("KKL_LEAD_REQUESTS_BASE_URL");
  if (baseUrl === undefined) {
    throw new Error(
      "A backend-served domain is switched on but KKL_BACKEND_BASE_URL (or " +
        "KKL_LEAD_REQUESTS_BASE_URL) is not set. kkl-web does not fall back to sample data " +
        "when a real service is unconfigured.",
    );
  }
  const devAuthSecret = read("KKL_BACKEND_DEV_SECRET") ?? read("KKL_LEAD_REQUESTS_DEV_SECRET");
  if (devAuthSecret === undefined) {
    throw new Error(
      "A backend-served domain is switched on but no development-authenticator secret is set. " +
        "kkl-backend has no usable production authenticator yet (Q-7: no one-time-code delivery " +
        "provider is selected), so kkl-web identifies itself through the development issuer. " +
        "This secret is server-side only and must never be given a NEXT_PUBLIC_ prefix.",
    );
  }
  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    devAuthSecret,
    refs: {
      buyer: read("KKL_BACKEND_BUYER_REF") ?? "kkl-web:sample-buyer",
      owner: read("KKL_BACKEND_OWNER_REF") ?? "kkl-web:sample-owner",
      seller: read("KKL_LEAD_REQUESTS_SELLER_REF") ?? "kkl-web:sample-seller",
      builder: read("KKL_BACKEND_BUILDER_REF") ?? "kkl-web:sample-builder",
      staff: read("KKL_LEAD_REQUESTS_STAFF_REF") ?? "kkl-web:sample-staff",
    },
  };
}

type SessionCache = Partial<Record<BackendRole, string | null>>;

/**
 * Cached per process, not per module: two import paths to the same module gave
 * two module instances once already, and a second cache is a second session
 * for no reason.
 */
const sessions = (): SessionCache => processState<SessionCache>("kkl.backend.sessions", () => ({}));

async function issueSession(access: BackendAccess, role: BackendRole): Promise<string> {
  const response = await fetch(`${access.baseUrl}/v1/dev/sessions`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-kkl-dev-secret": access.devAuthSecret },
    body: JSON.stringify({ externalRef: access.refs[role], displayName: LABELS[role], role }),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new ServiceError(
      "unavailable",
      `kkl-backend refused a ${role} session (HTTP ${response.status}). Check the backend ` +
        "address and the development-authenticator secret.",
    );
  }
  return ((await response.json()) as { token: string }).token;
}

async function tokenFor(access: BackendAccess, role: BackendRole): Promise<string> {
  const cache = sessions();
  const existing = cache[role];
  if (existing !== undefined && existing !== null) return existing;
  const token = await issueSession(access, role);
  cache[role] = token;
  return token;
}

export type BackendResponse<T> = { readonly status: number; readonly body: T };

export type BackendProblem = {
  error?: string;
  code?: string;
  field?: string;
  blockers?: ReadonlyArray<{ field: string; message: string }>;
};

/**
 * One request as one identity, with a single retry when a cached session has
 * expired or been revoked. Nothing else is retried: a failed write must not be
 * replayed blindly, and the writes here carry idempotency keys or are
 * naturally additive.
 */
export async function callAs<T>(
  role: BackendRole,
  path: string,
  { method = "GET", body }: { method?: string; body?: unknown } = {},
): Promise<BackendResponse<T & BackendProblem>> {
  const access = backendAccess();
  const attempt = async (token: string) =>
    fetch(`${access.baseUrl}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });

  let response: Response;
  try {
    response = await attempt(await tokenFor(access, role));
    if (response.status === 401) {
      sessions()[role] = null;
      response = await attempt(await tokenFor(access, role));
    }
  } catch (cause) {
    // Next signals "this route cannot be static" by throwing from fetch.
    // Catching that and reporting it as an outage hid a real cause once
    // already: the page was prerendered, not the backend down.
    if (isFrameworkSignal(cause)) throw cause;
    // Logged, not surfaced: the cause carries the backend's address.
    console.error("[kkl-web] kkl-backend unreachable", cause);
    throw new ServiceError(
      "unavailable",
      "That service is not responding. These records live in kkl-backend and are not served " +
        "from this process.",
    );
  }

  const text = await response.text();
  const parsed = text ? (JSON.parse(text) as T & BackendProblem) : ({} as T & BackendProblem);
  return { status: response.status, body: parsed };
}
