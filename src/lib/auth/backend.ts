import { AsyncLocalStorage } from "node:async_hooks";
import { cookies } from "next/headers";
import { ServiceError } from "@/lib/services/contracts";
import { isFrameworkSignal } from "@/lib/services/backend/session";
import { authBackendBaseUrl } from "@/lib/services/backend/config";
import {
  interpretAuthResponse,
  type AuthErrorBody,
  type AuthProblem,
} from "@/lib/auth/contract";
import {
  ACCESS_COOKIE,
  CHALLENGE_COOKIE,
  REFRESH_ATTEMPT_COOKIE,
  REFRESH_COOKIE,
  secondsUntil,
  sessionCookieOptions,
} from "@/lib/auth/cookies";

/**
 * Browser sessions against kkl-backend's published authenticator.
 *
 * This is not the development identity issuer. A code is requested, checked,
 * and exchanged for an access token plus a refresh token. The refresh token
 * is written only as an httpOnly cookie. Callers receive a profile with no
 * role: a role the browser supplied is not a role this process will repeat.
 *
 * When the service is unreachable the caller gets `unavailable`. Nothing in
 * this file accepts a code locally or serves a sample account instead.
 */

export class SessionStaleError extends Error {
  constructor() {
    super("The access token needs refreshing.");
    this.name = "SessionStaleError";
  }
}

export type ChallengeRecord = {
  readonly challengeId: string;
  readonly delivery: "local" | "other";
};

export type IssuedSession = {
  readonly accessToken: string;
  readonly refreshToken: string | null;
  readonly accessMaxAge: number;
  readonly refreshMaxAge: number | null;
};

export type SignedInProfile = {
  readonly displayName: string;
  readonly phone: string | null;
  readonly status: "active" | "suspended";
};

type CodeResponse = {
  challengeId?: unknown;
  expiresAt?: unknown;
  deliveryChannel?: unknown;
};

type SessionResponse = {
  accessToken?: unknown;
  expiresAt?: unknown;
  refreshToken?: unknown;
  refreshExpiresAt?: unknown;
};

const justIssued = new AsyncLocalStorage<string>();

const UNAVAILABLE: AuthProblem = {
  kind: "unavailable",
  message: "Verification is not available. Nothing was accepted in its place.",
};

async function readBody(response: Response): Promise<AuthErrorBody & Record<string, unknown>> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as AuthErrorBody & Record<string, unknown>;
  } catch {
    return {};
  }
}

