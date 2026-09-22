import type { StaffRef } from "@/lib/domain/identity";
import { SAMPLE_STAFF } from "@/lib/domain/identity";
import type { KycStatus } from "@/lib/domain/types";
import type {
  AdminAccount,
  AdminLead,
  AdminLedgerRow,
  AdminOrder,
  AdminSubscription,
  AdminThread,
  AdminActionResult,
  AdminTicket,
  AdminTicketFilter,
  AdminTicketState,
  AdminTicketMessage,
  AdminWallet,
  AuditCategory,
  AuditEntry,
  ConsentBasis,
  DashboardAlert,
  FieldChange,
  Integration,
  IntakeRejection,
  IntakeRun,
  JobFailure,
  KycApplication,
  ModeratedListing,
  NotificationRecord,
  QueueTile,
  RefundRequest,
  SuppressionEntry,
  VoiceCall,
  WhatsAppConversation,
  WhatsAppStep,
} from "@/lib/domain/admin";
import { processState } from "./process-state";
import * as sellerStore from "./seller-store";
import * as builderStore from "./builder-store";
import { builderPurchasedLeads, builderSupport } from "./builder-modules";

/**
 * The Admin console's records, and the joins to the two live consoles.
 *
 * WHAT IS REAL HERE AND WHAT IS NOT
 * ---------------------------------
 * Two of the accounts on A-03 are the Seller and the Builder whose consoles
 * exist in this build. For those, this store does not keep its own copy of the
 * verification or account status: it **reads them from the console's own
 * store**, so the two views cannot disagree, and a decision taken here is
 * visible there on the next request. Everything else — the third broker, the
 * lead lifecycle, the intake runs, the calls, the WhatsApp funnel — is static
 * sample data for accounts and processes that have no implementation, and every
 * screen carrying it says so.
 *
 * WHAT THIS IS NOT
 * ----------------
 * It is not authorization, and the separation it maintains is not a security
 * control. There is no staff sign-in; `SAMPLE_STAFF` is a constant. Any request
 * that reaches `/admin` gets everything, which is exactly why A-01 says so on
 * its own face. Real staff permissions, four-eyes rules on money, and the
 * question of who may see a document at all belong to kkl-backend and are not
 * demonstrated.
 *
 * REASONS ARE ENFORCED HERE, NOT IN THE FORMS
 * -------------------------------------------
 * Every mutating function takes a reason and refuses an empty one before it
 * changes anything. Putting that in the forms would mean a new screen could
 * quietly skip it; putting it here means an action without a reason cannot be
 * recorded, and each one writes its audit entry in the same call that makes the
 * change.
 */

// ---------------------------------------------------------- account mapping --

/** The two accounts whose consoles are implemented in this build. */
const SELLER_ACCOUNT_ID = "U-10442";
const BUILDER_ACCOUNT_ID = "U-10455";

/** The third broker: a record with no console behind it. */
const STATIC_BROKER_ID = "U-10501";

type Live = "seller" | "builder" | null;

function liveConsoleFor(accountId: string): Live {
  if (accountId === SELLER_ACCOUNT_ID) return "seller";
  if (accountId === BUILDER_ACCOUNT_ID) return "builder";
  return null;
}

/**
 * The verification state of an account, from wherever it actually lives.
 *
 * For the two live accounts this is the console's own value, which is what
 * makes "KYC decisions update the corresponding Seller/Builder verification
 * state" true rather than merely displayed.
 */
function kycStatusOf(accountId: string): KycStatus {
  const live = liveConsoleFor(accountId);
  if (live === "seller") return sellerStore.getAccount().kycStatus;
  if (live === "builder") return builderStore.getAccount().kycStatus;
  return state().staticKyc[accountId] ?? "approved";
}

function accountStatusOf(accountId: string): "active" | "suspended" {
  const live = liveConsoleFor(accountId);
  if (live === "seller") return sellerStore.getAccount().accountStatus;
  if (live === "builder") {
    return builderStore.getAccount().accountStatus === "suspended" ? "suspended" : "active";
  }
  return state().staticStatus[accountId] ?? "active";
}

// ------------------------------------------------------------------- errors --

const REASON_REQUIRED =
  "A reason is required. It is written to the audit log and, where the person is told the outcome, shown to them.";

function requireReason(reason: string): string | null {
  return reason.trim().length === 0 ? REASON_REQUIRED : null;
}

// -------------------------------------------------------------------- seeds --

function seedAccounts(): AdminAccount[] {
  return [
    {
      accountId: SELLER_ACCOUNT_ID,
      name: "Sanjay Paul",
      organisation: "Sen Properties",
      role: "seller",
      mobile: "+91 98300 41288",
      status: "active",
      kycStatus: "approved",
      joinedAt: "2 Aug 2026",
      liveConsole: "seller",
      facts: [
        { label: "Agency", value: "Sen Properties" },
        { label: "Areas", value: "New Town, Rajarhat" },
      ],
      history: [
        { what: "KYC approved", who: "A. Dutta · Operations", when: "14 Sep 2026" },
        { what: "Credit recharge ₹2,000", who: "Self-service", when: "14 Sep 2026" },
        { what: "Lead LD-88041 purchased", who: "Self-service", when: "12 Sep 2026" },
        { what: "Account created", who: "Self-registration", when: "2 Aug 2026" },
      ],
    },
    {
      accountId: BUILDER_ACCOUNT_ID,
      name: "Suman Bhattacharya",
      organisation: "Sample Builders Pvt Ltd",
      role: "builder",
      mobile: "+91 98311 20455",
      status: "active",
      kycStatus: "approved",
      joinedAt: "14 Jun 2026",
      liveConsole: "builder",
      facts: [
        { label: "Company", value: "Sample Builders Pvt Ltd" },
        { label: "Subscription", value: "Active — price not set by the client (D-01)" },
      ],
      history: [
        { what: "Subscription started", who: "Self-service", when: "14 Sep 2026" },
        { what: "Greenview Residency published", who: "Self-service", when: "28 Aug 2026" },
        { what: "KYC approved", who: "A. Dutta · Operations", when: "20 Jun 2026" },
        { what: "Account created", who: "Self-registration", when: "14 Jun 2026" },
      ],
    },
    {
      accountId: STATIC_BROKER_ID,
      name: "Deb Roy",
      organisation: "Roy Realty",
      role: "seller",
      mobile: "+91 90271 55810",
      status: "suspended",
      kycStatus: "approved",
      joinedAt: "19 Aug 2026",
      liveConsole: null,
      facts: [
        { label: "Agency", value: "Roy Realty" },
        { label: "Credit balance", value: "₹1,420 · frozen" },
        { label: "Leads purchased", value: "11" },
        { label: "Complaints", value: "3 buyer complaints" },
        { label: "Suspended on", value: "15 Sep 2026" },
      ],
      history: [
        {
          what: "Account suspended — reason recorded",
          who: "R. Iyer · Operations lead",
          when: "15 Sep 2026",
        },
        { what: "Third buyer complaint logged", who: "Support", when: "14 Sep 2026" },
        { what: "Credit adjustment +₹780", who: "A. Dutta · Operations", when: "14 Sep 2026" },
        { what: "Account created", who: "Self-registration", when: "19 Aug 2026" },
      ],
    },
    {
      accountId: "U-10620",
      name: "Rina Sen",
      organisation: "Buyer",
      role: "buyer",
      mobile: "+91 98300 51134",
      status: "active",
      kycStatus: "not_submitted",
      joinedAt: "11 Sep 2026",
      liveConsole: null,
      facts: [
        { label: "Enquiries", value: "4 · 1 site visit" },
        { label: "Verification", value: "Not applicable to a buyer account" },
      ],
      history: [
        { what: "Enquiry on Greenview Residency", who: "Self-service", when: "15 Sep 2026" },
        { what: "Account created", who: "Self-registration", when: "11 Sep 2026" },
      ],
    },
    {
      accountId: "U-10633",
      name: "Anima Ghosh",
      organisation: "Ghosh Developers",
      role: "builder",
      mobile: "+91 98745 21003",
      status: "active",
      kycStatus: "pending",
      joinedAt: "15 Sep 2026",
      liveConsole: null,
      facts: [
        { label: "Company", value: "Ghosh Developers" },
        { label: "Verification", value: "Submitted 15 Sep, in review" },
      ],
      history: [
        { what: "Documents submitted", who: "Self-service", when: "15 Sep 2026" },
        { what: "Account created", who: "Self-registration", when: "15 Sep 2026" },
      ],
    },
  ];
}

const KYC_CHECKS = [
  { key: "legible", label: "Both documents are legible" },
  { key: "match", label: "Name matches the account" },
  { key: "pan", label: "PAN format and check digit valid" },
  { key: "dupe", label: "No existing account with this PAN" },
] as const;

