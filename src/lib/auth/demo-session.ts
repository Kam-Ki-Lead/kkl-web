import { cookies } from "next/headers";
import { runtimeConfig } from "@/lib/config/runtime";
import {
  adminOperationsStoreKind,
  authStoreKind,
  builderEnquiryStoreKind,
  enquiryStoreKind,
  intakeStoreKind,
  leadRequestStoreKind,
  listingStoreKind,
  marketplaceStoreKind,
  notificationStoreKind,
  profileStoreKind,
  qualificationStoreKind,
  staffOrdersStoreKind,
  supportStoreKind,
  verificationStoreKind,
} from "@/lib/services/backend/config";
import {
  DEMO_SIGNIN_ENV,
  accountForRole,
  demoSignInIsAllowed,
  readDemoRole,
  readDemoSignInOptIn,
  type DemoAccount,
  type DemoRole,
} from "@/lib/auth/demo-access";

/**
 * The cookie behind the review sign-in shortcut, and the one place that reads
 * this server's configuration to decide whether the shortcut exists at all.
 *
 * The rule itself is in `demo-access.ts`, which imports nothing, so it can be
 * tested directly — a gate whose tests cannot run is a gate nobody checks.
 *
 * What this writes is NOT an access token. It carries a role name and nothing
 * else, it is never sent to kkl-backend, and it only counts while
 * `demoSignInAllowed()` holds — so a cookie set on a server that allows the
 * shortcut and carried to one that does not is ignored.
 *
 * NOTHING MAY TREAT IT AS A BACKEND SESSION. `hasBrowserSession()` means a
 * token, and must not consult this: callers use that as the precondition for
 * calling kkl-backend as the account, and a cookie that cannot authenticate
 * passing it sends them into a refusal, which the layout turns into a redirect
 * loop. That happened; see docs/review-sign-in.md.
 */

const COOKIE = "kkl_demo_session";

export function demoSignInAllowed(): boolean {
  return demoSignInIsAllowed({
    sampleData: runtimeConfig.isSampleMode,
    authBackend: authStoreKind() === "backend",
    production: runtimeConfig.deploymentEnv === "production",
    // Read from the process on every call, deliberately without a
    // NEXT_PUBLIC_ prefix: a value frozen into the bundle at build time would
    // keep a shortcut alive on a server that had since turned it off.
    optIn: readDemoSignInOptIn(process.env[DEMO_SIGNIN_ENV]),
  });
}

/**
 * Whether a demo session can actually reach the console it signs in to.
 *
 * On a server whose screens read from kkl-backend as the account, it cannot:
 * a demo session holds no token, those reads are refused, and the console
 * bounces back to sign-in. The sign-in page says so rather than sending
 * somebody into a door that does not open.
 *
 * EVERY domain switch counts, not just profiles. The four consoles between
 * them read profiles, listings, enquiries, the marketplace, support,
 * notifications, verification, lead requests, orders, intake and
 * qualification, and ONE of those on `backend` is enough to bounce the
 * console that reads it. Checking profiles alone said "the consoles work" on
 * a server where /seller or /admin did not. The conservative reading is the
 * honest one: a demo session opens a console only where nothing it might read
 * needs a token.
 *
 * `KKL_AUTH=backend` is enough on its own, whatever the domains say. Every
 * console shell reads the signed-in profile from kkl-backend when sign-in is
 * switched there (`bearerMode() === "browser-session"`), before it renders
 * anything, and a demo session has no token for that read. Verified rather
 * than assumed: on a server with `KKL_AUTH=backend` and every domain on
 * fixtures, all four consoles came back as a header and a footer with an empty
 * middle — the same blank screen this shortcut was reported for.
 *
 * Staging sets `KKL_AUTH=backend` and every domain to `backend` (see
 * DEPLOYMENT.md), so there this is false by design. A fully-sample server —
 * the one to run the four-console demo on — sets none of them, and there this
 * is true.
 */
const CONSOLE_DOMAINS = [
  profileStoreKind,
  listingStoreKind,
  enquiryStoreKind,
  marketplaceStoreKind,
  builderEnquiryStoreKind,
  supportStoreKind,
  notificationStoreKind,
  verificationStoreKind,
  adminOperationsStoreKind,
  staffOrdersStoreKind,
  intakeStoreKind,
  qualificationStoreKind,
  leadRequestStoreKind,
] as const;

export function demoConsolesWork(): boolean {
  if (authStoreKind() === "backend") return false;
  return CONSOLE_DOMAINS.every((kind) => kind() !== "backend");
}

/**
 * The one question the rest of the application asks: is this shortcut real
 * here?
 *
 * Both halves, because either alone ships a lie. The gate alone offered a
 * sign-in on servers where every console answered with a header, a footer and
 * an empty middle, and left the site header still saying "Sign in" afterwards
 * — a button that signs you in to nothing. There is no honest third state
 * between "it opens the consoles" and "it is not here", so there is no third
 * state in the code.
 *
 * Where this is false the sign-in page says which configuration does open
 * them, instead of showing a button that does not.
 */
export function demoSignInWorks(): boolean {
  return demoSignInAllowed() && demoConsolesWork();
}

export async function startDemoSession(account: DemoAccount): Promise<void> {
  if (!demoSignInWorks()) return;
  (await cookies()).set(COOKIE, account.role, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    // A working day, then gone. A review session that outlives the review is
    // how somebody later mistakes it for a real one.
    maxAge: 60 * 60 * 8,
  });
}

export async function endDemoSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

/** The signed-in demo account, or null. */
export async function demoSession(): Promise<DemoAccount | null> {
  if (!demoSignInWorks()) return null;
  const role: DemoRole | null = readDemoRole((await cookies()).get(COOKIE)?.value);
  return role ? accountForRole(role) : null;
}

export async function hasDemoSession(): Promise<boolean> {
  return (await demoSession()) !== null;
}
