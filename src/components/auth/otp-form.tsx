"use client";

import { useActionState } from "react";
import { otpStep, type OtpState } from "@/app/actions/auth";
import { Field, TextInput } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/states";

/**
 * P-06 — mobile OTP sign-in / register.
 *
 * Both steps post to one server action, so the flow survives a page without
 * JavaScript instead of degrading to a GET that would drop the pending enquiry.
 * The action passed to useActionState has to be the server action itself: a
 * client closure that picks between two of them only exists after hydration, so
 * the form would do nothing until then.
 *
 * Nothing here authenticates. See src/app/actions/auth.ts.
 */
export function OtpForm({
  presetMobile,
  next,
  isSample,
}: {
  presetMobile: string;
  next: string;
  isSample: boolean;
}) {
  const initial: OtpState = presetMobile
    ? { step: "code", mobile: presetMobile }
    : { step: "mobile", mobile: "" };

  const [state, action, pending] = useActionState<OtpState, FormData>(
    otpStep,
    initial,
  );

  return (
    <div className="flex flex-col gap-[16px]">
      {isSample ? (
        <p className="rounded-[8px] bg-chip-warning-bg px-[14px] py-[10px] text-[14px] text-warning">
          No message is sent in sample mode. Enter any six digits to continue;{" "}
          <span className="t-mono">000000</span> shows the invalid state.
        </p>
      ) : null}

      {state.step === "mobile" ? (
        <form action={action} className="flex flex-col gap-[16px]">
          <input type="hidden" name="phase" value="request" />
          <Field
            id="auth-mobile"
            label="Mobile number"
            error={state.error}
            helper="We use this to confirm your enquiries and replies."
          >
            <TextInput
              id="auth-mobile"
              name="mobile"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="10-digit mobile number"
              defaultValue={state.mobile}
              invalid={Boolean(state.error)}
              aria-describedby={
                state.error ? "auth-mobile-error" : "auth-mobile-helper"
              }
            />
          </Field>
          <Button type="submit" disabled={pending}>
            {pending ? "Sending…" : "Send code"}
          </Button>
        </form>
      ) : (
        <div className="flex flex-col gap-[16px]">
          {/*
            "Change number" is its own form rather than a second submit inside
            the code form. In one form it was the first submit button, which
            makes it the implicit default: typing the code and pressing Enter
            discarded the code and went back to step one.
          */}
          <form action={action}>
            <input type="hidden" name="phase" value="verify" />
            <input type="hidden" name="mobile" value={state.mobile} />
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
            <input type="hidden" name="phase" value="verify" />
            <input type="hidden" name="mobile" value={state.mobile} />
            <input type="hidden" name="next" value={next} />

            <Field id="auth-code" label="Verification code" error={state.error}>
              <TextInput
                id="auth-code"
                name="code"
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
                placeholder="6 digits"
                invalid={Boolean(state.error)}
                aria-describedby={state.error ? "auth-code-error" : undefined}
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

/** Shown when a verification step is reached with nothing to verify. */
export function NothingToVerify() {
  return (
    <StateMessage title="There is nothing waiting to be confirmed">
      Your verification link has expired or was already used. Start from the
      property you were enquiring about.
    </StateMessage>
  );
}
