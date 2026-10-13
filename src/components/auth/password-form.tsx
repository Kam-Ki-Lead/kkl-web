"use client";

import { useActionState } from "react";
import { passwordSignIn, type PasswordState } from "@/app/actions/auth";
import { Field, TextInput } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

/**
 * Sign in with an email address and a password.
 *
 * The second way in, for a deployment that cannot deliver a one-time code.
 * It posts to a server action rather than fetching, so the password is in a
 * POST body and never in a URL — a form that degraded to a GET would put it
 * in the address bar, in history and in the next request's referrer.
 *
 * `autoComplete` is set so a password manager fills and saves this correctly:
 * `username` on the address and `current-password` on the password are what
 * tell it this is a sign-in rather than a change-password form.
 *
 * One error line, whatever went wrong. The API deliberately does not say
 * whether an address has an account, and showing two different messages here
 * would hand that back.
 */
export function PasswordForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<PasswordState, FormData>(
    passwordSignIn,
    { email: "" },
  );

  return (
    <form action={action} className="flex flex-col gap-[16px]">
      <input type="hidden" name="next" value={next} />

      <Field
        id="auth-email"
        label="Email address"
        error={state.error}
        helper="The address on your account."
      >
        <TextInput
          id="auth-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="you@example.com"
          defaultValue={state.email}
          invalid={Boolean(state.error)}
          aria-describedby={state.error ? "auth-email-error" : "auth-email-helper"}
        />
      </Field>

      {/* The error is attached to the field above, not repeated here: one
          message for the pair, because the refusal is about the pair. */}
      <Field id="auth-password" label="Password">
        <TextInput
          id="auth-password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Your password"
          invalid={Boolean(state.error)}
          aria-describedby={state.error ? "auth-email-error" : undefined}
        />
      </Field>

      <Button type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
