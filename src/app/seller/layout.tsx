import type { ReactNode } from "react";

/**
 * The Seller console renders per-request state, so nothing under it is
 * prerendered.
 *
 * Balance, purchased leads, ledger entries and tickets all change during a
 * session. A build-time snapshot would show a Seller their balance before their
 * own purchase — the same defect the Buyer account area had.
 *
 * Once kkl-backend serves these screens they are per-account as well as
 * per-request, which rules out static rendering for a second reason.
 */
export const dynamic = "force-dynamic";

export default function SellerLayout({ children }: { children: ReactNode }) {
  return children;
}
