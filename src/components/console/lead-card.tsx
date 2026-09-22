import Link from "next/link";
import type { MarketplaceLead } from "@/lib/domain/types";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { MaskedValue } from "@/components/ui/chip";
import { formatAreaPath, formatExactInr } from "@/lib/format";

/**
 * C-06's lead card — the marketplace listing for an unpurchased lead (S-07).
 *
 * The contact line is a **content state, not a blur.** `MarketplaceLead` has no
 * name, phone or email field, so the values are absent from the response, the
 * HTML and the client bundle. There is nothing here to un-hide with a
 * stylesheet, a devtools inspection or a network tab. What renders is the
 * placeholder string the server composed, and how much that string may reveal is
 * kkl-backend's disclosure policy, not this component's.
 */
export function LeadCard({
  lead,
  basePath = "/seller/leads",
}: {
  lead: MarketplaceLead;
  /** Where this card's links point — the Seller and Builder marketplaces differ. */
  basePath?: string;
}) {
  const onSale = lead.status === "on_sale";

  return (
    <Card className="flex flex-col p-[18px]">
      <div className="flex items-start justify-between gap-[14px]">
        <div className="min-w-0">
          <p className="t-mono text-[13px] text-muted">{lead.id}</p>
          <h3 className="t-card-title mt-[2px] text-ink">{lead.requirement}</h3>
          <p className="t-caption mt-[1px] text-muted">
            {formatAreaPath(lead.locationPath)}
          </p>
        </div>
        <div className="flex-none text-right">
          {onSale ? (
            <p className="t-caption font-bold text-warning">Sale · aged {lead.ageDays} days</p>
          ) : null}
          <p className="t-card-title text-ink">{formatExactInr(lead.priceCredits)}</p>
          {lead.originalPriceCredits !== null ? (
            <p className="t-caption text-muted line-through">
              {formatExactInr(lead.originalPriceCredits)}
            </p>
          ) : null}
        </div>
      </div>

      <dl className="mt-[14px] grid grid-cols-4 gap-[8px] max-[720px]:grid-cols-2">
        <Fact label="Budget" value={lead.budgetBand} />
        <Fact label="Configuration" value={lead.configuration} />
        <Fact label="Intent score" value={`${lead.intentScore}/100`} />
        <Fact label="Age" value={lead.ageDays === 1 ? "1 day" : `${lead.ageDays} days`} />
      </dl>

      <p className="mt-[12px] rounded-[8px] bg-tint px-[13px] py-[10px] text-[14px] text-muted">
        Contact hidden until purchase · <MaskedValue>{lead.contactMask}</MaskedValue>
      </p>

      <div className="mt-[14px] grid grid-cols-2 gap-[10px] max-[480px]:grid-cols-1">
        <ButtonLink href={`${basePath}/${lead.id}`} variant="secondary">
          View lead
        </ButtonLink>
        <ButtonLink href={`${basePath}/${lead.id}/buy`}>
          Buy for {formatExactInr(lead.priceCredits)}
        </ButtonLink>
      </div>
    </Card>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] border border-line bg-tint px-[11px] py-[9px]">
      <dt className="t-caption text-muted">{label}</dt>
      <dd className="mt-[1px] text-[14px] font-bold text-ink">{value}</dd>
    </div>
  );
}

/** The compact row used on the dashboard's "new leads" list. */
export function LeadRow({
  lead,
  basePath = "/seller/leads",
}: {
  lead: MarketplaceLead;
  basePath?: string;
}) {
  return (
    <Link
      href={`${basePath}/${lead.id}`}
      className="flex items-center justify-between gap-[12px] rounded-[8px] bg-tint px-[14px] py-[12px] transition-[background-color] duration-150 hover:bg-[#EEF2FD]"
    >
      <span className="min-w-0">
        <span className="block text-[15px] font-bold text-ink">{lead.requirement}</span>
        <span className="t-caption block text-muted">
          {formatAreaPath(lead.locationPath)} · score {lead.intentScore}
        </span>
      </span>
      <span className="t-card-title flex-none text-brand">
        {formatExactInr(lead.priceCredits)}
      </span>
    </Link>
  );
}
