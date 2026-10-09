"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { countMatchingProperties } from "@/app/actions/search-count";
import { AreaPicker, type AreaOption } from "@/components/location/area-picker";
import type { PropertyTransaction } from "@/lib/domain/types";
import {
  propertySearchFilters,
  propertySearchHref,
  TRANSACTION_OPTIONS,
} from "@/lib/domain/property-search-query";

/**
 * The homepage search card (P-01): the primary action on the page.
 *
 * ONE SECTION, NOT TWO TABS
 *
 * It used to split into "Projects" and "Buy/Rent", which were not two views
 * of one search — they searched different things, properties and leads, and
 * the tab strip made that look like a filter. Buy and rent are a property's
 * transaction, so they belong in a dropdown inside one search, which is what
 * this is.
 *
 * Lead discovery did not disappear with the tab: "Buy Leads" in the
 * navigation and the Featured Leads row both open the lead marketplace.
 *
 * "Results update as you change a field" is literal — the count comes from
 * the service on every change, not from a guess in the browser.
 *
 * Property types are the approved sample set; the full list is an open client
 * decision (D-09), so this does not present itself as exhaustive.
 */

/** The label that means no budget preference. */
const ANY_BUDGET = "Any budget";

const BUDGETS: ReadonlyArray<{ label: string; maxInr?: number; minInr?: number }> = [
  { label: ANY_BUDGET },
  { label: "Up to ₹50L", maxInr: 5_000_000 },
  { label: "Up to ₹1Cr", maxInr: 10_000_000 },
  { label: "Up to ₹1.5Cr", maxInr: 15_000_000 },
  { label: "₹1.5Cr and above", minInr: 15_000_000 },
];

const CONFIGURATIONS = ["Any BHK", "1 BHK", "2 BHK", "3 BHK", "4 BHK"];

export function HomeSearchCard({
  areas,
  initialCount,
}: {
  /** Every area in the launch city, from the location service (CR05). */
  areas: readonly AreaOption[];
  initialCount: number;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [locality, setLocality] = useState("");
  const [transaction, setTransaction] = useState<"" | PropertyTransaction>("");
  const [configuration, setConfiguration] = useState("");
  const [budgetLabel, setBudgetLabel] = useState(BUDGETS[0]?.label as string);
  const [count, setCount] = useState(initialCount);

  const budget = BUDGETS.find((b) => b.label === budgetLabel);

  // Every field on the card is in this object, and every field in this object
  // is one the search honours. That is the invariant the card lost when it
  // carried a "Search type" box that read like a control and filtered
  // nothing.
  const filters = useMemo(
    () => propertySearchFilters({
      locality,
      transaction,
      bhk: configuration,
      budget: { min: budget?.minInr, max: budget?.maxInr },
    }),
    [locality, transaction, configuration, budget?.minInr, budget?.maxInr],
  );

  useEffect(() => {
    let cancelled = false;
    countMatchingProperties(filters)
      .then((next) => {
        if (!cancelled) setCount(next);
      })
      .catch(() => {
        /* Leave the previous count rather than showing a wrong one. */
      });
    return () => {
      cancelled = true;
    };
  }, [filters]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    // Same module the results page reads, so the card cannot send a field
    // the search does not honour.
    const href = propertySearchHref({
      locality,
      transaction,
      bhk: configuration,
      budget: budgetLabel,
      anyBudgetLabel: ANY_BUDGET,
    });
    startTransition(() => router.push(href));
  }

  return (
    <form
      action="/search"
      method="get"
      onSubmit={submit}
      className="relative z-10 mx-[20px] mt-[16px] rounded-[10px] border border-line bg-white p-[20px] shadow-[0_8px_28px_rgba(16,26,64,0.10)] max-[900px]:mx-0 max-[900px]:mt-[16px]"
    >
      {/* Narrow screens get Location full width, then BHK and Budget paired, with
          property type behind a disclosure — four selects side by side does not
          survive a phone, and the approved mobile layout moves it out of the way. */}
      <div className="grid grid-cols-4 gap-[12px] max-[900px]:grid-cols-2">
        <div className="flex flex-col gap-[6px] max-[900px]:col-span-2">
          <label htmlFor="home-locality" className="t-label text-body">
            Location
          </label>
          {/* Searchable over every area in the launch city (CR05); submits the
              record id. Empty means all of Kolkata. */}
          <AreaPicker
            id="home-locality"
            name="locality"
            areas={areas}
            value={locality}
            allLabel="All of Kolkata"
            onSelect={setLocality}
          />
        </div>
        <SearchField
          id="home-transaction"
          name="transaction"
          label="Buy or rent"
          value={transaction}
          onChange={(next) => setTransaction(next as "" | PropertyTransaction)}
          options={TRANSACTION_OPTIONS}
        />
        <SearchField
          id="home-bhk"
          name="bhk"
          label="BHK"
          value={configuration}
          onChange={setConfiguration}
          options={CONFIGURATIONS.map((c) => ({
            value: c === "Any BHK" ? "" : c.replace(/\D/g, ""),
            label: c,
          }))}
        />
        <SearchField
          id="home-budget"
          name="budget"
          label="Budget"
          value={budgetLabel}
          onChange={setBudgetLabel}
          options={BUDGETS.map((b) => ({ value: b.label, label: b.label }))}
        />
      </div>

      <div className="mt-[16px] flex flex-wrap items-center gap-[16px] max-[900px]:flex-col max-[900px]:items-stretch max-[900px]:gap-[10px]">
        <button
          type="submit"
          className="flex-none rounded-[6px] bg-brand px-[34px] py-[17px] text-[18px] font-bold text-white hover:bg-brand-deep max-[900px]:w-full"
        >
          Search {count} {count === 1 ? "property" : "properties"}
        </button>
        <span aria-live="polite" className="text-[15px] text-muted max-[900px]:hidden">
          Results update as you change a field.
        </span>

      </div>
    </form>
  );
}

function SearchField({
  id,
  name,
  label,
  value,
  onChange,
  options,
  className = "",
}: {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-[6px] ${className}`}>
      <label htmlFor={id} className="t-label text-body">
        {label}
      </label>
      <select
        id={id}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[48px] w-full cursor-pointer rounded-[8px] border border-control-border bg-white px-[13px] text-[15px] text-ink"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
