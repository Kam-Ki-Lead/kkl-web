# Phase 5 UAT readiness — frontend

This build is not accepted for UAT sign-off and it is not Phase 5
complete. Nothing in this directory is a signature for the client or
for a security reviewer.

The backend file kkl-backend `docs/phase-5/uat-readiness.md` said no
browser pass had been done. That pass is this directory. It does not
change the backend file's conclusion.

## Inspectable

- Review frontend on `http://127.0.0.1:3815`, built with `NEXT_PUBLIC_KKL_ENV=review` and `NEXT_PUBLIC_KKL_DATA_SOURCE=sample`, runtime `KKL_ENV=review`.
- Every enabled adapter pointed at `http://127.0.0.1:4012`. Ports 4010 and 4011 were not used for these screens.
- Voice left at `http://127.0.0.1:4020`, simulated, not provider-verified. No call was placed.
- Browser evidence: `docs/phase-5/browser-evidence.json` and `docs/phase-5/browser-followup.json`.
- Test report, security checklist, and defect register in this directory.
- `npm test`: 121 passed. Typecheck passed. Production build of this tree succeeded.

## What a reviewer can see in the browser

- Sign-in against the Phase 5 development authenticator, then logout that clears both session cookies.
- A seller stopped at the operations console, and an anonymous visitor stopped at sign-in.
- Aging copy that does not turn the stated 20% window into a price.
- Wallet reconciliation that does not claim an aging discount, an expiry, or a refund.
- Recharge refused before any payment control, with the Q-5 sentence.
- An intake lead that stays masked, with buy disabled.
- A purchased-lead download that returns 503 text and no contact file.
- A support body that stays text.
- A protocol-relative `next` that stays on `/account`.
- A synthetic pending order on the seller's list and detail. The chip reads Pending. Nothing was released. No cancel or refund control. The wallet was not debited.

## What still prevents Phase 5 acceptance

1. Q-1b, Q-1c, Q-1d, and Q-1e are unanswered. This UI will not invent a discounted charge, an expiry, a refund, or a tax invoice.
2. Q-4. The intake lead cannot be bought. Staff cannot award verified. No consent was recorded from qualification (Q-6).
3. Q-5. There is no Razorpay sandbox payment and no signed sandbox webhook from Razorpay.
4. Q-7. There is no WhatsApp sandbox send. No live message was sent.
5. Q-8. There is no file upload or download. The purchased-lead export returns 503 text. That refusal is correct unavailable behaviour, not a completed download.
6. Exotel and Sarvam were not called. A simulated voice socket is not a delivered call.
7. Meta Instant Form intake is not built.
8. There is no externally reachable staging URL and no platform secret loader.
9. No client signature and no security signature. This checklist does not provide either.

F5-1, F5-2, F5-3, F5-4, and F5-5 are closed in `defects.md`. Closing them does not close the list above.
