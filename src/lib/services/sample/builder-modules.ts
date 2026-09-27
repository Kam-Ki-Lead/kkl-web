import type {
  Invoice,
  InvoiceDetail,
  LedgerEntry,
  MarketplaceLead,
  MarketplaceLeadDetail,
  PurchasedLead,
  SupportThread,
  SupportTicket,
  TicketMessage,
  WalletSummary,
} from "@/lib/domain/types";
import {
  ServiceError,
  type CreditService,
  type LeadMarketPage,
  type LeadMarketQuery,
  type LeadMarketService,
  type PurchaseOutcome,
  type RechargeOutcome,
  type SupportService,
  type UsageMonth,
} from "@/lib/services/contracts";
import { processState } from "./process-state";
import { areaOptionsFor, displayPath, isWithin } from "./locations";
import * as builderStore from "./builder-store";
import { projectOrder } from "./lead-orders";

/**
 * The Builder's marketplace, credits and support.
 *
 * The approved design says Builders get the same modules as brokers under
 * Builder access, so these implement the same three interfaces. What they do
 * NOT share is records: a separate lead pool, a separate ledger and balance, a
 * separate ticket list. A Builder and a Seller are two accounts, and a shared
 * ledger between them would be a data leak.
 *
 * Credits are the one thing the two modules here have in common, because
 * unlocking an enquiry contact under alternative B spends from the same balance
 * a lead purchase does — one wallet per account, as the design shows.
 */

const SEED_BALANCE_SOURCE = () => builderStore.balance();

// ---------------------------------------------------------------- lead pool --

type SeedLead = MarketplaceLeadDetail & {
  readonly contact: PurchasedLead["contact"];
  /** The lead's area as a location-record id (CR05); the path derives from it. */
  readonly locationId: string;
};

/** Distinct from the Seller's pool: different references, areas and prices. */
function seedLeads(): readonly SeedLead[] {
  return [
    {
      id: "L-4530",
      requirement: "3 BHK · ₹90L – ₹1.2Cr",
      locationId: "action-area-ii",
    locationPath: displayPath("action-area-ii"),
      configuration: "3 BHK",
      budgetBand: "₹80L – ₹1Cr",
      intentBand: "hot",
      intentScore: 79,
      status: "listed",
      ageDays: 1,
      priceCredits: 880,
      originalPriceCredits: null,
      contactMask: "P••• G•• · +91 98••• ••52",
      qualification: {
        summary:
          "Buyer is comparing two under-construction projects in New Town and wants possession inside two years. Has an approved loan sanction letter.",
        intentScore: 79,
        consentCaptured: true,
        channel: "Voice call · Bengali",
        timeline: "1–2 years",
        purpose: "End use",
        financing: "Loan sanctioned",
      },
      contact: {
        name: "Piyali Ghosh",
        phone: "+91 98311 60452",
        email: "piyali.ghosh@example.invalid",
        bestTimeToCall: "Weekday evenings",
      },
    },
    {
      id: "L-4521",
      requirement: "4 BHK · ₹2Cr +",
      locationId: "action-area-i",
    locationPath: displayPath("action-area-i"),
      configuration: "4 BHK",
      budgetBand: "₹1.5Cr and above",
      intentBand: "warm",
      intentScore: 71,
      status: "on_sale",
      ageDays: 7,
      priceCredits: 1_120,
      originalPriceCredits: 1_400,
      contactMask: "T••• N•• · +91 90••• ••18",
      qualification: {
        summary:
          "Looking for a larger home after a family move from Delhi. Wants a lake-facing unit and covered parking for two cars.",
        intentScore: 71,
        consentCaptured: true,
        channel: "Voice call · Hindi",
        timeline: "Within 6 months",
        purpose: "End use",
        financing: "Self-funded",
      },
      contact: {
        name: "Tarun Nair",
        phone: "+91 90224 77118",
        email: null,
        bestTimeToCall: null,
      },
    },
    {
      id: "L-4498",
      requirement: "2 BHK · ₹55L – ₹70L",
      locationId: "rajarhat",
    locationPath: displayPath("rajarhat"),
      configuration: "2 BHK",
      budgetBand: "₹60L – ₹80L",
      intentBand: "mild",
      intentScore: 58,
      status: "listed",
      ageDays: 3,
      priceCredits: 640,
      originalPriceCredits: null,
      contactMask: "V••• R•• · +91 97••• ••73",
      qualification: {
        summary:
          "First home, budget is firm, and the decision depends on the handover date. Asked about construction progress photographs.",
        intentScore: 58,
        consentCaptured: true,
        channel: "Voice call · Bengali",
        timeline: "Timeline open",
        purpose: "End use",
        financing: "Loan required",
      },
      contact: {
        name: "Vikram Roy",
        phone: "+91 97440 20173",
        email: "vikram.roy@example.invalid",
        bestTimeToCall: "Mornings",
      },
    },
  ];
}

