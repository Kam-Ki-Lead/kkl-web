import type { AccountRole, StaffRef } from "./identity";
import type { KycStatus, LeadRequest, OwnerListing } from "./types";

/**
 * The Admin console's record shapes (A-01 to A-31).
 *
 * Separate from `types.ts` because these are the internal tool's view of the
 * platform, not the platform's own domain: an `AdminAccount` is what staff are
 * shown about an account, which is deliberately less than the account holds.
 * There is no password field, no OTP field and no document bytes anywhere in
 * this file, and that is a design constraint rather than an omission — see
 * A-03's footnote in the approved baseline.
 */

// ------------------------------------------------------------------ accounts --

export type AdminAccountStatus = "active" | "suspended";

/**
 * An account as the staff console sees it.
 *
 * `liveConsole` says whether this account is one of the two whose console
 * exists in this build. Where it is, `status` and `kycStatus` are read from
 * that console's own store rather than held here, so the two cannot disagree —
 * and a decision taken here is visible there. Where it is not, they are static
 * sample values and the screen says so.
 */
export type AdminAccount = {
  readonly accountId: string;
  readonly name: string;
  readonly organisation: string;
  readonly role: AccountRole;
  readonly mobile: string;
  readonly status: AdminAccountStatus;
  readonly kycStatus: KycStatus;
  readonly joinedAt: string;
  readonly liveConsole: "seller" | "builder" | null;
  readonly facts: readonly AdminFact[];
  readonly history: readonly AdminHistoryEntry[];
};

export type AdminFact = { readonly label: string; readonly value: string };

export type AdminHistoryEntry = {
  readonly what: string;
  readonly who: string;
  readonly when: string;
};

// ----------------------------------------------------------------- KYC queue --
// The sample queue below is a document application. The backend queue
// (`KKL_VERIFICATION=backend`) is required-action verification cases and does
// not use these document rows. Live listings are a separate moderation record
// from owner submissions.

export type KycApplicationState = "pending" | "resubmitted" | "ageing";

export type KycDocument = {
  readonly key: string;
  readonly title: string;
  readonly fileLabel: string;
  /** Set by a reviewer on A-06. Null until they look. */
  readonly verdict: "ok" | "problem" | null;
};

export type KycApplication = {
  readonly id: string;
  readonly accountId: string;
  readonly applicantName: string;
  readonly roleLabel: string;
  readonly documentsLabel: string;
  readonly submittedAt: string;
  readonly waitingLabel: string;
  readonly state: KycApplicationState;
  readonly liveConsole: "seller" | "builder" | null;
  readonly documents: readonly KycDocument[];
  readonly checks: readonly KycCheck[];
  /** Null while the application is still in the queue. */
  readonly decision: KycDecision | null;
};

export type KycCheck = {
  readonly key: string;
  readonly label: string;
  readonly done: boolean;
};

export type KycDecision = "approved" | "rejected" | "resubmit";

// --------------------------------------------------------------- moderation --

export type ModerationState = "reported" | "published" | "unpublished";

export type ModeratedListing = {
  readonly id: string;
  readonly name: string;
  readonly builder: string;
  readonly locality: string;
  readonly note: string;
  readonly state: ModerationState;
  /** Set once staff act. Null while the listing is untouched. */
  readonly outcome: "unpublished" | "report_dismissed" | null;
  readonly history: readonly AdminHistoryEntry[];
};

// -------------------------------------------------------------------- leads --

export type IntakeRun = {
  readonly id: string;
  readonly source: string;
  readonly when: string;
  readonly accepted: number;
  readonly rejected: number;
  readonly duplicates: number;
};

export type IntakeRejection = {
  readonly row: string;
  readonly maskedNumber: string;
  readonly field: string;
  readonly why: string;
};

export type AdminLeadState =
  | "qualifying"
  | "qualified"
  | "listed"
  | "on_sale"
  | "sold"
  | "disqualified";

export type AdminLead = {
  readonly id: string;
  readonly requirement: string;
  readonly area: string;
  readonly source: string;
  readonly state: AdminLeadState;
  readonly ageLabel: string;
  readonly intakenAt: string;
  readonly score: number;
  readonly channel: string;
  readonly priceLabel: string | null;
  readonly answers: readonly AdminFact[];
  readonly summary: string;
  readonly consent: AdminLeadConsent;
  readonly eligibility: readonly EligibilityLine[];
  readonly eligible: boolean;
  readonly eligibleLabel: string;
  readonly lifecycle: readonly LifecycleStep[];
  readonly callId: string | null;
};

export type AdminLeadConsent = {
  readonly label: string;
  readonly note: string;
  readonly given: boolean;
};

