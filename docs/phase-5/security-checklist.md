# Phase 5 frontend security checklist

Prepared as evidence from the kkl-web window. This file is not a
security sign-off and it is not a client sign-off. The backend checklist
in kkl-backend `docs/phase-5/security-checklist.md` is that window's
record. This one does not close those rows.

Branch `claude/phase-2-frontend`. Browser category: review-browser
against `http://127.0.0.1:3815` and `http://127.0.0.1:4012`. No sandbox
provider and no live provider.

| Area | What was checked | Evidence | Remaining limitation |
| --- | --- | --- | --- |
| Unauthorised routes | `/admin/wallets` without a session redirected to `/auth` and did not render a ledger or the sample seller. After logout, `/seller/billing` redirected to `/auth` and did not keep the ledger sentence. Cleared cookies did the same for `/admin/wallets`. | First browser run. | Expired-access plus live-refresh was not exercised. |
| Role denial | A seller session on `/admin` was told the session is a seller account. It did not see the sample staff queue. A staff session on `/seller` showed that account's own shell and not the seeded seller phone. | First browser run. | The seller shell does not refuse a staff session. Staff see their own wallet there. |
| Object access | The intake lead page showed no phone. The purchased export returned no contact file. | First run and the retest. | Another seller was not signed in. Seller `+919800005011` is at the daily OTP cap, so a second-account comparison was not repeated. |
| Server actions and API authorisation | Sign-in does not read a role from the form. Purchases, recharge, and export go through the backend adapters. Export throws `unavailable` rather than building a CSV. | `src/app/actions/auth.ts`, commerce adapter, export routes. | Unauthenticated export is 503 with the unavailable sentence, not 401. No contact bytes are returned. A later export that can succeed must check the session before writing a file. |
| Single origin | Two configured API origins throw before a call. The review process set every enabled adapter to `http://127.0.0.1:4012`. | `tests/phase5-origin.test.mjs`. Ports 4010 and 4011 were left running and were not the frontend's base URL. | The platform `NEXT_PUBLIC_KKL_DATA_SOURCE` stays `sample` so screens whose switch is off stay on labelled fixtures. |
| CSRF and cookies | Session cookies are `httpOnly`, `SameSite=Lax`, `path=/`, and `Secure` when `NODE_ENV=production`. The review server is `next start`, so `Secure` was set. Playwright on `http://127.0.0.1` accepted them. Logout clears access and refresh. | `src/lib/auth/cookies.ts`. First run recorded `httpOnly=true sameSite=Lax secure=true`. | Lax allows a top-level GET navigation to send the cookie. Server actions are POST. This pass did not add a separate CSRF token. |
| Open redirect | `safeNext` rejects an empty value, length over 512, a protocol-relative path, a backslash, NUL, other control characters, and encoded slash or backslash. | Unit tests. Browser retest of `next=//evil.example/steal` landed on `/account`. | Encoded-slash cases were not repeated in the browser. |
| XSS | No `dangerouslySetInnerHTML` under `src`. A support ticket body with a script and an image error handler did not open a dialog (`dialogs=0`) and remained text on the ticket URL. | First browser run. Ticket `TK-4D9EA088` in the isolated database. | Transcripts and lead answers were not given a second payload. They render as React text on the same rule. |
| Security headers | Document responses, including the export refusal, set `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Permissions-Policy: camera=() microphone=() geolocation=()`, `Content-Security-Policy: frame-ancestors 'none'; base-uri 'none'; object-src 'none'`, and `Cache-Control: private, no-store`. | First run and the unauthenticated export curl. | `script-src` was not set. Next serves its own scripts, and a nonce policy was not part of this pass. |
| Secrets | The dev authenticator secret is read on the server for the verification script. It is not a `NEXT_PUBLIC_` variable and it is not in git. Health reports `secrets.loader=not_integrated`. | Health JSON. `.env.example` names ports only. | The local env file is not a production secret manager. |
| PII rendering and caching | Intake lead: no phone. Export: no contact rows and `no-store`. Logout dropped the billing text. Wallet reconciliation does not print another account's phone. | Browser runs. | A purchased contact file was not available to test caching of, because export cannot build one (Q-8). |
| Upload and download | Export routes catch `ServiceError` and return text with `no-store`. Status 503 for unavailable. | Retest, authenticated and unauthenticated. | Upload of media bytes is still the API's `503 storage_not_configured` (Q-8). This window did not upload a file. |
| Duplicate submit and stale quote | The purchase form keeps an idempotency key, and a changed quote is refused in unit tests. | Existing commerce-display tests. | Not submitted in the browser. The intake lead's buy control was disabled, so there was no confirm button to double-click. |
| Payment failure | Recharge is hidden when `availability.recharge.available` is false. The panel names Q-5 and says nothing was charged. | Retest. | No sandbox decline was available to click through. |
| Account switch | Logout and cookie clearing were checked. A second sign-in on the same browser profile, seller then staff, was the first run's sequence. | First run. | The seller daily cap blocked a further seller sign-in after that run. |
| Redirects and deployment guard | A build/runtime env mismatch returns 503 plain text and does not serve the page. This process was built and started with `KKL_ENV=review` matching `NEXT_PUBLIC_KKL_ENV=review`. | Earlier 503 from a mismatched start was rebuilt before the recorded pass. The recorded pass was the matching process. | That guard is not a substitute for TLS on a public host. No public host was created. |

## Data protection

The review pair is loopback HTTP. That is not TLS. Session cookies were
`Secure` because the Node process is production mode; Chromium on
loopback still stored them.

No live call, live message, or card charge was made. Fixture publication,
verification, and consent were not written by this window. The intake
lead stayed consent unknown on the screen that was opened.

Logo palette and the approved layout files were not part of this change.
`docs/phase-2/visual/geometry-1440.json` stays an unrelated working-tree
change and is not evidence in this checklist.