function toMasked(seed: SeedLead): MarketplaceLead {
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

// -------------------------------------------------------------------- state --

function freshModules() {
  return {
    leads: seedLeads(),
    soldLeads: new Map<string, PurchasedLead>(),
    purchaseTokens: new Map<string, string>(),
    rechargeTokens: new Map<string, RechargeOutcome>(),
    orderSequence: 20_411,
    paymentSequence: 90_114,
    invoiceSequence: 903,
    ticketSequence: 3_140,
    messageSequence: 0,
    paymentOutcome: "success" as "success" | "pending" | "failed",
    invoices: seedInvoices(),
    threads: seedThreads(),
  };
}

type ModulesState = ReturnType<typeof freshModules>;

let holder: ModulesState | null = null;
function m(): ModulesState {
  holder ??= processState("builder-modules", freshModules);
  return holder;
}

function seedInvoices(): Invoice[] {
  return [
    {
      id: "INV-2026-0903",
      number: "INV-2026-0903",
      issuedAt: "2026-09-03T08:10:00.000Z",
      amountInr: 3_000,
      status: "paid",
      description: "Credit recharge ₹3,000",
    },
  ];
}

type StoredThread = Omit<SupportThread, "messages" | "status" | "updatedAt"> & {
  messages: TicketMessage[];
  status: SupportTicket["status"];
  updatedAt: string;
};

function seedThreads(): StoredThread[] {
  let n = 0;
  const id = () => `BM-seed-${(n += 1)}`;
  return [
    {
      id: "T-3140",
      reference: "T-3140",
      subject: "Orchid Grove is not appearing in search",
      topic: "Listings",
      status: "replied",
      createdAt: "2026-09-16T06:20:00.000Z",
      updatedAt: "2026-09-16T11:05:00.000Z",
      messages: [
        {
          id: id(),
          author: "you",
          authorLabel: "You",
          body: "Orchid Grove is not showing on the portal even though the listing looks complete.",
          sentAt: "2026-09-16T06:20:00.000Z",
        },
        {
          id: id(),
          author: "support",
          authorLabel: "Kam Ki Lead support",
          body: "The listing is currently unpublished — you can republish it from My properties. Nothing was removed.",
          sentAt: "2026-09-16T11:05:00.000Z",
        },
      ],
    },
  ];
}

// ------------------------------------------------------------- lead market --

export const builderLeadMarket: LeadMarketService = {
  async list(query: LeadMarketQuery): Promise<LeadMarketPage> {
    const available = m().leads.filter((l) => !m().soldLeads.has(l.id));
    let leads = available.filter((l) =>
      query.onSaleOnly === true ? l.status === "on_sale" : true,
    );
    if (query.areaId) {
      // Id-based and hierarchical (CR05): a locality covers its sub-localities.
      leads = leads.filter((l) => isWithin(l.locationId, query.areaId as string));
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
      withheld: null,
      filterOptions: {
        // Derived from the leads actually listed, through the location records.
        areas: areaOptionsFor(available.map((l) => l.locationId)),
        budgetBands: ["All budgets", "₹60L – ₹80L", "₹80L – ₹1Cr", "₹1.5Cr and above"],
        configurations: ["All configurations", "2 BHK", "3 BHK", "4 BHK"],
      },
    };
  },

  async get(id) {
    if (m().soldLeads.has(id)) return null;
    const seed = m().leads.find((l) => l.id === id);
    return seed ? { ...toMasked(seed), qualification: seed.qualification } : null;
  },

  async purchase(input): Promise<PurchaseOutcome> {
    const replayed = m().purchaseTokens.get(input.idempotencyKey);
    if (replayed !== undefined) {
      const existing = m().soldLeads.get(replayed);
      if (existing) return { kind: "purchased", lead: existing, duplicate: true };
    }

    const account = builderStore.getAccount();
    if (account.accountStatus === "suspended") return { kind: "account_suspended" };
    if (account.kycStatus !== "approved") {
      return { kind: "not_verified", kycStatus: account.kycStatus };
    }

    const seed = m().leads.find((l) => l.id === input.leadId);
    if (!seed || m().soldLeads.has(input.leadId)) return { kind: "already_sold" };

    if (SEED_BALANCE_SOURCE() < seed.priceCredits) {
      return {
        kind: "insufficient_credits",
        priceCredits: seed.priceCredits,
        balanceCredits: SEED_BALANCE_SOURCE(),
      };
    }

    m().orderSequence += 1;
    const orderId = `ORD-${m().orderSequence}`;
    builderStore.postEntry({
      type: "lead_purchase",
      description: `Lead purchase ${seed.id}`,
      deltaCredits: -seed.priceCredits,
      reference: orderId,
    });

    const purchased: PurchasedLead = {
      id: seed.id,
      orderId,
      purchasedAt: new Date().toISOString(),
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
    m().soldLeads.set(seed.id, purchased);
    m().purchaseTokens.set(input.idempotencyKey, seed.id);
    return { kind: "purchased", lead: purchased, duplicate: false };
  },

  async listPurchased() {
    return [...m().soldLeads.values()].sort((a, b) =>
      b.purchasedAt.localeCompare(a.purchasedAt),
    );
  },

  async getPurchased(id) {
    return m().soldLeads.get(id) ?? null;
  },

  // CR04 — the Builder's own orders, over the same projection the Seller
  // console uses. The two lead pools are separate; an order is not.
  async listOrders() {
    return [...m().soldLeads.values()]
      .sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt))
      .map((lead) => projectOrder(lead, "builder", lead.orderId));
  },

  async getOrder(reference) {
    const lead = [...m().soldLeads.values()].find((l) => l.orderId === reference);
    return lead === undefined ? null : projectOrder(lead, "builder", lead.orderId);
  },

  async exportPurchased({ ids }) {
    const rows = [...m().soldLeads.values()].filter((l) => (ids ? ids.includes(l.id) : true));
    const cell = (v: string | number | null) => {
      const s = v === null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [
      ["Lead", "Order", "Purchased", "Requirement", "Area", "Name", "Mobile", "Email", "Credits paid"].join(
        ",",
      ),
      ...rows.map((l) =>
        [
          l.id,
          l.orderId,
          l.purchasedAt,
          l.requirement,
          l.locationPath.join(" / "),
          l.contact.name,
          l.contact.phone,
          l.contact.email,
          l.pricePaidCredits,
        ]
          .map(cell)
          .join(","),
      ),
    ];
    return {
      filename: `kkl-builder-leads-${new Date().toISOString().slice(0, 10)}.csv`,
      contentType: "text/csv; charset=utf-8",
      body: `${lines.join("\r\n")}\r\n`,
    };
  },
};

// ---------------------------------------------------------------- credits --

export const builderCredits: CreditService = {
  async wallet(): Promise<WalletSummary> {
    return {
      balanceCredits: builderStore.balance(),
      expiringSoonCredits: null,
      expiredCredits: null,
    };
  },

  async usageByMonth(): Promise<readonly UsageMonth[]> {
    return [
      { label: "Apr", spentInr: 0 },
      { label: "May", spentInr: 0 },
      { label: "Jun", spentInr: 620 },
      { label: "Jul", spentInr: 0 },
      { label: "Aug", spentInr: 940 },
      { label: "Sep", spentInr: 1_150 },
    ];
  },

  async ledger(filter): Promise<readonly LedgerEntry[]> {
    const newestFirst = [...builderStore.ledger()].reverse();
    if (!filter?.type) return newestFirst;
    return newestFirst.filter((e) =>
      filter.type === "recharge" ? e.type === "recharge" : e.type === "lead_purchase",
    );
  },

  async recharge(input): Promise<RechargeOutcome> {
    const replayed = m().rechargeTokens.get(input.idempotencyKey);
    if (replayed) {
      return replayed.kind === "credited" ? { ...replayed, duplicate: true } : replayed;
    }

    m().paymentSequence += 1;
    const paymentReference = `PAY-${m().paymentSequence}`;

    if (m().paymentOutcome === "pending") {
      const outcome: RechargeOutcome = { kind: "pending", paymentReference };
      m().rechargeTokens.set(input.idempotencyKey, outcome);
      return outcome;
    }
    if (m().paymentOutcome === "failed") {
      const outcome: RechargeOutcome = {
        kind: "failed",
        message: "The payment was not completed. No credits were added and nothing was charged.",
      };
      m().rechargeTokens.set(input.idempotencyKey, outcome);
      return outcome;
    }

    builderStore.postEntry({
      type: "recharge",
      description: "Credit recharge",
      deltaCredits: input.amountInr,
      reference: paymentReference,
    });

    m().invoiceSequence += 1;
    const invoiceId = `INV-2026-${String(m().invoiceSequence).padStart(4, "0")}`;
    m().invoices.unshift({
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
      balanceCredits: builderStore.balance(),
      paymentReference,
      invoiceId,
      duplicate: false,
    };
    m().rechargeTokens.set(input.idempotencyKey, outcome);
    return outcome;
  },

  async invoices() {
    return m().invoices;
  },

  async invoice(id): Promise<InvoiceDetail | null> {
    const invoice = m().invoices.find((i) => i.id === id);
    if (!invoice) return null;
    const account = builderStore.getAccount();
    return {
      ...invoice,
      billedTo: {
        name: account.companyName,
        addressLines: ["Unit 7, Ecospace Business Park", "New Town, Kolkata 700160"],
        gstin: null,
      },
      issuedBy: {
        name: "Kam Ki Lead",
        addressLines: ["Kolkata, West Bengal"],
        gstin: null,
      },
      lines: [{ description: "Credit recharge", quantity: 1, amountInr: invoice.amountInr }],
      // Null while D-13 is open, exactly as on the Seller's invoices.
      taxInr: null,
      totalInr: invoice.amountInr,
    };
  },
};

export function setBuilderPaymentOutcomeForReview(next: "success" | "pending" | "failed"): void {
  m().paymentOutcome = next;
}

export function setBuilderBalanceForReview(credits: number): void {
  const delta = credits - builderStore.balance();
  if (delta === 0) return;
  builderStore.postEntry({
    type: "adjustment",
    description: "Review adjustment — sample mode only",
    deltaCredits: delta,
    reference: `ADJ-B-${Date.now()}`,
  });
}

export function reconcileBuilder() {
  const entries = builderStore.ledger();
  const sumOfDeltas = entries.reduce((total, e) => total + e.deltaCredits, 0);
  const opening = builderStore.openingBalance();
  let running = opening;
  let chainIntact = true;
  for (const entry of entries) {
    running += entry.deltaCredits;
    if (entry.balanceAfterCredits !== running) chainIntact = false;
  }
  const expectedBalance = opening + sumOfDeltas;
  const reportedBalance = builderStore.balance();
  return {
    openingBalance: opening,
    sumOfDeltas,
    expectedBalance,
    reportedBalance,
    entryCount: entries.length,
    chainIntact,
    consistent: chainIntact && expectedBalance === reportedBalance,
  };
}

// ----------------------------------------------------------------- support --

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

/**
 * The Builder's support module, plus the two synchronous accessors the Admin
 * console needs.
 *
 * `SupportService` is async because a real one will be. The Admin store reads
 * the same in-process records and has no request to await, so it reads them
 * through `snapshot` and `snapshotThread` rather than pretending. Keeping those
 * on this object rather than exporting them loose is deliberate: whoever reads
 * a Builder ticket goes through the Builder's own module, which is what keeps
 * "the two queues are separate" true rather than hopeful.
 */
export const builderSupport: SupportService & {
  snapshot(): readonly StoredThread[];
  snapshotThread(reference: string): StoredThread | null;
  postStaffReply(input: {
    reference: string;
    body: string;
    staffLabel: string;
  }): StoredThread | null;
  resolveThread(reference: string): StoredThread | null;
} = {
  snapshot() {
    return m().threads;
  },

  snapshotThread(reference) {
    return m().threads.find((t) => t.reference === reference) ?? null;
  },

  postStaffReply(input) {
    return postBuilderStaffReply(input);
  },

  resolveThread(reference) {
    const thread = m().threads.find((t) => t.reference === reference);
    if (!thread) return null;
    thread.status = "resolved";
    thread.updatedAt = new Date().toISOString();
    return thread;
  },

  async listTickets() {
    return m().threads.map(withoutMessages);
  },

  async getThread(reference) {
    return m().threads.find((t) => t.reference === reference) ?? null;
  },

  async createTicket(input) {
    m().ticketSequence += 1;
    const reference = `T-${m().ticketSequence}`;
    const now = new Date().toISOString();
    const thread: StoredThread = {
      id: reference,
      reference,
      subject: input.subject,
      topic: input.topic,
      status: "open",
      createdAt: now,
      updatedAt: now,
      messages: [
        {
          id: `BM-${(m().messageSequence += 1)}`,
          author: "you",
          authorLabel: "You",
          body: input.body,
          sentAt: now,
        },
      ],
    };
    m().threads.unshift(thread);
    return withoutMessages(thread);
  },

  async reply(input) {
    const thread = m().threads.find((t) => t.reference === input.reference);
    if (!thread) throw new ServiceError("not_found", `No ticket ${input.reference}.`);
    const now = new Date().toISOString();
    thread.messages.push({
      id: `BM-${(m().messageSequence += 1)}`,
      author: "you",
      authorLabel: "You",
      body: input.body,
      sentAt: now,
    });
    thread.updatedAt = now;
    thread.status = "open";
    return thread;
  },

  async resolve(reference) {
    const thread = m().threads.find((t) => t.reference === reference);
    if (!thread) throw new ServiceError("not_found", `No ticket ${reference}.`);
    thread.status = "resolved";
    thread.updatedAt = new Date().toISOString();
    return thread;
  },
};

/**
 * A staff reply into the Builder's own thread (A-23 → B-23).
 *
 * The Builder mirror of `postStaffReply` in seller-store, and separate from it
 * for the reason the two consoles are separate everywhere else: a reply meant
 * for a Builder must not be appendable to a Seller's thread. The Admin store
 * picks which of these two to call from the ticket's own account, not from
 * anything the form said.
 */
export function postBuilderStaffReply(input: {
  reference: string;
  body: string;
  staffLabel: string;
}): StoredThread | null {
  const thread = m().threads.find((t) => t.reference === input.reference);
  if (!thread) return null;
  const now = new Date().toISOString();
  thread.messages.push({
    id: `BM-${(m().messageSequence += 1)}`,
    author: "support",
    authorLabel: input.staffLabel,
    body: input.body,
    sentAt: now,
  });
  thread.updatedAt = now;
  thread.status = "replied";
  return thread;
}

/**
 * The Builder's purchased leads, read synchronously for the Admin console.
 *
 * Same reasoning as `builderSupport.snapshot`: A-16 joins both consoles'
 * purchases into one order list and has no request to await.
 */
export function builderPurchasedLeads(): readonly PurchasedLead[] {
  return [...m().soldLeads.values()];
}

export function resetBuilderModules(): void {
  Object.assign(m(), freshModules());
}