export type EligibilityLine = { readonly met: boolean; readonly text: string };

export type LifecycleStep = {
  readonly label: string;
  readonly note: string;
  readonly done: boolean;
};

// -------------------------------------------------------------------- money --

export type AdminOrderState = "delivered" | "failed";

export type AdminOrder = {
  readonly id: string;
  readonly leadId: string;
  readonly leadLabel: string;
  readonly purchaserName: string;
  readonly purchaserOrganisation: string;
  readonly purchaserAccountId: string;
  readonly amountInr: number;
  readonly state: AdminOrderState;
  readonly when: string;
  /** True for orders created by this review session rather than seeded. */
  readonly live: boolean;
  readonly facts: readonly AdminFact[];
  readonly events: readonly DeliveryEvent[];
};

export type DeliveryEvent = {
  readonly what: string;
  readonly detail: string;
  readonly when: string;
};

/**
 * A wallet, as the oversight screen sees it.
 *
 * `frozen` is not a wallet state anywhere in the system. An account is
 * suspended or it is not, and a suspended account cannot act at all — so the
 * field is reported from `accountStatus` and the two are kept beside each
 * other rather than one standing in for the other. There is no separate
 * "freeze this wallet" operation, and nothing here should imply one.
 */
export type AdminWallet = {
  readonly accountId: string;
  readonly name: string;
  readonly role: AccountRole;
  readonly balanceInr: number;
  readonly accountStatus: "active" | "suspended";
  readonly frozen: boolean;
  readonly note: string;
};

export type AdminLedgerRow = {
  readonly when: string;
  readonly what: string;
  readonly reference: string;
  readonly deltaInr: number;
  readonly balanceAfterInr: number;
  readonly reason: string | null;
};

export type RefundDecision = "approved" | "declined";

export type RefundRequest = {
  readonly id: string;
  readonly orderId: string;
  readonly requesterName: string;
  readonly requesterRole: string;
  readonly amountInr: number;
  readonly reasonGiven: string;
  readonly when: string;
  readonly decision: RefundDecision | null;
  readonly decisionReason: string | null;
};

export type AdminSubscriptionState = "active" | "renewal_due" | "expired";

export type AdminSubscription = {
  readonly id: string;
  readonly accountId: string;
  readonly organisation: string;
  readonly startedAt: string;
  readonly state: AdminSubscriptionState;
  readonly listingsLabel: string;
};

// ------------------------------------------------------------------ support --

export type AdminTicketState = "awaiting_reply" | "awaiting_user" | "resolved";

export type AdminTicket = {
  readonly reference: string;
  readonly subject: string;
  readonly requesterName: string;
  readonly requesterRole: string;
  readonly requesterAccountId: string;
  readonly openedAt: string;
  readonly ageLabel: string;
  readonly state: AdminTicketState;
  /** Which console this ticket was raised from, where one exists. */
  readonly liveConsole: "seller" | "builder" | null;
  readonly context: readonly AdminFact[];
};

/**
 * One message on a staff-side ticket thread.
 *
 * `internal` is the whole point of this type. An internal note is staff-only:
 * it must never reach the user's own thread, and the projection that builds
 * the user's view drops it rather than hiding it. See `adminOnly` in
 * admin-store.ts and the negative checks in the verification suite.
 */
export type AdminTicketMessage = {
  readonly id: string;
  readonly authorLabel: string;
  readonly body: string;
  readonly sentAt: string;
  readonly internal: boolean;
  readonly fromUser: boolean;
};

export type AdminThread = AdminTicket & {
  readonly messages: readonly AdminTicketMessage[];
};

// ------------------------------------------------------ lead requests (CR03) --

/**
 * The staff view of a lead request: everything the requester sees, plus who
 * asked and the internal handling notes.
 *
 * `internalNotes` exists only on this type. The requester's own `LeadRequest`
 * has no field that could carry one — the separation is structural, not a
 * filter (service-contract.md §2.8 states the rule for tickets; it applies
 * here for the same reason).
 */
export type AdminLeadRequest = LeadRequest & {
  /** The account that asked, as staff need to see it. */
  readonly requesterLabel: string;
  readonly internalNotes: readonly AdminTicketMessage[];
};

/**
 * CR02 — an owner's listing as staff see it: the owner's own view, plus who
 * asked and the staff notes.
 *
 * Same containment as CR03 and the support console. `OwnerListing` has no
 * field that could carry an internal note, so a staff note cannot reach the
 * owner by a forgotten filter on some later screen — it can only reach them
 * if somebody writes it into `messages`, which is the public thread.
 */
