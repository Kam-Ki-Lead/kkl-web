import type { WalletReconciliation } from "@/lib/domain/commerce-display";

/**
 * The signed comparison from GET /v1/wallet/reconciliation.
 *
 * `balanced` means the reported balance and the ledger sum are the same
 * number. It does not apply an aging discount, an expiry, or a refund.
 */
export function WalletReconciliationNote({ row }: { row: WalletReconciliation }) {
  return (
    <p
      className="t-caption mt-[8px] text-muted"
      data-wallet-reconciliation={row.balanced ? "balanced" : "unbalanced"}
    >
      {row.balanced
        ? `Ledger sum matches this balance (${row.entryCount} ${row.entryCount === 1 ? "entry" : "entries"}). This comparison does not apply an aging discount, an expiry, or a refund.`
        : `Ledger sum ${row.ledgerSumCredits} does not match balance ${row.balanceCredits}.`}
    </p>
  );
}
