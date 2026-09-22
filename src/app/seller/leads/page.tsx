import type { Metadata } from "next";
import Link from "next/link";
import { SellerShell } from "@/components/seller/seller-shell";
import { LeadCard } from "@/components/seller/lead-card";
import { LeadFilters } from "@/components/seller/lead-filters";
import { StateMessage } from "@/components/ui/states";
import { ButtonLink } from "@/components/ui/button";
import { PendingRule } from "@/components/ui/states";
import { DECISIONS } from "@/lib/config/business-rules";
import { getServices } from "@/lib/services";
import type { LeadSort } from "@/lib/services/contracts";

export const metadata: Metadata = { title: "Lead marketplace" };

const SORTS: readonly { value: LeadSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price", label: "Price" },
  { value: "score", label: "Score" },
];

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/**
 * S-07 — lead marketplace.
 *
 * Filters, sort and the Sale tab all live in the URL, so Back works, a filtered
 * view can be shared, and a reload does not reset the browse. The list itself is
 * filtered by the service, not in the browser: filtering client-side would mean
 * shipping every lead to every Seller and then hiding some, which is exactly the
 * mistake the masking rule exists to prevent.
 */
export default async function LeadMarketplacePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawSort = one(params.sort);
  const sort: LeadSort =
    rawSort === "price" || rawSort === "score" ? rawSort : "newest";
  const onSaleOnly = one(params.tab) === "sale";

  const query = {
    area: one(params.area),
    budgetBand: one(params.budget),
    configuration: one(params.config),
    minScore: one(params.score) ? Number(one(params.score)) : undefined,
    sort,
    onSaleOnly,
  };

  const page = await getServices().leadMarket.list(query);

  const tabHref = (tab: "all" | "sale") => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      const value = one(v);
      if (value && k !== "tab") next.set(k, value);
    }
    if (tab === "sale") next.set("tab", "sale");
    const qs = next.toString();
    return qs ? `/seller/leads?${qs}` : "/seller/leads";
  };

  return (
    <SellerShell title="Lead marketplace" subtitle="Qualified buyer leads in your areas">
      <div className="flex flex-col gap-[16px]">
        <div role="tablist" aria-label="Lead set" className="flex gap-[22px] border-b border-line">
          <TabLink href={tabHref("all")} active={!onSaleOnly}>
            All leads
          </TabLink>
          <TabLink href={tabHref("sale")} active={onSaleOnly}>
            Sale · aged leads
          </TabLink>
        </div>

        <LeadFilters options={page.filterOptions} />

        <div>
          <p className="text-[16px] font-bold text-ink">
            {page.total} {page.total === 1 ? "lead" : "leads"} ·{" "}
            {onSaleOnly ? "aged leads only" : "fresh and aged leads"}
          </p>
          {page.withheld ? (
            <p className="t-caption mt-[3px] text-muted">
              {page.withheld.count} qualified{" "}
              {page.withheld.count === 1 ? "lead is" : "leads are"} withheld — {page.withheld.reason}
            </p>
          ) : null}
          <p className="t-caption mt-[6px]">
            <PendingRule>{DECISIONS["D-03"].pendingCopy}</PendingRule>
          </p>
        </div>

        <form method="GET" action="/seller/leads" className="flex flex-wrap items-center gap-[10px]">
          {Object.entries(params).map(([k, v]) => {
            const value = one(v);
            return value && k !== "sort" ? (
              <input key={k} type="hidden" name={k} value={value} />
            ) : null;
          })}
          <span className="t-label text-ink">Sort</span>
          {SORTS.map((option) => (
            <button
              key={option.value}
              type="submit"
              name="sort"
              value={option.value}
              aria-pressed={sort === option.value}
              className={`min-h-[36px] rounded-[8px] border-[1.5px] px-[13px] text-[14px] font-semibold transition-[background-color,border-color,color] duration-150 ${
                sort === option.value
                  ? "border-brand bg-chip-neutral-bg text-brand"
                  : "border-line bg-white text-body hover:border-[#C3C9DA]"
              }`}
            >
              {option.label}
            </button>
          ))}
        </form>

        {page.leads.length === 0 ? (
          <StateMessage
            title="No leads match these filters"
            action={<ButtonLink href="/seller/leads">Clear filters</ButtonLink>}
          >
            {onSaleOnly
              ? "No aged leads are on the Sale tab right now. All leads are still listed at full price."
              : "Nothing in the marketplace matches the area, budget, configuration and score you have set. Clearing them shows everything available."}
          </StateMessage>
        ) : (
          <div className="grid grid-cols-2 gap-[14px] max-[1200px]:grid-cols-1">
            {page.leads.map((lead) => (
              <LeadCard key={lead.id} lead={lead} />
            ))}
          </div>
        )}
      </div>
    </SellerShell>
  );
}

function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`-mb-px border-b-[3px] pb-[10px] text-[16px] transition-[color,border-color] duration-150 ${
        active
          ? "border-brand font-bold text-brand"
          : "border-transparent font-medium text-muted hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}
