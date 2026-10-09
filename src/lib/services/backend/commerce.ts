import type {
  CreditService,
  LeadMarketQuery,
  LeadMarketService,
  PurchaseOutcome,
  RechargeOutcome,
} from "@/lib/services/contracts";
import { ServiceError } from "@/lib/services/contracts";
import type {
  CommerceAvailability,
  Invoice,
  InvoiceDetail,
  LeadOrder,
  LeadOrderStatus,
  LedgerEntry,
  MarketplaceLead,
  MarketplaceLeadDetail,
  PurchasedLead,
  WalletSummary,
} from "@/lib/domain/types";
import type { UsageMonth } from "@/lib/services/contracts";
import {
  customerOrderStatus,
  readPriceChangedQuote,
  readWalletReconciliation,
  purchaseExpectedFields,
  type WalletReconciliation,
} from "@/lib/domain/commerce-display";
import { callAs, type BackendRole } from "./session";
import {
  PURCHASED_EXPORT_CONTENT_TYPE, purchasedLeadsCsv, purchasedLeadsFilename,
} from "@/lib/domain/purchased-export";

/**
 * The marketplace, the wallet and orders, served by kkl-backend.
 *
 * WHAT IS REAL HERE
 * The records. A wallet balance is the sum of an append-only ledger in
 * PostgreSQL. An order is a row that one account can read. A lead's contact
 * details are released by a database policy to the account that bought that
 * lead, and to nobody else.
 *
 * WHAT REFUSES, AND WHY IT IS STILL CONNECTED
 * Buying refuses: no lead price is configured (Q-1a). Recharging refuses: no
 * payment provider credentials exist (Q-5). Refunds and invoices refuse for
 * their own reasons (Q-1d, Q-1e). Connecting the screens to a service whose
 * commercial actions refuse is not a half-measure — it is the difference
 * between a screen that says "not priced yet" because the service said so,
 * and a screen showing a plausible ₹1,200 that came from a fixture. The
 * second is the one that gets believed.
 *
 * WHAT IS NOT HERE
 * Qualification data. kkl-backend records leads that nobody has called —
 * voice is a later phase — so `qualification` is null and the screens say
 * so, rather than rendering a summary of a conversation that never happened.
 */

type BackendBlocker = { code: string; reason: string };

type BackendLead = {
  id: string;
  reference: string;
  status: string;
  locationId: string | null;
  locationName: string | null;
  marketQuote?: { ageDays: number; discountPercent: number; originalPriceCredits: number | null };
  propertyType: string | null;
  budgetBand: string | null;
  configurations: string[];
  timing: string | null;
  summary: string | null;
  consentStatus: string;
  priceCredits: number | null;
  priceConfigurationId: string | null;
  priceConfigurationVersion: number | null;
  available: boolean;
  eligible: boolean;
  contact: { state: "released_on_purchase"; label: string };
  purchasable: boolean;
  blockers: BackendBlocker[];
};

type BackendWallet = {
  accountId: string;
  balanceCredits: number;
  pricing: {
    leadPriceCredits: number | null;
    configured: boolean;
    reason: string | null;
    rules: Record<string, { configured: boolean; code: string; question: string; reason: string | null }>;
  };
  entries: {
    id: string;
    entryType: "recharge" | "purchase" | "refund" | "adjustment" | "expiry";
    amountCredits: number;
    orderId: string | null;
    reason: string | null;
    at: string;
  }[];
};

type BackendOrder = {
  id: string;
  reference: string;
  leadId: string;
  amountCredits: number;
  status: "pending" | "completed" | "failed" | "cancelled";
  failureReason: string | null;
  createdAt: string;
  completedAt: string | null;
  duplicate?: boolean;
  balanceCredits?: number;
  leadReference?: string;
  lead?: {
    reference: string;
    summary: string | null;
    propertyType: string | null;
    budgetBand: string | null;
    locationName: string | null;
  };
  contact?: { fullName: string; phone: string; email: string | null } | null;
};

function raise(status: number, body: { error?: string; code?: string }): never {
  const message = body.error ?? `The service returned ${status}.`;
  if (status === 401) throw new ServiceError("unauthenticated", message);
  if (status === 403) throw new ServiceError("forbidden", message);
  throw new ServiceError("unavailable", message);
}