function seedApplications(): KycApplication[] {
  const docs = (...titles: readonly (readonly [string, string, string])[]) =>
    titles.map(([key, title, fileLabel]) => ({ key, title, fileLabel, verdict: null }));
  const checks = () => KYC_CHECKS.map((c) => ({ ...c, done: false }));

  return [
    {
      id: "K-3318",
      accountId: BUILDER_ACCOUNT_ID,
      applicantName: "Suman Bhattacharya",
      roleLabel: "Builder · Sample Builders Pvt Ltd",
      documentsLabel: "PAN, Aadhaar, incorporation",
      submittedAt: "15 Sep, 10:24",
      waitingLabel: "1 day 4 hours",
      state: "ageing",
      liveConsole: "builder",
      documents: docs(
        ["pan", "Company PAN", "pan-card.pdf · 1.2 MB"],
        ["aadhaar", "Signatory Aadhaar", "aadhaar-both-sides.pdf · 2.4 MB"],
        ["incorporation", "Certificate of incorporation", "incorporation.pdf · 840 KB"],
      ),
      checks: checks(),
      decision: null,
    },
    {
      id: "K-3322",
      accountId: SELLER_ACCOUNT_ID,
      applicantName: "Sanjay Paul",
      roleLabel: "Broker · Sen Properties",
      documentsLabel: "PAN, Aadhaar",
      submittedAt: "16 Sep, 08:10",
      waitingLabel: "3 hours",
      state: "pending",
      liveConsole: "seller",
      documents: docs(
        ["pan", "PAN card", "pan-card.pdf · 980 KB"],
        ["aadhaar", "Aadhaar", "aadhaar-both-sides.pdf · 2.1 MB"],
      ),
      checks: checks(),
      decision: null,
    },
    {
      id: "K-3309",
      accountId: "U-10388",
      applicantName: "Metro Habitat",
      roleLabel: "Builder · Metro Habitat",
      documentsLabel: "PAN, Aadhaar, RERA",
      submittedAt: "13 Sep, 15:40",
      waitingLabel: "2 days 20 hours",
      state: "ageing",
      liveConsole: null,
      documents: docs(
        ["pan", "Company PAN", "pan-card.pdf · 1.1 MB"],
        ["aadhaar", "Signatory Aadhaar", "aadhaar.pdf · 1.9 MB"],
        ["rera", "RERA registration", "rera-certificate.pdf · 1.4 MB"],
      ),
      checks: checks(),
      decision: null,
    },
    {
      id: "K-3290",
      accountId: STATIC_BROKER_ID,
      applicantName: "Deb Roy",
      roleLabel: "Broker · Roy Realty",
      documentsLabel: "Aadhaar re-upload",
      submittedAt: "16 Sep, 09:55",
      waitingLabel: "1 hour",
      state: "resubmitted",
      liveConsole: null,
      documents: docs(["aadhaar", "Aadhaar", "aadhaar-reupload.pdf · 2.2 MB"]),
      checks: checks(),
      decision: null,
    },
  ];
}

function seedListings(): ModeratedListing[] {
  return [
    {
      id: "P-2204",
      name: "Riverside Commons",
      builder: "Metro Habitat",
      locality: "Action Area II, New Town",
      note: "Photographs reported as not matching the site · 1 report",
      state: "reported",
      outcome: null,
      history: [
        { what: "Reported by a buyer", who: "U-10620", when: "15 Sep 2026" },
        { what: "Photographs replaced", who: "Metro Habitat", when: "6 Sep 2026" },
        { what: "Published", who: "Metro Habitat", when: "28 Aug 2026" },
        { what: "Created as a draft", who: "Metro Habitat", when: "24 Aug 2026" },
      ],
    },
    {
      id: "P-2190",
      name: "Orchid Grove",
      builder: "Sample Builders Pvt Ltd",
      locality: "Action Area III, New Town",
      note: "Published 1 Sep · no reports",
      state: "published",
      outcome: null,
      history: [
        { what: "Unpublished by the builder", who: "Sample Builders", when: "1 Sep 2026" },
        { what: "Published", who: "Sample Builders", when: "18 Aug 2026" },
      ],
    },
    {
      id: "P-2211",
      name: "Sundew Enclave — Phase 2",
      builder: "Sample Builders Pvt Ltd",
      locality: "Rajarhat, Kolkata",
      note: "Published 12 Sep · pricing missing on one configuration",
      state: "published",
      outcome: null,
      history: [{ what: "Published", who: "Sample Builders", when: "12 Sep 2026" }],
    },
    {
      id: "P-2176",
      name: "Bayview Terraces",
      builder: "Ghosh Developers",
      locality: "Action Area I, New Town",
      note: "Unpublished 9 Sep · duplicate of P-2190",
      state: "unpublished",
      outcome: null,
      history: [
        { what: "Unpublished by staff", who: "R. Iyer · Operations lead", when: "9 Sep 2026" },
        { what: "Published", who: "Ghosh Developers", when: "3 Sep 2026" },
      ],
    },
  ];
}

function seedRefunds(): RefundRequest[] {
  return [
    {
      id: "RF-118",
      orderId: "ORD-10419",
      requesterName: "Sanjay Paul",
      requesterRole: "Broker",
      amountInr: 600,
      reasonGiven: "Lead contact number was disconnected on three attempts",
      when: "13 Sep 2026",
      decision: null,
      decisionReason: null,
    },
    {
      id: "RF-119",
      orderId: "ORD-10402",
      requesterName: "Deb Roy",
      requesterRole: "Broker",
      amountInr: 780,
      reasonGiven: "Claims the lead was already contacted by another broker",
      when: "15 Sep 2026",
      decision: null,
      decisionReason: null,
    },
  ];
}

function seedAudit(): AuditEntry[] {
  const staff = (staffId: string, name: string, team: string): StaffRef => ({
    staffId,
    name,
    team,
  });
  return [
    {
      id: "AU-5549",
      at: "15 Sep 2026, 14:41:37 IST",
      actor: staff("S-01", "R. Iyer", "Operations lead"),
      category: "listings",
      action: "Listing unpublished",
      subject: "P-2204",
      subjectLabel: "Listing P-2204 · Riverside Commons",
      reason: "Photographs did not match the address",
      reasonCategory: "Buyer report",
      changes: [
        { field: "listing_status", before: "published", after: "unpublished" },
        { field: "visible_in_search", before: "true", after: "false" },
        { field: "report_state", before: "open", after: "upheld" },
      ],
    },
    {
      id: "AU-5541",
      at: "15 Sep 2026, 09:05:02 IST",
      actor: staff("S-01", "R. Iyer", "Operations lead"),
      category: "accounts",
      action: "Account suspended",
      subject: STATIC_BROKER_ID,
      subjectLabel: "Account U-10501 · Deb Roy",
      reason: "Three buyer complaints of misrepresented listings",
      reasonCategory: "Buyer complaints",
      changes: [
        { field: "account_status", before: "active", after: "suspended" },
        { field: "can_purchase_leads", before: "true", after: "false" },
        { field: "kyc_status", before: "approved", after: "approved" },
      ],
    },
    {
      id: "AU-5530",
      at: "14 Sep 2026, 17:20:48 IST",
      actor: SAMPLE_STAFF,
      category: "money",
      action: "Credit adjustment, direction credit",
      subject: STATIC_BROKER_ID,
      subjectLabel: "Ledger entry LG-55340 · Deb Roy",
      reason: "Duplicate lead confirmed, goodwill credit",
      reasonCategory: "Confirmed error",
      changes: [
        { field: "ledger_entries", before: "18 entries", after: "19 entries" },
        { field: "derived_balance", before: "₹640", after: "₹1,420" },
      ],
    },
    {
      id: "AU-5521",
      at: "14 Sep 2026, 16:02:11 IST",
      actor: SAMPLE_STAFF,
      category: "accounts",
      action: "KYC approved",
      subject: "K-3301",
      subjectLabel: "KYC application K-3301 · Sanjay Paul",
      reason: "Documents legible, details match",
      reasonCategory: "Documents verified",
      changes: [
        { field: "kyc_status", before: "pending", after: "approved" },
        { field: "can_purchase_leads", before: "false", after: "true" },
        { field: "reviewed_by", before: "—", after: "S-04" },
      ],
    },
  ];
}

/**
 * Staff-side messages on tickets raised in the two live consoles.
 *
 * The user-visible messages live in the console's own store, because that is
 * the thread the user reads. What lives here is only the staff view's extra:
 * internal notes. A public reply written here is pushed *into* the console
 * store, so it reaches the person who raised the ticket; an internal note is
 * not, and cannot be, because nothing in this map is ever read by the Seller or
 * Builder support service.
 */
function seedInternalNotes(): Record<string, AdminTicketMessage[]> {
  return {
    "T-2291": [
      {
        id: "AN-1",
        authorLabel: "A. Dutta · Operations",
        body: "Checked the call record — the number was mis-keyed at intake. Corrected on the lead. Refund not applied: no policy agreed yet (D-06).",
        sentAt: "13 Sep 2026, 09:40",
        internal: true,
        fromUser: false,
      },
    ],
  };
}

// -------------------------------------------------------------------- state --

type AdminState = {
  accounts: AdminAccount[];
  applications: KycApplication[];
  listings: ModeratedListing[];
  refunds: RefundRequest[];
  audit: AuditEntry[];
  internalNotes: Record<string, AdminTicketMessage[]>;
  adjustments: AdminLedgerRow[];
  staticKyc: Record<string, KycStatus>;
  staticStatus: Record<string, "active" | "suspended">;
  auditSequence: number;
  ledgerSequence: number;
  signedIn: boolean;
};

function freshState(): AdminState {
  return {
    accounts: seedAccounts(),
    applications: seedApplications(),
    listings: seedListings(),
    refunds: seedRefunds(),
    audit: seedAudit(),
    internalNotes: seedInternalNotes(),
    adjustments: [],
    staticKyc: { "U-10633": "pending", "U-10388": "pending", [STATIC_BROKER_ID]: "approved" },
    staticStatus: { [STATIC_BROKER_ID]: "suspended" },
    auditSequence: 5549,
    ledgerSequence: 55411,
    signedIn: false,
  };
}

let holder: AdminState | null = null;
function state(): AdminState {
  holder ??= processState("admin", freshState);
  return holder;
}

export function resetForReview(): void {
  Object.assign(state(), freshState());
}

// -------------------------------------------------------------------- audit --

function nowLabel(): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  }).format(new Date()).replace(",", "") + " IST";
}

/**
 * Write an entry. Called by every mutation, in the same call that mutates.
 *
 * Append-only by construction: nothing in this module removes or rewrites an
 * entry, and the list is only ever `unshift`ed. A mistake is corrected by a new
 * entry, which is what the approved A-30 says.
 */
function record(input: {
  actor: StaffRef;
  category: AuditCategory;
  action: string;
  subject: string;
  subjectLabel: string;
  reason: string;
  reasonCategory?: string | null;
  changes: readonly FieldChange[];
}): string {
  state().auditSequence += 1;
  const id = `AU-${state().auditSequence}`;
  state().audit.unshift({
    id,
    at: nowLabel(),
    actor: input.actor,
    category: input.category,
    action: input.action,
    subject: input.subject,
    subjectLabel: input.subjectLabel,
    reason: input.reason.trim(),
    reasonCategory: input.reasonCategory ?? null,
    changes: input.changes,
  });
  return id;
}

