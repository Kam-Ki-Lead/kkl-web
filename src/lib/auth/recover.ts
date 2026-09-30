import { redirect } from "next/navigation";
import { ServiceError } from "@/lib/services/contracts";
import { SessionStaleError } from "@/lib/auth/backend";
import { safeNext } from "@/lib/auth/contract";

/** Send a stale or missing browser session back through sign-in. Other errors pass through. */
export function redirectForAuth(error: unknown, next: string): void {
  const target = safeNext(next);
  if (error instanceof SessionStaleError) {
    redirect(`/auth/refresh?next=${encodeURIComponent(target)}`);
  }
  if (error instanceof ServiceError && error.kind === "unauthenticated") {
    redirect(`/auth?next=${encodeURIComponent(target)}`);
  }
}