/** The requirement line the approved cards render, from what the lead has. */
const requirementOf = (lead: BackendLead) =>
  [lead.configurations.join(", "), lead.budgetBand].filter(Boolean).join(" · ")
  || lead.summary
  || lead.reference;

const pathOf = (lead: BackendLead) => (lead.locationName ? [lead.locationName] : []);

function toMarketplaceLead(lead: BackendLead): MarketplaceLead {
  return {
    id: lead.id,
    locationPath: pathOf(lead),
    configuration: lead.configurations.join(", ") || "Not stated",
    budgetBand: lead.budgetBand ?? "Not stated",
    // Nothing has scored these leads, and a default band would be a claim
    // about somebody nobody has spoken to.
    intentBand: null,
    intentScore: null,
    status: (lead.marketQuote?.discountPercent ?? 0) > 0 || lead.status === "on_sale" ? "on_sale" : "listed",
    // The aging rule is unconfirmed (Q-1b), so no age-derived discount is
    // computed here; the age itself is a fact and stays 0 until the backend
    // sends one.
    ageDays: lead.marketQuote?.ageDays ?? 0,
    priceCredits: lead.priceCredits,
    priceConfigurationId: typeof lead.priceConfigurationId === "string" ? lead.priceConfigurationId : null,
    priceConfigurationVersion:
      typeof lead.priceConfigurationVersion === "number" && Number.isSafeInteger(lead.priceConfigurationVersion)
        ? lead.priceConfigurationVersion
        : null,
    originalPriceCredits: (lead.marketQuote?.discountPercent ?? 0) > 0 ? lead.marketQuote?.originalPriceCredits ?? null : null,
    // kkl-backend composes no mask: it has read no contact to mask.
    contactMask: null,
    contactState: lead.contact,
    blockers: lead.blockers,
    purchasable: lead.purchasable,
    requirement: requirementOf(lead),
  };
}

const toDetail = (lead: BackendLead): MarketplaceLeadDetail => ({
  ...toMarketplaceLead(lead),
  qualification: null,
});

function orderStatus(status: BackendOrder["status"]): LeadOrderStatus {
  return customerOrderStatus(status);
}

function toLeadOrder(order: BackendOrder): LeadOrder {
  return {
    reference: order.id,
    // Contact is released only for a completed order. Pending stays pending:
    // it is not paid, and it is not a failed charge.
    status: orderStatus(order.status),
    placedAt: order.createdAt,
    leadId: order.status === "completed" ? order.leadId : null,
    itemLabel: order.lead?.summary ?? order.lead?.reference ?? order.leadReference ?? "Lead",
    locationPath: order.lead?.locationName ? [order.lead.locationName] : [],
    payment: {
      method: "wallet_credits",
      label: "Wallet credits",
      ledgerReference: order.reference,
      amountCredits: order.amountCredits,
    },
    invoice: {
      kind: "not_issued",
      reason:
        "No tax treatment or invoice numbering is configured, so no invoice has been issued "
        + "for this order.",
    },
    scope: "seller",
  };
}

/** What POST /v1/orders/export answers. */
type BackendExport = {
  readonly total: number;
  readonly exportedAt: string;
  readonly notAvailable: readonly string[];
  readonly withoutContact: readonly string[];
  readonly leads: ReadonlyArray<{
    readonly leadId: string;
    readonly orderId: string;
    readonly orderReference: string;
    readonly leadReference: string | null;
    readonly purchasedAt: string;
    readonly pricePaidCredits: number;
    readonly requirement: string | null;
    readonly locationName: string | null;
    readonly propertyType: string | null;
    readonly budgetBand: string | null;
    readonly intentScore: number | null;
    readonly contact: {
      readonly fullName: string | null;
      readonly phone: string | null;
      readonly email: string | null;
    } | null;
  }>;
};

function toPurchasedLead(order: BackendOrder): PurchasedLead | null {
  if (order.status !== "completed" || !order.contact) return null;
  return {
    id: order.leadId,
    orderId: order.id,
    purchasedAt: order.completedAt ?? order.createdAt,
    locationPath: order.lead?.locationName ? [order.lead.locationName] : [],
    configuration: order.lead?.propertyType ?? "Not stated",
    budgetBand: order.lead?.budgetBand ?? "Not stated",
    intentBand: null,
    intentScore: null,
    pricePaidCredits: order.amountCredits,
    requirement: order.lead?.summary ?? order.lead?.reference ?? "Lead",
    contact: {
      name: order.contact.fullName,
      phone: order.contact.phone,
      email: order.contact.email,
      // Free text from a qualification call that has not happened.
      bestTimeToCall: null,
    },
    qualification: null,
  };
}

