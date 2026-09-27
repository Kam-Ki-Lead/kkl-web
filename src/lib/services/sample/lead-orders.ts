import type { LeadOrder, PurchasedLead } from "@/lib/domain/types";

/**
 * CR04 — the order projection, shared by both marketplaces.
 *
 * The Seller and Builder lead pools are separate, but an order is the same
 * object in both: what was bought, what paid for it, and whether a document
 * exists. Written once so the two cannot drift — the same argument that put the
 * area labels in one place in CR05.
 *
 * Derived from the purchased lead rather than stored beside it. A lead purchase
 * already writes the released lead, carrying its order reference, and a ledger
 * entry whose id *is* that reference. An order is the join of those two, so
 * deriving it cannot disagree with them. A third stored copy could, and this
 * codebase has already been bitten once by a balance held next to the ledger
 * that produced it.
 */
export function projectOrder(
  lead: PurchasedLead,
  scope: "seller" | "builder",
  ledgerReference: string | null,
): LeadOrder {
  return {
    reference: lead.orderId,
    status: "paid",
    placedAt: lead.purchasedAt,
    leadId: lead.id,
    itemLabel: `${lead.configuration} · ${lead.budgetBand}`,
    locationPath: lead.locationPath,
    payment: {
      method: "wallet_credits",
      label: "Wallet credits",
      ledgerReference: ledgerReference ?? lead.orderId,
      amountCredits: lead.pricePaidCredits,
    },
    // Stated, not implied. The taxable event was the recharge that funded the
    // wallet; whether a per-order document is issued, and how it is taxed, are
    // open decisions. A "Download invoice" button leading nowhere, or an invoice
    // carrying a ₹0 tax line, would each answer a question nobody has answered.
    invoice: {
      kind: "not_issued",
      reason:
        "Settled from wallet credits. The recharge that funded it carries its own invoice; whether a separate document is issued per lead order, and how it is taxed, is not yet decided.",
    },
    scope,
  };
}

/**
 * Failed attempts are deliberately absent from order history. Nothing was
 * deducted and nothing was released, so there is no order — the failure is a
 * screen, not a record. Rows for things somebody never bought would be worse
 * than no rows at all.
 */
export const ORDERS_EXCLUDE_FAILED_ATTEMPTS = true;
