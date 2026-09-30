/**
 * Session cookies. Both tokens are httpOnly, so page JavaScript cannot read
 * them. The refresh token in particular must never be rendered, returned to
 * a client component, or copied into a `NEXT_PUBLIC_` variable.
 */

export const ACCESS_COOKIE = "kkl_access";
export const REFRESH_COOKIE = "kkl_refresh";
export const CHALLENGE_COOKIE = "kkl_auth_challenge";
/** Short-lived. Stops a failed refresh from redirecting forever. */
export const REFRESH_ATTEMPT_COOKIE = "kkl_refresh_attempt";

export function sessionCookieOptions(maxAge: number): {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: "/";
  maxAge: number;
} {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export function secondsUntil(iso: string): number | null {
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return null;
  return Math.floor((at - Date.now()) / 1000);
}