/**
 * Filters the eligible page the API already returned.
 *
 * `onSaleOnly` keeps rows the service marked `on_sale`. Age is not used:
 * Q-1b does not apply a discount, and a lead is not moved onto the Sale tab
 * from a day count this client invents.
 */
function filterMarketplace(
  leads: readonly MarketplaceLead[],
  query: LeadMarketQuery,
): MarketplaceLead[] {
  let next = leads.filter((lead) => {
    if (query.onSaleOnly && lead.status !== "on_sale") return false;
    if (query.areaId && lead.locationPath[0] !== query.areaId) return false;
    if (query.budgetBand && lead.budgetBand !== query.budgetBand) return false;
    if (query.configuration && !lead.configuration.includes(query.configuration)) return false;
    if (query.minScore !== undefined) {
      if (lead.intentScore === null || lead.intentScore < query.minScore) return false;
    }
    return true;
  });
  if (query.sort === "price") {
    next = [...next].sort((a, b) => (a.priceCredits ?? Number.MAX_SAFE_INTEGER) - (b.priceCredits ?? Number.MAX_SAFE_INTEGER));
  }
  if (query.sort === "score") {
    next = [...next].sort((a, b) => (b.intentScore ?? -1) - (a.intentScore ?? -1));
  }
  return next;
}

export type { WalletReconciliation };

/** The signed-in account's own ledger comparison. Staff use the admin reader. */
export async function readOwnWalletReconciliation(role: BackendRole): Promise<WalletReconciliation> {
  const { status, body } = await callAs<unknown>(role, "/v1/wallet/reconciliation");
  if (status !== 200) raise(status, body as { error?: string; code?: string });
  const parsed = readWalletReconciliation(body);
  if (!parsed) {
    throw new ServiceError("unavailable", "The wallet comparison could not be read.");
  }
  return parsed;
}

/**
 * The two marketplaces are two accounts, not one pool with a flag.
 *
 * A Seller and a Builder hold separate wallets, separate orders and separate
 * purchased leads, because they are separate accounts in kkl-backend. The
 * role decides which session the adapter speaks as, and the database decides
 * what that session may read.
 */
