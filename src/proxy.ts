import { NextRequest, NextResponse } from "next/server";
import { assertDeploymentSafe } from "@/lib/config/runtime";
import { assertVerificationPolicyConfirmed } from "@/lib/config/verification-policy";

/**
 * Per-request deployment guard.
 *
 * This exists because the build-time guard in runtime.ts cannot see the one
 * mistake that matters most: a bundle built for review, deployed to production
 * with the production environment variables set on the server. NEXT_PUBLIC_*
 * values are frozen into the bundle at build time, so the build-time check
 * still reads "review" and lets simulated sign-in and payment serve real
 * users.
 *
 * Proxy runs on the Node.js runtime and ahead of every request, so the
 * unprefixed KKL_ENV and KKL_DATA_SOURCE are read from the process here, fresh,
 * on each request. On a mismatch nothing renders: the request fails with the
 * reason, rather than quietly serving fixtures.
 *
 * Deliberately the only thing in this file. Proxy is not the place for
 * authentication, authorization or business rules — those belong to
 * kkl-backend, which is the only thing that can enforce them.
 */
export function proxy(request: NextRequest) {
  try {
    assertDeploymentSafe();
    // CR07: production must not apply a verification rule nobody decided. Same
    // shape as the guard above — it refuses rather than degrades, because the
    // degraded case is a policy decision made by accident. There is no
    // environment override: a variable set on a server is not a decision.
    assertVerificationPolicyConfirmed();
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Deployment configuration is unsafe.";
    // Plain text, 503, no caching: an operator reads this, not a visitor, and a
    // cached copy of a refusal would outlive the misconfiguration.
    return new NextResponse(reason, {
      status: 503,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
        ...documentHeaders(),
      },
    });
  }

  const forwarded = new Headers(request.headers);
  forwarded.set("x-kkl-path", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  const response = NextResponse.next({ request: { headers: forwarded } });
  for (const [name, value] of Object.entries(documentHeaders())) {
    response.headers.set(name, value);
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

/**
 * Document responses. Static build assets are outside the proxy matcher.
 * A full script policy is not set here: Next serves its own scripts, and a
 * nonce policy was not part of this pass.
 */
function documentHeaders(): Record<string, string> {
  return {
    // A browser ignores this on a plaintext origin, so it is unconditional:
    // one year, this host only. Not `includeSubDomains`, because a staging
    // deployment lives on a platform subdomain it shares with every other
    // project on that platform, and not `preload`, which is a commitment
    // about a domain this deployment does not own.
    "Strict-Transport-Security": "max-age=31536000",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Content-Security-Policy": "frame-ancestors 'none'; base-uri 'none'; object-src 'none'",
  };
}

export const config = {
  // Everything except Next's own build output. A misconfigured deployment must
  // not serve a single page, route handler or server action.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
