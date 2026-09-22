import type { Metadata } from "next";
import Link from "next/link";
import { BuilderShell } from "@/components/builder/builder-shell";
import { LeadCard } from "@/components/console/lead-card";
import { LeadFilters } from "@/components/console/lead-filters";
import { ButtonLink } from "@/components/ui/button";
import { PendingRule, StateMessage } from "@/components/ui/states";
import { DECISIONS } from "@/lib/config/business-rules";
import { getServices } from "@/lib/services";
import type { LeadSort } from "@/lib/services/contracts";

export const metadata: Metadata = { title: "Lead marketplace" };

const SORTS: readonly { value: LeadSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price", label: "Price" },
  { value: "score", label: "Score" },
];

function one(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

/**
 * B-20 — the lead marketplace under Builder access.
 *
 * Same interface and the same components as the Seller's S-07, over the
 * Builder's own lead pool, credits and purchases. The two accounts do not share
 * a marketplace: a lead this Builder buys is not removed from the Seller's list
 * and vice versa, because they are separate pools.
 */
export default async function BuilderMarketplacePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawSort = one(params.sort);
  const sort: LeadSort = rawSort === "price" || rawSort === "score" ? rawSort : "newest";
  const onSaleOnly = one(params.tab) === "sale";

  const page = await getServices().builder.leadMarket.list({
    area: one(params.area),
    budgetBand: one(params.budget),
    configuration: one(params.config),
    minScore: one(params.score) ? Number(one(params.score)) : undefined,
    sort,
    onSaleOnly,
  });

  const tabHref = (tab: "all" | "sale") => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      const value = one(v);
      if (value && k !== "tab") next.set(k, value);
    }
    if (tab === "sale") next.set("tab", "sale");
    const qs = next.toString();
    return qs ? `/builder/marketplace?${qs}` : "/builder/marketplace";
  };

  return (
    <BuilderShell title="Lead marketplace" subtitle="Qualified buyer leads · Builder access">
      <div className="flex flex-col gap-[16px]">
        <div role="tablist" aria-label="Lead set" className="flex gap-[22px] border-b border-line">
          {[
            { href: tabHref("all"), label: "All leads", active: !onSaleOnly },
            { href: tabHref("sale"), label: "Sale · aged leads", active: onSaleOnly },
          ].map((t) => (
            <Link
              key={t.label}
              href={t.href}
              aria-current={t.active ? "page" : undefined}
              className={`-mb-px border-b-[3px] pb-[10px] text-[16px] transition-[color,border-color] duration-150 ${
                t.active
                  ? "border-brand font-bold text-brand"
                  : "border-transparent font-medium text-muted hover:text-ink"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>

        <LeadFilters options={page.filterOptions} action="/builder/marketplace" />

        <div>
          <p className="text-[16px] font-bold text-ink">
            {page.total} {page.total === 1 ? "lead" : "leads"} ·{" "}
            {onSaleOnly ? "aged leads only" : "fresh and aged leads"}
          </p>
          <p className="t-caption mt-[6px]">
            <PendingRule>{DECISIONS["D-03"].pendingCopy}</PendingRule>
          </p>
        </div>

        <form
          method="GET"
          action="/builder/marketplace"
          className="flex flex-wrap items-center gap-[10px]"
        >
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
            action={<ButtonLink href="/builder/marketplace">Clear filters</ButtonLink>}
          >
            Nothing in the marketplace matches what you have set. Clearing the filters shows
            everything available to this account.
          </StateMessage>
        ) : (
          <div className="grid grid-cols-2 gap-[14px] max-[1200px]:grid-cols-1">
            {page.leads.map((lead) => (
              <LeadCard key={lead.id} lead={lead} basePath="/builder/marketplace" />
            ))}
          </div>
        )}
      </div>
    </BuilderShell>
  );
}
