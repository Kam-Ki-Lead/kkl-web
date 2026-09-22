"use client";

import { useActionState } from "react";
import { saveBilling, type BillingFormState } from "@/app/actions/seller-account";
import type { BillingDetails } from "@/lib/domain/types";
import { Button } from "@/components/ui/button";
import { Field, TextArea, TextInput } from "@/components/ui/field";
import { Chip } from "@/components/ui/chip";

/**
 * S-21 billing information.
 *
 * GSTIN is optional and format-checked. Whether GST invoicing is mandatory is an
 * open client decision (D-13), so the field neither requires a GSTIN nor implies
 * that supplying one changes the tax treatment of an invoice.
 */
export function BillingDetailsForm({
  details,
  isSample,
}: {
  details: BillingDetails;
  isSample: boolean;
}) {
  const [state, action, pending] = useActionState<BillingFormState, FormData>(saveBilling, {
    status: "idle",
  });

  const current = state.status === "saved" && state.saved ? state.saved : details;
  const v = state.values ?? {};
  const err = state.errors ?? {};

  return (
    <form action={action} className="flex flex-col gap-[16px]">
      {state.status === "saved" ? (
        <p
          role="status"
          className="rounded-[8px] bg-chip-success-bg px-[14px] py-[10px] text-[14px] font-semibold text-success"
        >
          Billing details saved. They apply to invoices issued from now on, not to ones already
          issued.
        </p>
      ) : null}

      <Field id="billingName" label="Billing name" error={err.billingName}>
        <TextInput
          id="billingName"
          name="billingName"
          defaultValue={v.billingName ?? current.billingName}
          invalid={Boolean(err.billingName)}
          aria-describedby={err.billingName ? "billingName-error" : undefined}
        />
      </Field>

      <Field
        id="gstin"
        label="GSTIN (optional)"
        error={err.gstin}
        helper="Whether GST invoicing is mandatory is an open client decision, so this stays optional."
      >
        <TextInput
          id="gstin"
          name="gstin"
          autoCapitalize="characters"
          placeholder="22AAAAA0000A1Z5"
          defaultValue={v.gstin ?? current.gstin ?? ""}
          invalid={Boolean(err.gstin)}
          aria-describedby={err.gstin ? "gstin-error" : "gstin-helper"}
        />
      </Field>

      <Field id="address" label="Billing address" error={err.address}>
        <TextArea
          id="address"
          name="address"
          rows={3}
          defaultValue={v.address ?? current.addressLines.join("\n")}
          invalid={Boolean(err.address)}
          aria-describedby={err.address ? "address-error" : undefined}
        />
      </Field>

      <Field
        id="invoiceEmail"
        label="Invoice email"
        error={err.invoiceEmail}
        helper="Where invoices are sent once email delivery is in place."
      >
        <TextInput
          id="invoiceEmail"
          name="invoiceEmail"
          type="email"
          defaultValue={v.invoiceEmail ?? current.invoiceEmail ?? ""}
          invalid={Boolean(err.invoiceEmail)}
          aria-describedby={err.invoiceEmail ? "invoiceEmail-error" : "invoiceEmail-helper"}
        />
      </Field>

      <Field id="contactName" label="Billing contact">
        <TextInput
          id="contactName"
          name="contactName"
          defaultValue={v.contactName ?? current.contactName ?? ""}
        />
      </Field>

      <div className="flex flex-wrap items-center gap-[14px]">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save billing details"}
        </Button>
        {isSample ? <Chip tone="warning">Held in memory only</Chip> : null}
      </div>
    </form>
  );
}