export function listAudit(category?: AuditCategory): readonly AuditEntry[] {
  const all = state().audit;
  return category ? all.filter((e) => e.category === category) : all;
}

export function getAudit(id: string): AuditEntry | null {
  return state().audit.find((e) => e.id === id) ?? null;
}

// ----------------------------------------------------------------- accounts --

/** A-03. Status and verification come from the live store where there is one. */
export function listAccounts(): readonly AdminAccount[] {
  return state().accounts.map(withLiveState);
}

export function getAccount(accountId: string): AdminAccount | null {
  const found = state().accounts.find((a) => a.accountId === accountId);
  return found ? withLiveState(found) : null;
}

function withLiveState(account: AdminAccount): AdminAccount {
  const live = liveConsoleFor(account.accountId);
  const facts = [...account.facts];
  if (live === "seller") {
    const wallet = sellerStore.wallet();
    facts.push({ label: "Credit balance", value: `₹${wallet.balanceCredits.toLocaleString("en-IN")}` });
    facts.push({ label: "Leads purchased", value: String(sellerStore.listPurchased().length) });
  }
  return {
    ...account,
    status: accountStatusOf(account.accountId),
    kycStatus: kycStatusOf(account.accountId),
    facts,
  };
}

export const SUSPENSION_REASONS = [
  "Buyer complaints",
  "Misrepresented listing",
  "Suspected fraud",
  "Document problem",
  "User request",
  "Other",
] as const;

/**
 * A-04. Suspend or reinstate, without touching verification.
 *
 * The separation is the point, and it is enforced rather than merely intended:
 * this function writes `accountStatus` and nothing else, and the audit entry it
 * records carries `kyc_status` as a before/after pair that is deliberately
 * unchanged, so the log shows what was *not* touched as well as what was.
 */
export function setAccountSuspension(input: {
  actor: StaffRef;
  accountId: string;
  suspended: boolean;
  reason: string;
  reasonCategory?: string;
}): AdminActionResult {
  const problem = requireReason(input.reason);
  if (problem) return { ok: false, error: problem };

  const account = state().accounts.find((a) => a.accountId === input.accountId);
  if (!account) return { ok: false, error: "That account could not be found." };

  const before = accountStatusOf(input.accountId);
  const after = input.suspended ? "suspended" : "active";
  const kycBefore = kycStatusOf(input.accountId);

  const live = liveConsoleFor(input.accountId);
  if (live === "seller") sellerStore.setAccountStatusForReview(after);
  else if (live === "builder") builderStore.setAccountStatusForReview(after);
  else state().staticStatus[input.accountId] = after;

  const auditId = record({
    actor: input.actor,
    category: "accounts",
    action: input.suspended ? "Account suspended" : "Account reinstated",
    subject: input.accountId,
    subjectLabel: `Account ${input.accountId} · ${account.name}`,
    reason: input.reason,
    reasonCategory: input.reasonCategory ?? null,
    changes: [
      { field: "account_status", before, after },
      { field: "can_purchase_leads", before: String(before === "active"), after: String(after === "active") },
      // Recorded unchanged on purpose. Suspension is not a verification
      // decision, and the log should be able to prove that.
      { field: "kyc_status", before: kycBefore, after: kycStatusOf(input.accountId) },
    ],
  });
  return { ok: true, auditId };
}

// ---------------------------------------------------------------- KYC queue --

export function listApplications(filter?: "pending" | "resubmitted" | "ageing"): readonly KycApplication[] {
  const open = state().applications.filter((a) => a.decision === null);
  if (!filter) return open;
  if (filter === "pending") return open.filter((a) => a.state === "pending" || a.state === "ageing");
  return open.filter((a) => a.state === filter);
}

export function getApplication(id: string): KycApplication | null {
  return state().applications.find((a) => a.id === id) ?? null;
}

/** A-06 — a reviewer marking one document legible or not. */
export function setDocumentVerdict(input: {
  applicationId: string;
  documentKey: string;
  verdict: "ok" | "problem";
}): void {
  const application = state().applications.find((a) => a.id === input.applicationId);
  if (!application) return;
  const index = state().applications.indexOf(application);
  state().applications[index] = {
    ...application,
    documents: application.documents.map((d) =>
      d.key === input.documentKey ? { ...d, verdict: input.verdict } : d,
    ),
  };
}

/** A-06 — the checklist that gates approval. */
export function toggleCheck(input: { applicationId: string; checkKey: string }): void {
  const application = state().applications.find((a) => a.id === input.applicationId);
  if (!application) return;
  const index = state().applications.indexOf(application);
  state().applications[index] = {
    ...application,
    checks: application.checks.map((c) =>
      c.key === input.checkKey ? { ...c, done: !c.done } : c,
    ),
  };
}

export const CHECKLIST_INCOMPLETE =
  "Work through the checklist first. Approval is the one decision here that cannot be taken back by the applicant, so every line has to be ticked before it is available.";

/**
 * A-06 and A-07 — the decision.
 *
 * A-07 is not a separate screen. The approved design shows the decision as the
 * outcome panel of A-06's own review flow, and building it as its own route
 * would invent a step the design does not have.
 *
 * Approval is gated on the checklist; rejection and resubmission are gated on a
 * reason. Approving needs no free-text reason because the checklist *is* the
 * reason, and it is recorded as one.
 */
export function decideApplication(input: {
  actor: StaffRef;
  applicationId: string;
  decision: "approved" | "rejected" | "resubmit";
  reason: string;
}): AdminActionResult {
  const application = state().applications.find((a) => a.id === input.applicationId);
  if (!application) return { ok: false, error: "That application could not be found." };
  if (application.decision !== null) {
    return { ok: false, error: "This application has already been decided." };
  }

  if (input.decision === "approved") {
    if (!application.checks.every((c) => c.done)) {
      return { ok: false, error: CHECKLIST_INCOMPLETE };
    }
  } else {
    const problem = requireReason(input.reason);
    if (problem) return { ok: false, error: problem };
  }

  const nextKyc: KycStatus =
    input.decision === "approved" ? "approved" : input.decision === "rejected" ? "rejected" : "pending";
  const before = kycStatusOf(application.accountId);

  // The cross-role write. For the two live accounts this is the console's own
  // verification state, so the Seller or Builder sees the decision.
  const live = liveConsoleFor(application.accountId);
  if (live === "seller") sellerStore.setKycStatusForReview(nextKyc);
  else if (live === "builder") builderStore.setKycStatusForReview(nextKyc);
  else state().staticKyc[application.accountId] = nextKyc;

  const index = state().applications.indexOf(application);
  state().applications[index] = { ...application, decision: input.decision };

  const reason =
    input.decision === "approved"
      ? application.checks.map((c) => c.label).join("; ")
      : input.reason;

  const auditId = record({
    actor: input.actor,
    category: "accounts",
    action:
      input.decision === "approved"
        ? "KYC approved"
        : input.decision === "rejected"
          ? "KYC rejected"
          : "KYC resubmission requested",
    subject: application.id,
    subjectLabel: `KYC application ${application.id} · ${application.applicantName}`,
    reason,
    reasonCategory: input.decision === "approved" ? "Documents verified" : "Document problem",
    changes: [
      { field: "kyc_status", before, after: nextKyc },
      { field: "reviewed_by", before: "—", after: input.actor.staffId },
      // Suspension is a separate axis and a verification decision does not
      // move it. Recorded unchanged, for the same reason as above.
      {
        field: "account_status",
        before: accountStatusOf(application.accountId),
        after: accountStatusOf(application.accountId),
      },
    ],
  });
  return { ok: true, auditId };
}

// --------------------------------------------------------------- moderation --

export function listModeratedListings(
  filter?: "reported" | "published" | "unpublished",
): readonly ModeratedListing[] {
  const all = state().listings;
  return filter ? all.filter((l) => l.state === filter) : all;
}

export function getModeratedListing(id: string): ModeratedListing | null {
  return state().listings.find((l) => l.id === id) ?? null;
}

/**
 * A-09 — unpublish a listing, or dismiss the report against it.
 *
 * **Neither of these is approval.** D-10 — whether a listing is reviewed before
 * or after it goes live — is open, so there is no "approve" action here and
 * nothing in this store can publish anything. Dismissing a report leaves a
 * listing exactly as published as it already was; it does not bless it. The
 * screen says the same thing in words.
 */
export function moderateListing(input: {
  actor: StaffRef;
  listingId: string;
  action: "unpublish" | "dismiss_report";
  reason: string;
}): AdminActionResult {
  const problem = requireReason(input.reason);
  if (problem) return { ok: false, error: problem };

  const listing = state().listings.find((l) => l.id === input.listingId);
  if (!listing) return { ok: false, error: "That listing could not be found." };

  const index = state().listings.indexOf(listing);
  const unpublishing = input.action === "unpublish";
  state().listings[index] = {
    ...listing,
    state: unpublishing ? "unpublished" : listing.state === "reported" ? "published" : listing.state,
    outcome: unpublishing ? "unpublished" : "report_dismissed",
  };

  const auditId = record({
    actor: input.actor,
    category: "listings",
    action: unpublishing ? "Listing unpublished" : "Report dismissed",
    subject: listing.id,
    subjectLabel: `Listing ${listing.id} · ${listing.name}`,
    reason: input.reason,
    reasonCategory: unpublishing ? "Moderation" : "Report reviewed",
    changes: unpublishing
      ? [
          { field: "listing_status", before: "published", after: "unpublished" },
          { field: "visible_in_search", before: "true", after: "false" },
          { field: "report_state", before: "open", after: "upheld" },
        ]
      : [
          { field: "report_state", before: "open", after: "dismissed" },
          // Unchanged, and shown unchanged: dismissing a report is not an
          // approval and does not move the listing's own status.
          { field: "listing_status", before: "published", after: "published" },
        ],
  });
  return { ok: true, auditId };
}

// -------------------------------------------------------------------- money --

