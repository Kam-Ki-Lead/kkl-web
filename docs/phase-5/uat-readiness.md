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

Those items, and closed defects F5-1 through F5-5, are completed local checks. They are not Razorpay, WhatsApp, Exotel, Sarvam, storage, or public-staging verification.

The backend three-second runs in kkl-backend `docs/phase-5/results.md` (`tests/phase5-performance.test.mjs`, evidence `local_synthetic_load`) lasted about 3002 ms for search, 3019 ms for lead reads, 3034 ms for call scheduling, and 3004 ms for the idle poll. This window did not rerun them. They are short synthetic local benchmarks. They are not sustained-load or production-capacity validation. `agreedTarget` and `acceptanceThreshold` are false. The two browser timings in `test-report.md` are the same kind of local observation: one navigation each, not a load test.

## Outstanding provider and staging verification

These were not run. The local checks above do not fill them.

1. Q-5. There is no Razorpay sandbox payment and no signed sandbox webhook from Razorpay.
2. Q-7. There is no WhatsApp sandbox send. No live message was sent.
3. Q-8. There is no file upload or download. The purchased-lead export returns 503 text. That refusal is correct unavailable behaviour, not a completed download.
4. Exotel and Sarvam were not called. A simulated voice socket is not a delivered call.
5. There is no externally reachable staging URL and no platform secret loader.

Unanswered product rules stay separate from that list. Q-1b, Q-1c, Q-1d, and Q-1e are unanswered, so this UI does not invent a discounted charge, an expiry, a refund, or a tax invoice. Q-4 and Q-6 are unanswered: the intake lead cannot be bought, staff cannot award verified, and qualification did not record marketplace consent.

No client signature and no security signature. This checklist does not provide either.

## Pending scope authorisation

Meta Instant Form intake is not built. It is waiting on scope authorisation. It is not an automatic Phase 5 acceptance gate. That matches kkl-backend `docs/phase-5/dependencies.md`.

F5-1, F5-2, F5-3, F5-4, and F5-5 stay closed in `defects.md`. Closing them does not close the provider and staging list above.