async function postAuth(
  path: string,
  body: unknown,
  stage: "code" | "verify" | "refresh",
): Promise<{ ok: true; status: number; body: Record<string, unknown> } | { ok: false; problem: AuthProblem }> {
  let baseUrl: string;
  try {
    baseUrl = authBackendBaseUrl();
  } catch (cause) {
    console.error("[kkl-web] auth backend is not configured", cause);
    return { ok: false, problem: UNAVAILABLE };
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch (cause) {
    if (isFrameworkSignal(cause)) throw cause;
    console.error("[kkl-web] auth service unreachable", cause);
    return { ok: false, problem: UNAVAILABLE };
  }

  const parsed = await readBody(response);
  const problem = interpretAuthResponse(response.status, parsed, stage);
  if (problem) return { ok: false, problem };
  return { ok: true, status: response.status, body: parsed };
}

export async function requestAuthCode(
  phone: string,
): Promise<{ ok: true; challenge: ChallengeRecord } | { ok: false; problem: AuthProblem }> {
  const result = await postAuth("/v1/auth/code", { phone }, "code");
  if (!result.ok) return result;

  const body = result.body as CodeResponse;
  if (typeof body.challengeId !== "string" || typeof body.expiresAt !== "string") {
    return { ok: false, problem: UNAVAILABLE };
  }
  const maxAge = secondsUntil(body.expiresAt);
  if (maxAge === null) return { ok: false, problem: UNAVAILABLE };
  if (maxAge <= 0) {
    return {
      ok: false,
      problem: { kind: "invalid_code", message: "That code has expired. Request a new one." },
    };
  }

  const challenge: ChallengeRecord = {
    challengeId: body.challengeId,
    delivery: body.deliveryChannel === "local" ? "local" : "other",
  };
  const jar = await cookies();
  jar.set(CHALLENGE_COOKIE, JSON.stringify(challenge), sessionCookieOptions(maxAge));
  return { ok: true, challenge };
}

/** The challenge id stays in the httpOnly cookie. The form cannot substitute one. */
export async function readChallenge(): Promise<{ challengeId: string; delivery: "local" | "other" } | null> {
  const raw = (await cookies()).get(CHALLENGE_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { challengeId?: unknown; delivery?: unknown };
    if (typeof parsed.challengeId !== "string") return null;
    return {
      challengeId: parsed.challengeId,
      delivery: parsed.delivery === "local" ? "local" : "other",
    };
  } catch {
    return null;
  }
}

export async function clearChallenge(): Promise<void> {
  (await cookies()).set(CHALLENGE_COOKIE, "", sessionCookieOptions(0));
}

function issuedFrom(body: SessionResponse): IssuedSession | null {
  if (typeof body.accessToken !== "string" || typeof body.expiresAt !== "string") return null;
  const accessMaxAge = secondsUntil(body.expiresAt);
  if (accessMaxAge === null || accessMaxAge <= 0) return null;
  const refreshToken = typeof body.refreshToken === "string" ? body.refreshToken : null;
  const refreshMaxAge = typeof body.refreshExpiresAt === "string" ? secondsUntil(body.refreshExpiresAt) : null;
  if (refreshToken && (refreshMaxAge === null || refreshMaxAge <= 0)) return null;
  return { accessToken: body.accessToken, refreshToken, accessMaxAge, refreshMaxAge };
}

export async function writeSession(session: IssuedSession): Promise<void> {
  const jar = await cookies();
  jar.set(ACCESS_COOKIE, session.accessToken, sessionCookieOptions(session.accessMaxAge));
  if (session.refreshToken && session.refreshMaxAge) {
    jar.set(REFRESH_COOKIE, session.refreshToken, sessionCookieOptions(session.refreshMaxAge));
  } else {
    jar.set(REFRESH_COOKIE, "", sessionCookieOptions(0));
  }
  jar.set(CHALLENGE_COOKIE, "", sessionCookieOptions(0));
  jar.set(REFRESH_ATTEMPT_COOKIE, "", sessionCookieOptions(0));
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, CHALLENGE_COOKIE, REFRESH_ATTEMPT_COOKIE]) {
    jar.set(name, "", sessionCookieOptions(0));
  }
}

export async function exchangeCode(
  code: string,
): Promise<{ ok: true; session: IssuedSession } | { ok: false; problem: AuthProblem }> {
  const challenge = await readChallenge();
  if (!challenge) {
    return {
      ok: false,
      problem: {
        kind: "invalid_code",
        message: "That code has expired. Request a new one.",
      },
    };
  }
  const result = await postAuth(
    "/v1/auth/sessions",
    { challengeId: challenge.challengeId, code },
    "verify",
  );
  if (!result.ok) return result;
  const session = issuedFrom(result.body as SessionResponse);
  if (!session) return { ok: false, problem: UNAVAILABLE };
  return { ok: true, session };
}

/**
 * Run `fn` with the access token that was just issued, before the cookie
 * written in this action is visible to a later `cookies().get`.
 */
export function withIssuedAccess<T>(accessToken: string, fn: () => Promise<T>): Promise<T> {
  return justIssued.run(accessToken, fn);
}

