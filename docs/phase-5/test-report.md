# Phase 5 frontend test report

This is the kkl-web record of the review-browser pass against the shared
Phase 5 pair. It is not a sandbox run, not a live-provider run, and not
acceptance of Phase 5.

Historical Phase 2–4 evidence is not treated as proof of this combined
system. Backend results in kkl-backend `docs/phase-5/results.md` are that
window's local measurements. They are not repeated here as browser proof.

## Revisions and runtime

| Piece | Revision | How it was used |
| --- | --- | --- |
| kkl-web | working tree on `4568ce72d565fb914dfb02766ff913273ccf9329`, branch `claude/phase-2-frontend` | Built and served for this pass. The commit that contains these notes is the record of that tree. |
| kkl-backend checkout | `d980dda003921b5a0513ea9f2f403f458f21f10b` on `claude/phase-4-qualification` | `git rev-parse` at evidence time. The handoff says the API process was started from `e7eaf6cf5619456c50595df8caa28780ba3f3e9b` and was not restarted for the later documentation commit. This window did not restart it. |
| kkl-backend Phase 5 tree named in the handoff | `8ae579aca755837914b6e6fa97567c54160c218c` | The handoff's Phase 5 API revision. |
| kkl-voice | `c42e6a4b86d9037e9a1e617b013bdf78a696323b` | Health only. No call was placed. |

Runtime, all loopback:

- Frontend: `next start` on `http://127.0.0.1:3815`, Next.js 16.2.11. Build and process used `NEXT_PUBLIC_KKL_ENV=review`, `NEXT_PUBLIC_KKL_DATA_SOURCE=sample`, `KKL_ENV=review`, `KKL_DATA_SOURCE=sample`.
- Every enabled adapter (`KKL_AUTH`, lead requests, locations, profiles, listings, enquiries, marketplace, builder enquiries, support, notifications, verification, admin operations, staff orders, intake, qualification) was `backend` with base `http://127.0.0.1:4012`.
- `KKL_ALLOW_LIVE_CALLS` and `KKL_ALLOW_LIVE_MESSAGING` were unset.
- API health: `environment=review`, `secrets.loader=not_integrated`, `localEnvironmentFileIsProductionSecretManager=false`, live telephony and live messaging false, `providerVerified` false.
- Voice `http://127.0.0.1:4020`: `simulatedRuntime=true`, `providerVerified=false`.
- Ports 4010 and 4011 still answered and were not used as this frontend's API.
- Database named by the handoff: `kkl_phase5` on `127.0.0.1:5433`. Port 5432 was not used.

`npm test` (121 tests) and `tsc --noEmit` passed on this tree before the rebuild that served the retest.

## Categories

| Category | What happened |
| --- | --- |
| Review-browser | Playwright against `127.0.0.1:3815`, which called `127.0.0.1:4012`. Two runs, below. |
| Mocked provider | Not a separate run. The API reports providers unconfigured. No test transport was injected. |
| Sandbox | Not run. Razorpay, WhatsApp, Exotel, and Sarvam credentials are absent. |
| Live | Not run. No call, no message, no card charge, no public deploy. |

Fixture phones and rows are synthetic and are not product rules. Staff `+919800005010`, seller `+919800005011`, intake lead `ec336642-0763-4b8e-ba21-1d9f6645ec74` with consent unknown, qualification run `cdc9689f-3d7b-4fe2-b142-21042ee63396` still collecting. The fixture calling window is not a client calling window.

## First browser run

`scripts/verify-phase5.mjs` wrote `browser-evidence.json`. 23 checks passed and 2 failed. The failures are recorded as failures.

Passed, seller session `+919800005011` unless noted:

