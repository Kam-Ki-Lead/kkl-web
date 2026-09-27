import type { ChipTone } from "@/components/ui/chip";
import type { OwnerListingStatus } from "@/lib/domain/types";

/**
 * CR02 — how each owner-listing status reads, in one place.
 *
 * `cleared` is the one worth reading twice. It means review finished and found
 * nothing wrong; it does not mean the listing is live, because whether an
 * owner's listing publishes at all is part of the owner policy still to be
 * confirmed. The label says "Cleared — not published" everywhere rather than
 * "Approved", which people read as "it is up".
 */
export const OWNER_STATUS: Record<
  OwnerListingStatus,
  { readonly label: string; readonly tone: ChipTone; readonly line: string }
> = {
  draft: {
    label: "Draft",
    tone: "muted",
    line: "Only you can see this. Nothing has been sent.",
  },
  submitted: {
    label: "Waiting for review",
    tone: "neutral",
    line: "It is in the queue. It is not published, and nothing has been charged.",
  },
  in_review: {
    label: "Being reviewed",
    tone: "neutral",
    line: "The team has it open. It is not published.",
  },
  changes_requested: {
    label: "Changes needed",
    tone: "warning",
    line: "The team asked for something. Make the change and send it again.",
  },
  cleared: {
    label: "Cleared — not published",
    tone: "success",
    line:
      "Review found nothing wrong. It is still not live: whether an owner's listing publishes, and on what terms, is part of the owner policy still to be confirmed.",
  },
  declined: {
    label: "Declined",
    tone: "danger",
    line: "The team did not take it forward. The reason is on this page.",
  },
  withdrawn: {
    label: "Withdrawn",
    tone: "muted",
    line: "You took it out of the queue. You can edit it and send it again.",
  },
};

/** Statuses the owner can still edit. */
export function ownerCanEdit(status: OwnerListingStatus): boolean {
  return status === "draft" || status === "changes_requested" || status === "withdrawn";
}