export function backendLeadMarket(role: BackendRole): LeadMarketService {
  return {
    async list(query: LeadMarketQuery) {
      const { status, body } = await callAs<{ leads: BackendLead[] }>(
        role, "/v1/leads?eligible=true");
      if (status !== 200) raise(status, body);
      const mapped = body.leads.map(toMarketplaceLead);
      const areaName = body.leads.find((lead) => lead.locationId === query.areaId)?.locationName;
      const leads = filterMarketplace(mapped, areaName ? { ...query, areaId: areaName } : query);
      return {
        leads,
        total: leads.length,
        // The backend withholds unconsented leads from the eligible view and
        // says so per row; it does not yet return a count of what it left
        // out, and inventing one would be worse than the honest null.
        withheld: null,
        filterOptions: {
          areas: [...new Map(body.leads.filter((lead) => lead.locationId && lead.locationName).map((lead) => [lead.locationId, { id: lead.locationId as string, name: lead.locationName as string, label: lead.locationName as string }])).values()],
          budgetBands: [...new Set(body.leads.map((l) => l.budgetBand).filter(
            (b): b is string => b !== null))],
          configurations: [...new Set(body.leads.flatMap((l) => l.configurations))],
        },
      };
    },

    async get(id) {
      // kkl-backend has no single-lead route: a lead is a row in the list its
      // policy already scopes. Filtering here reads no more than the list did.
      const { status, body } = await callAs<{ leads: BackendLead[] }>(
        role, "/v1/leads?eligible=false");
      if (status !== 200) raise(status, body);
      const found = body.leads.find((l) => l.id === id);
      return found ? toDetail(found) : null;
    },

    async purchase(input): Promise<PurchaseOutcome> {
      const expected = purchaseExpectedFields({
        expectedPriceCredits: input.expectedPriceCredits ?? 0,
        expectedConfigurationVersion: input.expectedConfigurationVersion ?? null,
      });
      const { status, body } = await callAs<BackendOrder & { error?: string; code?: string; quote?: unknown }>(
        role, "/v1/orders", {
          method: "POST",
          body: {
            leadId: input.leadId,
            idempotencyKey: input.idempotencyKey,
            ...(expected ?? (Number.isSafeInteger(input.expectedPriceCredits) && (input.expectedPriceCredits ?? 0) > 0 ? { expectedPriceCredits: input.expectedPriceCredits } : {})),
          },
        });

      if (status === 201 || status === 200) {
        const order = await callAs<BackendOrder>(role, `/v1/orders/${body.id}`);
        const purchased = toPurchasedLead(order.body);
        if (!purchased) {
          return {
            kind: "deduction_failed",
            message: "The order completed but its contact details could not be read back.",
          };
        }
        return { kind: "purchased", lead: purchased, duplicate: body.duplicate === true };
      }

      // Each refusal maps to the outcome the approved screens already draw.
      // `deduction_failed` carries the backend's own sentence, because the
      // reason a purchase is unavailable — no price, no consent — is the
      // useful part and a generic failure message throws it away.
      const code = (body as { code?: string }).code;
      if (code === "insufficient_credits") {
        const wallet = await callAs<BackendWallet>(role, "/v1/wallet");
        return {
          kind: "insufficient_credits",
          priceCredits: 0,
          balanceCredits: wallet.body.balanceCredits,
        };
      }
      if (code === "lead_already_sold" || code === "lead_not_for_sale") return { kind: "already_sold" };
      if (code === "account_suspended") return { kind: "account_suspended" };
      if (code === "price_changed") {
        return {
          kind: "price_changed",
          message: (body as { error?: string }).error
            ?? "Review the price and pricing version now on that lead. Nothing was charged.",
          quote: readPriceChangedQuote(body),
        };
      }
      return {
        kind: "deduction_failed",
        message: (body as { error?: string }).error ?? "That purchase could not be completed.",
      };
    },

    async listPurchased() {
      const { status, body } = await callAs<{ orders: BackendOrder[] }>(role, "/v1/orders");
      if (status !== 200) raise(status, body);
      const completed = body.orders.filter((o) => o.status === "completed");
      const details = await Promise.all(
        completed.map((o) => callAs<BackendOrder>(role, `/v1/orders/${o.id}`)));
      return details
        .map((d) => toPurchasedLead(d.body))
        .filter((l): l is PurchasedLead => l !== null);
    },

    async getPurchased(id) {
      const { status, body } = await callAs<{ orders: BackendOrder[] }>(role, "/v1/orders");
      if (status !== 200) raise(status, body);
      const match = body.orders.find((o) => o.leadId === id && o.status === "completed");
      if (!match) return null;
      const detail = await callAs<BackendOrder>(role, `/v1/orders/${match.id}`);
      return toPurchasedLead(detail.body);
    },

    async listOrders() {
      const { status, body } = await callAs<{ orders: BackendOrder[] }>(role, "/v1/orders");
      if (status !== 200) raise(status, body);
      return body.orders.map((o) => toLeadOrder({ ...o, scope: undefined } as BackendOrder))
        .map((o) => ({ ...o, scope: role === "builder" ? ("builder" as const) : ("seller" as const) }));
    },

    async getOrder(reference) {
      const { status, body } = await callAs<BackendOrder>(role, `/v1/orders/${reference}`);
      if (status === 404) return null;
      if (status !== 200) raise(status, body);
      return {
        ...toLeadOrder(body),
        scope: role === "builder" ? "builder" : "seller",
      };
    },

    /**
     * CSV of the caller's own purchased leads, from kkl-backend.
     *
     * `POST /v1/orders/export` rather than a read: it writes one
     * `lead_contact.exported` audit entry naming the actor and the lead ids,
     * which is the record this route's comment said only the server could
     * keep. Access is the database's — `lead_contacts` releases a row only
     * to an account holding a completed order for that lead — so a lead id
     * belonging to somebody else comes back under `notAvailable` and never
     * in the file.
     *
     * No object storage is involved, here or in the route: the body is the
     * response.
     */
    async exportPurchased({ ids }) {
      const { status, body } = await callAs<BackendExport>(role, "/v1/orders/export", {
        method: "POST",
        body: ids && ids.length > 0 ? { leadIds: [...ids] } : {},
      });
      if (status !== 200) raise(status, body as { error?: string });
      return {
        filename: role === "builder"
          ? `kkl-builder-leads-${new Date().toISOString().slice(0, 10)}.csv`
          : purchasedLeadsFilename(),
        contentType: PURCHASED_EXPORT_CONTENT_TYPE,
        body: purchasedLeadsCsv(body.leads.map((lead) => ({
          leadId: lead.leadId,
          orderReference: lead.orderReference,
          purchasedAt: lead.purchasedAt,
          requirement: lead.requirement,
          area: lead.locationName,
          configuration: lead.propertyType,
          budgetBand: lead.budgetBand,
          // Null, not zero. The question-to-level mapping is not confirmed,
          // and a zero in this column would read as a scored lead.
          intentScore: lead.intentScore,
          name: lead.contact?.fullName ?? null,
          mobile: lead.contact?.phone ?? null,
          email: lead.contact?.email ?? null,
          // Free text from a qualification call that has not happened.
          bestTimeToCall: null,
          creditsPaid: lead.pricePaidCredits,
        }))),
      };
    },
  };
}

