import type { Metadata } from "next";
import { SellerShell } from "@/components/seller/seller-shell";
import { UsageChart } from "@/components/console/usage-chart";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { formatCreditBalance, formatDate, formatSignedInr } from "@/lib/format";
import { getServices } from "@/lib/services";
import { DECISIONS } from "@/lib/config/business-rules";

export const metadata: Metadata = { title: "Billing & credits" };

/** S-14 — credits, usage and recent transactions. */
export default async function BillingPage() {
  const services = getServices();
  const [wallet, usage, ledger] = await Promise.all([
    services.credits.wallet(),
    services.credits.usageByMonth(),
    services.credits.ledger(),
  ]);

  const spentThisMonth = usage[usage.length - 1]?.spentInr ?? 0;

  return (
    <SellerShell title="Billing & credits" subtitle="Balance, usage and transactions">
      <div className="flex flex-col gap-[18px]">
        <div className="grid grid-cols-[minmax(0,1fr)_380px] gap-[18px] max-[1200px]:grid-cols-1">
          <Card className="p-[22px]">
            <p className="t-caption text-muted">Available balance</p>
            <p className="t-title mt-[2px] text-ink">
              {formatCreditBalance(wallet.balanceCredits)}
            </p>
            <p className="t-body mt-[6px] text-body">
              1 rupee = 1 credit. Credits are deducted when a lead purchase succeeds.
            </p>
            <div className="mt-[16px] flex flex-wrap gap-[10px]">
              <ButtonLink href="/seller/billing/recharge">Recharge credits</ButtonLink>
              <ButtonLink href="/seller/billing/history" variant="secondary">
                Transaction history
              </ButtonLink>
            </div>
          </Card>

          {/* D-04. The panel says what is undecided rather than showing a date or
              a countdown that nobody has agreed. */}
          <Card className="border-[#F3DFB4] bg-[#FFF7E8] p-[22px]">
            <h2 className="t-card-title text-ink">Expiry &amp; renewal</h2>
            <p className="t-body mt-[6px] text-body">
              The specification says credits expire, but the period, the renewal route and whether
              expired credits can be restored are not decided. Nothing is shown to sellers until
              they are.
            </p>
            <ButtonLink href="/seller/billing/expiry" variant="secondary" className="mt-[14px]">
              See the proposed states
            </ButtonLink>
            <p className="t-caption mt-[10px] text-muted">{DECISIONS["D-04"].question} — D-04</p>
          </Card>
        </div>

        <Card className="p-[22px]">
          <div className="flex flex-wrap items-baseline justify-between gap-[10px]">
            <h2 className="t-card-title text-ink">Usage this month</h2>
            <p className="t-caption text-muted">
              {formatCreditBalance(spentThisMonth)} spent · six months shown
            </p>
          </div>
          <div className="mt-[16px]">
            <UsageChart months={usage} />
          </div>
        </Card>

        <Card className="overflow-hidden">
          <h2 className="t-card-title border-b border-line px-[22px] py-[16px] text-ink">
            Recent transactions
          </h2>
          {ledger.length === 0 ? (
            <p className="t-body px-[22px] py-[18px] text-body">
              No transactions yet. A recharge or a lead purchase appears here as a ledger entry.
            </p>
          ) : (
            <ul>
              {ledger.slice(0, 3).map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-wrap items-baseline justify-between gap-[10px] border-b border-line px-[22px] py-[14px] last:border-b-0"
                >
                  <span>
                    <span className="block text-[15px] font-bold text-ink">
                      {entry.description}
                    </span>
                    <span className="t-caption block text-muted">
                      {formatDate(entry.occurredAt)} ·{" "}
                      <span className="t-mono">{entry.id}</span>
                    </span>
                  </span>
                  <span
                    className={`text-[15px] font-bold ${
                      entry.deltaCredits < 0 ? "text-danger" : "text-success"
                    }`}
                  >
                    {formatSignedInr(entry.deltaCredits)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </SellerShell>
  );
}
