"use client";

import Link from "next/link";
import { useActionState } from "react";
import { startEnquiry, type EnquiryFormState } from "@/app/actions/enquiry";
import { Field, TextArea, TextInput } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

/**
 * P-04 enquiry form and P-05 site-visit request — the same form with one extra
 * field, as approved.
 *
 * On a validation failure the entered values come back with the errors; on
 * success the draft is held server-side across OTP. Nothing is ever retyped.
 */
export function EnquiryForm({
  propertyId,
  propertySlug,
  kind,
}: {
  propertyId: string;
  propertySlug: string;
  kind: "enquiry" | "site_visit";
}) {
  const [state, formAction, pending] = useActionState<EnquiryFormState, FormData>(
    startEnquiry,
    {},
  );
  const v = state.values ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-[16px]">
      <input type="hidden" name="propertyId" value={propertyId} />
      <input type="hidden" name="propertySlug" value={propertySlug} />
      <input type="hidden" name="kind" value={kind} />

      <Field id="name" label="Your name" error={state.errors?.name}>
        <TextInput
          id="name"
          name="name"
          placeholder="Full name"
          autoComplete="name"
          defaultValue={v.name ?? ""}
          invalid={Boolean(state.errors?.name)}
          aria-describedby={state.errors?.name ? "name-error" : undefined}
        />
      </Field>

      <Field id="mobile" label="Mobile number" error={state.errors?.mobile}>
        <TextInput
          id="mobile"
          name="mobile"
          inputMode="numeric"
          placeholder="10-digit mobile number"
          autoComplete="tel-national"
          defaultValue={v.mobile ?? ""}
          invalid={Boolean(state.errors?.mobile)}
          aria-describedby={state.errors?.mobile ? "mobile-error" : undefined}
        />
      </Field>

      {kind === "site_visit" ? (
        <Field
          id="preferredDate"
          label="Preferred date"
          helper="The builder confirms the slot with you — a request is not a confirmed visit."
        >
          <TextInput
            id="preferredDate"
            name="preferredDate"
            type="date"
            defaultValue={v.preferredDate ?? ""}
          />
        </Field>
      ) : null}

      <Field id="message" label="Message (optional)">
        <TextArea
          id="message"
          name="message"
          rows={3}
          placeholder="What would you like to know?"
          defaultValue={v.message ?? ""}
        />
      </Field>

      <div className="flex flex-wrap items-center gap-[18px]">
        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : kind === "site_visit" ? "Request site visit" : "Send enquiry"}
        </Button>
        <Link
          href={`/property/${propertySlug}`}
          className="text-[15px] font-semibold text-brand underline underline-offset-2 hover:text-brand-deep"
        >
          Cancel
        </Link>
      </div>

      <p className="t-caption text-muted">
        Next: we verify your number by OTP. Your details stay filled in.
      </p>
    </form>
  );
}
