import { leadRequestStore } from "@/lib/services";
import { authStoreKind } from "@/lib/services/backend/config";

/**
 * CR03 — one sentence about where a request actually goes, read from the
 * configuration rather than written into the page.
 *
 * The distinction matters more than it looks. A screen that says "stored"
 * while records live in process memory is the specific claim the client's
 * change confirmation refused, and a screen that still says "kept for this
 * session only" once records genuinely persist understates working software.
 * Neither sentence should be a constant, so neither is.
 */
export function LeadRequestStorageNote({ className }: { className?: string }) {
  const stored = leadRequestStore() === "backend";
  return (
    <span className={className}>
      {stored
        ? authStoreKind() === "backend"
          ? "Requests are saved by the lead-request service for the signed-in account and stay available after it restarts."
          : "Requests are saved by the lead-request service and stay available after it restarts. Sign-in is not built yet, so every request on this build belongs to the one sample Seller."
        : "In this review build, requests are kept for the session only — permanent storage is a backend dependency, not yet claimed."}
    </span>
  );
}