/**
 * A-18. Balances read from the live ledgers, never a second copy.
 *
 * The Seller and Builder wallets are derived from their own entry chains
 * (see the reconciliation invariant in each store). If this screen kept its own
 * figure it would be a third number to drift, so it does not.
 */
export function listWallets(): readonly AdminWallet[] {
  return [
    {
      accountId: SELLER_ACCOUNT_ID,
      name: "Sanjay Paul",
      role: "seller",
      balanceInr: sellerStore.wallet().balanceCredits,
      frozen: accountStatusOf(SELLER_ACCOUNT_ID) === "suspended",
      note: "Live — this is the Seller console's own derived balance",
    },
    {
      accountId: BUILDER_ACCOUNT_ID,
      name: "Suman Bhattacharya",
      role: "builder",
      balanceInr: builderStore.balance(),
      frozen: accountStatusOf(BUILDER_ACCOUNT_ID) === "suspended",
      note: "Live — this is the Builder console's own derived balance",
    },
    {
      accountId: STATIC_BROKER_ID,
      name: "Deb Roy",
      role: "seller",
      balanceInr: 1_420,
      frozen: true,
      note: "Static sample — this account has no console in this build",
    },
  ];
}

export function walletLedger(accountId: string): readonly AdminLedgerRow[] {
  const toRow = (e: {
    occurredAt: string;
    description: string;
    id: string;
    deltaCredits: number;
    balanceAfterCredits: number;
    type: string;
  }): AdminLedgerRow => ({
    when: e.occurredAt,
    what: e.description,
    reference: e.id,
    deltaInr: e.deltaCredits,
    balanceAfterInr: e.balanceAfterCredits,
    // The reason an adjustment carries is part of its description; a purchase
    // or a recharge has none and shows none rather than an empty label.
    reason: e.type === "adjustment" ? e.description : null,
  });

  if (accountId === SELLER_ACCOUNT_ID) return sellerStore.getLedger().map(toRow);
  if (accountId === BUILDER_ACCOUNT_ID) return [...builderStore.ledger()].reverse().map(toRow);
  return state().adjustments.filter(() => accountId === STATIC_BROKER_ID);
}

export const ADJUSTMENT_AMOUNT_REQUIRED = "Enter a whole number of credits, at least 1.";

/**
 * A-19 — a credit adjustment.
 *
 * Both gates are here rather than in the form: an amount of at least one
 * credit, and a reason. The entry it posts goes into the account's own ledger,
 * so the Seller or Builder sees it in their billing history with the reason
 * attached — an adjustment nobody can trace is the thing this screen exists to
 * prevent.
 *
 * On an account with no console, the adjustment is recorded in the audit log
 * and nowhere else, and the screen says so rather than implying a ledger that
 * does not exist.
 */
export function adjustCredits(input: {
  actor: StaffRef;
  accountId: string;
  direction: "credit" | "debit";
  amountInr: number;
  reason: string;
}): AdminActionResult {
  if (!Number.isInteger(input.amountInr) || input.amountInr < 1) {
    return { ok: false, error: ADJUSTMENT_AMOUNT_REQUIRED };
  }
  const problem = requireReason(input.reason);
  if (problem) return { ok: false, error: problem };

  const account = state().accounts.find((a) => a.accountId === input.accountId);
  if (!account) return { ok: false, error: "That account could not be found." };

  const delta = input.direction === "credit" ? input.amountInr : -input.amountInr;
  const staffLabel = `${input.actor.name} · ${input.actor.team}`;
  const live = liveConsoleFor(input.accountId);

  let before = 0;
  let after = 0;
  let reference = "—";
  if (live === "seller") {
    before = sellerStore.wallet().balanceCredits;
    reference = sellerStore.postStaffAdjustment({ deltaCredits: delta, reason: input.reason.trim(), staffLabel }).id;
    after = sellerStore.wallet().balanceCredits;
  } else if (live === "builder") {
    before = builderStore.balance();
    reference = builderStore.postStaffAdjustment({ deltaCredits: delta, reason: input.reason.trim(), staffLabel }).id;
    after = builderStore.balance();
  } else {
    state().ledgerSequence += 1;
    reference = `LG-${state().ledgerSequence}`;
    before = 1_420;
    after = before + delta;
    state().adjustments.unshift({
      when: new Date().toISOString(),
      what: `Adjustment by ${staffLabel}`,
      reference,
      deltaInr: delta,
      balanceAfterInr: after,
      reason: input.reason.trim(),
    });
  }

  const auditId = record({
    actor: input.actor,
    category: "money",
    action: `Credit adjustment, direction ${input.direction}`,
    subject: input.accountId,
    subjectLabel: `Ledger entry ${reference} · ${account.name}`,
    reason: input.reason,
    reasonCategory: "Credit adjustment",
    changes: [
      { field: "ledger_entry", before: "—", after: reference },
      {
        field: "derived_balance",
        before: `₹${before.toLocaleString("en-IN")}`,
        after: `₹${after.toLocaleString("en-IN")}`,
      },
    ],
  });
  return { ok: true, auditId };
}

export function listRefunds(): readonly RefundRequest[] {
  return state().refunds;
}

export function getRefund(id: string): RefundRequest | null {
  return state().refunds.find((r) => r.id === id) ?? null;
}

/**
 * A-20 — record a refund decision.
 *
 * **Nothing moves.** D-06 leaves both the eligibility rule and the destination
 * open — wallet credits or a gateway reversal — so approving records a decision
 * and writes no ledger entry at all. Inventing either half would be inventing
 * refund policy, which the brief rules out; the screen states the same thing
 * where a reader can see it.
 */
export function decideRefund(input: {
  actor: StaffRef;
  refundId: string;
  decision: RefundDecisionInput;
  reason: string;
}): AdminActionResult {
  const problem = requireReason(input.reason);
  if (problem) return { ok: false, error: problem };

  const refund = state().refunds.find((r) => r.id === input.refundId);
  if (!refund) return { ok: false, error: "That refund request could not be found." };
  if (refund.decision !== null) return { ok: false, error: "This request has already been decided." };

  const index = state().refunds.indexOf(refund);
  state().refunds[index] = {
    ...refund,
    decision: input.decision,
    decisionReason: input.reason.trim(),
  };

  const auditId = record({
    actor: input.actor,
    category: "money",
    action: input.decision === "approved" ? "Refund approved" : "Refund declined",
    subject: refund.id,
    subjectLabel: `Refund ${refund.id} · order ${refund.orderId}`,
    reason: input.reason,
    reasonCategory: "Refund decision",
    changes: [
      { field: "refund_state", before: "awaiting_decision", after: input.decision },
      // Deliberately unmoved. D-06 is open, so an approval is a decision on
      // record and not a transfer, and the log says which.
      { field: "credits_moved", before: "none", after: "none · D-06 open" },
    ],
  });
  return { ok: true, auditId };
}

type RefundDecisionInput = "approved" | "declined";

// ------------------------------------------------------------------ support --

/**
 * A-22. Tickets from both live consoles in one queue, plus static ones.
 *
 * The join the brief asks for: a ticket raised in the Seller console and one
 * raised in the Builder console both appear here, each carrying which console
 * it came from. That field is what decides where a reply goes — not a form
 * field, and not the reference's shape.
 */
export function listTickets(filter?: AdminTicketFilter): readonly AdminTicket[] {
  const all = [...liveTickets(), ...staticTickets()];
  if (!filter || filter === "all") return all;
  return all.filter((t) => t.state === filter);
}

function toAdminState(status: string): AdminTicketState {
  if (status === "resolved") return "resolved";
  if (status === "replied") return "awaiting_user";
  return "awaiting_reply";
}

function liveTickets(): AdminTicket[] {
  const seller = sellerStore.listTickets().map((t) => ({
    reference: t.reference,
    subject: t.subject,
    requesterName: "Sanjay Paul",
    requesterRole: "Broker",
    requesterAccountId: SELLER_ACCOUNT_ID,
    openedAt: t.createdAt,
    ageLabel: t.topic,
    state: toAdminState(t.status),
    liveConsole: "seller" as const,
    context: [
      { label: "Account", value: `${SELLER_ACCOUNT_ID} · Sanjay Paul` },
      { label: "Role", value: `Broker · ${kycStatusOf(SELLER_ACCOUNT_ID)}` },
      { label: "Credit balance", value: `₹${sellerStore.wallet().balanceCredits.toLocaleString("en-IN")}` },
      { label: "Raised from", value: "Seller console (S-23)" },
    ],
  }));

  const builderThreads = builderSupportThreads();
  const builder = builderThreads.map((t) => ({
    reference: t.reference,
    subject: t.subject,
    requesterName: "Suman Bhattacharya",
    requesterRole: "Builder",
    requesterAccountId: BUILDER_ACCOUNT_ID,
    openedAt: t.createdAt,
    ageLabel: t.topic,
    state: toAdminState(t.status),
    liveConsole: "builder" as const,
    context: [
      { label: "Account", value: `${BUILDER_ACCOUNT_ID} · Suman Bhattacharya` },
      { label: "Role", value: `Builder · ${kycStatusOf(BUILDER_ACCOUNT_ID)}` },
      { label: "Credit balance", value: `₹${builderStore.balance().toLocaleString("en-IN")}` },
      { label: "Raised from", value: "Builder console (B-23)" },
    ],
  }));

  return [...seller, ...builder];
}

/**
 * The Builder's tickets, read through its own service.
 *
 * `builderSupport.listTickets` is async because the interface is, but nothing
 * behind it is: it reads the same in-process records synchronously. Reading it
 * here through a promise the call site cannot await would be worse than saying
 * so, so the module's own record accessor is used instead.
 */
function builderSupportThreads(): readonly {
  reference: string;
  subject: string;
  topic: string;
  status: string;
  createdAt: string;
}[] {
  return builderSupport.snapshot();
}

