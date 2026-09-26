import type { ChipTone } from "@/components/ui/chip";
import type { LeadRequestStatus } from "@/lib/domain/types";

/**
 * CR03 — how a lead request's status renders, on both consoles.
 *
 * The names are the confirmation document's proposal (D-17): if the client
 * confirms different ones, they change here and both consoles follow.
 */
export const REQUEST_STATUS: Record<LeadRequestStatus, { label: string; tone: ChipTone }> = {
  submitted: { label: "Submitted", tone: "neutral" },
  under_review: { label: "Under review", tone: "warning" },
  needs_clarification: { label: "Needs clarification", tone: "warning" },
  fulfilled: { label: "Fulfilled", tone: "success" },
  closed: { label: "Closed", tone: "muted" },
};
