"use client";

import { useActionState } from "react";
import { builderRegisterStep, type BuilderRegisterState } from "@/app/actions/builder-register";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";

/**
 * B-01 registration form.
 *
 * Both phases post to one server action so the form works before hydration —
 * the same fix the Buyer OTP form needed. "Change number" is its own form,
 * because as a second submit inside the code form it becomes the implicit
 * default and Enter would discard the typed code.
 */
export function BuilderRegisterForm({ isSample }: { isSample: boolean }) {
  const [state, action, pending] = useActionState<BuilderRegisterState, FormData>(builderRegisterStep, {
    step: "details",
    mobile: "",
    company: "",
  });

  const err = state.errors ?? {};

  return (
    <div className="flex flex-col gap-[16px]">
      {isSample ? (
        <p className="rounded-[8px] bg-chip-warning-bg px-[14px] py-[10px] text-[14px] text-warning">
          No message is sent and no account is created in sample mode. Enter any six digits to
          continue; <span className="t-mono">000000</span> shows the invalid state.
        </p>
      ) : null}

      {state.step === "details" ? (
        <form action={action} className="flex flex-col gap-[16px]">
          <input type="hidden" name="phase" value="details" />

          <Field id="breg-mobile" label="Mobile number" error={err.mobile}>
            <TextInput
              id="breg-mobile"
              name="mobile"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="10-digit mobile number"
              defaultValue={state.mobile}
              invalid={Boolean(err.mobile)}
              aria-describedby={err.mobile ? "breg-mobile-error" : undefined}
            />
          </Field>

          <Field
            id="breg-company"
            label="Company name"
            error={err.company}
            helper="This appears on your listings and invoices. You can change it later."
          >
            <TextInput
              id="breg-company"
              name="company"
              autoComplete="organization"
              defaultValue={state.company}
              invalid={Boolean(err.company)}
              aria-describedby={err.company ? "breg-company-error" : "breg-company-helper"}
            />
          </Field>

          <Button type="submit" disabled={pending}>
            {pending ? "Sending…" : "Send OTP"}
          </Button>
        </form>
      ) : (
        <div className="flex flex-col gap-[16px]">
          <form action={action}>
            <input type="hidden" name="phase" value="code" />
            <input type="hidden" name="mobile" value={state.mobile} />
            <input type="hidden" name="company" value={state.company} />
            <input type="hidden" name="intent" value="change-number" />
            <p className="text-[15px] text-body">
              Enter the six-digit code for{" "}
              <span className="t-mono text-ink">+91 {state.mobile}</span>.{" "}
              <button
                type="submit"
                className="font-semibold text-brand underline underline-offset-2"
              >
                Change number
              </button>
            </p>
          </form>

          <form action={action} className="flex flex-col gap-[16px]">
            <input type="hidden" name="phase" value="code" />
            <input type="hidden" name="mobile" value={state.mobile} />
            <input type="hidden" name="company" value={state.company} />

            <Field id="breg-code" label="Verification code" error={err.code}>
              <TextInput
                id="breg-code"
                name="code"
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
                placeholder="6 digits"
                invalid={Boolean(err.code)}
                aria-describedby={err.code ? "breg-code-error" : undefined}
              />
            </Field>

            <Button type="submit" disabled={pending}>
              {pending ? "Verifying…" : "Verify and continue"}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
