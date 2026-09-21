"use server";

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
 * That cookie carries the draft only. It is not an authentication token, it
 * asserts nothing about who the person is, and nothing downstream trusts it for
 * identity — kkl-backend decides that. A draft enquiry is not authentication,
 * authorization, consent, lead ownership or financial state, none of which are
 * ever kept client-side.
 */

const DRAFT_COOKIE = "kkl_enquiry_draft";
const DRAFT_MAX_AGE_SECONDS = 60 * 30;

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
});

export type EnquiryDraft = z.infer<typeof draftSchema>;

export type EnquiryFormState = {
  readonly errors?: Partial<Record<keyof EnquiryDraft, string>>;
  readonly values?: Partial<EnquiryDraft>;
};

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
    path: "/",
    maxAge: DRAFT_MAX_AGE_SECONDS,
  });

  redirect(`/auth?next=/enquiry/confirm&mobile=${encodeURIComponent(parsed.data.mobile)}`);
}

export async function readEnquiryDraft(): Promise<EnquiryDraft | null> {
  const jar = await cookies();
  const raw = jar.get(DRAFT_COOKIE)?.value;
  if (!raw) return null;
  const parsed = draftSchema.safeParse(JSON.parse(raw));
  return parsed.success ? parsed.data : null;
}

/**
 * Completes the enquiry after verification.
 *
 * Idempotent by construction: the draft is cleared once submitted, and the
 * service derives the reference from the input, so a refresh or a second submit
 * does not create a second enquiry.
 */
export async function completeEnquiry(): Promise<{ enquiryId: string } | null> {
  const draft = await readEnquiryDraft();
  if (!draft) return null;

  const { enquiryId } = await getServices().enquiries.submitEnquiry({
    propertyId: draft.propertyId,
    kind: draft.kind,
    name: draft.name,
    mobile: draft.mobile,
    message: draft.message,
    preferredDate: draft.preferredDate,
  });

  const jar = await cookies();
  jar.delete(DRAFT_COOKIE);

  return { enquiryId };
}
