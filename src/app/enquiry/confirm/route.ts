import { NextResponse, type NextRequest } from "next/server";
import { completeEnquiry } from "@/app/actions/enquiry";

/**
 * The handoff between verification (P-06) and confirmation (P-07).
 *
 * A route handler rather than a page, because it performs an effect — recording
 * the enquiry and clearing the server-held draft — and Next only permits cookie
 * writes in a Server Action or Route Handler.
 *
 * Repeat-safe: the draft is cleared once consumed, so a refresh or a second
 * visit cannot record the same enquiry twice. It lands on the expired state
 * instead of silently enquiring again.
 */
export async function GET(request: NextRequest) {
  const result = await completeEnquiry();
  const target = result
    ? `/enquiry/${result.enquiryId}/confirmed`
    : "/enquiry/expired";
  return NextResponse.redirect(new URL(target, request.url));
}
