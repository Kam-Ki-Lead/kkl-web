import type {
  BillingDetails,
  Invoice,
  InvoiceDetail,
  KycSubmission,
  KycTimelineEntry,
  LedgerEntry,
  MarketplaceLead,
  MarketplaceLeadDetail,
  PurchasedLead,
  SellerAccount,
  SellerAlertPreferences,
  SellerBusinessType,
  SupportThread,
  SupportTicket,
  TicketMessage,
  WalletSummary,
} from "@/lib/domain/types";
import type {
  LeadMarketPage,
  LeadMarketQuery,
  PurchaseOutcome,
  RechargeOutcome,
  UsageMonth,
} from "@/lib/services/contracts";
import { processState } from "./process-state";

/**
 * In-process Seller state for a review session.
 *
 * WHAT THIS IS
 * ------------
 * Plain objects and `Map`s in the Node process that serves the app. It exists so
 * the Seller journey can be reviewed end to end — a purchase really deducts, the
 * ledger really gains an entry, a ticket reply really appears — before
 * kkl-backend exists.
 *
 * WHAT IT IS NOT
 * --------------
 * It is not authentication, authorization, KYC, lead ownership or a wallet.
 *
 * - **No account.** There is one Seller and no sign-in. Every visitor to this
 *   process is that Seller and shares this state. Two reviewers in two browsers
 *   see each other's purchases.
 * - **No authorization.** Nothing checks whether the caller may buy a lead.
 *   `kycStatus` and `accountStatus` decide what the screens say; they are not
 *   enforced against a credential, because there is no credential.
 * - **Not money.** `balanceCredits` is a number in memory. No payment is taken,
 *   no gateway is called, no invoice is issued to anyone. Recharging changes a
 *   variable.
 * - **Not durable.** Restarting the server restores the seed values and loses
 *   every purchase, ledger entry and ticket.
 * - **Not transactional.** Deduct-then-release happens in two statements here.
 *   It cannot be torn between them in a single-threaded process, which is luck
 *   rather than a guarantee, and does not survive more than one instance.
 *
 * A real implementation must do the deduction and the release in one database
 * transaction, keyed by the idempotency key, so a replay cannot spend twice and
 * a failed deduction cannot release a lead. That is kkl-backend's to build and
 * is NOT demonstrated here.
 */

// ------------------------------------------------------------------ account --

const SEED_ACCOUNT: SellerAccount = {
  id: "U-10442",
  contactName: "Sujata Pal",
  agencyName: "Sen Properties",
  mobile: "9830044182",
  businessType: "proprietorship",
  areas: ["New Town"],
  gstin: null,
  kycStatus: "approved",
  accountStatus: "active",
  alerts: {
    newLeadsInMyAreas: true,
    viewedLeadOnSale: true,
    lowBalance: false,
  },
};

const SEED_BILLING: BillingDetails = {
  billingName: "Sen Properties",
  gstin: null,
  addressLines: ["12B Chinar Park, Rajarhat", "Kolkata 700157"],
  invoiceEmail: "accounts@senproperties.example.invalid",
  contactName: "Sujata Pal",
};

const SEED_KYC: KycSubmission = {
  status: "approved",
  submittedAt: "2026-09-14T04:54:00.000Z",
  decidedAt: "2026-09-14T10:32:00.000Z",
  rejectionReason: null,
  panMasked: "ABCDE••••F",
  aadhaarMasked: "•••• •••• 4182",
};

/** Seed balance. Declared above the holder, which reads it. */
const SEED_BALANCE = 4_200;

/**
 * All mutable state, in one process-scoped holder.
 *
 * Not module-scope `let`. Route handlers, pages and server actions are bundled
 * separately, so this module gets instantiated more than once per server and
 * each copy would keep its own variables — which is exactly what happened: the
 * review route set the balance and every page went on showing the old one. See
 * process-state.ts.
 *
 * Fields are mutated in place. Reassigning `state` would leave whichever bundle
 * loaded first holding the old object.
 */
