import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { ButtonLink } from "@/components/ui/button";
import { formatExactInr, formatSignedInr } from "@/lib/format";
import { getServices } from "@/lib/services";

export const metadata: Metadata = { title: "Wallets & credits", robots: { index: false } };

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

/**
 * A-18 — balances and ledgers by account.
 *
 * Two of these balances are **derived** from the console's own entry chain
 * rather than stored a second time here. That is the only way a staff screen
 * and a user's own billing page can be guaranteed to agree: there is one
 * number, computed the same way, in one place.
 */
export default async function AdminWalletsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const admin = getServices().admin;
  const wallets = await admin.listWallets();
  const selected = one(params.account) || wallets[0]?.accountId || "";
  const ledger = await admin.walletLedger(selected);
  const adjusted = one(params.adjusted);
  const current = wallets.find((w) => w.accountId === selected);

  return (
    <AdminShell title="Wallets & credits" subtitle="Balances and ledgers by account">
      <div className="flex max-w-[900px] flex-col gap-[16px]">
        {adjusted ? (
          <Card className="border-[#BFE0CE] bg-chip-success-bg p-[16px]">
            <h2 className="t-card-title text-success">Adjustment recorded</h2>
            <p className="t-body mt-[4px] text-body">
              Audit entry <span className="t-mono">{adjusted}</span>. The entry is in the
              account&rsquo;s own ledger with your reason attached, so it appears in their billing
              history too.
            </p>
          </Card>
        ) : null}

        <div className="grid grid-cols-3 gap-[14px] max-[900px]:grid-cols-1">
          {wallets.map((wallet) => {
            const active = wallet.accountId === selected;
            return (
              <Link key={wallet.accountId} href={`/admin/wallets?account=${wallet.accountId}`}>
                <Card
                  className={`p-[18px] transition-[border-color] duration-150 hover:border-brand ${
                    active ? "border-brand bg-tint" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-[10px]">
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold text-ink">{wallet.name}</p>
                      {/* The approved wallet card sets the account reference in
                          14px Public Sans. */}
                      <p className="text-[14px] text-muted">{wallet.accountId}</p>
                    </div>
                    {wallet.frozen ? <Chip tone="warning">Frozen</Chip> : null}
                  </div>
                  {/* The approved A-18 row sets the balance at 19px/800. */}
                  <p
                    className={`mt-[10px] font-[family-name:var(--font-heading)] text-[19px] font-extrabold ${wallet.frozen ? "text-warning" : "text-ink"}`}
                  >
                    {formatExactInr(wallet.balanceInr)}
                  </p>
                  <p className="t-caption mt-[2px] text-muted">{wallet.note}</p>
                </Card>
              </Link>
            );
          })}
        </div>

        <Card className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-[12px] border-b border-line px-[18px] py-[14px]">
            <h2 className="t-card-title text-ink">
              Ledger · {current?.name ?? selected}
            </h2>
            <ButtonLink href={`/admin/wallets/${selected}/adjust`} size="sm">
              Adjust balance
            </ButtonLink>
          </div>

          {ledger.length === 0 ? (
            <p className="t-body px-[18px] py-[20px] text-body">
              No entries. This account has no console in this build, so its ledger is not
              modelled — an adjustment made here is recorded in the audit log and nowhere else.
            </p>
          ) : (
            <ul>
              {ledger.map((row) => (
                <li
                  key={row.reference}
                  className="flex flex-wrap items-center justify-between gap-[12px] border-b border-[#EDEFF6] px-[18px] py-[13px] last:border-b-0"
                >
                  <span className="min-w-0">
                    <span className="block text-[15px] text-ink">{row.what}</span>
                    <span className="t-mono block text-[13px] text-muted">{row.reference}</span>
                  </span>
                  <span className="flex flex-none items-baseline gap-[16px]">
                    <span
                      className={`font-[family-name:var(--font-heading)] text-[15px] font-extrabold ${row.deltaInr < 0 ? "text-danger" : "text-success"}`}
                    >
                      {formatSignedInr(row.deltaInr)}
                    </span>
                    <span className="t-caption w-[86px] text-right text-muted">
                      {formatExactInr(row.balanceAfterInr)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <p className="t-caption text-muted">
          The balance is the last entry&rsquo;s running total, not a stored figure — the same
          derivation the account&rsquo;s own billing screen uses, so the two cannot drift. No money
          exists behind any of it.
        </p>
      </div>
    </AdminShell>
  );
}