export type AdminOwnerListing = OwnerListing & {
  readonly ownerLabel: string;
  readonly internalNotes: readonly AdminTicketMessage[];
};

// ------------------------------------------------------------ qualification --

export type CallOutcome = "qualified" | "declined" | "no_answer";

export type VoiceCall = {
  readonly id: string;
  readonly maskedNumber: string;
  readonly language: string;
  readonly length: string;
  readonly outcomeLabel: string;
  readonly outcome: CallOutcome;
  readonly consentLabel: string;
  readonly transcript: readonly TranscriptLine[];
  readonly captured: readonly CapturedAnswer[];
};

export type TranscriptLine = {
  readonly at: string;
  readonly who: string;
  readonly text: string;
  readonly automated: boolean;
};

export type CapturedAnswer = {
  readonly label: string;
  readonly value: string;
  readonly at: string;
};

export type WhatsAppStep = {
  readonly label: string;
  readonly count: number;
  readonly percent: string;
  readonly tone: "brand" | "warning" | "success";
};

export type WhatsAppConversation = {
  readonly maskedNumber: string;
  readonly step: string;
  readonly when: string;
  readonly stateLabel: string;
  readonly tone: "success" | "danger" | "warning" | "muted";
};

// ------------------------------------------------------ consent, notices, ops --

/**
 * One entry on the suppression list.
 *
 * `maskedNumber` is null whenever the service does not hold an address — which
 * is every backend deployment, because the table stores a SHA-256 and nothing
 * else. A mask implies a value is being withheld; null plus
 * `addressAvailable: false` says there is nothing to withhold, which is a
 * different and truer statement. The screen renders the second case as a
 * sentence rather than as dots.
 */
export type SuppressionEntry = {
  readonly maskedNumber: string | null;
  readonly addressAvailable: boolean;
  readonly source: string;
  readonly basis: string;
  readonly when: string;
};

export type ConsentBasis = { readonly source: string; readonly basis: string };

export type NotificationState =
  | "sent"
  | "failed"
  | "retrying"
  | "queued"
  | "sending"
  | "suppressed"
  | "unconfigured";

export type NotificationRecord = {
  readonly id: string;
  readonly when: string;
  readonly recipientName: string;
  readonly recipientNumber: string;
  readonly channel: string;
  readonly message: string;
  readonly state: NotificationState;
};

export type IntegrationState = "healthy" | "degraded" | "failing";

export type Integration = {
  readonly name: string;
  readonly role: string;
  readonly state: IntegrationState;
  readonly stateLabel: string;
  readonly metrics: readonly AdminFact[];
  readonly note: string;
};

export type JobFailure = {
  readonly job: string;
  readonly error: string;
  readonly when: string;
  readonly attempts: string;
};

// -------------------------------------------------------------- audit trail --

export type AuditCategory = "accounts" | "money" | "listings" | "support";

/**
 * One entry in the append-only staff action log (A-30).
 *
 * Every field here exists because the approved design shows it: who acted, when
 * exactly, on what, why, and what changed. `reason` is not optional and no
 * action in the Admin services can write an entry without one — that is the
 * "reason-gated decision" the brief asks for, enforced at the store rather than
 * in each form.
 */
export type AuditEntry = {
  readonly id: string;
  readonly at: string;
  readonly actor: StaffRef;
  readonly category: AuditCategory;
  readonly action: string;
  readonly subject: string;
  readonly subjectLabel: string;
  readonly reason: string;
  readonly reasonCategory: string | null;
  readonly changes: readonly FieldChange[];
};

export type FieldChange = {
  readonly field: string;
  readonly before: string;
  readonly after: string;
};

// ----------------------------------------------------------------- dashboard --

export type QueueTile = {
  /** Null when the count could not be read. That is not zero, and not a fixture. */
  readonly value: number | null;
  readonly label: string;
  readonly note: string;
  readonly flag: string | null;
  readonly tone: "warning" | "danger" | "neutral";
  readonly href: string;
};

export type DashboardAlert = {
  readonly title: string;
  readonly body: string;
  readonly tone: "danger" | "warning";
  readonly href: string;
};


// ------------------------------------------------------------ action results --

/**
 * What a staff action returns.
 *
 * Every Admin mutation can fail for one reason the person can fix — almost
 * always that they did not say why — so the result says that and nothing else.
 * A thrown error would make each form catch and translate; a result makes the
 * refusal part of the type.
 */
export type AdminActionResult =
  | { readonly ok: true; readonly auditId: string }
  | { readonly ok: false; readonly error: string };

export type AdminTicketFilter = "awaiting_reply" | "awaiting_user" | "resolved" | "all";
