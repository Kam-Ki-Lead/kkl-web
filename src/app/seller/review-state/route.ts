import { NextResponse, type NextRequest } from "next/server";
import { getSampleReviewControls } from "@/lib/services";

/**
 * Review-only switches for the Seller states a reviewer cannot otherwise reach.
 *
 * S-04's four verification states, S-05's suspension, S-16's three payment
 * outcomes and S-10's insufficient-balance failure all depend on state that is
 * decided elsewhere — by an administrator, or by a payment gateway. Without a
 * way to set them, half the approved Seller screens could never be looked at.
 *
 * The approved prototype solved this with a review bar across the top of every
 * screen. That bar is reviewer tooling and must not appear in the application,
 * so the switches live here instead: a URL a reviewer visits deliberately,
 * with nothing in the interface pointing at it.
 *
 * WHY THIS IS SAFE TO SHIP
 * ------------------------
 * It refuses to exist outside sample mode. `getSampleReviewControls()` returns
 * null whenever the data source is the real API, so on any build pointed at
 * kkl-backend this route returns 404 before reading a single parameter — and the
 * production guard in proxy.ts already refuses to serve sample mode to real
 * users, so the two conditions cannot both be true.
 *
 * The controls come through @/lib/services rather than from the sample store
 * directly. Route handlers and pages are bundled separately, and importing the
 * store from both gave two module instances: this route set a balance and the
 * pages went on showing the old one.
 *
 * What it does NOT do: it does not authenticate, authorise, approve a document,
 * take a payment or move money. It sets the values that decide which designed
 * screen renders. A real deployment has no equivalent, and needs none —
 * verification and suspension are administrator actions in kkl-backend.
 */

export async function GET(request: NextRequest) {
  const review = getSampleReviewControls();
  if (review === null) {
    return new NextResponse("Not found", { status: 404 });
  }

  const params = request.nextUrl.searchParams;

  // Read-only: the ledger invariant, as JSON, so a test can assert it rather
  // than infer it from rendered figures. Returned before any mutation so the
  // caller sees the state it asked about.
  if (params.get("reconcile") === "1") {
    return NextResponse.json(review.reconcile(), {
      headers: { "cache-control": "no-store" },
    });
  }

  const applied: string[] = [];

  // Reset runs first, so ?reset=1&balance=0 means "start clean, then set the
  // balance" rather than silently undoing the balance that came with it.
  if (params.get("reset") === "1") {
    review.reset();
    applied.push("reset");
  }

  const kyc = params.get("kyc");
  if (kyc === "not_submitted" || kyc === "pending" || kyc === "approved" || kyc === "rejected") {
    review.setKycStatus(kyc);
    applied.push(`kyc=${kyc}`);
  }

  const account = params.get("account");
  if (account === "active" || account === "suspended") {
    review.setAccountStatus(account);
    applied.push(`account=${account}`);
  }

  const payment = params.get("payment");
  if (payment === "success" || payment === "pending" || payment === "failed") {
    review.setPaymentOutcome(payment);
    applied.push(`payment=${payment}`);
  }

  // CR07: what the sample verification service answers next, so each outcome —
  // including the one that must never become a pass — can be seen on the screens.
  const provider = params.get("provider");
  if (
    provider === "verified" ||
    provider === "failed" ||
    provider === "unclear" ||
    provider === "unavailable"
  ) {
    review.setVerificationProviderResult(provider);
    applied.push(`provider=${provider}`);
  }

  const balance = params.get("balance");
  if (balance !== null && /^\d{1,7}$/.test(balance)) {
    review.setBalance(Number(balance));
    applied.push(`balance=${balance}`);
  }

  if (applied.length === 0) {
    return new NextResponse(
      [
        "Seller review state — sample mode only.",
        "",
        "  ?kyc=not_submitted|pending|approved|rejected   verification state (S-04, S-05)",
        "  ?account=active|suspended                      account state (S-05)",
        "  ?payment=success|pending|failed                next recharge outcome (S-16)",
        "  ?balance=<rupees>                              set the balance, e.g. 0 for S-10",
        "  ?provider=verified|failed|unclear|unavailable  next sample verification result (CR07)",
        "  ?reset=1                                       restore every seed value",
        "  ?reconcile=1                                   the ledger invariant, as JSON",
        "  &to=/seller/...                                where to go afterwards",
        "",
        "These set which designed screen renders. Nothing here approves a document,",
        "authorises an account or moves money.",
        "",
      ].join("\n"),
      { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } },
    );
  }

  // Only same-origin paths are followed, so this cannot be used to bounce
  // someone to another site with a Kaam Ki Lead URL.
  const raw = params.get("to") ?? "/seller";
  const to = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/seller";

  return NextResponse.redirect(new URL(to, request.url), {
    headers: { "cache-control": "no-store" },
  });
}
