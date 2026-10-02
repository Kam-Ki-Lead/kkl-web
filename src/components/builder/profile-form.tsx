"use client";

import { useActionState } from "react";
import { saveBuilderProfile, type BuilderProfileState } from "@/app/actions/builder-profile";
import type { BuilderAccount } from "@/lib/domain/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Field, TextInput } from "@/components/ui/field";
import { alertSavedMessage } from "@/lib/services/backend/alert-preferences";

/**
 * B-24's form.
 *
 * The mobile number is shown disabled with its reason, as C-04 requires: it is
 * the verified identifier the account was created with, so changing it is a
 * re-verification flow rather than a text field.
 */
export function BuilderProfileForm({
  account,
  isSample,
  contractBound = false,
  profileFullName = null,
  alertsWritable = false,
  deliveryAvailable = false,
}: {
  account: BuilderAccount;
  isSample: boolean;
  /** True when company, account name and email are written to the profile. */
  contractBound?: boolean;
  /** The profile full name, which this form does not edit. */
  profileFullName?: string | null;
  /** True when this account's profile carries the builder alert keys. */
  alertsWritable?: boolean;
  /** The delivery capability returned with the saved choices. */
  deliveryAvailable?: boolean;
}) {
  const [state, action, pending] = useActionState<BuilderProfileState, FormData>(
    saveBuilderProfile,
    { status: "idle" },
  );

  const current = state.status === "saved" && state.saved ? state.saved : account;
  const v = state.values ?? {};
  const err = state.errors ?? {};
  const savedDelivery = state.status === "saved" ? state.deliveryAvailable === true : deliveryAvailable;
  const choice = (key: "newEnquiry" | "siteVisitRequest" | "subscriptionReminders", fallback: boolean) =>
    v[key] === "true" ? true : v[key] === "false" ? false : fallback;

  return (
    <Card className="p-[20px]">
      <form action={action} className="flex flex-col gap-[16px]">
        {state.status === "saved" ? (
          <p
            role="status"
            className={
              "rounded-[8px] bg-chip-success-bg px-[14px] py-[10px] text-[14px] font-semibold text-success"
            }
          >
            {contractBound
              ? `Company name, the account name and the contact email were saved. ${
                  alertsWritable ? alertSavedMessage(savedDelivery) : ""
                } Add a RERA registration number on the property listing. This profile does not store it.`
              : `Your details were saved.${isSample ? " In sample mode this is kept in memory only." : ""} ${alertSavedMessage(false)}`}
          </p>
        ) : null}

        {err.form ? (
          <p role="alert" className="rounded-[8px] bg-chip-danger-bg px-[14px] py-[10px] text-[14px] text-danger">
            {err.form}
          </p>
        ) : null}

        <Field id="companyName" label="Company name" error={err.companyName}>
          <TextInput
            id="companyName"
            name="companyName"
            defaultValue={v.companyName ?? current.companyName}
            invalid={Boolean(err.companyName)}
            aria-describedby={err.companyName ? "companyName-error" : undefined}
          />
        </Field>

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
        {contractBound && profileFullName ? (
          <p className="t-caption text-muted">The profile full name stays {profileFullName}.</p>
        ) : null}

        <Field
          id="mobile"
          label="Mobile number"
          helper="Verified when you registered. Changing it needs a new verification, which is not available yet."
        >
          <TextInput id="mobile" name="mobile" value={current.mobile} disabled readOnly />
        </Field>

        <Field id="email" label="Email address" error={err.email}>
          <TextInput
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={v.email ?? current.email ?? ""}
            invalid={Boolean(err.email)}
            aria-describedby={err.email ? "email-error" : undefined}
          />
        </Field>

        <Field
          id="reraId"
          label="RERA registration"
          helper={
            contractBound
              ? "Add the RERA registration number on the property listing. This profile does not store it, and nothing here is checked against a RERA register."
              : "Shown on your listings when present. Nothing here is checked against a RERA register."
          }
        >
          {contractBound ? (
            <TextInput id="reraId" value="" disabled readOnly aria-describedby="reraId-helper" />
          ) : (
            <TextInput
              id="reraId"
              name="reraId"
              defaultValue={v.reraId ?? current.reraId ?? ""}
              aria-describedby="reraId-helper"
            />
          )}
        </Field>

        <fieldset className="flex flex-col gap-[10px]" disabled={contractBound && !alertsWritable} aria-describedby="alerts-note">
          <legend className="t-label mb-[4px] text-body">Alert me when</legend>
          <p id="alerts-note" className="t-caption text-muted">
            {contractBound && !alertsWritable
              ? "These choices are unavailable for this account, and no alert is sent."
              : contractBound
                ? savedDelivery
                  ? "These choices are saved on this profile. Saving a choice does not send an alert by itself."
                  : "These choices are saved on this profile. Alert delivery is not available yet."
                : "These record a preference. Delivery is kkl-backend’s and is not connected, so turning one on does not start sending anything."}
          </p>
          <Toggle
            name={contractBound && !alertsWritable ? undefined : "newEnquiry"}
            label="A buyer enquires about one of my listings"
            checked={choice("newEnquiry", current.alerts.newEnquiry)}
          />
          <Toggle
            name={contractBound && !alertsWritable ? undefined : "siteVisitRequest"}
            label="A buyer requests a site visit"
            checked={choice("siteVisitRequest", current.alerts.siteVisitRequest)}
          />
          <Toggle
            name={contractBound && !alertsWritable ? undefined : "subscriptionReminders"}
            label="My subscription is due for renewal"
            checked={choice("subscriptionReminders", current.alerts.subscriptionReminders)}
          />
        </fieldset>

        <div className="flex flex-wrap items-center gap-[14px]">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
          {isSample ? <Chip tone="warning">Not connected to an account</Chip> : null}
        </div>
      </form>
    </Card>
  );
}

function Toggle({
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
