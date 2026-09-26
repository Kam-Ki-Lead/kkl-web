"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { countMatchingProperties } from "@/app/actions/search-count";
import type { LocalitySummary } from "@/lib/services/contracts";

/**
 * The homepage search card (P-01): the primary action on the page.
 *
 * "Results update as you change a field" is literal — the count comes from the
 * service on every change, not from a guess in the browser.
 *
 * Property types are the approved sample set; the full list is an open client
 * decision (D-09), so this does not present itself as exhaustive.
 */

const BUDGETS: ReadonlyArray<{ label: string; maxInr?: number; minInr?: number }> = [
  { label: "Any budget" },
  { label: "Up to ₹50L", maxInr: 5_000_000 },
  { label: "Up to ₹1Cr", maxInr: 10_000_000 },
  { label: "Up to ₹1.5Cr", maxInr: 15_000_000 },
  { label: "₹1.5Cr and above", minInr: 15_000_000 },
];

const CONFIGURATIONS = ["Any BHK", "1 BHK", "2 BHK", "3 BHK", "4 BHK"];
const TYPES = ["Apartment", "Villa", "Plot", "Commercial"];

export function HomeSearchCard({
  localities,
  initialCount,
}: {
  localities: readonly LocalitySummary[];
  initialCount: number;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [locality, setLocality] = useState(localities[0]?.id ?? "");
  const [propertyType, setPropertyType] = useState(TYPES[0] as string);
  const [configuration, setConfiguration] = useState("");
  const [budgetLabel, setBudgetLabel] = useState(BUDGETS[0]?.label as string);
  const [count, setCount] = useState(initialCount);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);

  const budget = BUDGETS.find((b) => b.label === budgetLabel);

  useEffect(() => {
    let cancelled = false;
    const filters = {
      locationId: locality || undefined,
      propertyType,
      configurations: configuration ? [configuration] : undefined,
      minBudgetInr: budget?.minInr,
      maxBudgetInr: budget?.maxInr,
    };
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
  }, [locality, propertyType, configuration, budget?.minInr, budget?.maxInr]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (locality) params.set("locality", locality);
    if (propertyType && propertyType !== "Apartment") params.set("type", propertyType);
    if (configuration) params.set("bhk", configuration);
    if (budgetLabel !== "Any budget") params.set("budget", budgetLabel);
    startTransition(() => router.push(params.size ? `/search?${params}` : "/search"));
  }

  return (
    <form
      action="/search"
      method="get"
      onSubmit={submit}
      className="relative z-10 mx-[20px] -mt-[62px] rounded-[10px] border border-line bg-white p-[20px] shadow-[0_8px_28px_rgba(16,26,64,0.10)] max-[900px]:mx-0 max-[900px]:-mt-[32px]"
    >
      <div className="mb-[14px] flex gap-[20px] border-b border-line">
        {/* The approved P-01 search tab is 17px/700 Archivo. */}
        <span className="border-b-[3px] border-saffron pb-[8px] font-[family-name:var(--font-heading)] text-[17px] font-bold text-brand">
          Buy
        </span>
      </div>

      {/* Narrow screens get Location full width, then BHK and Budget paired, with
          property type behind a disclosure — four selects side by side does not
          survive a phone, and the approved mobile layout moves it out of the way. */}
      <div className="grid grid-cols-4 gap-[12px] max-[900px]:grid-cols-2">
        <SearchField
          id="home-locality"
          name="locality"
          label="Location"
          value={locality}
          onChange={setLocality}
          options={localities.map((l) => ({ value: l.id, label: `${l.name}, Kolkata` }))}
          className="max-[900px]:col-span-2"
        />
        <SearchField
          id="home-type"
          name="type"
          label="Property type"
          value={propertyType}
          onChange={setPropertyType}
          options={TYPES.map((t) => ({ value: t, label: t }))}
          className={moreFiltersOpen ? "max-[900px]:col-span-2" : "max-[900px]:hidden"}
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
        {!moreFiltersOpen ? (
          <button
            type="button"
            onClick={() => setMoreFiltersOpen(true)}
            className="hidden min-h-[44px] text-[15px] font-bold text-brand underline underline-offset-2 max-[900px]:block"
          >
            + More filters (property type)
          </button>
        ) : null}
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
