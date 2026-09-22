import { NextResponse, type NextRequest } from "next/server";
import { confirmEnquiryDestination } from "@/app/actions/enquiry";

/**
 * The handoff between verification (P-06) and confirmation (P-07).
 *
 * A route handler rather than a page, because it performs an effect — recording
 * the enquiry and clearing the server-held draft — and Next only permits cookie
 * writes in a Server Action or Route Handler.
 *
 * This is the direct-GET entry point. The verification step does NOT redirect
 * here: a Server Action redirecting to a Route Handler strands the client
 * router, so that path calls confirmEnquiryDestination() itself and redirects
 * straight to the resulting screen.
 *
 * Repeat safety does NOT come from clearing the draft. The draft carries a
 * submission token that the service treats as an idempotency key, so a replay
 * resolves to the enquiry already recorded. Clearing the cookie afterwards only
 * stops this browser asking again.
 */
export async function GET(request: NextRequest) {
  const target = await confirmEnquiryDestination();
  return NextResponse.redirect(new URL(target, request.url));
}
