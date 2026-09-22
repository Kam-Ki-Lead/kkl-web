"use client";

import { useActionState } from "react";
import {
  submitVerification,
  type VerificationFormState,
} from "@/app/actions/builder-verification";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Field, TextInput } from "@/components/ui/field";

/**
 * B-02's form.
 *
 * The file inputs are real — choosing a file shows its name and leaving one
 * empty is a validation error, so the flow behaves the way it will when uploads
 * exist. What does not happen is the upload, and the screen says so.
 */
export function VerificationForm({ isSample }: { isSample: boolean }) {
  const [state, action, pending] = useActionState<VerificationFormState, FormData>(
    submitVerification,
    {},
  );
  const err = state.errors ?? {};
  const v = state.values ?? {};

  return (
    <form action={action} encType="multipart/form-data" className="flex flex-col gap-[16px]">
      <DocumentSlot
        id="panDocument"
        title="Company PAN"
        hint="Clear photo or scan"
        error={err.hasPanDocument}
      />
      <DocumentSlot
        id="companyDocument"
        title="Incorporation certificate or partnership deed"
        hint="PDF preferred"
        error={err.hasCompanyDocument}
      />

      <Field id="panNumber" label="Company PAN number" error={err.panNumber}>
        <TextInput
          id="panNumber"
          name="panNumber"
          autoCapitalize="characters"
          placeholder="AAACS1234Q"
          maxLength={10}
          defaultValue={v.panNumber ?? ""}
          invalid={Boolean(err.panNumber)}
          aria-describedby={err.panNumber ? "panNumber-error" : undefined}
        />
      </Field>

      <Card className="bg-tint p-[16px]">
        <p className="t-caption text-warning">
          <strong>Nothing is uploaded yet.</strong> The file you choose is not sent or stored:
          document storage, virus scanning, access logging and a retention rule are
          kkl-backend&rsquo;s and do not exist. This form records that you selected a file, and the
          PAN number, so the flow can be reviewed end to end.
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
          <h3 className="t-card-title text-ink">{title}</h3>
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
