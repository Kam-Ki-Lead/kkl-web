"use client";

import { searchLeads } from "@/app/actions/lead-search";
import { useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useHydrated } from "@/lib/use-hydrated";
import { Field, Select } from "@/components/ui/field";
import { AreaPicker } from "@/components/location/area-picker";
import { Button } from "@/components/ui/button";

/**
 * S-07 marketplace filters: area, budget band, configuration, qualification.
 *
 * A real GET form, not a router push. Filter state belongs in the URL — Back,
 * sharing and reload all depend on it — and a plain form gets that for free and
 * keeps working before hydration.
 *
 * The approved design shows no Apply button: changing a select applies it. That
 * needs JavaScript, so the button is rendered server-side and hidden once this
 * component mounts. Without JavaScript the selects still work and the button is
 * the thing that submits them; with it, the change handler submits and the
 * button is redundant. Neither path loses a choice.
 */
export function LeadFilters({
  options,
  action = "/seller/leads",
}: {
  /** Where the filter form submits — the two marketplaces have separate routes. */
  action?: string;
  options: {
    /** Areas with listings, as location-record id + picker label (CR05). */
    readonly areas: ReadonlyArray<{ readonly id: string; readonly label: string }>;
    readonly budgetBands: readonly string[];
    readonly configurations: readonly string[];
  };
}) {
  const params = useSearchParams();
  const form = useRef<HTMLFormElement>(null);
  const enhanced = useHydrated();

  const value = (key: string, fallback: string) => params.get(key) ?? fallback;
  const submit = () => {
    if (enhanced) form.current?.requestSubmit();
  };

  return (
    <form
      ref={form}
      action={searchLeads}
      className="grid grid-cols-4 gap-[14px] max-[1060px]:grid-cols-2 max-[560px]:grid-cols-1"
    >
      <input type="hidden" name="marketplace" value={action.startsWith("/builder") ? "builder" : "seller"} />
      {/* The tab and sort are part of the view, not of this form's fields, so
          they ride along rather than resetting when a filter changes. */}
      {params.get("tab") ? <input type="hidden" name="tab" value={params.get("tab") as string} /> : null}
      {params.get("sort") ? (
        <input type="hidden" name="sort" value={params.get("sort") as string} />
      ) : null}

      <Field id="lead-area" label="Area" labelSize="sm">
        {/* Searchable over the location records; submits the record id. The
            no-JS fallback is a plain select over the same options. */}
        <AreaPicker
          id="lead-area"
          name="area"
          areas={options.areas.map((a) => ({ id: a.id, label: a.label }))}
          defaultValue={value("area", "")}
          allLabel="All areas"
          onSelect={submit}
        />
      </Field>

      <Field id="lead-budget" label="Budget band" labelSize="sm">
        <Select
          id="lead-budget"
          name="budget"
          defaultValue={value("budget", "All budgets")}
          onChange={submit}
        >
          {options.budgetBands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </Select>
      </Field>

      <Field id="lead-config" label="Configuration" labelSize="sm">
        <Select
          id="lead-config"
          name="config"
          defaultValue={value("config", "All configurations")}
          onChange={submit}
        >
          {options.configurations.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </Field>

      <Field id="lead-score" label="Qualification" labelSize="sm">
        <Select id="lead-score" name="score" defaultValue={value("score", "")} onChange={submit}>
          <option value="">Any score</option>
          <option value="80">80 and above</option>
          <option value="65">65 and above</option>
          <option value="50">50 and above</option>
        </Select>
      </Field>

      {enhanced ? null : (
        <div className="flex items-end">
          <Button type="submit" variant="secondary">
            Apply filters
          </Button>
        </div>
      )}
    </form>
  );
}