function staticTickets(): AdminTicket[] {
  return [
    {
      reference: "AT-551",
      subject: "When will the subscription price be confirmed?",
      requesterName: "Anima Ghosh",
      requesterRole: "Builder",
      requesterAccountId: "U-10633",
      openedAt: "11 Sep 2026",
      ageLabel: "replied 1 day ago",
      state: "awaiting_user",
      liveConsole: null,
      context: [
        { label: "Account", value: "U-10633 · Ghosh Developers" },
        { label: "Role", value: "Builder · verification pending" },
        { label: "Raised from", value: "An account with no console in this build" },
      ],
    },
    {
      reference: "AT-544",
      subject: "KYC rejected — which side of Aadhaar?",
      requesterName: "Deb Roy",
      requesterRole: "Broker",
      requesterAccountId: STATIC_BROKER_ID,
      openedAt: "29 Aug 2026",
      ageLabel: "closed 5 Sep",
      state: "resolved",
      liveConsole: null,
      context: [
        { label: "Account", value: "U-10501 · Deb Roy" },
        { label: "Role", value: "Broker · suspended" },
        { label: "Raised from", value: "An account with no console in this build" },
      ],
    },
  ];
}

/**
 * A-23. The staff view of one thread: the user's messages plus internal notes.
 *
 * The merge happens here and only here. The user's own service builds the
 * user's view from the console store alone, which does not contain and cannot
 * represent an internal note.
 */
export function getThread(reference: string): AdminThread | null {
  const ticket = listTickets().find((t) => t.reference === reference);
  if (!ticket) return null;

  const userMessages: AdminTicketMessage[] =
    ticket.liveConsole === "seller"
      ? (sellerStore.getThread(reference)?.messages ?? []).map(fromConsoleMessage)
      : ticket.liveConsole === "builder"
        ? (builderSupport.snapshotThread(reference)?.messages ?? []).map(fromConsoleMessage)
        : staticThreadMessages(reference);

  const notes = state().internalNotes[reference] ?? [];
  const messages = [...userMessages, ...notes].sort((a, b) => a.sentAt.localeCompare(b.sentAt));
  return { ...ticket, messages };
}

function fromConsoleMessage(m: {
  id: string;
  author: string;
  authorLabel: string;
  body: string;
  sentAt: string;
}): AdminTicketMessage {
  return {
    id: m.id,
    authorLabel: m.authorLabel,
    body: m.body,
    sentAt: m.sentAt,
    // A message from a console store is by definition one the user can see.
    internal: false,
    fromUser: m.author === "you",
  };
}

function staticThreadMessages(reference: string): AdminTicketMessage[] {
  if (reference !== "AT-551") return [];
  return [
    {
      id: "SM-1",
      authorLabel: "Anima Ghosh · Builder",
      body: "We are ready to subscribe but cannot see a price anywhere. When is it confirmed?",
      sentAt: "2026-09-11T10:20:00.000Z",
      internal: false,
      fromUser: true,
    },
    {
      id: "SM-2",
      authorLabel: "Kam Ki Lead support",
      body: "The subscription price and billing cycle are not set yet (D-01). We will write to you as soon as they are agreed — nothing is being charged in the meantime.",
      sentAt: "2026-09-15T09:02:00.000Z",
      internal: false,
      fromUser: false,
    },
  ];
}

export const REPLY_BODY_REQUIRED = "Write something before sending.";

/**
 * A-23 — reply to the user, or add an internal note.
 *
 * The two paths do different things and that is the point of the screen:
 *
 * - **A public reply is pushed into the requester's own console store**, by the
 *   ticket's recorded console. A Seller's ticket cannot receive a Builder's
 *   reply and the reverse, because the destination is read from the ticket, not
 *   supplied by the caller.
 * - **An internal note is stored here and nowhere else.** No Seller- or
 *   Builder-facing service reads `state().internalNotes`, and a console
 *   `TicketMessage` has no field that could carry one. That is containment by
 *   construction, which is the only kind worth having — a filter can be
 *   forgotten on the next screen.
 */
export function replyToTicket(input: {
  actor: StaffRef;
  reference: string;
  body: string;
  internal: boolean;
}): AdminActionResult {
  if (input.body.trim().length === 0) return { ok: false, error: REPLY_BODY_REQUIRED };

  const ticket = listTickets().find((t) => t.reference === input.reference);
  if (!ticket) return { ok: false, error: "That ticket could not be found." };

  const staffLabel = `${input.actor.name} · ${input.actor.team}`;

  if (input.internal) {
    const notes = state().internalNotes[input.reference] ?? [];
    notes.push({
      id: `AN-${notes.length + 1}-${input.reference}`,
      authorLabel: `${staffLabel} · internal`,
      body: input.body.trim(),
      sentAt: new Date().toISOString(),
      internal: true,
      fromUser: false,
    });
    state().internalNotes[input.reference] = notes;
    return { ok: true, auditId: "—" };
  }

  // The destination comes from the ticket. There is no branch here that a
  // caller could steer.
  if (ticket.liveConsole === "seller") {
    sellerStore.postStaffReply({
      reference: input.reference,
      body: input.body.trim(),
      staffLabel: "Kam Ki Lead support",
    });
  } else if (ticket.liveConsole === "builder") {
    builderSupport.postStaffReply({
      reference: input.reference,
      body: input.body.trim(),
      staffLabel: "Kam Ki Lead support",
    });
  }
  // A ticket from an account with no console has nowhere to deliver to. It is
  // recorded on the staff thread and the screen says the requester has no
  // console in this build rather than implying a message was sent.

  return { ok: true, auditId: "—" };
}

export function resolveTicket(input: {
  actor: StaffRef;
  reference: string;
  reason: string;
}): AdminActionResult {
  const problem = requireReason(input.reason);
  if (problem) return { ok: false, error: problem };

  const ticket = listTickets().find((t) => t.reference === input.reference);
  if (!ticket) return { ok: false, error: "That ticket could not be found." };

  if (ticket.liveConsole === "seller") sellerStore.resolveTicket(input.reference);
  else if (ticket.liveConsole === "builder") builderSupport.resolveThread(input.reference);

  const auditId = record({
    actor: input.actor,
    category: "support",
    action: "Ticket resolved",
    subject: ticket.reference,
    subjectLabel: `Ticket ${ticket.reference} · ${ticket.subject}`,
    reason: input.reason,
    reasonCategory: "Support",
    changes: [{ field: "ticket_status", before: "open", after: "resolved" }],
  });
  return { ok: true, auditId };
}

// -------------------------------------------------------------------- leads --

/**
 * A-10 to A-13, A-24 to A-26, A-27, A-28, A-31.
 *
 * Everything from here down is **static sample data for processes that are not
 * implemented anywhere in this repository**: there is no intake pipeline, no
 * qualification call, no WhatsApp journey and no notification sender. The
 * screens exist so their layout and states can be reviewed; each one says on
 * its face that it is reading fixtures.
 *
 * They are kept in this store rather than in the page files so that a reviewer
 * can see, in one place, exactly how much of the Admin console is real.
 */

export function intakeRuns(): readonly IntakeRun[] {
  return [
    { id: "INT-2291", source: "Partner feed", when: "16 Sep, 06:00", accepted: 145, rejected: 12, duplicates: 3 },
    { id: "INT-2288", source: "Partner feed", when: "15 Sep, 06:00", accepted: 151, rejected: 4, duplicates: 2 },
    { id: "INT-2284", source: "Website forms", when: "15 Sep, hourly", accepted: 37, rejected: 0, duplicates: 1 },
  ];
}

export function intakeRun(id: string): IntakeRun | null {
  return intakeRuns().find((r) => r.id === id) ?? null;
}

export function intakeSources(): readonly { value: number; label: string; note: string }[] {
  return [
    { value: 148, label: "Partner feed", note: "Today · 6am batch" },
    { value: 37, label: "Website forms", note: "Today · continuous" },
    { value: 12, label: "WhatsApp inbound", note: "Today · continuous" },
    { value: 5, label: "Duplicates merged", note: "Matched on mobile number" },
  ];
}

/**
 * A-11's rejected rows.
 *
 * Numbers are masked here, in the data, not in the markup. An intake rejection
 * is a row staff need to understand, not a number they need to call, and a
 * screen that renders a full number is one screenshot away from leaking it.
 */
export function intakeRejections(): readonly IntakeRejection[] {
  return [
    { row: "14", maskedNumber: "+91 98••• ••21", field: "Budget band", why: "Empty — a budget band is required before a lead can be qualified" },
    { row: "29", maskedNumber: "+91 90••• ••04", field: "Mobile number", why: "Duplicate of an existing lead intaken 12 Sep — merged instead of created" },
    { row: "51", maskedNumber: "+91 87••• ••77", field: "Mobile number", why: "On the suppression list — the buyer opted out on 2 Sep" },
    { row: "88", maskedNumber: "+91 99••• ••13", field: "Locality", why: 'Value "New Twon" does not match the location hierarchy' },
  ];
}