export async function refreshSession(): Promise<boolean> {
  const refreshToken = (await cookies()).get(REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    console.error("[kkl-web] refresh: no refresh cookie on the request");
    return false;
  }
  const result = await postAuth("/v1/auth/sessions/refresh", { refreshToken }, "refresh");
  if (!result.ok) {
    console.error("[kkl-web] refresh refused", result.problem.kind);
    await clearSession();
    return false;
  }
  const session = issuedFrom(result.body as SessionResponse);
  if (!session) {
    console.error("[kkl-web] refresh response had no usable token");
    await clearSession();
    return false;
  }
  await writeSession(session);
  return true;
}

export async function hasBrowserSession(): Promise<boolean> {
  const jar = await cookies();
  return Boolean(jar.get(ACCESS_COOKIE)?.value || jar.get(REFRESH_COOKIE)?.value);
}

async function accessToken(): Promise<string | null> {
  return justIssued.getStore() ?? (await cookies()).get(ACCESS_COOKIE)?.value ?? null;
}

/**
 * One call as the browser's session. A 401 with a refresh cookie becomes
 * `SessionStaleError` so a Server Component can redirect to the refresh
 * route — a component cannot write the new cookies itself. No refresh
 * token leaves this function.
 */
export async function callAsSignedIn<T>(
  path: string,
  { method = "GET", body }: { method?: string; body?: unknown } = {},
): Promise<{ readonly status: number; readonly body: T & AuthErrorBody }> {
  const token = await accessToken();
  if (!token) {
    if ((await cookies()).get(REFRESH_COOKIE)?.value) throw new SessionStaleError();
    throw new ServiceError("unauthenticated", "Sign in to continue.");
  }

  let baseUrl: string;
  try {
    baseUrl = authBackendBaseUrl();
  } catch (cause) {
    console.error("[kkl-web] auth backend is not configured", cause);
    throw new ServiceError("unavailable", UNAVAILABLE.message);
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch (cause) {
    if (isFrameworkSignal(cause)) throw cause;
    console.error("[kkl-web] kkl-backend unreachable", cause);
    throw new ServiceError(
      "unavailable",
      "That service is not responding. These records live in kkl-backend and are not served from this process.",
    );
  }

  if (response.status === 401) {
    const jar = await cookies();
    if (jar.get(REFRESH_COOKIE)?.value && !jar.get(REFRESH_ATTEMPT_COOKIE)?.value && !justIssued.getStore()) {
      throw new SessionStaleError();
    }
    throw new ServiceError("unauthenticated", "Sign in to continue.");
  }

  const text = await response.text();
  const parsed = text
    ? JSON.parse(text) as T & AuthErrorBody
    : {} as T & AuthErrorBody;

  if (response.status === 403) {
    throw new ServiceError(
      "forbidden",
      typeof parsed.error === "string" ? parsed.error : "This account cannot do that.",
    );
  }

  return { status: response.status, body: parsed };
}

/** Who the token belongs to, from `GET /v1/me`. The role is not returned. */
export async function readSignedInProfile(): Promise<SignedInProfile> {
  const { status, body } = await callAsSignedIn<{
    displayName?: unknown;
    phone?: unknown;
    status?: unknown;
  }>("/v1/me");
  if (status !== 200) {
    throw new ServiceError("unavailable", "The signed-in account could not be read.");
  }
  return {
    displayName: typeof body.displayName === "string" ? body.displayName : "Signed in",
    phone: typeof body.phone === "string" ? body.phone : null,
    status: body.status === "suspended" ? "suspended" : "active",
  };
}

export async function revokeSession(everywhere: boolean): Promise<void> {
  const path = everywhere ? "/v1/sessions" : "/v1/sessions/current";
  try {
    await callAsSignedIn(path, { method: "DELETE" });
  } catch (error) {
    if (!(error instanceof SessionStaleError)) throw error;
    const refreshed = await refreshSession();
    if (!refreshed) return;
    await callAsSignedIn(path, { method: "DELETE" });
  } finally {
    await clearSession();
  }
}

export async function markRefreshAttempt(): Promise<void> {
  (await cookies()).set(REFRESH_ATTEMPT_COOKIE, "1", sessionCookieOptions(15));
}
