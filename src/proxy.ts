import { NextResponse } from "next/server";
import { assertDeploymentSafe } from "@/lib/config/runtime";
import { assertVerificationPolicyAcknowledged } from "@/lib/config/verification-policy";

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
export function proxy() {
  try {
    assertDeploymentSafe();
    // CR07: production must not silently apply a verification rule nobody
    // confirmed. Same shape as the guard above — it refuses rather than
    // degrades, because the degraded case is a policy decision made by
    // accident.
    assertVerificationPolicyAcknowledged();
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Deployment configuration is unsafe.";
    // Plain text, 503, no caching: an operator reads this, not a visitor, and a
    // cached copy of a refusal would outlive the misconfiguration.
    return new NextResponse(reason, {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  }

  return NextResponse.next();
}

export const config = {
  // Everything except Next's own build output. A misconfigured deployment must
  // not serve a single page, route handler or server action.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
