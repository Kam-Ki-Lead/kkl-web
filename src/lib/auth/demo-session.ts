import { cookies } from "next/headers";
import { runtimeConfig } from "@/lib/config/runtime";
import { authStoreKind } from "@/lib/services/backend/config";
import {
  DEMO_MOBILE,
  DEMO_SIGNIN_ENV,
  demoSignInIsAllowed,
  readDemoSignInOptIn,
} from "@/lib/auth/demo-access";

/**
 * The cookie behind the review sign-in shortcut, and the one place that reads
 * this server's configuration to decide whether the shortcut exists at all.
 *
 * The rule itself is in `demo-access.ts`, which imports nothing, so it can be
 * tested directly — a gate whose tests cannot run is a gate nobody checks.
 *
 * What this writes is NOT an access token. It carries no credential, it is
 * never sent to kkl-backend, and it only counts as a session while
 * `demoSignInAllowed()` holds — so a cookie set on a sample server and carried
 * to a real one is simply ignored.
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

export async function startDemoSession(): Promise<void> {
  if (!demoSignInAllowed()) return;
  (await cookies()).set(COOKIE, DEMO_MOBILE, {
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

export async function hasDemoSession(): Promise<boolean> {
  if (!demoSignInAllowed()) return false;
  return Boolean((await cookies()).get(COOKIE)?.value);
}
