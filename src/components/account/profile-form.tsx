"use client";

import { useActionState } from "react";
import { saveProfile, type ProfileFormState } from "@/app/actions/profile";
import type { BuyerProfile } from "@/lib/domain/types";
import type { LocalitySummary } from "@/lib/services/contracts";
import { Field, TextInput } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";

/**
 * P-15 profile form.
 *
 * The mobile number is shown but not editable: it is the verified identifier the
 * account was created with, so changing it is a re-verification flow rather than
 * a text field. C-04's rule applies — a disabled field always says why.
 */
export function ProfileForm({
  profile,
  localities,
  isSample,
}: {
  profile: BuyerProfile;
  localities: readonly LocalitySummary[];
  isSample: boolean;
}) {
  const [state, action, pending] = useActionState<ProfileFormState, FormData>(saveProfile, {
    status: "idle",
  });

  const current = state.status === "saved" && state.saved ? state.saved : profile;
  const v = state.values ?? {};
  const err = state.errors ?? {};

  const valueFor = (key: keyof BuyerProfile, fallback: string) =>
    typeof v[key] === "string" ? (v[key] as string) : fallback;

  return (
    <form action={action} className="flex flex-col gap-[16px]">
      {state.status === "saved" ? (
        <p
          role="status"
          className="rounded-[8px] bg-chip-success-bg px-[14px] py-[10px] text-[14px] font-semibold text-success"
        >
          Your details were saved.
          {isSample ? " In sample mode this is kept in memory only — see below." : ""}
        </p>
      ) : null}

      {err.form ? (
        <p role="alert" className="rounded-[8px] bg-chip-danger-bg px-[14px] py-[10px] text-[14px] text-danger">
          {err.form}
        </p>
      ) : null}

      <Field id="fullName" label="Full name" error={err.fullName}>
        <TextInput
          id="fullName"
          name="fullName"
          autoComplete="name"
          defaultValue={valueFor("fullName", current.fullName)}
          invalid={Boolean(err.fullName)}
          aria-describedby={err.fullName ? "fullName-error" : undefined}
        />
      </Field>

      <Field
        id="mobile"
        label="Mobile number"
        helper="Verified when you registered. Changing it needs a new verification, which is not available yet."
      >
        <TextInput id="mobile" name="mobile" value={current.mobile} disabled readOnly />
      </Field>

      <Field
        id="email"
        label="Email address (optional)"
        error={err.email}
        helper="Used for enquiry receipts if you turn on email updates."
      >
        <TextInput
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          defaultValue={valueFor("email", current.email ?? "")}
          invalid={Boolean(err.email)}
          aria-describedby={err.email ? "email-error" : "email-helper"}
        />
      </Field>

      <Field id="preferredLocalityId" label="Preferred locality">
        <select
          id="preferredLocalityId"
          name="preferredLocalityId"
          defaultValue={valueFor("preferredLocalityId", current.preferredLocalityId ?? "")}
          className="min-h-[44px] w-full cursor-pointer rounded-[8px] border border-line bg-white px-[13px] text-[15px] text-ink"
        >
          <option value="">No preference</option>
          {localities.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}, Kolkata
            </option>
          ))}
        </select>
      </Field>

      <fieldset className="flex flex-col gap-[10px]">
        <legend className="t-label mb-[4px] text-ink">How we contact you</legend>
        <label className="flex min-h-[44px] cursor-pointer items-center gap-[10px] rounded-[8px] border border-line px-[12px]">
          <input
            type="checkbox"
            name="notifyByWhatsApp"
            defaultChecked={
              typeof v.notifyByWhatsApp === "boolean"
                ? v.notifyByWhatsApp
                : current.notifyByWhatsApp
            }
          />
          <span className="text-[15px] text-ink">Updates on WhatsApp</span>
        </label>
        <label className="flex min-h-[44px] cursor-pointer items-center gap-[10px] rounded-[8px] border border-line px-[12px]">
          <input
            type="checkbox"
            name="notifyByEmail"
            defaultChecked={
              typeof v.notifyByEmail === "boolean" ? v.notifyByEmail : current.notifyByEmail
            }
          />
          <span className="text-[15px] text-ink">Updates by email</span>
        </label>
      </fieldset>

      <div className="flex flex-wrap items-center gap-[14px]">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
        {isSample ? <Chip tone="warning">Not connected to an account</Chip> : null}
      </div>
    </form>
  );
}
