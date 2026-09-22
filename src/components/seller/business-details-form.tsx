"use client";

import { useActionState, useState } from "react";
import { saveBusinessDetails, type AccountFormState } from "@/app/actions/seller-account";
import type { SellerAccount, SellerBusinessType } from "@/lib/domain/types";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Select, TextInput } from "@/components/ui/field";

/**
 * S-02 business details.
 *
 * Areas are a multi-select of checkboxes rather than chips with click handlers,
 * so they post without JavaScript and each one is a real labelled control. The
 * approved design shows them as chips; the styling here follows that while the
 * markup stays a fieldset of checkboxes.
 *
 * GSTIN is optional, and the helper says why rather than leaving the reader to
 * guess: whether GST invoicing is mandatory is an open client decision (D-13).
 */

const TYPES: readonly { value: SellerBusinessType; label: string }[] = [
  { value: "individual_broker", label: "Individual broker" },
  { value: "proprietorship", label: "Proprietorship" },
  { value: "partnership", label: "Partnership" },
  { value: "private_limited", label: "Private limited" },
];

const AREAS = [
  "New Town",
  "Rajarhat",
  "Salt Lake",
  "Action Area I",
  "Action Area II",
  "Action Area III",
];

export function BusinessDetailsForm({ account }: { account: SellerAccount }) {
  const [state, action, pending] = useActionState<AccountFormState, FormData>(
    saveBusinessDetails,
    { status: "idle" },
  );
  const [areas, setAreas] = useState<readonly string[]>(account.areas);

  const err = state.errors ?? {};
  const v = state.values ?? {};

  if (state.status === "saved") {
    return (
      <div className="rounded-[10px] border border-[#BFE0CE] bg-chip-success-bg p-[20px]">
        <h2 className="t-card-title text-success">Business details saved</h2>
        <p className="t-body mt-[6px] text-body">
          Next: PAN and Aadhaar, which an administrator reviews before you can buy leads.
        </p>
        <ButtonLink href="/seller/kyc" className="mt-[14px]">
          Continue to KYC
        </ButtonLink>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-[16px]">
      <Field id="agencyName" label="Legal / trade name" error={err.agencyName}>
        <TextInput
          id="agencyName"
          name="agencyName"
          defaultValue={v.agencyName ?? account.agencyName}
          invalid={Boolean(err.agencyName)}
          aria-describedby={err.agencyName ? "agencyName-error" : undefined}
        />
      </Field>

      <Field id="businessType" label="Business type">
        <Select
          id="businessType"
          name="businessType"
          defaultValue={v.businessType ?? account.businessType}
        >
          {TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </Select>
      </Field>

      <fieldset>
        <legend className="t-label mb-[8px] text-ink">Areas you work in</legend>
        {err.areas ? (
          <p id="areas-error" className="t-caption mb-[8px] text-danger">
            {err.areas}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-[8px]">
          {AREAS.map((area) => {
            const selected = areas.includes(area);
            return (
              <label
                key={area}
                className={`inline-flex min-h-[40px] cursor-pointer items-center gap-[8px] rounded-full border-[1.5px] px-[14px] text-[15px] font-semibold transition-[background-color,border-color,color] duration-150 ${
                  selected
                    ? "border-brand bg-chip-neutral-bg text-brand"
                    : "border-line bg-white text-body hover:border-[#C6CCE0]"
                }`}
              >
                <input
                  type="checkbox"
                  name="areas"
                  value={area}
                  checked={selected}
                  onChange={(e) =>
                    setAreas((prev) =>
                      e.target.checked ? [...prev, area] : prev.filter((a) => a !== area),
                    )
                  }
                  className="h-[16px] w-[16px]"
                />
                {area}
              </label>
            );
          })}
        </div>
      </fieldset>

      <Field
        id="gstin"
        label="GSTIN (optional)"
        error={err.gstin}
        helper="Whether GST invoicing is mandatory is an open client decision, so this stays optional for now."
      >
        <TextInput
          id="gstin"
          name="gstin"
          autoCapitalize="characters"
          placeholder="22AAAAA0000A1Z5"
          defaultValue={v.gstin ?? account.gstin ?? ""}
          invalid={Boolean(err.gstin)}
          aria-describedby={err.gstin ? "gstin-error" : "gstin-helper"}
        />
      </Field>

      <div className="flex flex-wrap items-center gap-[12px]">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Continue to KYC"}
        </Button>
        <ButtonLink href="/seller/register" variant="secondary">
          Back
        </ButtonLink>
      </div>
    </form>
  );
}
