import { NextResponse, type NextRequest } from "next/server";
import { getSampleReviewControls } from "@/lib/services";

/**
 * Review-only switches for the Builder states a reviewer cannot otherwise reach.
 *
 * The same reasoning as the Seller's equivalent: B-02's four verification
 * states, B-05's subscription states, B-17's two contact-access alternatives
 * and B-04's three payment outcomes all depend on decisions taken elsewhere.
 * Without a way to set them, most of the Builder console could never be looked
 * at.
 *
 * Nothing in the interface links here, and it returns 404 outside sample mode.
 * It does not authenticate, authorise, approve a document, take a payment or
 * move money — it sets which designed screen renders.
 */

export async function GET(request: NextRequest) {
  const review = getSampleReviewControls();
  if (review === null) return new NextResponse("Not found", { status: 404 });

  const builder = review.builder;
  const params = request.nextUrl.searchParams;

  if (params.get("reconcile") === "1") {
    return NextResponse.json(builder.reconcile(), {
      headers: { "cache-control": "no-store" },
    });
  }

  const applied: string[] = [];

  // Reset first, so ?reset=1&kyc=pending reads as "start clean, then set".
  if (params.get("reset") === "1") {
    builder.reset();
    applied.push("reset");
  }

  const kyc = params.get("kyc");
  if (kyc === "not_submitted" || kyc === "pending" || kyc === "approved" || kyc === "rejected") {
    builder.setKycStatus(kyc);
    applied.push(`kyc=${kyc}`);
  }

  const account = params.get("account");
  if (account === "active" || account === "suspended") {
    builder.setAccountStatus(account);
    applied.push(`account=${account}`);
  }

  const subscription = params.get("subscription");
  if (
    subscription === "none" ||
    subscription === "active" ||
    subscription === "due" ||
    subscription === "grace" ||
    subscription === "expired"
  ) {
    builder.setSubscriptionState(subscription);
    applied.push(`subscription=${subscription}`);
  }

  const outcome = params.get("subscriptionOutcome");
  if (outcome === "active" || outcome === "pending" || outcome === "failed") {
    builder.setSubscriptionOutcome(outcome);
    applied.push(`subscriptionOutcome=${outcome}`);
  }

  const contact = params.get("contact");
  if (contact === "included" || contact === "unlock") {
    builder.setContactAccess(contact);
    applied.push(`contact=${contact}`);
  }

  const payment = params.get("payment");
  if (payment === "success" || payment === "pending" || payment === "failed") {
    builder.setPaymentOutcome(payment);
    applied.push(`payment=${payment}`);
  }

  const balance = params.get("balance");
  if (balance !== null && /^\d{1,7}$/.test(balance)) {
    builder.setBalance(Number(balance));
    applied.push(`balance=${balance}`);
  }

  if (applied.length === 0) {
    return new NextResponse(
      [
        "Builder review state — sample mode only.",
        "",
        "  ?reset=1                                        restore every seed value",
        "  ?reconcile=1                                    the ledger invariant, as JSON",
        "  ?kyc=not_submitted|pending|approved|rejected    verification (B-02, B-19)",
        "  ?account=active|suspended                       account state (B-19)",
        "  ?subscription=none|active|due|grace|expired     subscription (B-03, B-05, B-19)",
        "  ?subscriptionOutcome=active|pending|failed      next subscribe result (B-04)",
        "  ?contact=included|unlock                        contact-access alternative (B-16, B-17)",
        "  ?payment=success|pending|failed                 next recharge result (B-22)",
        "  ?balance=<rupees>                               set the credit balance",
        "  &to=/builder/...                                where to go afterwards",
        "",
        "These set which designed screen renders. Nothing here approves a document,",
        "authorises an account or moves money.",
        "",
      ].join("\n"),
      { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } },
    );
  }

  const raw = params.get("to") ?? "/builder";
  const to = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/builder";
  return NextResponse.redirect(new URL(to, request.url), {
    headers: { "cache-control": "no-store" },
  });
}