const LEADS: readonly AdminLead[] = [
  {
    id: "LD-88104",
    requirement: "3 BHK · ₹1Cr – ₹1.5Cr",
    area: "Action Area I, New Town",
    source: "Voice call",
    state: "listed",
    ageLabel: "2 days",
    intakenAt: "14 Sep 2026",
    score: 82,
    channel: "Voice call · Hindi",
    priceLabel: "₹950",
    answers: [
      { label: "Budget band", value: "₹1Cr – ₹1.5Cr" },
      { label: "Location", value: "Action Area I" },
      { label: "Configuration", value: "3 BHK" },
      { label: "Timeline", value: "Within 6 months" },
      { label: "Purpose", value: "End use" },
      { label: "Financing", value: "Loan pre-approved" },
    ],
    summary:
      "Relocating from Salt Lake, wants possession within six months, loan pre-approved. Asked about lake-facing units and covered parking.",
    consent: {
      label: "Given on the call",
      note: "Recorded at 03:12 into the call on 14 September. The buyer agreed to be contacted by brokers about matching properties.",
      given: true,
    },
    eligibility: [
      { met: true, text: "Qualification completed" },
      { met: true, text: "Consent captured and current" },
      { met: true, text: "Number not on the suppression list" },
      { met: true, text: "Budget band recorded" },
    ],
    eligible: true,
    eligibleLabel: "Eligible — listed on the marketplace",
    lifecycle: [
      { label: "Intaken from partner feed", note: "INT-2288 · 14 Sep, 06:00", done: true },
      { label: "Call attempted", note: "14 Sep, 10:40 · answered", done: true },
      { label: "Qualified", note: "Intent score 82 · consent given", done: true },
      { label: "Listed to marketplace", note: "14 Sep, 11:05 · ₹950", done: true },
      { label: "Sold", note: "Not yet", done: false },
    ],
    callId: "C-7741",
  },
  {
    id: "LD-88098",
    requirement: "2 BHK · ₹60L – ₹80L",
    area: "Rajarhat, Kolkata",
    source: "WhatsApp",
    state: "qualified",
    ageLabel: "4 days",
    intakenAt: "12 Sep 2026",
    score: 68,
    channel: "WhatsApp journey",
    priceLabel: "₹600",
    answers: [
      { label: "Budget band", value: "₹60L – ₹80L" },
      { label: "Location", value: "Rajarhat" },
      { label: "Configuration", value: "2 BHK" },
      { label: "Timeline", value: "Not captured" },
      { label: "Purpose", value: "End use" },
      { label: "Financing", value: "Not captured" },
    ],
    summary: "Replied to the WhatsApp journey through the budget and requirement questions, then stopped.",
    consent: {
      label: "Given in the WhatsApp journey",
      note: "Opt-in recorded against the conversation on 12 September.",
      given: true,
    },
    eligibility: [
      { met: true, text: "Qualification completed" },
      { met: true, text: "Consent captured and current" },
      { met: true, text: "Number not on the suppression list" },
      { met: true, text: "Budget band recorded" },
    ],
    eligible: true,
    eligibleLabel: "Eligible — qualified, not yet listed",
    lifecycle: [
      { label: "Intaken from website form", note: "INT-2284 · 12 Sep", done: true },
      { label: "WhatsApp journey", note: "12 Sep · replied through consent", done: true },
      { label: "Qualified", note: "Intent score 68", done: true },
      { label: "Listed to marketplace", note: "Not yet", done: false },
      { label: "Sold", note: "Not yet", done: false },
    ],
    callId: null,
  },
  {
    id: "LD-88041",
    requirement: "4 BHK · ₹1.5Cr +",
    area: "Action Area II, New Town",
    source: "Voice call",
    state: "on_sale",
    ageLabel: "6 days",
    intakenAt: "10 Sep 2026",
    score: 74,
    channel: "Voice call · Bengali",
    priceLabel: "₹1,040 · aged, −20%",
    answers: [
      { label: "Budget band", value: "₹1.5Cr and above" },
      { label: "Location", value: "Action Area II" },
      { label: "Configuration", value: "4 BHK" },
      { label: "Timeline", value: "Within a year" },
      { label: "Purpose", value: "End use" },
      { label: "Financing", value: "Self-funded" },
    ],
    summary: "Wants a large unit with a study. Flexible on possession, not on size.",
    consent: { label: "Given on the call", note: "Recorded at 02:41 on 10 September.", given: true },
    eligibility: [
      { met: true, text: "Qualification completed" },
      { met: true, text: "Consent captured and current" },
      { met: true, text: "Number not on the suppression list" },
      { met: true, text: "Budget band recorded" },
    ],
    eligible: true,
    eligibleLabel: "Eligible — on the Sale tab",
    lifecycle: [
      { label: "Intaken from partner feed", note: "INT-2280 · 10 Sep", done: true },
      { label: "Call attempted", note: "10 Sep, 09:15 · answered", done: true },
      { label: "Qualified", note: "Intent score 74", done: true },
      { label: "Listed to marketplace", note: "10 Sep · ₹1,300", done: true },
      { label: "Moved to the Sale tab", note: "15 Sep · aged, −20%", done: true },
    ],
    callId: null,
  },
  {
    id: "LD-88120",
    requirement: "Budget not captured",
    area: "New Town",
    source: "Web form",
    state: "qualifying",
    ageLabel: "4 hours",
    intakenAt: "16 Sep 2026",
    score: 0,
    channel: "Awaiting first call",
    priceLabel: null,
    answers: [
      { label: "Budget band", value: "Not captured" },
      { label: "Location", value: "New Town" },
      { label: "Configuration", value: "Not captured" },
      { label: "Timeline", value: "Not captured" },
      { label: "Purpose", value: "Not captured" },
      { label: "Financing", value: "Not captured" },
    ],
    summary: "Submitted a web form with a locality and nothing else. Queued for a qualification call.",
    consent: {
      label: "Not established",
      note: "A web form is not on its own a basis for outbound contact. The qualification call asks the consent question before anything else happens.",
      given: false,
    },
    eligibility: [
      { met: false, text: "Qualification not completed" },
      { met: false, text: "No consent captured" },
      { met: true, text: "Number not on the suppression list" },
      { met: false, text: "No budget band recorded" },
    ],
    eligible: false,
    eligibleLabel: "Not eligible — cannot be listed until it is qualified",
    lifecycle: [
      { label: "Intaken from website form", note: "INT-2291 · 16 Sep", done: true },
      { label: "Call attempted", note: "Queued", done: false },
      { label: "Qualified", note: "Not yet", done: false },
      { label: "Listed to marketplace", note: "Not yet", done: false },
      { label: "Sold", note: "Not yet", done: false },
    ],
    callId: null,
  },
  {
    id: "LD-87990",
    requirement: "2, 3 BHK · investment",
    area: "Salt Lake, Kolkata",
    source: "Voice call",
    state: "sold",
    ageLabel: "11 days",
    intakenAt: "5 Sep 2026",
    score: 71,
    channel: "Voice call · Bengali",
    priceLabel: "₹780",
    answers: [
      { label: "Budget band", value: "₹60L – ₹1Cr" },
      { label: "Location", value: "Salt Lake" },
      { label: "Configuration", value: "2, 3 BHK" },
      { label: "Timeline", value: "No hurry" },
      { label: "Purpose", value: "Investment" },
      { label: "Financing", value: "Self-funded" },
    ],
    summary: "Investor looking for rental yield rather than a home. Open on configuration.",
    consent: { label: "Given on the call", note: "Recorded at 04:02 on 5 September.", given: true },
    eligibility: [
      { met: true, text: "Qualification completed" },
      { met: true, text: "Consent captured and current" },
      { met: true, text: "Number not on the suppression list" },
      { met: true, text: "Budget band recorded" },
    ],
    eligible: true,
    eligibleLabel: "Sold — one purchaser per lead",
    lifecycle: [
      { label: "Intaken from partner feed", note: "INT-2270 · 5 Sep", done: true },
      { label: "Call attempted", note: "5 Sep, 11:20 · answered", done: true },
      { label: "Qualified", note: "Intent score 71", done: true },
      { label: "Listed to marketplace", note: "5 Sep · ₹780", done: true },
      { label: "Sold", note: "9 Sep · ORD-10402 reversed, resold 11 Sep", done: true },
    ],
    callId: null,
  },
  {
    id: "LD-88066",
    requirement: "Consent refused",
    area: "Rajarhat",
    source: "Voice call",
    state: "disqualified",
    ageLabel: "5 days",
    intakenAt: "11 Sep 2026",
    score: 0,
    channel: "Voice call · Bengali",
    priceLabel: null,
    answers: [
      { label: "Budget band", value: "Not captured" },
      { label: "Location", value: "Rajarhat" },
      { label: "Configuration", value: "Not captured" },
      { label: "Timeline", value: "Not captured" },
      { label: "Purpose", value: "Not captured" },
      { label: "Financing", value: "Not captured" },
    ],
    summary: "The buyer declined to continue and asked not to be contacted again. The call ended at the consent question.",
    consent: {
      label: "Refused — on the suppression list",
      note: "Refusal recorded at 00:48 on 11 September. The number was added to the suppression list automatically and cannot be contacted again.",
      given: false,
    },
    eligibility: [
      { met: true, text: "Call completed" },
      { met: false, text: "Consent refused" },
      { met: false, text: "Number on the suppression list" },
      { met: false, text: "No requirement captured" },
    ],
    eligible: false,
    eligibleLabel: "Not eligible — cannot be listed or sold",
    lifecycle: [
      { label: "Intaken from web form", note: "INT-2281 · 11 Sep, 06:00", done: true },
      { label: "Call attempted", note: "11 Sep, 12:15 · answered", done: true },
      { label: "Consent refused", note: "Added to suppression list", done: true },
      { label: "Disqualified", note: "Removed from the qualification queue", done: true },
      { label: "Listed to marketplace", note: "Never", done: false },
    ],
    callId: "C-7728",
  },
];

export function listLeads(state_?: AdminLead["state"]): readonly AdminLead[] {
  return state_ ? LEADS.filter((l) => l.state === state_) : LEADS;
}

export function getLead(id: string): AdminLead | null {
  return LEADS.find((l) => l.id === id) ?? null;
}

export function priceBands(): readonly { band: string; priceInr: number; saleInr: number }[] {
  return [
    { band: "Up to ₹60L", priceInr: 450, saleInr: 360 },
    { band: "₹60L – ₹1Cr", priceInr: 600, saleInr: 480 },
    { band: "₹1Cr – ₹1.5Cr", priceInr: 950, saleInr: 760 },
    { band: "₹1.5Cr and above", priceInr: 1_300, saleInr: 1_040 },
  ];
}

// ------------------------------------------------------------------- orders --

/**
 * A-16. Seeded orders, plus purchases made in this review session.
 *
 * A lead bought in the Seller or Builder console during a review pass appears
 * at the top of this list, marked live. That is the "purchases and credit
 * activity appear consistently in Admin records" join, and it reads from each
 * console's own purchase list rather than being told about it.
 */
export function listOrders(filter?: "delivered" | "failed"): readonly AdminOrder[] {
  const all = [...liveOrders(), ...SEEDED_ORDERS];
  return filter ? all.filter((o) => o.state === filter) : all;
}

