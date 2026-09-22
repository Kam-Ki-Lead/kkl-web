import type { Metadata } from "next";
import Link from "next/link";
import { SellerShell } from "@/components/seller/seller-shell";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { StateMessage } from "@/components/ui/states";
import { formatAreaPath, formatDate, formatExactInr } from "@/lib/format";
import { getServices } from "@/lib/services";

export const metadata: Metadata = { title: "My leads" };

/** S-12 — purchased leads, with the designed empty state. */
export default async function PurchasedLeadsPage() {
  const leads = await getServices().leadMarket.listPurchased();

  return (
    <SellerShell title="My leads" subtitle="Leads you have purchased">
      <div className="flex flex-col gap-[16px]">
        <div className="flex flex-wrap items-center justify-between gap-[12px]">
          <p className="text-[16px] font-bold text-ink">
            {leads.length} purchased {leads.length === 1 ? "lead" : "leads"}
          </p>
          {leads.length > 0 ? (
            <ButtonLink href="/seller/purchased/export.csv" variant="secondary" prefetch={false}>
              Download CSV
            </ButtonLink>
          ) : null}
        </div>

        {leads.length === 0 ? (
          <StateMessage
            title="You have not bought any leads yet"
            action={<ButtonLink href="/seller/leads">Browse the marketplace</ButtonLink>}
          >
            Purchased leads appear here with full contact details and stay available to download.
          </StateMessage>
        ) : (
          <ul className="flex flex-col gap-[12px]">
            {leads.map((lead) => (
              <li key={lead.id}>
                <Card className="p-[18px]">
                  <div className="flex flex-wrap items-start justify-between gap-[12px]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-[10px]">
                        <p className="t-mono text-[13px] text-muted">{lead.id}</p>
                        <Chip tone="success">Purchased</Chip>
                      </div>
                      <h2 className="t-card-title mt-[3px] text-ink">
                        <Link
                          href={`/seller/purchased/${lead.id}`}
                          className="underline-offset-2 hover:underline"
                        >
                          {lead.requirement}
                        </Link>
                      </h2>
                      <p className="t-caption mt-[1px] text-muted">
                        {formatAreaPath(lead.locationPath)} · bought{" "}
                        {formatDate(lead.purchasedAt)} · {lead.orderId}
                      </p>
                      <p className="mt-[8px] text-[15px] text-ink">
                        {lead.contact.name} ·{" "}
                        <span className="t-mono">{lead.contact.phone}</span>
                      </p>
                    </div>
                    <div className="flex-none text-right">
                      <p className="t-card-title text-ink">
                        {formatExactInr(lead.pricePaidCredits)}
                      </p>
                      <p className="t-caption text-muted">credits paid</p>
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SellerShell>
  );
}
