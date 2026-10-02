"use client";

import { useActionState } from "react";
import { saveSellerProfile, type ProfileFormState } from "@/app/actions/seller-account";
import type { SellerAccount } from "@/lib/domain/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, TextInput } from "@/components/ui/field";
import { Chip } from "@/components/ui/chip";
import { alertSavedMessage } from "@/lib/services/backend/alert-preferences";

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
  profileFullName = null,
  contractBound = false,
  deliveryAvailable = false,
}: {
  account: SellerAccount;
  isSample: boolean;
  /** False when this account cannot write alert choices. */
  alertsStored?: boolean;
  /** The profile full name, which this form does not edit. */
  profileFullName?: string | null;
  /** True when the profile service stores this form. */
  contractBound?: boolean;
  /** The delivery capability returned with the saved choices. */
  deliveryAvailable?: boolean;
}) {
  const [state, action, pending] = useActionState<ProfileFormState, FormData>(saveSellerProfile, {
    status: "idle",
  });

  const current = state.status === "saved" && state.saved ? state.saved : account;
  const v = state.values ?? {};
  const err = state.errors ?? {};
  const savedDelivery = state.status === "saved" ? state.deliveryAvailable === true : deliveryAvailable;
  const choice = (key: "newLeadsInMyAreas" | "viewedLeadOnSale" | "lowBalance", fallback: boolean) =>
    v[key] === "true" ? true : v[key] === "false" ? false : fallback;

  return (
    <Card className="p-[20px]">
      <form action={action} className="flex flex-col gap-[16px]">
        {state.status === "saved" ? (
          <p
            role="status"
            className="rounded-[8px] bg-chip-success-bg px-[14px] py-[10px] text-[14px] font-semibold text-success"
          >
            {contractBound
              ? `Contact name and agency name were saved. ${
                  alertsStored ? alertSavedMessage(savedDelivery) : "Alert preferences were not stored."
                }`
              : `Your details were saved.${isSample ? " In sample mode this is kept in memory only." : ""}`}
          </p>
        ) : null}

        {err.form ? (
          <p role="alert" className="rounded-[8px] bg-chip-danger-bg px-[14px] py-[10px] text-[14px] text-danger">
            {err.form}
          </p>
        ) : null}

        <Field
          id="contactName"
          label="Contact name"
          error={err.contactName}
          helper={
            contractBound
              ? "This is the name support uses. It is stored as the account name. The profile full name is a separate field, and saving does not change it."
              : undefined
          }
        >
          <TextInput
            id="contactName"
            name="contactName"
            autoComplete="name"
            defaultValue={v.contactName ?? current.contactName}
            invalid={Boolean(err.contactName)}
            aria-describedby={
              err.contactName ? "contactName-error" : contractBound ? "contactName-helper" : undefined
            }
          />
        </Field>
        {!alertsStored && profileFullName ? (
          <p className="t-caption text-muted">The profile full name stays {profileFullName}.</p>
        ) : null}

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

        <fieldset className="flex flex-col gap-[10px]" disabled={!alertsStored} aria-describedby="alerts-note">
          <legend className="t-label mb-[4px] text-body">Alert me when</legend>
          <p id="alerts-note" className="t-caption text-muted">
            {alertsStored
              ? contractBound
                ? savedDelivery
                  ? "These choices are saved on this profile. Saving a choice does not send an alert by itself."
                  : "These choices are saved on this profile. Alert delivery is not available yet."
                : "These record a preference. Delivery — by WhatsApp, email or push — is kkl-backend’s and is not connected, so turning one on does not start sending anything."
              : "These choices are unavailable for this account, and no alert is sent."}
          </p>
          <AlertToggle
            name={alertsStored ? "newLeadsInMyAreas" : undefined}
            label="New leads match my areas"
            checked={choice("newLeadsInMyAreas", current.alerts.newLeadsInMyAreas)}
          />
          <AlertToggle
            name={alertsStored ? "viewedLeadOnSale" : undefined}
            label="A lead I viewed moves to the Sale tab"
            checked={choice("viewedLeadOnSale", current.alerts.viewedLeadOnSale)}
          />
          <AlertToggle
            name={alertsStored ? "lowBalance" : undefined}
            label="My credit balance runs low"
            checked={choice("lowBalance", current.alerts.lowBalance)}
          />
        </fieldset>

        <div className="flex flex-wrap items-center gap-[14px]">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
          {alertsStored && isSample && !contractBound ? (
            <Chip tone="warning">Not connected to an account</Chip>
          ) : null}
          {alertsStored ? null : <Chip tone="warning">Alerts are not stored</Chip>}
        </div>
      </form>
    </Card>
  );
}

function AlertToggle({
  name,
  label,
  checked,
}: {
  name?: string;
  label: string;
  checked: boolean;
}) {
  return (
    <label className="flex min-h-[44px] items-center gap-[10px] rounded-[8px] border border-line px-[12px] has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
      {name ? <input type="hidden" name={name} value="false" /> : null}
      <input key={checked ? "on" : "off"} type="checkbox" name={name} value="true" defaultChecked={checked} />
      <span className="text-[15px] text-ink">{label}</span>
    </label>
  );
}
