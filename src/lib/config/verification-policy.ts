import type { GatedAction } from "@/lib/domain/types";
import type { AccountRole } from "@/lib/domain/identity";

/**
 * CR07 — the verification policy, in one place.
 *
 * WHAT WAS CONFIRMED
 * ------------------
 * A selective, action-based policy: no check for browsing or enquiring, and a
 * check only where money or publication is at stake. "Not required" is its own
 * state and is never presented as verified. The existing Seller purchase
 * restriction stays until its replacement is confirmed.
 *
 * WHY THIS IS A MODULE AND NOT A SPRINKLING OF `if`s
 * -------------------------------------------------
 * Two sources disagreed about verification — the written specification proposes
 * third-party checks before an owner may publish, the call says KYC is
 * compliance-based and mostly unnecessary — and the disagreement went unnoticed
 * for a while because the rule lived in whichever screen happened to need it.
 * One table means the next change is one edit, and the next question has one
 * place to look for an answer.
 *
 * WHAT IS STILL NOT DECIDED, AND IS NOT DECIDED HERE
 * -------------------------------------------------
 * - Which provider does the checking. None is selected; nothing in this build
 *   contacts one or collects a real identity document.
 * - Whether a verification expires, and after how long. `expired` exists as an
 *   outcome because the policy may set one; no period is assumed.
 * - Whether an owner's listing publishes at all, and on what terms (CR02). The
 *   owner publication row below is written for the action *if* it exists; no
 *   listing publishes in this build, so no owner is asked for a check today.
 * - Whether requesting leads (CR03) requires a check. The specification does not
 *   say and the call did not cover it, so the answer is "not required" and the
 *   screens say that is an assumption rather than a decision.
 */

export type PolicyRule = {
  readonly action: GatedAction;
  readonly label: string;
  /** Whether a check is required for this action at all. */
  readonly required: boolean;
  /** The sentence the person reads, in either case. */
  readonly explanation: string;
  /**
   * True where the rule follows from a confirmed decision. False where it is
   * this implementation's assumption, which the screens mark as such rather
   * than presenting as settled.
   */
  readonly confirmed: boolean;
};

const RULES: Record<GatedAction, PolicyRule> = {
  browse_properties: {
    action: "browse_properties",
    label: "Browse and search properties",
    required: false,
    explanation:
      "No verification is needed to look at properties. Registering does not start a check and does not put an account in any verification queue.",
    confirmed: true,
  },
  enquire_property: {
    action: "enquire_property",
    label: "Enquire about a property",
    required: false,
    explanation:
      "No document check is needed to send an enquiry. Confirming a mobile number at enquiry is a separate thing from identity verification, and passing it is not a verification.",
    confirmed: true,
  },
  request_leads: {
    action: "request_leads",
    label: "Request leads",
    required: false,
    explanation:
      "Asking the team to find leads moves no money and publishes nothing, so no check is required. Whether requesting should require one has not actually been decided — this is an assumption, not a confirmed rule.",
    confirmed: false,
  },
  purchase_lead: {
    action: "purchase_lead",
    label: "Buy a lead",
    required: true,
    explanation:
      "Buying a lead spends credits and releases another person's contact details, so it requires verification. This is the restriction that already applied; it stays until a replacement is confirmed.",
    confirmed: true,
  },
  publish_owner_listing: {
    action: "publish_owner_listing",
    label: "Publish a property you own",
    required: true,
    explanation:
      "Publishing a listing puts a property in front of buyers in your name, so it requires verification. Nothing publishes in this build — an owner's submission goes to a review queue — so no check is asked of an owner today.",
    confirmed: true,
  },
  publish_builder_listing: {
    action: "publish_builder_listing",
    label: "Publish a project listing",
    required: true,
    explanation:
      "The existing Builder conditions stand: verification and an active subscription before a listing is published. The owner policy does not overwrite them.",
    confirmed: true,
  },
};

export function policyFor(action: GatedAction): PolicyRule {
  return RULES[action];
}

/** Every rule, for the screens that show the whole picture. */
export const VERIFICATION_POLICY: readonly PolicyRule[] = Object.values(RULES);

/**
 * The actions a role can actually take, so a screen does not tell a Seller
 * about publishing a project or a Builder about an owner listing.
 */
const BY_ROLE: Record<string, readonly GatedAction[]> = {
  buyer: ["browse_properties", "enquire_property"],
  seller: ["browse_properties", "enquire_property", "request_leads", "purchase_lead"],
  builder: ["browse_properties", "enquire_property", "purchase_lead", "publish_builder_listing"],
  owner: ["browse_properties", "enquire_property", "publish_owner_listing"],
};

export function actionsFor(role: AccountRole | "owner"): readonly GatedAction[] {
  return BY_ROLE[role] ?? ["browse_properties", "enquire_property"];
}

/**
 * The one thing this file must never do.
 *
 * A provider that is unreachable, errors, or returns something unreadable is
 * NOT a pass. It is `needs_review` — a case waiting on a person. Written here
 * as a named constant so the store cannot quietly choose otherwise and so a
 * test can assert the mapping rather than trusting a comment.
 */
export const PROVIDER_FAILURE_OUTCOME = "needs_review" as const;
