import type { Metadata } from "next";
import Link from "next/link";
import { SellerShell } from "@/components/seller/seller-shell";
import { StatTiles } from "@/components/console/stat-tiles";
import { LeadRow } from "@/components/console/lead-card";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { DECISIONS } from "@/lib/config/business-rules";
import { formatCreditBalance, formatDate, formatExactInr } from "@/lib/format";
import { getServices } from "@/lib/services";
import { SellerSampleNotice } from "@/components/seller/sample-notice";

export const metadata: Metadata = { title: "Seller dashboard" };

/** S-06 — Seller dashboard. */
export default async function SellerDashboardPage() {
  const services = getServices();
  const [wallet, market, saleMarket, purchased, ledger] = await Promise.all([
    services.credits.wallet(),
    services.leadMarket.list({}),
    services.leadMarket.list({ onSaleOnly: true }),
    services.leadMarket.listPurchased(),
    services.credits.ledger(),
  ]);

  return (
    <SellerShell title="Dashboard" subtitle="Leads, credits and recent activity">
      <div className="flex flex-col gap-[18px]">
        <StatTiles
          tiles={[
            {
              value: String(market.total),
              label: market.total === 1 ? "New lead today" : "New leads today",
              note: "In your areas",
            },
            {
              value: String(purchased.length),
              label: purchased.length === 1 ? "Lead purchased" : "Leads purchased",
              note: "This month",
            },
            {
              value: formatExactInr(wallet.balanceCredits),
              label: "Credit balance",
              // Plain caption text, not a PendingRule chip: a chip here wraps to
              // two lines and makes this tile taller than the three beside it.
              // The rule is still named, and the Credits card carries it too.
              note: DECISIONS["D-04"].pendingCopy,
            },
            {
              value: String(saleMarket.total),
              label: saleMarket.total === 1 ? "Sale-tab lead" : "Sale-tab leads",
              note: "Aged, discounted 20%",
            },
          ]}
        />

        <div className="grid grid-cols-[minmax(0,1fr)_380px] gap-[18px] max-[1200px]:grid-cols-1">
          <Card className="p-[18px]">
            <div className="flex flex-wrap items-center justify-between gap-[10px]">
              <h2 className="t-heading text-ink">New leads matching your areas</h2>
              <Link
                href="/seller/leads"
                className="text-[15px] font-bold text-brand underline underline-offset-2"
              >
                Open marketplace →
              </Link>
            </div>
            {market.leads.length === 0 ? (
              <p className="t-body mt-[12px] text-body">
                No leads are listed in your areas right now. Widening the areas on your profile
                brings more through.
              </p>
            ) : (
              <ul className="mt-[14px] flex flex-col gap-[10px]">
                {market.leads.slice(0, 3).map((lead) => (
                  <li key={lead.id}>
                    <LeadRow lead={lead} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div className="flex flex-col gap-[18px]">
            <Card className="p-[18px]">
              <h2 className="t-card-title text-ink">Credits</h2>
              <p className="t-title mt-[4px] text-ink">
                {formatCreditBalance(wallet.balanceCredits)}
              </p>
              <p className="t-caption mt-[2px] text-muted">
                {DECISIONS["D-04"].pendingCopy}
              </p>
              <ButtonLink href="/seller/billing/recharge" className="mt-[14px] w-full">
                Recharge credits
              </ButtonLink>
            </Card>

            <Card className="p-[18px]">
              <h2 className="t-card-title text-ink">Recent activity</h2>
              {ledger.length === 0 ? (
                <p className="t-body mt-[8px] text-body">Nothing has happened on this account yet.</p>
              ) : (
                <ul className="mt-[10px] flex flex-col">
                  {ledger.slice(0, 3).map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-baseline justify-between gap-[10px] border-b border-line py-[9px] last:border-b-0 last:pb-0"
                    >
                      <span className="text-[15px] text-ink">{entry.description}</span>
                      <span className="t-caption flex-none text-muted">
                        {formatDate(entry.occurredAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>

        <SellerSampleNotice />
      </div>
    </SellerShell>
  );
}