const state = processState("seller", () => ({
  account: SEED_ACCOUNT,
  billing: SEED_BILLING,
  kyc: SEED_KYC,
  soldLeads: new Map<string, PurchasedLead>(),
  purchaseTokens: new Map<string, string>(),
  rechargeTokens: new Map<string, RechargeOutcome>(),
  orderSequence: 10_233,
  paymentSequence: 88_441,
  ticketSequence: 2_291,
  messageSequence: 0,
  balanceCredits: SEED_BALANCE,
  paymentOutcome: "success" as "success" | "pending" | "failed",
  ledger: seedLedger(),
  invoices: seedInvoices(),
  threads: seedThreads(),
}));

export function getAccount(): SellerAccount {
  return state.account;
}

export function saveBusiness(input: {
  agencyName: string;
  businessType: SellerBusinessType;
  areas: readonly string[];
  gstin: string | null;
}): SellerAccount {
  state.account = { ...state.account, ...input };
  return state.account;
}

export function saveProfile(input: {
  contactName: string;
  agencyName: string;
  alerts: SellerAlertPreferences;
}): SellerAccount {
  state.account = { ...state.account, ...input };
  return state.account;
}

export function getBilling(): BillingDetails {
  return state.billing;
}

export function saveBilling(next: BillingDetails): BillingDetails {
  state.billing = next;
  return state.billing;
}

// ---------------------------------------------------------------------- state.kyc --

export function getKyc(): KycSubmission {
  return state.kyc;
}

/**
 * Submitting moves to `pending`. It never approves.
 *
 * A sample implementation that flipped straight to `approved` would teach the
 * wrong thing about the flow: approval is an administrator's decision (A-06,
 * A-07), taken elsewhere, and the Seller waits for it.
 */
export function submitKyc(input: {
  panNumber: string;
  hasPanDocument: boolean;
  hasAadhaarDocument: boolean;
}): KycSubmission {
  const masked = input.panNumber
    ? `${input.panNumber.slice(0, 5)}••••${input.panNumber.slice(-1)}`
    : null;
  state.kyc = {
    status: "pending",
    submittedAt: new Date().toISOString(),
    decidedAt: null,
    rejectionReason: null,
    panMasked: masked,
    aadhaarMasked: input.hasAadhaarDocument ? "•••• •••• ••••" : null,
  };
  state.account = { ...state.account, kycStatus: "pending" };
  return state.kyc;
}

export function kycTimeline(): readonly KycTimelineEntry[] {
  const entries: KycTimelineEntry[] = [
    { label: "Documents submitted", at: state.kyc.submittedAt },
  ];
  if (state.kyc.status === "approved") {
    entries.push({
      label: "Approved by administrator",
      at: state.kyc.decidedAt,
    });
    entries.push({ label: "Purchasing enabled", at: state.kyc.decidedAt });
  } else if (state.kyc.status === "rejected") {
    entries.push({
      label: "Rejected by administrator",
      at: state.kyc.decidedAt,
    });
  } else if (state.kyc.status === "pending") {
    // No third entry, and no estimate: D-11 leaves turnaround unpromised.
    entries.push({ label: "Awaiting administrator review", at: null });
  }
  return entries;
}

// ---------------------------------------------------------------- lead market --

type SeedLead = MarketplaceLeadDetail & {
  readonly contact: PurchasedLead["contact"];
};

/**
 * Seed leads.
 *
 * `contact` lives on the seed only. It is never part of a `MarketplaceLead`, so
 * the masked screens cannot reach it even by mistake — `toMasked` strips it and
 * the type has no field to put it in.
 */
