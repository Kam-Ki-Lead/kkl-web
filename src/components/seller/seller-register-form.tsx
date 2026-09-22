"use client";

import { useActionState } from "react";
import { registerStep, type RegisterState } from "@/app/actions/seller-register";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";

/**
 * S-01 registration form.
 *
 * Both phases post to one server action so the form works before hydration —
 * the same fix the Buyer OTP form needed. "Change number" is its own form,
 * because as a second submit inside the code form it becomes the implicit
 * default and Enter would discard the typed code.
 */
export function SellerRegisterForm({ isSample }: { isSample: boolean }) {
  const [state, action, pending] = useActionState<RegisterState, FormData>(registerStep, {
    step: "details",
    mobile: "",
    agency: "",
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

          <Field id="reg-mobile" label="Mobile number" error={err.mobile}>
            <TextInput
              id="reg-mobile"
              name="mobile"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="10-digit mobile number"
              defaultValue={state.mobile}
              invalid={Boolean(err.mobile)}
              aria-describedby={err.mobile ? "reg-mobile-error" : undefined}
            />
          </Field>

          <Field
            id="reg-agency"
            label="Agency or your name"
            error={err.agency}
            helper="This appears on your invoices. You can change it later."
          >
            <TextInput
              id="reg-agency"
              name="agency"
              autoComplete="organization"
              defaultValue={state.agency}
              invalid={Boolean(err.agency)}
              aria-describedby={err.agency ? "reg-agency-error" : "reg-agency-helper"}
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
            <input type="hidden" name="agency" value={state.agency} />
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
            <input type="hidden" name="agency" value={state.agency} />

            <Field id="reg-code" label="Verification code" error={err.code}>
              <TextInput
                id="reg-code"
                name="code"
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
                placeholder="6 digits"
                invalid={Boolean(err.code)}
                aria-describedby={err.code ? "reg-code-error" : undefined}
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
