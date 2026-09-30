import { NextResponse } from "next/server";
import { clearSession, markRefreshAttempt, refreshSession } from "@/lib/auth/backend";
import { safeNext } from "@/lib/auth/contract";

export const dynamic = "force-dynamic";

/**
 * Rotate the browser session, then return to the page that asked.
 *
 * A Server Component cannot write the new cookies, so a stale access token
 * redirects here. The refresh token is read from its httpOnly cookie and
 * sent to kkl-backend from this process. It is not placed on the redirect.
 *
 * Cross-site navigations are refused: a lax cookie would otherwise be sent
 * on a top-level GET, and rotating a session from another site is not a
 * request this route exists to serve.
 */
/** Stay on the host the browser used. `request.url` is rewritten to localhost. */
function at(request: Request, path: string): URL {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  return new URL(path, host ? `${proto}://${host}` : request.url);
}

export async function GET(request: Request) {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next") ?? "/account");

  const refreshed = await refreshSession();
  if (!refreshed) {
    await clearSession();
    return NextResponse.redirect(at(request, `/auth?next=${encodeURIComponent(next)}`));
  }

  await markRefreshAttempt();
  return NextResponse.redirect(at(request, next));
}