export function backendCredits(role: BackendRole): CreditService {
  return {
    async availability(): Promise<CommerceAvailability> {
      const { status, body } = await callAs<CommerceAvailability>(
        role, "/v1/commerce/availability");
      if (status !== 200) raise(status, body as { error?: string });
      return body;
    },

    async wallet(): Promise<WalletSummary> {
      const { status, body } = await callAs<BackendWallet>(role, "/v1/wallet");
      if (status !== 200) raise(status, body);
      return {
        balanceCredits: body.balanceCredits,
        // Null, not zero, for both. No expiry rule is configured (Q-1c), so
        // nobody can say how many credits are near expiry or past it — and a
        // zero would assert that none are.
        expiringSoonCredits: null,
        expiredCredits: null,
      };
    },

    async usageByMonth(): Promise<readonly UsageMonth[]> {
      const { status, body } = await callAs<BackendWallet>(role, "/v1/wallet");
      if (status !== 200) raise(status, body);
      const months = new Map<string, number>();
      for (const entry of body.entries) {
        if (entry.entryType !== "purchase") continue;
        const label = new Date(entry.at).toLocaleDateString("en-IN", {
          month: "short", year: "numeric",
        });
        months.set(label, (months.get(label) ?? 0) - entry.amountCredits);
      }
      return [...months].map(([label, spentInr]) => ({ label, spentInr }));
    },

    async ledger(filter): Promise<readonly LedgerEntry[]> {
      const { status, body } = await callAs<BackendWallet>(role, "/v1/wallet");
      if (status !== 200) raise(status, body);
      // The running balance is computed from the end, because the backend
      // returns newest first and the balance it reports is the current one.
      let running = body.balanceCredits;
      const entries: LedgerEntry[] = [];
      for (const entry of body.entries) {
        const balanceAfterCredits = running;
        running -= entry.amountCredits;
        if (filter?.type && entry.entryType !== filter.type) continue;
        entries.push({
          id: entry.id,
          type: entry.entryType === "purchase" ? "lead_purchase"
            : entry.entryType === "expiry" ? "credit_expired"
              : entry.entryType,
          occurredAt: entry.at,
          description: entry.reason ?? entry.entryType,
          deltaCredits: entry.amountCredits,
          balanceAfterCredits,
          // No expiry rule is configured (Q-1c), so no entry carries a date.
          expiresAt: null,
        });
      }
      return entries;
    },

    async recharge(): Promise<RechargeOutcome> {
      const { body } = await callAs<{ error?: string }>(role, "/v1/wallet/recharge", {
        method: "POST", body: {},
      });
      // Always this branch today. The message is the backend's, because it
      // names the provider and the dependency, and a generic "failed" would
      // send somebody looking for a bug instead of a credential.
      return {
        kind: "failed",
        message: body.error ?? "Recharge is unavailable.",
      };
    },

    async invoices(): Promise<readonly Invoice[]> {
      // No invoice has been issued, because no tax treatment is configured
      // (Q-1e). An empty list is the truth; the screens say why.
      return [];
    },

    async invoice(): Promise<InvoiceDetail | null> {
      return null;
    },
  };
}
