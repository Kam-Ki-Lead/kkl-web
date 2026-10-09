"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { countMatchingProperties } from "@/app/actions/search-count";
import { AreaPicker, type AreaOption } from "@/components/location/area-picker";
import { NOT_FORWARDED, leadSearchHref } from "@/lib/domain/lead-search-query";

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
type SearchMode = "projects" | "buy_rent";

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
  const [searchMode, setSearchMode] = useState<SearchMode>("buy_rent");
  const [configuration, setConfiguration] = useState("");
  const [budgetLabel, setBudgetLabel] = useState(BUDGETS[0]?.label as string);
  const [count, setCount] = useState(initialCount);

  const budget = BUDGETS.find((b) => b.label === budgetLabel);

  useEffect(() => {
    if (searchMode !== "projects") return;
    let cancelled = false;
    const filters = {
      locationId: locality || undefined,
      // This effect only runs in projects mode, so the type is always
      // "project" here; there is no other branch to express.
      propertyType: "project",
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
  }, [locality, configuration, budget?.minInr, budget?.maxInr, searchMode]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (searchMode === "buy_rent") {
      // Only what the marketplace genuinely filters on. `lead-search-query`
      // holds the mapping and the reasons, so the card and `/seller/leads`
      // cannot drift apart again.
      startTransition(() =>
        router.push(leadSearchHref({ areaId: locality, bhk: configuration })),
      );
      return;
    }

    if (locality) params.set("locality", locality);
    params.set("type", "project");
    if (configuration) params.set("bhk", configuration);
    if (budgetLabel !== "Any budget") params.set("budget", budgetLabel);
    startTransition(() => router.push(`/search?${params}`));
  }

  return (
    <form
      action="/search"
      method="get"
      onSubmit={submit}
      className="relative z-10 mx-[20px] mt-[16px] rounded-[10px] border border-line bg-white p-[20px] shadow-[0_8px_28px_rgba(16,26,64,0.10)] max-[900px]:mx-0 max-[900px]:mt-[16px]"
    >
      <div className="mb-[14px] flex gap-[8px] border-b border-line">
        <SearchModeButton
          active={searchMode === "projects"}
          onClick={() => setSearchMode("projects")}
        >
          Projects
        </SearchModeButton>
        <SearchModeButton
          active={searchMode === "buy_rent"}
          onClick={() => setSearchMode("buy_rent")}
        >
          Buy/Rent
        </SearchModeButton>
      </div>

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
        {searchMode === "buy_rent" ? (
          // Property type is not a lead filter — the marketplace has no such
          // parameter — so it is not offered here. Offering a control that
          // changes nothing is worse than leaving it out.
          <div className="flex flex-col gap-[6px] max-[900px]:hidden">
            <span className="t-label text-body">Searching</span>
            <div className="flex min-h-[48px] items-center rounded-[8px] border border-brand-mist bg-tint px-[13px] text-[15px] font-semibold text-brand">
              Buyer requirements
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-[6px] max-[900px]:hidden">
            <span className="t-label text-body">Search type</span>
            <div className="flex min-h-[48px] items-center rounded-[8px] border border-brand-mist bg-tint px-[13px] text-[15px] font-semibold text-brand">
              Builder projects
            </div>
          </div>
        )}
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
        {searchMode === "projects" ? (
          <SearchField
            id="home-budget"
            name="budget"
            label="Budget"
            value={budgetLabel}
            onChange={setBudgetLabel}
            options={BUDGETS.map((b) => ({ value: b.label, label: b.label }))}
          />
        ) : (
          // The marketplace compares a lead's budget band for exact equality
          // against the band the buyer stated. These labels are not those
          // values, so the band is chosen on the results page instead.
          <div className="flex flex-col gap-[6px]">
            <span className="t-label text-body">Budget</span>
            <p className="t-caption flex min-h-[48px] items-center text-muted">
              {NOT_FORWARDED.budget}
            </p>
          </div>
        )}
      </div>

      <div className="mt-[16px] flex flex-wrap items-center gap-[16px] max-[900px]:flex-col max-[900px]:items-stretch max-[900px]:gap-[10px]">
        <button
          type="submit"
          className="flex-none rounded-[6px] bg-brand px-[34px] py-[17px] text-[18px] font-bold text-white hover:bg-brand-deep max-[900px]:w-full"
        >
          {searchMode === "projects"
            ? `Search ${count} ${count === 1 ? "project" : "projects"}`
            : "Search leads"}
        </button>
        <span aria-live="polite" className="text-[15px] text-muted max-[900px]:hidden">
          {searchMode === "projects"
            ? "Results update as you change a field."
            : "Browse buyer requirements by area, configuration and budget."}
        </span>

      </div>
    </form>
  );
}

function SearchModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      // C-04: every control a thumb has to hit is at least 44px tall. The
      // measured height here was 43px, which the phone check caught.
      className={`min-h-[44px] border-b-[3px] px-[14px] pb-[9px] pt-[5px] font-[family-name:var(--font-heading)] text-[17px] font-bold transition-colors ${
        active
          ? "border-saffron text-brand"
          : "border-transparent text-muted hover:border-brand-mist hover:text-brand"
      }`}
    >
      {children}
    </button>
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
