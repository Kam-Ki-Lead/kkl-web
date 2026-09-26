/**
 * Business rules, split by whether the client has actually decided them.
 *
 * Client approval of the Phase 1 *design* did not resolve the commercial rules.
 * The approved decision register is C-12 of "KKL Component and State Library"
 * (baseline 5bc3512): sixteen open decisions, six of which block launch.
 *
 * Rules the client HAS confirmed are constants here. Rules they have NOT are
 * `UNRESOLVED` — a shape the UI must render as a pending state, never as a number.
 * Shipping one prototype alternative as though it were the agreed rule is exactly
 * what this module exists to prevent.
 */

// --------------------------------------------------------------- confirmed --

/**
 * From the Account Roles & Access Specification and the Development Proposal.
 * These are safe to render as fact.
 */
export const CONFIRMED = {
  /** 1 INR = 1 credit. Roles §3. */
  rupeesPerCredit: 1,
  /** Leads aged this many days move to the Sale tab. Proposal Ph3. */
  saleTabFromDays: 2,
  /** ...and leave the marketplace after this many. Proposal Ph3. */
  saleTabUntilDays: 10,
  /** Automatic discount applied on the Sale tab. Proposal Ph3. */
  saleDiscountPercent: 20,
  /** Purchased lead export. Proposal Ph2. */
  downloadFormats: ["csv"] as const,
  /** One lead is sold to exactly one purchaser. Proposal Ph3. */
  oneLeadOnePurchaser: true,
  /** Contact details are released only after a successful credit deduction. */
  contactReleasedOnlyAfterDeduction: true,
} as const;

// -------------------------------------------------------------- unresolved --

export type UnresolvedRule = {
  readonly state: "unresolved";
  /** Decision ID in the approved register (C-12). */
  readonly decision: DecisionId;
};

export type DecisionId =
  | "D-01" | "D-02" | "D-03" | "D-04" | "D-05" | "D-06" | "D-07" | "D-08"
  | "D-09" | "D-10" | "D-11" | "D-12" | "D-13" | "D-14" | "D-15" | "D-16"
  | "D-17" | "D-18";

export type DecisionImpact = "blocks-launch" | "changes-flow" | "wording";

export type Decision = {
  readonly id: DecisionId;
  readonly question: string;
  readonly impact: DecisionImpact;
  /** What the UI shows while this is open. Never an invented value. */
  readonly pendingCopy: string;
};

