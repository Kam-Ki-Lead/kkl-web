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

/**
 * Where a rule came from.
 *
 * Recorded per rule rather than in a comment, because "who decided this and on
 * what basis" is the question anybody auditing a verification policy asks
 * first, and a comment cannot be rendered on a screen or asserted by a test.
 *
 * `product_decision` is deliberately not `compliance`. A decision that an action
 * needs no identity check is a decision about how the product works. It is not
 * a determination that no law requires one — nobody here is in a position to
 * make that, and the wording must never imply otherwise. If a compliance
 * adviser later says a check is legally required, that overrides any row below
 * and is a different kind of input, which is why there is no `compliance` value
 * to reach for casually.
 */
export type PolicyBasis =
  /** Stated in the client's written specification. */
  | "specification"
  /** Decided by the project owner as a product decision. Not a legal determination. */
  | "product_decision"
  /** This implementation's assumption. The screens say so; production refuses to run it. */
  | "assumption";

export type PolicyRule = {
  readonly action: GatedAction;
  readonly label: string;
  /** Whether a check is required for this action at all. */
  readonly required: boolean;
  /**
   * What the customer reads. Plain, short, and about what they can and cannot
   * do — never about who decided it or on what basis.
   *
   * That separation is deliberate. Provenance matters enormously to whoever
   * audits this policy and not at all to somebody trying to work out whether
   * they can file a request. Mixing the two made a two-line answer into a
   * paragraph and put an internal distinction in front of a customer who has no
   * use for it. `internalNote` below is where that belongs.
   */
  readonly explanation: string;
  /**
   * The provenance, for staff and for the record. Rendered on the Admin case
   * detail and in the policy documentation. **Never on a customer screen.**
   */
  readonly internalNote: string;
  /** Where the rule came from. `assumption` is the only unconfirmed basis. */
  readonly basis: PolicyBasis;
  /** Who decided it, for the record. Null for a rule nobody has decided. */
  readonly decidedBy: string | null;
  /**
   * True where the rule follows from a confirmed decision. False where it is
   * this implementation's assumption, which the screens mark as such rather
   * than presenting as settled. Derived from `basis`; kept as its own field so
   * every read site does not have to know which bases count.
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
    internalNote:
      "From the client's written specification and restated on the call: no blanket KYC gate for browsing.",
    basis: "specification",
    decidedBy: "Client specification, and the call",
    confirmed: true,
  },
  enquire_property: {
    action: "enquire_property",
    label: "Enquire about a property",
    required: false,
    explanation:
      "No document check is needed to send an enquiry. Confirming a mobile number at enquiry is a separate thing from identity verification, and passing it is not a verification.",
    internalNote:
      "From the client's written specification. Mobile confirmation at enquiry is deliberately not treated as identity verification.",
    basis: "specification",
    decidedBy: "Client specification, and the call",
    confirmed: true,
  },
  request_leads: {
    action: "request_leads",
    label: "Request leads",
    required: false,
    explanation:
      "You can submit a lead request without verification. Verification is required before purchasing leads.",
    internalNote:
      "Product decision by the project owner, 28 September 2026: submitting a lead request does not require KYC, the restriction on purchasing leads is retained, and no other action changes. This is a decision about how KKL works — it is not a determination about what any law requires, and must not be described as one.",
    basis: "product_decision",
    decidedBy: "Project owner, 28 September 2026",
    confirmed: true,
  },
  purchase_lead: {
    action: "purchase_lead",
    label: "Buy a lead",
    required: true,
    explanation:
      "Buying a lead spends credits and releases another person's contact details, so it requires verification.",
    internalNote:
      "Pre-existing restriction, explicitly retained by the project owner on 27 and again on 28 September 2026. It stays until a replacement is confirmed.",
    basis: "product_decision",
    decidedBy: "Project owner, 27 September 2026 (retained 28 September 2026)",
    confirmed: true,
  },
  publish_owner_listing: {
    action: "publish_owner_listing",
    label: "Publish a property you own",
    required: true,
    explanation:
      "Publishing a listing puts a property in front of buyers in your name, so it requires verification. Nothing publishes in this build — an owner's submission goes to a review queue — so no check is asked of an owner today.",
    internalNote:
      "Product decision by the project owner, 27 September 2026 (submit for review, never auto-publish). The publication terms themselves are still open, so this rule describes an action that does not yet happen.",
    basis: "product_decision",
    decidedBy: "Project owner, 27 September 2026",
    confirmed: true,
  },
  publish_builder_listing: {
    action: "publish_builder_listing",
    label: "Publish a project listing",
    required: true,
    explanation:
      "The existing Builder conditions stand: verification and an active subscription before a listing is published.",
    internalNote:
      "Existing Builder conditions, unchanged. The owner policy deliberately does not overwrite them.",
    basis: "specification",
    decidedBy: "Existing Builder conditions, unchanged",
    confirmed: true,
  },
};

export function policyFor(action: GatedAction): PolicyRule {
  return RULES[action];
}

/** Every rule currently in force that nobody has actually confirmed. */
export function unconfirmedRules(): readonly PolicyRule[] {
  return Object.values(RULES).filter((rule) => !rule.confirmed);
}

/**
 * Refuse to serve production while any rule in force is unconfirmed.
 *
 * **There is deliberately no override.** An earlier version of this let an
 * operator acknowledge an unconfirmed rule with an environment variable. That
 * was wrong, and the reason is worth keeping written down: an environment
 * variable is not a decision. Neither is a sample-mode default, a review
 * control, or the fact that a screen has been rendering a rule for weeks.
 * Whoever sets a variable on a server is not the person who gets to decide
 * whether someone must prove their identity before an action — so the escape
 * hatch is gone, and the only way past this check is to get the rule decided
 * and record it in the table above with its basis and who decided it.
 *
 * As of 28 September 2026 every rule is confirmed and this cannot fire. It
 * stays because the next rule added will default to `assumption`, and this is
 * what stops that one reaching production on nobody's authority.
 *
 * Read from the process on every call, like the deployment guard beside it, so
 * it cannot be frozen into a bundle built somewhere else.
 */
export function assertVerificationPolicyConfirmed(): void {
  if (process.env.KKL_ENV !== "production") return;

  const unconfirmed = unconfirmedRules();
  if (unconfirmed.length === 0) return;

  throw new Error(
    "Refusing to serve: the verification policy contains rules nobody has decided — " +
      unconfirmed
        .map((rule) => `${rule.action} (${rule.required ? "required" : "not required"})`)
        .join(", ") +
      ". These are this implementation's assumptions, and production must not apply them. " +
      "There is no environment override for this on purpose: a variable set on a server is " +
      "not a business decision. Get the rule decided, then record it in " +
      "src/lib/config/verification-policy.ts with its basis and who decided it — see " +
      "docs/phase-2/decisions-received.md.",
  );
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
