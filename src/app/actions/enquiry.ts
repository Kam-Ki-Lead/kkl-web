"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getServices } from "@/lib/services";

/**
 * The enquiry flow: form → OTP verification → confirmation.
 *
 * "Next: we verify your number by OTP. Your details stay filled in." Keeping that
 * promise needs the draft to survive a navigation, so it is held in a short-lived
 * httpOnly cookie written by the server.
 *
 * What that cookie is and is not
 * ------------------------------
 * It carries the draft only. It is not an authentication token, it asserts nothing
 * about who the person is, and nothing downstream trusts it for identity —
 * kkl-backend will decide that. A draft enquiry is not authentication,
 * authorization, consent, lead ownership or financial state, none of which are
 * ever kept client-side.
 *
 * Because it is httpOnly and scoped to this origin, one browser session cannot
 * read another's draft, and the draft never appears in a URL — no name, mobile
 * number or message is ever placed in a query string, where it would leak into
 * history, logs and referrers.
 *
 * Duplicate submission
 * --------------------
 * Clearing the draft is NOT what prevents a duplicate. A cleared cookie only
 * means this browser stops asking; it says nothing about a second tab that
 * already loaded the page, a retried request, or a replay. Each draft therefore
 * carries a `submissionToken` generated once, and the service treats that token
 * as an idempotency key: submitting it twice returns the first enquiry and
 * records nothing new. The cleared cookie is a convenience on top of that, not
 * the mechanism.
 */

const DRAFT_COOKIE = "kkl_enquiry_draft";
const DRAFT_TTL_SECONDS = 60 * 30;

const draftSchema = z.object({
  propertyId: z.string().min(1),
  propertySlug: z.string().min(1),
  kind: z.enum(["enquiry", "site_visit"]),
  name: z.string().trim().min(2, "Enter your name as it should reach the builder."),
  mobile: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number."),
  message: z.string().trim().max(1000).optional(),
  preferredDate: z.string().trim().optional(),
  /** Idempotency key for this attempt. Generated once, when the draft is created. */
  submissionToken: z.string().uuid(),
  /** Epoch ms. Lets an expired draft be distinguished from a missing one. */
  createdAt: z.number().int().positive(),
});

export type EnquiryDraft = z.infer<typeof draftSchema>;

export type EnquiryFormState = {
  readonly errors?: Partial<Record<keyof EnquiryDraft, string>>;
  readonly values?: Partial<EnquiryDraft>;
};

/** Why a draft could not be used, so the UI can say which it was. */
export type DraftProblem = "missing" | "expired";

/** Validates, stores the draft, and hands off to OTP verification. */
export async function startEnquiry(
  _previous: EnquiryFormState,
  formData: FormData,
): Promise<EnquiryFormState> {
  const raw = {
    propertyId: String(formData.get("propertyId") ?? ""),
    propertySlug: String(formData.get("propertySlug") ?? ""),
    kind: String(formData.get("kind") ?? "enquiry"),
    name: String(formData.get("name") ?? ""),
    mobile: String(formData.get("mobile") ?? ""),
    message: String(formData.get("message") ?? "") || undefined,
    preferredDate: String(formData.get("preferredDate") ?? "") || undefined,
    submissionToken: randomUUID(),
    createdAt: Date.now(),
  };

  const parsed = draftSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !errors[key]) errors[key] = issue.message;
    }
    // The entered values go back with the errors — nothing is retyped.
    return { errors, values: raw as Partial<EnquiryDraft> };
  }

  const jar = await cookies();
  jar.set(DRAFT_COOKIE, JSON.stringify(parsed.data), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DRAFT_TTL_SECONDS,
  });

  // No personal detail travels in the URL. The verification screen reads the
  // number it needs from the draft, server-side.
  redirect("/auth?next=/enquiry/confirm");
}

export async function readEnquiryDraft(): Promise<
  { ok: true; draft: EnquiryDraft } | { ok: false; problem: DraftProblem }
> {
  const jar = await cookies();
  const raw = jar.get(DRAFT_COOKIE)?.value;
  if (!raw) return { ok: false, problem: "missing" };

  let parsed;
  try {
    parsed = draftSchema.safeParse(JSON.parse(raw));
  } catch {
    return { ok: false, problem: "missing" };
  }
  if (!parsed.success) return { ok: false, problem: "missing" };

  if (Date.now() - parsed.data.createdAt > DRAFT_TTL_SECONDS * 1000) {
    return { ok: false, problem: "expired" };
  }
  return { ok: true, draft: parsed.data };
}

/** The mobile to prefill on the verification screen, read server-side. */
export async function pendingVerificationMobile(): Promise<string | null> {
  const result = await readEnquiryDraft();
  return result.ok ? result.draft.mobile : null;
}

/**
 * Completes the enquiry after verification.
 *
 * The submission token is the idempotency key. A replay — refresh, a second tab,
 * a retried request — resolves to the enquiry already recorded rather than
 * creating another one.
 */
export async function completeEnquiry(): Promise<
  { ok: true; receipt: string } | { ok: false; problem: DraftProblem }
> {
  const result = await readEnquiryDraft();
  if (!result.ok) return result;

  const { draft } = result;
  await getServices().enquiries.submitEnquiry({
    idempotencyKey: draft.submissionToken,
    propertyId: draft.propertyId,
    kind: draft.kind,
    name: draft.name,
    mobile: draft.mobile,
    message: draft.message,
    preferredDate: draft.preferredDate,
  });

  const jar = await cookies();
  jar.delete(DRAFT_COOKIE);

  // The confirmation screen is addressed by the submission token, not by the
  // enquiry reference: references are sequential and would be enumerable in a
  // URL. The reference is shown on the screen, where it belongs.
  return { ok: true, receipt: draft.submissionToken };
}

/**
 * Where a completed verification should land, having recorded the enquiry.
 *
 * Returns a page path, never the /enquiry/confirm handoff. A Server Action that
 * redirects to a Route Handler leaves the client router stranded: it asks the
 * target for an RSC payload, gets a plain redirect response instead, aborts the
 * navigation, and the person sits on the verification screen with the enquiry
 * unrecorded. So the effect happens here and the redirect goes straight to the
 * screen that shows the result.
 */
export async function confirmEnquiryDestination(): Promise<string> {
  const result = await completeEnquiry();
  return result.ok
    ? `/enquiry/${result.receipt}/confirmed`
    : `/enquiry/unavailable?reason=${result.problem}`;
}
