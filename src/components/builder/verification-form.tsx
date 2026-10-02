"use client";

import { useActionState, useState } from "react";
import { submitVerification } from "@/app/actions/builder-verification";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";

/**
 * B-02's four document cards — the approved layout (E-P5 correction).
 *
 * The approved screen asks for the company PAN and the authorised signatory's
 * Aadhaar (required), plus the incorporation certificate and RERA
 * registration (proposed, flagged for client confirmation). There is no
 * PAN-number text field: the approved validation is "PAN and Aadhaar files
 * at least", and the masked-PAN echo never appears in the approved design.
 *
 * Real file inputs, styled as the approved dashed upload button with the
 * chosen file's name beside it (the native control's own rendering — that is
 * exactly what the approved prototype shows). The chip flips to "Ready" when
 * a file is chosen; without JavaScript it stays "Required"/"Optional" and
 * the server-side validation carries the flow.
 *
 * The approved validation is a single submit-line error — "Upload PAN and
 * Aadhaar at least before submitting." — and that is what renders. The
 * approved per-document error box exists for format rejection, a state
 * sample mode cannot reach: no file is ever examined, because no file is
 * ever uploaded.
 *
 * Sample mode: files are never uploaded; the store records only that a file
 * was chosen. The compact notice below the cards says so — required by the
 * sample-mode honesty safeguards.
 */

type DocSpec = {
  readonly id: string;
  readonly title: string;
  readonly hint: string;
  readonly required: boolean;
};

const DOCUMENTS: readonly DocSpec[] = [
  { id: "panDocument", title: "Company PAN", hint: "Required", required: true },
  {
    id: "aadhaarDocument",
    title: "Authorised signatory Aadhaar",
    hint: "Required",
    required: true,
  },
  {
    id: "companyDocument",
    title: "Incorporation / registration certificate",
    hint: "Proposed — client to confirm",
    required: false,
  },
  {
    id: "reraDocument",
    title: "RERA registration",
    hint: "Proposed — client to confirm whether mandatory",
    required: false,
  },
];

function DocumentSlot({ spec }: { readonly spec: DocSpec }) {
  const [fileChosen, setFileChosen] = useState(false);
  return (
    <div className="rounded-[10px] border border-line bg-white p-[18px]">
      <div className="flex flex-wrap items-start justify-between gap-[14px]">
        <div className="min-w-0">
          <h3 className="t-card-title text-ink">{spec.title}</h3>
          <p className="mt-[3px] text-[14px] text-muted">{spec.hint}</p>
        </div>
        <Chip tone={fileChosen ? "success" : "muted"}>
          {fileChosen ? "Ready" : spec.required ? "Required" : "Optional"}
        </Chip>
      </div>
      <div className="mt-[14px]">
        <label htmlFor={spec.id} className="sr-only">
          {spec.title} — choose file
        </label>
        <input
          id={spec.id}
          name={spec.id}
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          onChange={(event) =>
            setFileChosen(Boolean(event.target.files?.length))
          }
          className="block w-full cursor-pointer text-[14px] text-muted file:mr-[12px] file:cursor-pointer file:rounded-[8px] file:border-2 file:border-dashed file:border-control-border file:bg-white file:px-[20px] file:py-[14px] file:text-[15px] file:font-bold file:text-brand hover:file:border-brand hover:file:bg-chip-neutral-bg"
        />
      </div>
    </div>
  );
}

export function VerificationForm({ isSample }: { readonly isSample: boolean }) {
  const [state, formAction, pending] = useActionState(submitVerification, {});

  return (
    <form action={formAction} className="mt-[20px] flex flex-col gap-[14px]">
      {DOCUMENTS.map((spec) => (
        <DocumentSlot key={spec.id} spec={spec} />
      ))}

      {/* Approved flag note, verbatim. */}
      <div className="rounded-[8px] border border-[#F3DFB4] bg-[#FFF7E8] px-[16px] py-[14px] text-[15px] leading-[1.6] text-body">
        Which company documents are mandatory — incorporation certificate, GST,
        RERA registration — is not settled in either source document. The four
        above are a design proposal, flagged for client confirmation.
      </div>

      {isSample ? (
        <div className="rounded-[8px] border border-line bg-tint px-[16px] py-[14px]">
          <p className="t-caption text-warning">
            Nothing is uploaded yet — the sample service records that a file
            was chosen, not its contents. Upload, virus scanning and retention
            are backend work (D-15).
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-[12px]">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Submitting…" : "Submit for verification"}
        </Button>
        {state.submitError ? (
          <span role="alert" className="text-[14px] text-danger">
            {state.submitError}
          </span>
        ) : null}
      </div>
      <p className="t-caption text-muted">
        Submitting moves your account to in review; an administrator decides.
        You can keep building listings in the meantime.
      </p>
    </form>
  );
}
