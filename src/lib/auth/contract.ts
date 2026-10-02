/**
 * The published auth contract, as pure decisions.
 *
 * Paths and fields are `kkl-backend` `docs/api/v1.yaml` version
 * `1.0.0-phase3.i`: `POST /v1/auth/code`, `POST /v1/auth/sessions`,
 * `POST /v1/auth/sessions/refresh`, `DELETE /v1/sessions/current`,
 * `DELETE /v1/sessions`, `GET /v1/me`. Nothing here invents a field.
 *
 * A role on the code request applies only when the number has no account,
 * and `staff` is refused. This client never sends one. The browser does not
 * get to choose an account type, and an existing account keeps the role on
 * its row.
 */

export type AuthStage = "code" | "verify" | "refresh";

export type AuthErrorBody = {
  error?: unknown;
  code?: unknown;
  field?: unknown;
  retryAfterSeconds?: unknown;
};

export type AuthProblem = {
  readonly kind: "invalid" | "rate_limited" | "suspended" | "invalid_code" | "unauthorized" | "unavailable";
  readonly message: string;
  readonly retryAfterSeconds?: number;
};

const INDIAN_MOBILE = /^[6-9]\d{9}$/;

export function localIndianMobile(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  const local = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  return INDIAN_MOBILE.test(local) ? local : null;
}

/** E.164, which the contract accepts alongside a local number. No role. */
export function codeRequestBody(mobile: string): { readonly phone: string } {
  return { phone: `+91${mobile}` };
}

export function sessionRequestBody(
  challengeId: string,
  code: string,
): { readonly challengeId: string; readonly code: string } {
  return { challengeId, code };
}

/**
 * Same-site paths only.
 *
 * A protocol-relative URL, a backslash, a control character, or an encoded
 * slash is not a path this app will redirect to.
 */
export function safeNext(raw: string): string {
  if (raw.length === 0 || raw.length > 512) return "/account";
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return "/account";
  if (raw.includes("\\") || raw.includes("\0")) return "/account";
  if (/[\u0000-\u001F\u007F]/.test(raw)) return "/account";
  if (/%(?:2f|5c)/i.test(raw)) return "/account";
  return raw;
}

function sentence(body: AuthErrorBody, fallback: string): string {
  return typeof body.error === "string" && body.error.trim() !== "" ? body.error : fallback;
}

/**
 * Map a non-success auth response onto a state the screen can show.
 * Wrong, expired, used and exhausted codes are all 401 and are not
 * distinguished — the contract says so, and the screen repeats the
 * sentence the service sent rather than inventing which of the four it was.
 */
export function interpretAuthResponse(
  status: number,
  body: AuthErrorBody,
  stage: AuthStage,
): AuthProblem | null {
  if (status === 200 || status === 201 || status === 204) return null;

  const retryAfterSeconds = typeof body.retryAfterSeconds === "number"
    ? body.retryAfterSeconds
    : undefined;

  if (status === 429 || body.code === "rate_limited") {
    const base = sentence(body, "Too many codes were requested for this number.");
    const message = retryAfterSeconds !== undefined && !base.includes(String(retryAfterSeconds))
      ? `${base} You can request another code in ${retryAfterSeconds} seconds.`
      : base;
    return { kind: "rate_limited", message, ...(retryAfterSeconds !== undefined ? { retryAfterSeconds } : {}) };
  }

  if (status === 403 || body.code === "account_suspended") {
    return {
      kind: "suspended",
      message: sentence(body, "This account is suspended. Signing in is not available."),
    };
  }

  if (status === 422) {
    return { kind: "invalid", message: sentence(body, "That value was not accepted.") };
  }

  if (status === 401 && stage === "refresh") {
    return {
      kind: "unauthorized",
      message: sentence(body, "That session has ended. Sign in again."),
    };
  }

  if (status === 401) {
    return {
      kind: "invalid_code",
      message: sentence(body, "That code was not accepted. Request a new one and try again."),
    };
  }

  if (status === 503 || status >= 500) {
    return {
      kind: "unavailable",
      message: sentence(body, "Verification is not available. Nothing was accepted in its place."),
    };
  }

  return {
    kind: "unavailable",
    message: sentence(body, "Verification is not available. Nothing was accepted in its place."),
  };
}
