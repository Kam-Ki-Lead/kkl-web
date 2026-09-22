import { NextResponse, type NextRequest } from "next/server";
import { getSampleReviewControls } from "@/lib/services";

/**
 * Review-only reset for the Admin console.
 *
 * Smaller than the Seller's and Builder's equivalents, because the Admin
 * console has almost no states that need forcing: its queues are reached by
 * acting on them. What it does need is a **reset**, because staff decisions are
 * one-way — an approved application leaves the queue, and a reviewer walking
 * the flow a second time needs it back.
 *
 * The reset is deliberately the *whole* platform, not just the Admin store: a
 * verification decision writes into the Seller or Builder console, so resetting
 * Admin alone would leave those two carrying the last pass's decisions while
 * this console shows a fresh queue. That disagreement is exactly what these
 * screens exist to make impossible.
 *
 * Nothing links here, it returns 404 outside sample mode, and it authenticates
 * nobody — there is nobody to authenticate.
 */
export async function GET(request: NextRequest) {
  const review = getSampleReviewControls();
  if (review === null) return new NextResponse("Not found", { status: 404 });

  const params = request.nextUrl.searchParams;

  if (params.get("reset") === "1") {
    // Both consoles, and the Admin store with them. Each of these already
    // resets the Admin records, so calling both is belt and braces rather than
    // two different resets.
    review.reset();
    review.builder.reset();

    const to = params.get("to");
    if (to && to.startsWith("/admin")) {
      return NextResponse.redirect(new URL(to, request.url), { status: 303 });
    }
    return new NextResponse(
      "Reset. Every account, queue, decision, ledger and ticket is back to its seed state — " +
        "across the Seller, Builder and Admin consoles, because a staff decision writes into " +
        "the other two.\n",
      { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } },
    );
  }

  return new NextResponse(
    [
      "Admin review state — sample mode only.",
      "",
      "  ?reset=1                restore every seed value, across all three consoles",
      "  &to=/admin/...          where to go afterwards",
      "",
      "The Admin console needs no state switches: its queues are reached by acting",
      "on them. It needs a reset, because staff decisions are one-way.",
      "",
      "Nothing here authenticates anybody. There is no staff sign-in to bypass.",
      "",
    ].join("\n"),
    { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } },
  );
}
