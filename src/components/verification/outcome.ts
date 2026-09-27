import type { ChipTone } from "@/components/ui/chip";
import type { VerificationOutcome } from "@/lib/domain/types";

/**
 * CR07 — how each outcome reads, in one place.
 *
 * The first two rows are the reason this file exists. "Not required" and
 * "Verified" are different answers and must never be dressed the same: one means
 * nobody asked, the other means somebody checked and it passed. A shared green
 * tick across both would be the exact claim the policy forbids, so `not_required`
 * is neutral and its sentence says plainly that nothing was checked.
 */
export const OUTCOME: Record<
  VerificationOutcome,
  { readonly label: string; readonly tone: ChipTone; readonly line: string }
> = {
  not_required: {
    label: "Not required",
    tone: "muted",
    line:
      "Nothing needs checking for this. This is not a verification and no check has been passed — it means none was asked for.",
  },
  required: {
    label: "Check needed",
    tone: "warning",
    line: "A check is needed before this. Nothing has started yet.",
  },
  in_progress: {
    label: "Being checked",
    tone: "neutral",
    line: "The verification service has it. This is routine processing, not something waiting on a person.",
  },
  verified: {
    label: "Verified",
    tone: "success",
    line: "The check completed and passed.",
  },
  needs_review: {
    label: "Needs a person",
    tone: "warning",
    line:
      "The service could not give a usable answer, so somebody has to look at it. This is not an approval and not a refusal.",
  },
  failed: {
    label: "Did not pass",
    tone: "danger",
    line: "The check completed and did not pass. Nothing was approved.",
  },
  expired: {
    label: "Expired",
    tone: "warning",
    line: "An earlier check no longer counts. Whether verifications expire, and after how long, is not yet decided.",
  },
};