const SEED_LEADS: readonly SeedLead[] = [
  {
    id: "L-4471",
    requirement: "3 BHK · ₹1Cr – ₹1.5Cr",
    locationPath: ["Kolkata", "New Town", "Action Area I"],
    configuration: "3 BHK",
    budgetBand: "₹1Cr – ₹1.5Cr",
    intentBand: "hot",
    intentScore: 82,
    status: "listed",
    ageDays: 1,
    priceCredits: 950,
    originalPriceCredits: null,
    contactMask: "R••• S•• · +91 98••• ••34",
    qualification: {
      summary:
        "Buyer is relocating from Salt Lake and wants possession within six months. Loan pre-approved with a nationalised bank. Asked specifically about lake-facing units and covered parking.",
      intentScore: 82,
      consentCaptured: true,
      channel: "Voice call · Hindi",
      timeline: "Within 6 months",
      purpose: "End use",
      financing: "Loan pre-approved",
    },
    contact: {
      name: "Rina Sen",
      phone: "+91 98300 51134",
      email: "rina.sen@example.invalid",
      bestTimeToCall: "Evenings after 6pm",
    },
  },
  {
    id: "L-4468",
    requirement: "2 BHK · ₹60L – ₹80L",
    locationPath: ["Kolkata", "Rajarhat"],
    configuration: "2 BHK",
    budgetBand: "₹60L – ₹80L",
    intentBand: "warm",
    intentScore: 68,
    status: "listed",
    ageDays: 2,
    priceCredits: 600,
    originalPriceCredits: null,
    contactMask: "A••• D•• · +91 90••• ••07",
    qualification: {
      summary:
        "First-time buyer, comparing two projects in Rajarhat. Needs a home loan and has not applied yet. Wants to see a sample flat at the weekend.",
      intentScore: 68,
      consentCaptured: true,
      channel: "Voice call · Bengali",
      timeline: "1–2 years",
      purpose: "End use",
      financing: "Loan required",
    },
    contact: {
      name: "Arun Dutta",
      phone: "+91 90730 44207",
      email: "arun.dutta@example.invalid",
      bestTimeToCall: "Weekends",
    },
  },
  {
    id: "L-4402",
    requirement: "4 BHK · ₹1.5Cr +",
    locationPath: ["Kolkata", "New Town", "Action Area II"],
    configuration: "4 BHK",
    budgetBand: "₹1.5Cr and above",
    intentBand: "warm",
    intentScore: 74,
    status: "on_sale",
    ageDays: 6,
    priceCredits: 1040,
    originalPriceCredits: 1300,
    contactMask: "M••• K••• · +91 99••• ••81",
    qualification: {
      summary:
        "Investor buying a second property. Ready to move preferred, self-funded, decision depends on rental yield in the area.",
      intentScore: 74,
      consentCaptured: true,
      channel: "Voice call · English",
      timeline: "Ready to move",
      purpose: "Investment",
      financing: "Self-funded",
    },
    contact: {
      name: "Mohit Khanna",
      phone: "+91 99035 12281",
      email: null,
      bestTimeToCall: null,
    },
  },
  {
    id: "L-4455",
    requirement: "3 BHK · ₹80L – ₹1Cr",
    locationPath: ["Kolkata", "Salt Lake"],
    configuration: "3 BHK",
    budgetBand: "₹80L – ₹1Cr",
    intentBand: "mild",
    intentScore: 54,
    status: "on_sale",
    ageDays: 9,
    priceCredits: 780,
    originalPriceCredits: 975,
    contactMask: "S••• B•• · +91 97••• ••16",
    qualification: {
      summary:
        "Wants to move closer to family in Salt Lake. Budget is firm and the timeline is open — no decision expected this quarter.",
      intentScore: 54,
      consentCaptured: true,
      channel: "Voice call · Bengali",
      timeline: "Timeline open",
      purpose: "End use",
      financing: "Part loan",
    },
    contact: {
      name: "Sanjay Bose",
      phone: "+91 97480 22116",
      email: "sanjay.bose@example.invalid",
      bestTimeToCall: "Weekday mornings",
    },
  },
];

/**
 * One qualified lead the marketplace refuses to list.
 *
 * D-14: a partner-feed lead with no consent captured on its qualification call
 * cannot be sold. The count is surfaced to the Seller; which lead it is, is not.
 */
const WITHHELD_COUNT = 1;

function toMasked(seed: SeedLead): MarketplaceLead {
  // Explicit field list, not a spread-and-delete: a new contact field on the
  // seed must not be able to appear here by default.
  return {
    id: seed.id,
    requirement: seed.requirement,
    locationPath: seed.locationPath,
    configuration: seed.configuration,
    budgetBand: seed.budgetBand,
    intentBand: seed.intentBand,
    intentScore: seed.intentScore,
    status: seed.status,
    ageDays: seed.ageDays,
    priceCredits: seed.priceCredits,
    originalPriceCredits: seed.originalPriceCredits,
    contactMask: seed.contactMask,
  };
}

