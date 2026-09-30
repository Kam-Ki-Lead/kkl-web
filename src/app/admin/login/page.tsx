import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { Card } from "@/components/ui/card";
import { Field, TextInput } from "@/components/ui/field";
import { ButtonLink } from "@/components/ui/button";
import { authStoreKind } from "@/lib/services/backend/config";

export const metadata: Metadata = {
  title: "Staff sign-in",
  // A staff sign-in page has no reason to be in an index.
  robots: { index: false, follow: false },
};

/**
 * A-01 — staff sign-in.
 *
 * **This screen authenticates nobody, and it says so on its own face rather
 * than in a comment.** There is no password check, no session, no MFA and no
 * lockout; the button is a link. A form that looked like it worked would be the
 * single most misleading thing in this build, so it is not offered as one — the
 * fields are present because the layout is what is being reviewed, they are
 * disabled, and the way through is a labelled link.
 *
 * D-16 — whether staff sign-in requires MFA, and of what kind — is open, so no
 * second factor is drawn either. Inventing one would be inventing a security
 * control.
 */
export default function AdminLoginPage() {
  const signedIn = authStoreKind() === "backend";
  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-deep px-4 py-[40px]">
      <Card className="w-full max-w-[420px] p-[28px]">
        {/* The approved staff sign-in uses the small (19px) wordmark and a
            26px/800 title, not the public-header sizes. */}
        <Wordmark size="sm" />

        <p className="t-eyebrow mt-[18px] text-muted">Internal operations</p>
        {/* A-01 sets the login title at 26px/800 flat — it does not step
            with the frame, so it stays off the stepping t-heading class. */}
        <h1 className="mt-[8px] font-[family-name:var(--font-heading)] text-[26px] font-extrabold leading-[1.15] tracking-[-0.03em] text-ink">Staff sign-in</h1>
        <p className="t-body mt-[8px] text-body">
          Accounts are created by an administrator. There is no self-registration and no public
          route to this screen.
        </p>

        <div className="mt-[20px] flex flex-col gap-[14px]">
          <Field id="staff-email" label="Work email">
            <TextInput
              id="staff-email"
              name="email"
              type="email"
              placeholder="name@kamkilead.internal"
              disabled
              autoComplete="off"
            />
          </Field>
          <Field id="staff-password" label="Password">
            <TextInput
              id="staff-password"
              name="password"
              type="password"
              placeholder="••••••••••"
              disabled
              autoComplete="off"
            />
          </Field>
        </div>

        <div className="mt-[18px] rounded-[10px] border border-[#F3DFB4] bg-[#FFF7E8] p-[16px]">
          <h2 className="t-card-title text-warning">These fields do nothing</h2>
          <p className="t-body mt-[6px] text-body">
            {signedIn
              ? "No password is checked and this form creates no session. Staff access is an account that was already provisioned as staff. Sign in with that account. A customer sign-in stays a customer."
              : "No password is checked, no session is created and no second factor is asked for. Staff authentication belongs to kkl-backend and does not exist yet, so the fields are disabled rather than pretending — and the console is reachable without them, by anybody who has this URL."}
          </p>
          <p className="t-caption mt-[8px] text-muted">
            Whether staff sign-in requires MFA, and of what kind, is <strong>D-16</strong> and is
            not decided. No second factor is shown because none has been agreed.
          </p>
        </div>

        {signedIn ? (
          <ButtonLink href="/auth?next=/admin" className="mt-[16px] w-full">
            Sign in
          </ButtonLink>
        ) : (
          <ButtonLink href="/admin" className="mt-[16px] w-full">
            Continue to the console (no sign-in)
          </ButtonLink>
        )}

        <p className="t-caption mt-[14px] text-muted">
          <Link href="/" className="text-brand underline underline-offset-2">
            Back to the public site
          </Link>
        </p>
      </Card>
    </main>
  );
}
