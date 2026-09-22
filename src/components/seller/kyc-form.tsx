"use client";

import { useActionState } from "react";
import { submitKyc, type KycFormState } from "@/app/actions/seller-kyc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Field, TextInput } from "@/components/ui/field";

/**
 * S-03 KYC form.
 *
 * The file inputs are real inputs — choosing a file shows its name, and leaving
 * one empty is a validation error, so the flow behaves the way it will when
 * uploads exist. What does not happen is the upload: the action reads only
 * whether a file was chosen, never its contents.
 *
 * The screen says so, in the place a Seller will read it. A PAN or Aadhaar image
 * needs storage kkl-backend controls, a scan, an access log and a retention
 * rule; until those exist, accepting the file and dropping it would leave
 * someone believing their documents were submitted.
 */
export function KycForm({ isSample }: { isSample: boolean }) {
  const [state, action, pending] = useActionState<KycFormState, FormData>(submitKyc, {});
  const err = state.errors ?? {};
  const v = state.values ?? {};

  return (
    <form action={action} encType="multipart/form-data" className="flex flex-col gap-[16px]">
      <DocumentSlot
        id="panDocument"
        title="PAN card"
        hint="Clear photo or scan of the card"
        error={err.hasPanDocument}
      />
      <DocumentSlot
        id="aadhaarDocument"
        title="Aadhaar"
        hint="Both sides, or the e-Aadhaar PDF"
        error={err.hasAadhaarDocument}
      />

      <Card className="p-[18px]">
        <Field id="panNumber" label="PAN number" error={err.panNumber}>
          <TextInput
            id="panNumber"
            name="panNumber"
            autoCapitalize="characters"
            placeholder="ABCDE1234F"
            maxLength={10}
            defaultValue={v.panNumber ?? ""}
            invalid={Boolean(err.panNumber)}
            aria-describedby={err.panNumber ? "panNumber-error" : undefined}
          />
        </Field>
      </Card>

      <Card className="bg-tint p-[16px]">
        <p className="t-caption text-muted">
          Accepted: JPG, PNG or PDF up to 5 MB per document. Documents are visible only to Kam Ki
          Lead administrators.
        </p>
        <p className="t-caption mt-[8px] text-warning">
          <strong>Nothing is uploaded yet.</strong> The file you choose is not sent or stored:
          document storage, virus scanning, access logging and a retention rule are kkl-backend&rsquo;s
          and do not exist. This form records that you selected a file, and the PAN number, so the
          flow can be reviewed end to end.
          {isSample ? " No administrator will see anything." : ""}
        </p>
      </Card>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Submitting…" : "Submit for verification"}
        </Button>
        <p className="t-caption mt-[10px] text-muted">
          Submitting moves your account to <strong>in review</strong>. It does not approve it — an
          administrator decides, and no turnaround time is promised.
        </p>
      </div>
    </form>
  );
}

function DocumentSlot({
  id,
  title,
  hint,
  error,
}: {
  id: string;
  title: string;
  hint: string;
  error?: string;
}) {
  return (
    <Card className="p-[18px]">
      <div className="flex flex-wrap items-start justify-between gap-[10px]">
        <div>
          <h2 className="t-card-title text-ink">{title}</h2>
          <p className="t-caption mt-[1px] text-muted">{hint}</p>
        </div>
        <Chip tone="muted">Required</Chip>
      </div>

      <div className="mt-[12px]">
        <label htmlFor={id} className="t-label block text-ink">
          <span className="sr-only">{title} — </span>Choose file
        </label>
        <input
          id={id}
          name={id}
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="mt-[6px] block w-full cursor-pointer rounded-[8px] border border-dashed border-[#B9C3EC] bg-white px-[13px] py-[11px] text-[15px] text-body file:mr-[12px] file:cursor-pointer file:rounded-[6px] file:border-0 file:bg-chip-neutral-bg file:px-[13px] file:py-[8px] file:text-[14px] file:font-semibold file:text-brand"
        />
        {error ? (
          <p id={`${id}-error`} className="t-caption mt-[6px] text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </Card>
  );
}