function toMaskedDetail(seed: SeedLead): MarketplaceLeadDetail {
  return { ...toMasked(seed), qualification: seed.qualification };
}

export function listLeads(query: LeadMarketQuery): LeadMarketPage {
  const available = SEED_LEADS.filter((l) => !state.soldLeads.has(l.id));
  let leads = available.filter((l) =>
    query.onSaleOnly === true ? l.status === "on_sale" : true,
  );

  if (query.area && query.area !== "All areas") {
    leads = leads.filter((l) => l.locationPath.includes(query.area as string));
  }
  if (query.budgetBand && query.budgetBand !== "All budgets") {
    leads = leads.filter((l) => l.budgetBand === query.budgetBand);
  }
  if (query.configuration && query.configuration !== "All configurations") {
    leads = leads.filter((l) => l.configuration === query.configuration);
  }
  if (typeof query.minScore === "number") {
    leads = leads.filter((l) => l.intentScore >= (query.minScore as number));
  }

  const sorted = [...leads].sort((a, b) => {
    if (query.sort === "price") return a.priceCredits - b.priceCredits;
    if (query.sort === "score") return b.intentScore - a.intentScore;
    return a.ageDays - b.ageDays;
  });

  return {
    leads: sorted.map(toMasked),
    total: sorted.length,
    withheld:
      WITHHELD_COUNT > 0
        ? {
            count: WITHHELD_COUNT,
            reason:
              "the qualification call did not capture consent, so it cannot be listed. Only an administrator sees which.",
          }
        : null,
    filterOptions: {
      areas: [
        "All areas",
        "New Town",
        "Rajarhat",
        "Salt Lake",
        "Action Area I",
        "Action Area II",
      ],
      budgetBands: [
        "All budgets",
        "₹60L – ₹80L",
        "₹80L – ₹1Cr",
        "₹1Cr – ₹1.5Cr",
        "₹1.5Cr and above",
      ],
      configurations: ["All configurations", "2 BHK", "3 BHK", "4 BHK"],
    },
  };
}

export function getLead(id: string): MarketplaceLeadDetail | null {
  if (state.soldLeads.has(id)) return null;
  const seed = SEED_LEADS.find((l) => l.id === id);
  return seed ? toMaskedDetail(seed) : null;
}

/**
 * Buying a lead.
 *
 * Order of checks matters and mirrors what a real implementation must do:
 * state.account state first, then availability, then funds, then the deduction, and
 * only then the release. Nothing is released if the deduction does not happen.
 */
export function purchaseLead(input: {
  leadId: string;
  idempotencyKey: string;
}): PurchaseOutcome {
  const replayed = state.purchaseTokens.get(input.idempotencyKey);
  if (replayed !== undefined) {
    const existing = state.soldLeads.get(replayed);
    if (existing) return { kind: "purchased", lead: existing, duplicate: true };
  }

  if (state.account.accountStatus === "suspended")
    return { kind: "account_suspended" };
  if (state.account.kycStatus !== "approved") {
    return { kind: "not_verified", kycStatus: state.account.kycStatus };
  }

  const seed = SEED_LEADS.find((l) => l.id === input.leadId);
  if (!seed || state.soldLeads.has(input.leadId))
    return { kind: "already_sold" };

  if (state.balanceCredits < seed.priceCredits) {
    return {
      kind: "insufficient_credits",
      priceCredits: seed.priceCredits,
      balanceCredits: state.balanceCredits,
    };
  }

  state.orderSequence += 1;
  const orderId = `ORD-${state.orderSequence}`;
  const purchasedAt = new Date().toISOString();

  // Deduct first. The release below is only reached because this succeeded.
  postLedgerEntry({
    type: "lead_purchase",
    description: `Lead purchase ${seed.id}`,
    deltaCredits: -seed.priceCredits,
    reference: orderId,
  });

  const purchased: PurchasedLead = {
    id: seed.id,
    orderId,
    purchasedAt,
    requirement: seed.requirement,
    locationPath: seed.locationPath,
    configuration: seed.configuration,
    budgetBand: seed.budgetBand,
    intentBand: seed.intentBand,
    intentScore: seed.intentScore,
    pricePaidCredits: seed.priceCredits,
    contact: seed.contact,
    qualification: seed.qualification,
  };

  state.soldLeads.set(seed.id, purchased);
  state.purchaseTokens.set(input.idempotencyKey, seed.id);
  return { kind: "purchased", lead: purchased, duplicate: false };
}

