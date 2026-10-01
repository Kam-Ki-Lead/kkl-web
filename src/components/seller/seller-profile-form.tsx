"use client";

import { useActionState } from "react";
import { saveSellerProfile, type ProfileFormState } from "@/app/actions/seller-account";
import type { SellerAccount } from "@/lib/domain/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, TextInput } from "@/components/ui/field";
import { Chip } from "@/components/ui/chip";

/**
 * S-25 profile form.
 *
 * The mobile number is shown but not editable, and says why: it is the verified
 * identifier the account was created with, so changing it is a re-verification
 * flow rather than a text field. C-04 requires a disabled control to give its
 * reason.
 */
export function SellerProfileForm({
  account,
  isSample,
  alertsStored = true,
}: {
  account: SellerAccount;
  isSample: boolean;
  /** False when the profile resource does not carry the three alert toggles. */
  alertsStored?: boolean;
}) {
  const [state, action, pending] = useActionState<ProfileFormState, FormData>(saveSellerProfile, {
    status: "idle",
  });

  const current = state.status === "saved" && state.saved ? state.saved : account;
  const v = state.values ?? {};
  const err = state.errors ?? {};

  return (
    <Card className="p-[20px]">
      <form action={action} className="flex flex-col gap-[16px]">
        {state.status === "saved" ? (
          <p
            role="status"
            className="rounded-[8px] bg-chip-success-bg px-[14px] py-[10px] text-[14px] font-semibold text-success"
          >
            Your details were saved.
            {alertsStored
              ? isSample
                ? " In sample mode this is kept in memory only."
                : ""
              : " Contact name and agency name were written to the profile. Alert preferences were not."}
          </p>
        ) : null}

        <Field id="contactName" label="Contact name" error={err.contactName}>
          <TextInput
            id="contactName"
            name="contactName"
            autoComplete="name"
            defaultValue={v.contactName ?? current.contactName}
            invalid={Boolean(err.contactName)}
            aria-describedby={err.contactName ? "contactName-error" : undefined}
          />
        </Field>

        <Field id="agencyName" label="Agency" error={err.agencyName}>
          <TextInput
            id="agencyName"
            name="agencyName"
            defaultValue={v.agencyName ?? current.agencyName}
            invalid={Boolean(err.agencyName)}
            aria-describedby={err.agencyName ? "agencyName-error" : undefined}
          />
        </Field>

        <Field
          id="mobile"
          label="Mobile number"
          helper="Verified when you registered. Changing it needs a new verification, which is not available yet."
        >
          <TextInput id="mobile" name="mobile" value={current.mobile} disabled readOnly />
        </Field>

        <fieldset className="flex flex-col gap-[10px]">
          <legend className="t-label mb-[4px] text-body">Alert me when</legend>
          <AlertToggle
            name="newLeadsInMyAreas"
            label="New leads match my areas"
            defaultChecked={current.alerts.newLeadsInMyAreas}
          />
          <AlertToggle
            name="viewedLeadOnSale"
            label="A lead I viewed moves to the Sale tab"
            defaultChecked={current.alerts.viewedLeadOnSale}
          />
          <AlertToggle
            name="lowBalance"
            label="My credit balance runs low"
            defaultChecked={current.alerts.lowBalance}
          />
          <p className="t-caption text-muted">
            {alertsStored
              ? "These record a preference. Delivery — by WhatsApp, email or push — is kkl-backend’s and is not connected, so turning one on does not start sending anything."
              : "These switches are not fields on the profile. Saving does not store them, and it does not turn delivery on."}
          </p>
        </fieldset>

        <div className="flex flex-wrap items-center gap-[14px]">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
          {alertsStored && isSample ? <Chip tone="warning">Not connected to an account</Chip> : null}
          {alertsStored ? null : <Chip tone="warning">Alerts are not stored</Chip>}
        </div>
      </form>
    </Card>
  );
}

function AlertToggle({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex min-h-[44px] cursor-pointer items-center gap-[10px] rounded-[8px] border border-line px-[12px]">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} />
      <span className="text-[15px] text-ink">{label}</span>
    </label>
  );
}
