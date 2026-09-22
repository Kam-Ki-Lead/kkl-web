import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdjustmentForm } from "@/components/admin/adjustment-form";
import { Card } from "@/components/ui/card";
import { formatExactInr } from "@/lib/format";
import { getServices } from "@/lib/services";

export const metadata: Metadata = { title: "Credit adjustment", robots: { index: false } };

/**
 * A-19 — a credit adjustment, recorded as an auditable transaction.
 *
 * Two gates, both in the store rather than this form: a whole number of at
 * least one credit, and a written reason. What the store then does is post a
 * **ledger entry**, not set a balance — the reason travels with the entry, so
 * the account holder sees it in their own billing history and nobody has to
 * ask this console what happened.
 */
export default async function AdminAdjustPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = getServices().admin;
  const [account, wallets] = await Promise.all([admin.getAccount(id), admin.listWallets()]);
  if (!account) notFound();

  const wallet = wallets.find((w) => w.accountId === id);

  return (
    <AdminShell title="Credit adjustment" subtitle="Recorded as an auditable transaction">
      <div className="flex max-w-[640px] flex-col gap-[16px]">
        <Link
          href={`/admin/wallets?account=${id}`}
          className="t-caption text-brand underline underline-offset-2"
        >
          ← {account.name}&rsquo;s ledger
        </Link>

        <Card className="p-[18px]">
          <p className="t-caption text-muted">Adjusting</p>
          <h2 className="t-heading mt-[2px] text-ink">{account.name}</h2>
          <p className="t-body text-body">
            {account.organisation} · <span className="t-mono text-[13px]">{account.accountId}</span>
          </p>
          <p className="t-title mt-[12px] text-ink">
            {wallet ? formatExactInr(wallet.balanceInr) : "—"}
            <span className="t-caption ml-[8px] font-normal text-muted">current balance</span>
          </p>
        </Card>

        <AdjustmentForm
          accountId={account.accountId}
          currentBalanceInr={wallet?.balanceInr ?? 0}
          live={account.liveConsole !== null}
        />

        <Card className="p-[16px]">
          <h2 className="t-card-title text-ink">What an adjustment is, and is not</h2>
          <ul className="t-body mt-[8px] flex list-disc flex-col gap-[4px] pl-[20px] text-body">
            <li>
              It posts a ledger entry. It does not set a balance — the balance is derived from the
              entries, so there is nothing to set.
            </li>
            <li>
              The reason is mandatory and travels with the entry. The account holder sees it in
              their own billing history, not just in the audit log.
            </li>
            <li>
              It moves no money. There is no payment, no gateway and no reconciliation with
              anything outside this process.
            </li>
            <li>
              It is not a refund. Refunds are decided on their own screen, and whether one returns
              credits or reverses a payment is undecided (<strong>D-06</strong>).
            </li>
          </ul>
        </Card>
      </div>
    </AdminShell>
  );
}