/** C-12 verbatim, with the copy each open rule renders in its place. */
export const DECISIONS: Readonly<Record<DecisionId, Decision>> = {
  "D-01": {
    id: "D-01",
    question: "Builder subscription price and billing cycle",
    impact: "blocks-launch",
    pendingCopy: "Price is not yet set by the client",
  },
  "D-02": {
    id: "D-02",
    question: "What happens to published listings when a subscription expires",
    impact: "blocks-launch",
    pendingCopy: "The effect on published listings is not yet decided",
  },
  "D-03": {
    id: "D-03",
    question: "Lead price list",
    impact: "blocks-launch",
    pendingCopy: "Lead prices are not yet set by the client",
  },
  "D-04": {
    id: "D-04",
    question: "Credit expiry period and whether expired credits can be renewed",
    impact: "blocks-launch",
    pendingCopy: "Expiry period is not yet set by the client",
  },
  "D-05": {
    id: "D-05",
    question:
      "Whether a Builder pays to see contact details on enquiries for their own listings",
    impact: "blocks-launch",
    pendingCopy: "Contact access on your own enquiries is not yet decided",
  },
  "D-06": {
    id: "D-06",
    question: "Refund eligibility and destination",
    impact: "blocks-launch",
    pendingCopy: "Refund eligibility is not yet decided",
  },
  "D-07": {
    id: "D-07",
    question: "What an unverified account may see",
    impact: "changes-flow",
    pendingCopy: "Access before verification is not yet decided",
  },
  "D-08": {
    id: "D-08",
    question: "Whether one person may hold both Broker and Builder roles on one account",
    impact: "changes-flow",
    pendingCopy: "Holding both roles on one account is not yet decided",
  },
  "D-09": {
    id: "D-09",
    question: "Property type list",
    impact: "changes-flow",
    pendingCopy: "The full property type list is not yet confirmed",
  },
  "D-10": {
    id: "D-10",
    question: "Whether listing review happens before or after publishing",
    impact: "changes-flow",
    pendingCopy: "Review timing is not yet decided",
  },
  "D-11": {
    id: "D-11",
    question: "Verification turnaround as a user-facing promise",
    impact: "wording",
    pendingCopy: "No turnaround time is promised",
  },
  "D-12": {
    id: "D-12",
    question: "Support response-time commitment",
    impact: "wording",
    pendingCopy: "No response time is published",
  },
  "D-13": {
    id: "D-13",
    question: "GST treatment on credits and subscriptions",
    impact: "wording",
    pendingCopy: "Tax treatment is not yet confirmed",
  },
  "D-14": {
    id: "D-14",
    question: "Whether partner-feed leads carry a usable consent basis",
    impact: "changes-flow",
    pendingCopy: "Treated as no consent until a qualification call captures one",
  },
  "D-15": {
    id: "D-15",
    question: "Which company documents a Builder must submit",
    impact: "changes-flow",
    pendingCopy: "Awaiting confirmation",
  },
  "D-16": {
    id: "D-16",
    question: "Whether staff sign-in requires a second factor",
    impact: "wording",
    pendingCopy: "No second factor is configured",
  },
  // CR03 — confirmation-document decision 2. The request form's fields and
  // the queue's status names are the client's written proposal, not yet
  // confirmed, and the screens that render them say so.
  "D-17": {
    id: "D-17",
    question: "Lead-request field set, status names and handling workflow",
    impact: "changes-flow",
    pendingCopy: "Fields and statuses shown here are the proposal awaiting confirmation",
  },
  // CR02 — confirmation-document decisions 1, 5 and 7. The owner journey is
  // confirmed to exist; everything about how it charges, moderates, routes
  // enquiries, handles rentals and verifies is not.
  "D-18": {
    id: "D-18",
    question:
      "Individual-owner Post Property policy: charges, moderation timing, enquiry routing, rentals, verification requirement",
    impact: "changes-flow",
    pendingCopy: "Owner policy is not yet confirmed — this journey is prepared for review, not open for submissions",
  },
};

const unresolved = (decision: DecisionId): UnresolvedRule => ({
  state: "unresolved",
  decision,
});

/**
 * Commercial values the UI would otherwise have to invent.
 *
 * Each is `UNRESOLVED` until the client answers. When an answer arrives, replace the
 * value here — every screen reading it updates, and nothing else needs to change.
 * Do not hardcode a number at a call site to work around one of these.
 */
export const COMMERCIAL = {
  /** D-01. */
  builderSubscriptionPrice: unresolved("D-01"),
  /** D-01. */
  builderSubscriptionCycle: unresolved("D-01"),
  /** D-02. */
  listingFateOnSubscriptionExpiry: unresolved("D-02"),
  /** D-03. Individual lead prices are sample-only until this lands. */
  leadPriceList: unresolved("D-03"),
  /** D-04. */
  creditExpiryPeriod: unresolved("D-04"),
  /** D-04. */
  expiredCreditRenewal: unresolved("D-04"),
  /** D-05. Governs the Builder enquiry contact treatment on B-17 / B-18. */
  builderPaysForOwnEnquiryContact: unresolved("D-05"),
  /** D-06. */
  refundEligibility: unresolved("D-06"),
  /** D-07. */
  unverifiedAccountVisibility: unresolved("D-07"),
  /** D-13. No tax line is invented on any invoice. */
  gstTreatment: unresolved("D-13"),
} as const;

export function isUnresolved(value: unknown): value is UnresolvedRule {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as UnresolvedRule).state === "unresolved"
  );
}

/** The copy a screen shows in place of an unresolved value. */
export function pendingCopyFor(rule: UnresolvedRule): string {
  return DECISIONS[rule.decision].pendingCopy;
}