export function listPurchased(): readonly PurchasedLead[] {
  return [...state.soldLeads.values()].sort((a, b) =>
    b.purchasedAt.localeCompare(a.purchasedAt),
  );
}

export function getPurchased(id: string): PurchasedLead | null {
  return state.soldLeads.get(id) ?? null;
}

/** CSV of the caller's own purchased leads. Quoting is deliberate, not optional. */
export function exportPurchasedCsv(ids?: readonly string[]): string {
  const rows = listPurchased().filter((l) => (ids ? ids.includes(l.id) : true));
  const head = [
    "Lead",
    "Order",
    "Purchased",
    "Requirement",
    "Area",
    "Configuration",
    "Budget band",
    "Intent score",
    "Name",
    "Mobile",
    "Email",
    "Best time to call",
    "Credits paid",
  ];
  const cell = (v: string | number | null) => {
    const s = v === null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [head.join(",")];
  for (const l of rows) {
    lines.push(
      [
        l.id,
        l.orderId,
        l.purchasedAt,
        l.requirement,
        l.locationPath.join(" / "),
        l.configuration,
        l.budgetBand,
        l.intentScore,
        l.contact.name,
        l.contact.phone,
        l.contact.email,
        l.contact.bestTimeToCall,
        l.pricePaidCredits,
      ]
        .map(cell)
        .join(","),
    );
  }
  return `${lines.join("\r\n")}\r\n`;
}

// ------------------------------------------------------------------ credits --

function seedLedger(): LedgerEntry[] {
  return [
    {
      id: "PAY-88441",
      occurredAt: "2026-09-14T06:12:00.000Z",
      type: "recharge",
      description: "Credit recharge",
      deltaCredits: 2_000,
      balanceAfterCredits: 4_200,
      expiresAt: null,
    },
    {
      id: "ORD-10233",
      occurredAt: "2026-09-12T11:40:00.000Z",
      type: "lead_purchase",
      description: "Lead purchase L-4402",
      deltaCredits: -1_040,
      balanceAfterCredits: 2_200,
      expiresAt: null,
    },
    {
      id: "ORD-10211",
      occurredAt: "2026-09-09T09:05:00.000Z",
      type: "lead_purchase",
      description: "Lead purchase L-4455",
      deltaCredits: -780,
      balanceAfterCredits: 3_240,
      expiresAt: null,
    },
    {
      id: "PAY-87902",
      occurredAt: "2026-09-02T07:20:00.000Z",
      type: "recharge",
      description: "Credit recharge",
      deltaCredits: 5_000,
      balanceAfterCredits: 4_020,
      expiresAt: null,
    },
  ];
}

/**
 * Appends to the state.ledger and derives the new balance from it.
 *
 * The balance is never set directly — it is the result of an entry, which is the
 * property the design states on S-17: "balances are derived from these entries,
 * never edited directly."
 */
function postLedgerEntry(input: {
  type: LedgerEntry["type"];
  description: string;
  deltaCredits: number;
  reference: string;
}): LedgerEntry {
  state.balanceCredits += input.deltaCredits;
  const entry: LedgerEntry = {
    id: input.reference,
    occurredAt: new Date().toISOString(),
    type: input.type,
    description: input.description,
    deltaCredits: input.deltaCredits,
    balanceAfterCredits: state.balanceCredits,
    // Null, not a computed date. D-04 leaves the expiry period unset, and
    // inventing one here would put a made-up date in front of a Seller.
    expiresAt: null,
  };
  state.ledger.unshift(entry);
  return entry;
}

export function wallet(): WalletSummary {
  return {
    balanceCredits: state.balanceCredits,
    // Both null while D-04 is open: with no expiry period there is no basis for
    // saying any part of the balance is expiring or expired.
    expiringSoonCredits: null,
    expiredCredits: null,
  };
}

/** Review affordance: drop the balance to zero to reach the S-10 failure state. */
export function setBalanceForReview(credits: number): void {
  const delta = credits - state.balanceCredits;
  if (delta === 0) return;
  postLedgerEntry({
    type: "adjustment",
    description: "Review adjustment — sample mode only",
    deltaCredits: delta,
    reference: `ADJ-${Date.now()}`,
  });
}

export function getLedger(filter?: {
  type?: "recharge" | "purchase";
}): readonly LedgerEntry[] {
  if (!filter?.type) return state.ledger;
  return state.ledger.filter((e) =>
    filter.type === "recharge"
      ? e.type === "recharge"
      : e.type === "lead_purchase",
  );
}

export function usageByMonth(): readonly UsageMonth[] {
  // Fixed illustrative shape. Deriving six months from four seed entries would
  // produce a chart that says more than the data does.
  return [
    { label: "Apr", spentInr: 1_450 },
    { label: "May", spentInr: 2_380 },
    { label: "Jun", spentInr: 1_820 },
    { label: "Jul", spentInr: 3_040 },
    { label: "Aug", spentInr: 3_960 },
    { label: "Sep", spentInr: 3_370 },
  ];
}

/**
 * Recharging.
 *
 * `state.paymentOutcome` decides success, pending or failure so the three
 * designed results (S-16) can all be reached. That switch is the whole of the
 * "payment" here: no gateway is contacted and no money moves.
 */
export function setPaymentOutcomeForReview(
  outcome: "success" | "pending" | "failed",
): void {
  state.paymentOutcome = outcome;
}

export function recharge(input: {
  amountInr: number;
  idempotencyKey: string;
}): RechargeOutcome {
  const replayed = state.rechargeTokens.get(input.idempotencyKey);
  if (replayed) {
    return replayed.kind === "credited"
      ? { ...replayed, duplicate: true }
      : replayed;
  }

  state.paymentSequence += 1;
  const paymentReference = `PAY-${state.paymentSequence}`;

  if (state.paymentOutcome === "pending") {
    const outcome: RechargeOutcome = { kind: "pending", paymentReference };
    state.rechargeTokens.set(input.idempotencyKey, outcome);
    return outcome;
  }

  if (state.paymentOutcome === "failed") {
    const outcome: RechargeOutcome = {
      kind: "failed",
      message:
        "The payment was not completed. No credits were added and nothing was charged.",
    };
    state.rechargeTokens.set(input.idempotencyKey, outcome);
    return outcome;
  }

  postLedgerEntry({
    type: "recharge",
    description: "Credit recharge",
    deltaCredits: input.amountInr,
    reference: paymentReference,
  });

  const invoiceId = `INV-2026-${String(state.invoices.length + 915).padStart(4, "0")}`;
  state.invoices.unshift({
    id: invoiceId,
    number: invoiceId,
    issuedAt: new Date().toISOString(),
    amountInr: input.amountInr,
    status: "paid",
    description: `Credit recharge ₹${input.amountInr.toLocaleString("en-IN")}`,
  });

  const outcome: RechargeOutcome = {
    kind: "credited",
    amountInr: input.amountInr,
    balanceCredits: state.balanceCredits,
    paymentReference,
    invoiceId,
    duplicate: false,
  };
  state.rechargeTokens.set(input.idempotencyKey, outcome);
  return outcome;
}

// ----------------------------------------------------------------- state.invoices --

function seedInvoices(): Invoice[] {
  return [
    {
      id: "INV-2026-0914",
      number: "INV-2026-0914",
      issuedAt: "2026-09-14T06:12:00.000Z",
      amountInr: 2_000,
      status: "paid",
      description: "Credit recharge ₹2,000",
    },
    {
      id: "INV-2026-0902",
      number: "INV-2026-0902",
      issuedAt: "2026-09-02T07:20:00.000Z",
      amountInr: 5_000,
      status: "paid",
      description: "Credit recharge ₹5,000",
    },
    {
      id: "INV-2026-0821",
      number: "INV-2026-0821",
      issuedAt: "2026-08-21T05:40:00.000Z",
      amountInr: 1_000,
      status: "paid",
      description: "Credit recharge ₹1,000",
    },
  ];
}

export function listInvoices(): readonly Invoice[] {
  return state.invoices;
}

export function getInvoice(id: string): InvoiceDetail | null {
  const invoice = state.invoices.find((i) => i.id === id);
  if (!invoice) return null;
  return {
    ...invoice,
    billedTo: {
      name: state.billing.billingName,
      addressLines: state.billing.addressLines,
      gstin: state.billing.gstin,
    },
    issuedBy: {
      name: "Kam Ki Lead",
      addressLines: ["Kolkata, West Bengal"],
      // Null, and the screen says why: D-13 leaves GST treatment unconfirmed.
      gstin: null,
    },
    lines: [
      {
        description: "Credit recharge",
        quantity: 1,
        amountInr: invoice.amountInr,
      },
    ],
    // Null while D-13 is open. A zero would be a tax claim nobody has made.
    taxInr: null,
    totalInr: invoice.amountInr,
  };
}

// ------------------------------------------------------------------ support --

type StoredThread = Omit<SupportThread, "messages" | "status" | "updatedAt"> & {
  messages: TicketMessage[];
  status: SupportTicket["status"];
  updatedAt: string;
};

const nextMessageId = () => `M-${(state.messageSequence += 1)}`;

/**
 * Seed threads.
 *
 * Its own local id counter, not `nextMessageId`: this runs inside the
 * `processState` factory, before `state` exists, so reading `state` from here
 * would be a use-before-initialisation.
 */
function seedThreads(): StoredThread[] {
  let n = 0;
  const id = () => `M-seed-${(n += 1)}`;
  return [
    {
      id: "T-2291",
      reference: "T-2291",
      subject: "Lead L-4468 contact number is disconnected",
      topic: "Lead quality",
      status: "replied",
      createdAt: "2026-09-12T05:32:00.000Z",
      updatedAt: "2026-09-13T03:48:00.000Z",
      messages: [
        {
          id: id(),
          author: "you",
          authorLabel: "You",
          body: "Lead L-4468 gave a wrong number — the line is disconnected. Can this be reviewed?",
          sentAt: "2026-09-12T05:32:00.000Z",
        },
        {
          id: id(),
          author: "support",
          authorLabel: "Kam Ki Lead support",
          body: "Thanks — we have pulled the call recording and asked the qualification team to re-check the number. We will confirm the outcome here.",
          sentAt: "2026-09-12T10:10:00.000Z",
        },
        {
          id: id(),
          author: "support",
          authorLabel: "Kam Ki Lead support",
          body: "The number was mis-keyed during intake and has been corrected on your purchased lead. Whether a credit refund applies is still being decided by the client, so we have not applied one.",
          sentAt: "2026-09-13T03:48:00.000Z",
        },
      ],
    },
    {
      id: "T-2274",
      reference: "T-2274",
      subject: "Invoice for the 2 September recharge",
      topic: "Payment or credits",
      status: "resolved",
      createdAt: "2026-09-03T08:15:00.000Z",
      updatedAt: "2026-09-05T06:02:00.000Z",
      messages: [
        {
          id: id(),
          author: "you",
          authorLabel: "You",
          body: "I cannot find the invoice for the ₹5,000 recharge on 2 September.",
          sentAt: "2026-09-03T08:15:00.000Z",
        },
        {
          id: id(),
          author: "support",
          authorLabel: "Kam Ki Lead support",
          body: "It is INV-2026-0902, under Billing → Invoices. Marking this resolved — reopen by replying if anything is still missing.",
          sentAt: "2026-09-05T06:02:00.000Z",
        },
      ],
    },
    {
      id: "T-2260",
      reference: "T-2260",
      subject: "KYC rejected — which side of Aadhaar?",
      topic: "KYC",
      status: "awaiting_reply",
      createdAt: "2026-08-28T11:20:00.000Z",
      updatedAt: "2026-08-30T04:44:00.000Z",
      messages: [
        {
          id: id(),
          author: "you",
          authorLabel: "You",
          body: "My KYC was rejected for an unclear Aadhaar. Do you need both sides in one file?",
          sentAt: "2026-08-28T11:20:00.000Z",
        },
        {
          id: id(),
          author: "support",
          authorLabel: "Kam Ki Lead support",
          body: "Either both sides in one PDF or the e-Aadhaar PDF. Could you confirm which you uploaded so we can check what came through?",
          sentAt: "2026-08-30T04:44:00.000Z",
        },
      ],
    },
  ];
}

export function listTickets(): readonly SupportTicket[] {
  return state.threads.map(withoutMessages);
}

/** A thread's ticket half, so a list never carries every message body. */
function withoutMessages(thread: StoredThread): SupportTicket {
  return {
    id: thread.id,
    reference: thread.reference,
    subject: thread.subject,
    topic: thread.topic,
    status: thread.status,
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,
  };
}

export function getThread(reference: string): SupportThread | null {
  return state.threads.find((t) => t.reference === reference) ?? null;
}

export function createTicket(input: {
  topic: string;
  subject: string;
  body: string;
}): SupportTicket {
  state.ticketSequence += 1;
  const reference = `T-${state.ticketSequence}`;
  const now = new Date().toISOString();
  const thread: StoredThread = {
    id: reference,
    reference,
    subject: input.subject,
    topic: input.topic,
    // "open", not "replied": no automated reply is fabricated, and D-12 leaves
    // any response time unpublished.
    status: "open",
    createdAt: now,
    updatedAt: now,
    messages: [
      {
        id: nextMessageId(),
        author: "you",
        authorLabel: "You",
        body: input.body,
        sentAt: now,
      },
    ],
  };
  state.threads.unshift(thread);
  return withoutMessages(thread);
}

export function replyToTicket(input: {
  reference: string;
  body: string;
}): SupportThread | null {
  const thread = state.threads.find((t) => t.reference === input.reference);
  if (!thread) return null;
  const now = new Date().toISOString();
  thread.messages.push({
    id: nextMessageId(),
    author: "you",
    authorLabel: "You",
    body: input.body,
    sentAt: now,
  });
  thread.updatedAt = now;
  thread.status = "open";
  return thread;
}

export function resolveTicket(reference: string): SupportThread | null {
  const thread = state.threads.find((t) => t.reference === reference);
  if (!thread) return null;
  thread.status = "resolved";
  thread.updatedAt = new Date().toISOString();
  return thread;
}

// ------------------------------------------------------- review affordances --

/**
 * Review-only setters for the state.account states the design covers.
 *
 * These exist so S-04 and S-05 can be reviewed without an administrator. They
 * are reachable only from a route that refuses to exist outside sample mode —
 * see src/app/seller/review-state/route.ts. Nothing in the product surface calls
 * them, and a real deployment has no equivalent: verification and suspension are
 * administrator decisions taken in kkl-backend.
 */
export function setKycStatusForReview(status: KycSubmission["status"]): void {
  const now = new Date().toISOString();
  state.kyc = {
    status,
    submittedAt:
      status === "not_submitted" ? null : (state.kyc.submittedAt ?? now),
    decidedAt: status === "approved" || status === "rejected" ? now : null,
    rejectionReason:
      status === "rejected"
        ? "The Aadhaar upload was not readable. Please re-upload both sides, or the e-Aadhaar PDF."
        : null,
    panMasked:
      status === "not_submitted" ? null : (state.kyc.panMasked ?? "ABCDE••••F"),
    aadhaarMasked:
      status === "not_submitted"
        ? null
        : (state.kyc.aadhaarMasked ?? "•••• •••• 4182"),
  };
  state.account = { ...state.account, kycStatus: status };
}

export function setAccountStatusForReview(
  status: SellerAccountStatusInput,
): void {
  state.account = { ...state.account, accountStatus: status };
}

type SellerAccountStatusInput = SellerAccount["accountStatus"];

/** Puts every seed value back, for a clean review pass. */
export function resetForReview(): void {
  state.account = SEED_ACCOUNT;
  state.billing = SEED_BILLING;
  setKycStatusForReview("approved");
  state.soldLeads.clear();
  state.purchaseTokens.clear();
  state.rechargeTokens.clear();
  state.balanceCredits = SEED_BALANCE;
  state.paymentOutcome = "success";
}