function liveOrders(): AdminOrder[] {
  const fromSeller = sellerStore.listPurchased().map((lead, index) =>
    liveOrder({
      index,
      lead: lead.id,
      priceInr: lead.pricePaidCredits,
      purchasedAt: lead.purchasedAt,
      name: "Sanjay Paul",
      organisation: "Sen Properties · live this session",
      accountId: SELLER_ACCOUNT_ID,
      prefix: 10_500,
    }),
  );
  const fromBuilder = builderPurchasedLeads().map((lead, index) =>
    liveOrder({
      index,
      lead: lead.id,
      priceInr: lead.pricePaidCredits,
      purchasedAt: lead.purchasedAt,
      name: "Suman Bhattacharya",
      organisation: "Sample Builders · live this session",
      accountId: BUILDER_ACCOUNT_ID,
      prefix: 10_700,
    }),
  );
  return [...fromSeller, ...fromBuilder];
}

function liveOrder(input: {
  index: number;
  lead: string;
  priceInr: number;
  purchasedAt: string;
  name: string;
  organisation: string;
  accountId: string;
  prefix: number;
}): AdminOrder {
  const id = `ORD-${input.prefix + input.index}`;
  return {
    id,
    leadId: input.lead,
    leadLabel: input.lead,
    purchaserName: input.name,
    purchaserOrganisation: input.organisation,
    purchaserAccountId: input.accountId,
    amountInr: input.priceInr,
    state: "delivered",
    when: input.purchasedAt,
    live: true,
    facts: [
      { label: "Amount", value: `₹${input.priceInr.toLocaleString("en-IN")} credits` },
      { label: "Purchaser account", value: input.accountId },
      { label: "Recorded", value: "This review session, in the console's own store" },
    ],
    events: [
      { what: "Credits deducted", detail: `₹${input.priceInr.toLocaleString("en-IN")}`, when: input.purchasedAt },
      { what: "Lead released to purchaser", detail: "Contact details revealed", when: input.purchasedAt },
      { what: "Lead removed from the marketplace", detail: "One purchaser per lead", when: input.purchasedAt },
    ],
  };
}

const SEEDED_ORDERS: readonly AdminOrder[] = [
  {
    id: "ORD-10233",
    leadId: "LD-88041",
    leadLabel: "LD-88041 · 4 BHK · ₹1.5Cr +",
    purchaserName: "Sanjay Paul",
    purchaserOrganisation: "Sen Properties",
    purchaserAccountId: SELLER_ACCOUNT_ID,
    amountInr: 1_040,
    state: "delivered",
    when: "12 Sep 2026, 14:22",
    live: false,
    facts: [
      { label: "Amount", value: "₹1,040 credits" },
      { label: "Ledger entry", value: "LG-55201" },
      { label: "Balance before", value: "₹3,240" },
      { label: "Balance after", value: "₹2,200" },
      { label: "Lead price at listing", value: "₹1,040 (Sale, −20%)" },
      { label: "Purchaser account", value: SELLER_ACCOUNT_ID },
    ],
    events: [
      { what: "Credits deducted", detail: "LG-55201 · ₹1,040", when: "12 Sep, 14:22:04" },
      { what: "Lead released to purchaser", detail: "Contact details revealed", when: "12 Sep, 14:22:05" },
      { what: "Lead removed from the marketplace", detail: "One purchaser per lead", when: "12 Sep, 14:22:05" },
      { what: "CSV downloaded", detail: "By the purchaser · first download", when: "12 Sep, 14:26" },
      { what: "CSV downloaded", detail: "By the purchaser · repeat, not charged", when: "14 Sep, 09:11" },
    ],
  },
  {
    id: "ORD-10418",
    leadId: "LD-88104",
    leadLabel: "LD-88104 · 3 BHK · ₹1Cr – ₹1.5Cr",
    purchaserName: "Suman Bhattacharya",
    purchaserOrganisation: "Sample Builders",
    purchaserAccountId: BUILDER_ACCOUNT_ID,
    amountInr: 950,
    state: "delivered",
    when: "14 Sep 2026, 11:40",
    live: false,
    facts: [
      { label: "Amount", value: "₹950 credits" },
      { label: "Ledger entry", value: "LG-55288" },
      { label: "Purchaser account", value: BUILDER_ACCOUNT_ID },
    ],
    events: [
      { what: "Credits deducted", detail: "LG-55288 · ₹950", when: "14 Sep, 11:40:02" },
      { what: "Lead released to purchaser", detail: "Contact details revealed", when: "14 Sep, 11:40:03" },
    ],
  },
  {
    id: "ORD-10402",
    leadId: "LD-87990",
    leadLabel: "LD-87990 · 2, 3 BHK · investment",
    purchaserName: "Deb Roy",
    purchaserOrganisation: "Roy Realty",
    purchaserAccountId: STATIC_BROKER_ID,
    amountInr: 780,
    state: "failed",
    when: "9 Sep 2026, 11:08",
    live: false,
    facts: [
      { label: "Amount attempted", value: "₹780 credits" },
      { label: "Ledger entry", value: "LG-54880 + reversal LG-54881" },
      { label: "Balance before", value: "₹2,200" },
      { label: "Balance after", value: "₹2,200" },
      { label: "Net charge", value: "None" },
      { label: "Purchaser account", value: STATIC_BROKER_ID },
    ],
    events: [
      { what: "Credits deducted", detail: "LG-54880 · ₹780", when: "9 Sep, 11:08:02" },
      { what: "Lead release failed", detail: "Lead already sold to another purchaser", when: "9 Sep, 11:08:03" },
      { what: "Deduction reversed", detail: "LG-54881 · +₹780 · automatic", when: "9 Sep, 11:08:03" },
      { what: "Purchaser notified", detail: "Shown the already-sold state in the console", when: "9 Sep, 11:08:04" },
    ],
  },
];

export function getOrder(id: string): AdminOrder | null {
  return listOrders().find((o) => o.id === id) ?? null;
}

export function listSubscriptions(
  filter?: AdminSubscription["state"],
): readonly AdminSubscription[] {
  const live = builderStore.getAccount().subscription.state;
  const all: AdminSubscription[] = [
    {
      id: "SUB-4021",
      accountId: BUILDER_ACCOUNT_ID,
      organisation: "Sample Builders Pvt Ltd",
      startedAt: "14 Sep 2026",
      // Read from the Builder console, so A-21 cannot claim active while the
      // Builder's own B-03 says expired.
      state: live === "expired" ? "expired" : live === "due" || live === "grace" ? "renewal_due" : "active",
      listingsLabel: `${builderStore.portalListings().length} published`,
    },
    {
      id: "SUB-3988",
      accountId: "U-10633",
      organisation: "Ghosh Developers",
      startedAt: "19 Aug 2026",
      state: "renewal_due",
      listingsLabel: "1 published",
    },
    {
      id: "SUB-3901",
      accountId: "U-10388",
      organisation: "Metro Habitat",
      startedAt: "10 Jul 2026",
      state: "expired",
      listingsLabel: "3 · D-02 undecided",
    },
  ];
  return filter ? all.filter((s) => s.state === filter) : all;
}

// ------------------------------------------------------------ qualification --

const CALLS: readonly VoiceCall[] = [
  {
    id: "C-7741",
    maskedNumber: "+91 98••• ••34",
    language: "Hindi",
    length: "4m 12s",
    outcomeLabel: "Qualified",
    outcome: "qualified",
    consentLabel: "Given",
    transcript: [
      { at: "00:00", who: "Kam Ki Lead (automated)", text: "Good morning, this is Kam Ki Lead calling about your property enquiry in New Town. Is now a good time to speak?", automated: true },
      { at: "00:09", who: "Buyer", text: "Yes, go ahead.", automated: false },
      { at: "00:14", who: "Kam Ki Lead (automated)", text: "What budget range are you working with?", automated: true },
      { at: "00:22", who: "Buyer", text: "Around one crore, maybe up to one and a half if the project is right.", automated: false },
      { at: "01:05", who: "Kam Ki Lead (automated)", text: "And how soon would you want possession?", automated: true },
      { at: "01:12", who: "Buyer", text: "Within six months. We are relocating from Salt Lake.", automated: false },
      { at: "03:04", who: "Kam Ki Lead (automated)", text: "May we share your requirement with verified brokers and builders so they can contact you about matching properties?", automated: true },
      { at: "03:12", who: "Buyer", text: "Yes, that is fine.", automated: false },
    ],
    captured: [
      { label: "Budget band", value: "₹1Cr – ₹1.5Cr", at: "00:22" },
      { label: "Location", value: "Action Area I, New Town", at: "00:41" },
      { label: "Configuration", value: "3 BHK", at: "00:58" },
      { label: "Timeline", value: "Within 6 months", at: "01:12" },
      { label: "Financing", value: "Loan pre-approved", at: "02:30" },
    ],
  },
  {
    id: "C-7739",
    maskedNumber: "+91 90••• ••07",
    language: "Bengali",
    length: "2m 48s",
    outcomeLabel: "Qualified",
    outcome: "qualified",
    consentLabel: "Given",
    transcript: [],
    captured: [],
  },
  {
    id: "C-7728",
    maskedNumber: "+91 87••• ••26",
    language: "Bengali",
    length: "0m 48s",
    outcomeLabel: "Declined to continue",
    outcome: "declined",
    consentLabel: "Refused",
    transcript: [
      { at: "00:00", who: "Kam Ki Lead (automated)", text: "Good afternoon, this is Kam Ki Lead calling about your property enquiry. Is now a good time?", automated: true },
      { at: "00:11", who: "Buyer", text: "Who gave you this number?", automated: false },
      { at: "00:40", who: "Kam Ki Lead (automated)", text: "May we share your requirement with verified brokers so they can contact you?", automated: true },
      { at: "00:48", who: "Buyer", text: "No. Please do not call again.", automated: false },
    ],
    captured: [],
  },
  {
    id: "C-7722",
    maskedNumber: "+91 99••• ••13",
    language: "Hindi",
    length: "0m 06s",
    outcomeLabel: "No answer · attempt 2 of 3",
    outcome: "no_answer",
    consentLabel: "Not reached",
    transcript: [],
    captured: [],
  },
];