- Unauthenticated `/admin/wallets` redirected to `/auth?next=%2Fadmin%2Fwallets` and did not show a ledger.
- Auth at 390×844: Tab from the mobile field focused a button, and the page did not overflow horizontally.
- Seller dashboard showed "Aging discount is not applied" and the REVIEW banner. It did not say sign-in was simulated or that payments were unimplemented.
- Sale tab, about 910 ms, did not show "Reduced from" or "discounted 20%".
- Seller billing showed the ledger comparison and did not say a payment was captured.
- Intake lead page showed no `+91` phone.
- A support ticket containing `<script>` and an `<img onerror>` payload did not open a dialog. The text stayed on `/seller/support/TK-4D9EA088`. That ticket is a row in the isolated database, not a sent message.
- A seller session on `/admin` was told it was a seller account and did not see the sample staff queue.
- Public `/search` returned 200 in about 1081 ms.
- Logout removed `kkl_access` and `kkl_refresh`. `/seller/billing` then redirected to sign-in and did not keep the ledger sentence.
- Staff session: wallet ledger comparison, qualification run without a level or "consent granted", intake queue without a "sample queue" label, and `/seller` without the seeded seller phone or the sample name Sujata Pal.
- Staff cookies were `httpOnly`, `SameSite=Lax`, `Secure`. Clearing them returned `/admin/wallets` to sign-in.
- Document responses set `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, a CSP of `frame-ancestors 'none'; base-uri 'none'; object-src 'none'`, and `Cache-Control: private, no-store`.

Failed, and not counted as passes:

- Recharge. The script required a "Continue to payment" button. The page does not render that button when recharge is unavailable.
- Open redirect. The script asked the seller phone for another code. That phone's daily OTP counter was already 10, so the code field never appeared. `safeNext` was not exercised by that attempt.

The purchased-lead export in this first run returned HTTP 500 with an empty body and no contact row. That was a frontend defect (F5-5), not a successful download.

## Retest

`scripts/verify-phase5-followup.mjs` at `2026-10-02T21:15:53Z`, one staff code, after the 15-minute OTP window moved. The seller phone was not used again.

| Check | Result |
| --- | --- |
| `next=//evil.example/steal` | Landed on `http://127.0.0.1:3815/account`. |
| `/seller/billing/recharge` | "Recharge is unavailable" because Razorpay credentials are not configured (Q-5). Footnote: no payment was attempted and nothing was charged. No payment button. |
| Intake lead | Buy control was not a link. Price "Not priced yet". Balance ₹0. The visible hold says verification is required, no case has been opened, and no provider is selected (Q-4). No order was submitted. No phone was shown. |
| `GET /seller/purchased/export.csv` | 503, `text/plain`, the unavailable sentence, no phone. The same response, with `private, no-store` and `nosniff`, was returned without a session cookie. |

## Paths that stop before a completed journey

The supported chain is intake, qualification, marketplace listing, purchase, download, notification, plus the admin screens that exist.

| Step | What this browser pass saw | Where it stops |
| --- | --- | --- |
| Intake | Staff queue rendered from the API. | A new batch was not submitted. |
| Qualification | Seeded run did not show a level or marketplace consent. | No retry was clicked. No Exotel or Sarvam call. |
| Marketplace listing | Sale tab did not invent an on-sale price or a 20% charge. | Q-1b is unanswered, so no discounted charge is rendered. |
| Purchase | The intake lead's buy control was disabled. | No `POST /v1/orders` from the browser. The API refusal code was not observed here. Consent and verification were not written. |
| Download | Export returned 503 and no file. | Q-8. Storage is not configured. |
| Notification | Not opened. | A queued or unconfigured delivery was not labelled delivered. The support ticket above is not a provider send. |
| Payment | Recharge panel refused before a form. | Q-5. No sandbox payment and no charge. |
| Admin | Wallets showed the ledger comparison. Seller role was denied. | Staff cannot award verified (Q-4). No refund or tax invoice (Q-1d, Q-1e). |

Account isolation that was exercised: a seller cannot open the operations console; a staff session on the seller shell did not show the other fixture's phone; logout and cleared cookies dropped the billing and wallet screens. Session refresh with an expired access token and a live refresh cookie was not exercised. Pagination was not clicked in the browser. Duplicate purchase and a stale quote were not submitted; the quote refusal remains a unit test in `tests/phase5-origin.test.mjs` and the commerce-display tests.

## Performance

Two browser timings on this machine, one navigation each: sale tab about 910 ms, public search about 1081 ms. They are not agreed targets and they are not a load test. No tool was pointed at Razorpay, WhatsApp, Exotel, Sarvam, or at ports 4010 and 4011.

## Unit checks that are not this browser pass

`tests/phase5-origin.test.mjs` refuses two backend origins and accepts one origin with a trailing slash. `tests/auth-contract.test.mjs` refuses an empty `next`, a `next` over 512 characters, a protocol-relative `next`, a backslash, a NUL, a control character, and `%2f` / `%5c`. The browser retest covered only `//evil.example/steal`.
