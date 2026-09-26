"use client";

import { useActionState, useState } from "react";
import { createLeadRequest, type LeadRequestFormState } from "@/app/actions/lead-requests";
import { AreaPicker, type AreaOption } from "@/components/location/area-picker";
import { Button } from "@/components/ui/button";
import { Field, Select, TextArea, TextInput } from "@/components/ui/field";

/**
 * CR03 — the Request Leads form.
 *
 * The field set is the confirmation document's proposal (D-17) and the page
 * says so. Only the area is required: everything else narrows what the team
 * looks for, and an honest "not sure" beats an invented answer, so the rest
 * may be left blank.
 *
 * The area is a location record (CR05), chosen through the searchable picker
 * and submitted as the record's id — never as typed text, so a request cannot
 * name a place the service cannot route.
 *
 * Configurations are a fieldset of checkboxes: they post without JavaScript
 * and each is a real labelled control.
 *
 * Submitting files the request under the account the service derives
 * server-side. There is no account field on this form, hidden or otherwise.
 */

const PROPERTY_TYPES = [
  "Apartment",
  "Villa / independent house",
  "Plot",
  "Commercial",
] as const;

const CONFIGURATIONS = ["1", "2", "3", "4+"] as const;

const BUDGET_BANDS = [
  "Under ₹40L",
  "₹40L – ₹60L",
  "₹60L – ₹80L",
  "₹80L – ₹1.2Cr",
  "Above ₹1.2Cr",
] as const;

const TIMINGS = [
  "Immediately",
  "Over the next month",
  "Over the next 2–3 months",
  "Just exploring",
] as const;

export function LeadRequestForm({
  areas,
  idempotencyKey,
}: {
  areas: readonly AreaOption[];
  idempotencyKey: string;
}) {
  const [state, action, pending] = useActionState<LeadRequestFormState, FormData>(
    createLeadRequest,
    { status: "idle" },
  );
  const [configurations, setConfigurations] = useState<readonly string[]>([]);

  const err = state.errors ?? {};
  const v = state.values ?? {};

  return (
    <form action={action} className="flex flex-col gap-[16px]">
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

      {err.form ? (
        <p
          role="alert"
          className="rounded-[8px] bg-chip-danger-bg px-[13px] py-[10px] text-[14px] font-semibold text-danger"
        >
          {err.form}
        </p>
      ) : null}

      <Field
        id="areaId"
        label="Area you need leads in"
        error={err.areas}
        helper="Start typing to search localities across Kolkata."
      >
        <AreaPicker
          id="areaId"
          name="areaId"
          areas={areas}
          defaultValue={v.areaId ?? ""}
          allLabel="Choose an area"
        />
      </Field>

      <Field id="propertyType" label="Property type">
        <Select id="propertyType" name="propertyType" defaultValue={v.propertyType ?? ""}>
          <option value="">Any</option>
          {PROPERTY_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </Select>
      </Field>

      <fieldset>
        <legend className="t-label mb-[8px] text-body">Configurations</legend>
        <div className="flex flex-wrap gap-[8px]">
          {CONFIGURATIONS.map((config) => {
            const selected = configurations.includes(config);
            return (
              <label
                key={config}
                className={`inline-flex min-h-[40px] cursor-pointer items-center gap-[8px] rounded-full border-[1.5px] px-[14px] text-[15px] font-semibold transition-[background-color,border-color,color] duration-150 ${
                  selected
                    ? "border-brand bg-brand text-white"
                    : "border-line bg-white text-body hover:border-[#C6CCE0]"
                }`}
              >
                <input
                  type="checkbox"
                  name="configuration"
                  value={config}
                  checked={selected}
                  onChange={(e) =>
                    setConfigurations((prev) =>
                      e.target.checked ? [...prev, config] : prev.filter((c) => c !== config),
                    )
                  }
                  className="h-[16px] w-[16px]"
                />
                {config} BHK
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="t-label mb-[8px] text-body">You are looking for</legend>
        <div className="flex flex-wrap gap-[8px]">
          {[
            { value: "buy", label: "Buyer leads" },
            { value: "rent", label: "Tenant leads" },
          ].map((option) => (
            <label
              key={option.value}
              className="inline-flex min-h-[40px] cursor-pointer items-center gap-[8px] rounded-full border-[1.5px] border-line bg-white px-[14px] text-[15px] font-semibold text-body has-checked:border-brand has-checked:bg-brand has-checked:text-white"
            >
              <input
                type="radio"
                name="intent"
                value={option.value}
                defaultChecked={v.intent === option.value}
                className="h-[16px] w-[16px]"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <Field id="budgetBand" label="Budget band">
        <Select id="budgetBand" name="budgetBand" defaultValue={v.budgetBand ?? ""}>
          <option value="">Any budget</option>
          {BUDGET_BANDS.map((band) => (
            <option key={band} value={band}>
              {band}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        id="quantity"
        label="How many leads do you need?"
        error={err.quantity}
      >
        <TextInput
          id="quantity"
          name="quantity"
          inputMode="numeric"
          defaultValue={v.quantity ?? ""}
          invalid={Boolean(err.quantity)}
          aria-describedby={err.quantity ? "quantity-error" : undefined}
          placeholder="e.g. 5"
        />
      </Field>

      <Field id="timing" label="When do you need them?">
        <Select id="timing" name="timing" defaultValue={v.timing ?? ""}>
          <option value="">No particular timing</option>
          {TIMINGS.map((timing) => (
            <option key={timing} value={timing}>
              {timing}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        id="notes"
        label="Anything else the team should know"
        helper="Requirements, preferences, exclusions. This is not a promise of availability or delivery time."
      >
        <TextArea id="notes" name="notes" rows={4} defaultValue={v.notes ?? ""} />
      </Field>

      <div>
        <Button type="submit" size="action" disabled={pending}>
          {pending ? "Sending…" : "Send request"}
        </Button>
      </div>
    </form>
  );
}