export function listCalls(): readonly VoiceCall[] {
  return CALLS;
}

export function getCall(id: string): VoiceCall | null {
  return CALLS.find((c) => c.id === id) ?? null;
}

export function voiceStats(): readonly { value: number; label: string; note: string }[] {
  return [
    { value: 96, label: "Calls attempted today", note: "Inside calling hours only" },
    { value: 71, label: "Answered", note: "74% answer rate" },
    { value: 58, label: "Consent captured", note: "Of those answered" },
    { value: 7, label: "Held for quiet hours", note: "Will be attempted tomorrow" },
  ];
}

export function whatsappFunnel(): readonly WhatsAppStep[] {
  return [
    { label: "Message delivered", count: 412, percent: "100%", tone: "brand" },
    { label: "Replied to the first question", count: 286, percent: "69%", tone: "brand" },
    { label: "Budget captured", count: 204, percent: "50%", tone: "brand" },
    { label: "Requirement captured", count: 141, percent: "34%", tone: "warning" },
    { label: "Consent captured", count: 118, percent: "29%", tone: "success" },
  ];
}

export function whatsappConversations(): readonly WhatsAppConversation[] {
  return [
    { maskedNumber: "+91 98••• ••34", step: "Consent captured", when: "2 hours ago", stateLabel: "Complete", tone: "success" },
    { maskedNumber: "+91 90••• ••07", step: "Requirement question", when: "4 hours ago", stateLabel: "Stalled · template rejected", tone: "danger" },
    { maskedNumber: "+91 87••• ••91", step: "Budget question", when: "Yesterday", stateLabel: "Awaiting reply", tone: "warning" },
    { maskedNumber: "+91 99••• ••02", step: "First question", when: "2 days ago", stateLabel: "No reply · closed", tone: "muted" },
  ];
}

// ------------------------------------------------- consent, notices and ops --

export function suppressionList(): readonly SuppressionEntry[] {
  return [
    { maskedNumber: "+91 87772 ••••6", source: "Refused on a qualification call", basis: "Explicit refusal recorded at 00:48, call C-7728", when: "11 Sep 2026" },
    { maskedNumber: "+91 99031 ••••8", source: "Replied STOP on WhatsApp", basis: "Channel opt-out honoured across all channels", when: "8 Sep 2026" },
    { maskedNumber: "+91 90271 ••••2", source: "Requested removal via support", basis: "Ticket AT-538, identity confirmed by OTP", when: "2 Sep 2026" },
    { maskedNumber: "+91 98311 ••••9", source: "National registry match at intake", basis: "Filtered before any contact attempt", when: "29 Aug 2026" },
  ];
}

export function suppressionEffects(): readonly string[] {
  return [
    "No qualification calls, at any hour.",
    "No WhatsApp or SMS, including OTP for a new registration attempt.",
    "The lead cannot be listed on the marketplace or sold.",
    "Intake rejects the row rather than creating a lead.",
  ];
}

export function consentBases(): readonly ConsentBasis[] {
  return [
    { source: "Website enquiry form", basis: "The buyer submitted their own details and agreed to be contacted about the property they enquired on." },
    { source: "Qualification call", basis: "Scripted consent question, answer recorded with a timestamp against the call." },
    { source: "Partner feed", basis: "Basis not established — treated as no consent until a call captures one." },
  ];
}

export function listNotifications(filter?: NotificationRecord["state"]): readonly NotificationRecord[] {
  const all: readonly NotificationRecord[] = [
    { id: "N-9921", when: "Today, 11:20", recipientName: "Rina Sen", recipientNumber: "+91 98300 ••••4", channel: "WhatsApp", message: "Enquiry received", state: "failed" },
    { id: "N-9918", when: "Today, 10:44", recipientName: "Arun Das", recipientNumber: "+91 90514 ••••7", channel: "SMS", message: "OTP", state: "retrying" },
    { id: "N-9902", when: "Today, 09:12", recipientName: "Suman Bhattacharya", recipientNumber: "+91 98311 ••••5", channel: "SMS", message: "New enquiry", state: "sent" },
    { id: "N-9880", when: "Yesterday", recipientName: "Withheld", recipientNumber: "On suppression list", channel: "WhatsApp", message: "Blocked before send", state: "failed" },
  ];
  return filter ? all.filter((n) => n.state === filter) : all;
}

export function integrations(): readonly Integration[] {
  return [
    {
      name: "Payment gateway",
      role: "Credit recharges and subscriptions",
      state: "degraded",
      stateLabel: "Degraded",
      metrics: [
        { label: "Callbacks received", value: "312 today" },
        { label: "Retries", value: "14 in the last hour" },
        { label: "Last failure", value: "18 minutes ago" },
      ],
      note: "Retries are climbing. Payments still complete, but confirmation is slow — the pending state is being shown to users more often than usual.",
    },
    {
      name: "Telephony · voice qualification",
      role: "Outbound qualification calls",
      state: "healthy",
      stateLabel: "Healthy",
      metrics: [
        { label: "Calls placed", value: "96 today" },
        { label: "Failed to connect", value: "4" },
        { label: "Queue depth", value: "7 held for quiet hours" },
      ],
      note: "Calls are placed only inside configured hours; the held queue drains at the start of the next window.",
    },
    {
      name: "Speech · transcription",
      role: "Transcripts and captured answers",
      state: "healthy",
      stateLabel: "Healthy",
      metrics: [
        { label: "Transcripts produced", value: "71 today" },
        { label: "Low-confidence", value: "5 flagged for review" },
        { label: "Average latency", value: "38 seconds" },
      ],
      note: "Low-confidence transcripts are flagged rather than discarded, so a human can check the captured answers.",
    },
    {
      name: "WhatsApp Business",
      role: "WhatsApp qualification journey",
      state: "failing",
      stateLabel: "Template rejected",
      metrics: [
        { label: "Messages sent", value: "412 today" },
        { label: "Delivery failures", value: "2" },
        { label: "Templates active", value: "3 of 4" },
      ],
      note: "One journey template was rejected by the provider, stalling conversations at the requirement question. Resubmission happens outside this tool.",
    },
  ];
}

export function jobFailures(): readonly JobFailure[] {
  return [
    { job: "Payment callback reconciliation", error: "Timeout waiting for the gateway status endpoint", when: "18 minutes ago", attempts: "attempt 3 of 5" },
    { job: "WhatsApp journey advance", error: "Template not approved for this message", when: "2 hours ago", attempts: "attempt 5 of 5 · stopped" },
    { job: "Nightly lead aging sweep", error: "Completed with 2 rows skipped — lead already sold mid-sweep", when: "Last night, 02:10", attempts: "attempt 1 of 3" },
  ];
}

export function funnel(): readonly { label: string; value: number; percent: number }[] {
  return [
    { label: "Intaken", value: 1_482, percent: 100 },
    { label: "Called", value: 1_190, percent: 80 },
    { label: "Qualified", value: 612, percent: 41 },
    { label: "Listed", value: 548, percent: 37 },
    { label: "Sold", value: 231, percent: 16 },
  ];
}

// ---------------------------------------------------------------- dashboard --

/**
 * A-02's queue tiles, counted from the records rather than written down.
 *
 * A dashboard with hardcoded counts is a dashboard that lies the first time
 * somebody clears a queue, so the first two are derived and the screen says
 * which of the remaining figures are fixtures.
 */
export function queueTiles(): readonly QueueTile[] {
  const applications = listApplications().length;
  const ageing = listApplications().filter((a) => a.state === "ageing").length;
  const reported = listModeratedListings("reported").length;
  const openTickets = listTickets().filter((t) => t.state === "awaiting_reply").length;
  const undecidedRefunds = state().refunds.filter((r) => r.decision === null).length;

  return [
    {
      value: applications,
      label: applications === 1 ? "KYC application" : "KYC applications",
      note: ageing > 0 ? `${ageing} waiting over a day` : "None waiting over a day",
      flag: ageing > 0 ? `${ageing} ageing` : null,
      tone: ageing > 0 ? "warning" : "neutral",
      href: "/admin/kyc",
    },
    {
      value: listModeratedListings().length,
      label: "Listings to review",
      note: reported > 0 ? `${reported} reported by a buyer` : "Nothing reported",
      flag: reported > 0 ? `${reported} reported` : null,
      tone: reported > 0 ? "danger" : "neutral",
      href: "/admin/properties",
    },
    {
      value: listTickets().length,
      label: "Support tickets",
      note: `${openTickets} awaiting first reply`,
      flag: null,
      tone: "neutral",
      href: "/admin/support",
    },
    {
      value: undecidedRefunds,
      label: "Refund requests",
      note: undecidedRefunds > 0 ? "Awaiting a decision" : "All decided",
      flag: null,
      tone: "neutral",
      href: "/admin/refunds",
    },
  ];
}

export function dashboardVolumes(): readonly { label: string; value: string }[] {
  return [
    { label: "Leads intaken today", value: "148" },
    { label: "Qualified", value: "61" },
    { label: "Listed to marketplace", value: "54" },
    { label: "Leads sold", value: "23" },
    { label: "Calls attempted", value: "96" },
    { label: "Consent captured", value: "58" },
  ];
}

export function dashboardAlerts(): readonly DashboardAlert[] {
  return [
    {
      title: "3 notifications failed to deliver",
      body: "WhatsApp template rejected for two numbers, one SMS bounce.",
      tone: "danger",
      href: "/admin/notifications",
    },
    {
      title: "Intake run INT-2291 had 12 rejected rows",
      body: "Missing budget on 9 rows, duplicate number on 3.",
      tone: "warning",
      href: "/admin/leads/intake/INT-2291",
    },
    {
      title: "Webhook retries climbing",
      body: "Payment gateway callbacks retried 14 times in the last hour.",
      tone: "warning",
      href: "/admin/system",
    },
  ];
}
