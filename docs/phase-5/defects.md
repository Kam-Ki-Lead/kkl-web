# Phase 5 frontend defect register

Severity is the severity found. A critical or high row is closed only
when the retest below actually ran. Backend defects D5-1 through D5-8
are recorded in kkl-backend `docs/phase-5/defects.md`. This window did
not retest them and does not close them.

Dependencies in kkl-backend `docs/phase-5/dependencies.md` are not
defects and are not closed by a frontend wording change.

## Closed

| Id | Severity | Area | Reproduction | Disposition |
| --- | --- | --- | --- | --- |
| F5-1 | Medium | Copy | With auth and marketplace pointed at the API, the banner still said sign-in was sample data, and the seller notice said auth and payments were not implemented. | Fixed. Backend auth shows a REVIEW banner: sign-in uses the configured API, and payments, live calls, and live messages are not configured. The seller notice says the wallet and a refused purchase are enforced by kkl-backend. Retest: first browser run, seller dashboard. |
| F5-2 | High | Pricing display | The seller dashboard and sale tab could describe a 20% aging discount as the charge. Q-1b is unanswered. The API does not apply that percent. | Fixed when `KKL_MARKETPLACE=backend`. The dashboard says "Aging discount is not applied". The sale copy says a 20% window is stated for a lead 2–10 days old and the charged price is the configured price. Sale rows are kept only when the API status is `on_sale`. Retest: first browser run, dashboard and sale tab. No "Reduced from" and no "discounted 20%". |
| F5-4 | Medium | Redirect | `next=//evil.example/steal` must not leave this origin. Encoded slashes and backslashes were also accepted by the previous check. | `safeNext` now rejects those forms and returns `/account`. Unit retest: `tests/auth-contract.test.mjs`. Browser retest: staff sign-in with that `next` landed on `http://127.0.0.1:3815/account`. The encoded-slash cases were not repeated in the browser. |
| F5-5 | Medium | Download | `GET /seller/purchased/export.csv` threw and Next returned HTTP 500 with an empty body. | The seller and builder export routes catch `ServiceError` and return the message as `text/plain` with `no-store`. Unavailable is 503. Retest: staff session and an unauthenticated curl both received 503 and the unavailable sentence, with no phone. |

## Open

| Id | Severity | Area | Reproduction | Disposition |
| --- | --- | --- | --- | --- |
| F5-3 | Medium | Orders | A pending order was mapped to the failed chip, so a pending charge could be read as a failed charge. Contact is released only when the status is paid. | The adapter maps `completed` to paid, `pending` to pending, `cancelled` to cancelled, and anything else to failed. The chip uses those four labels. Not closed. The seeded seller has no pending order, so the browser did not show the pending chip. |

## Not closed, and not frontend defects

These blocked the journey. They are the backend dependency list. This
window did not guess a rule for them.

| Block | What the browser could not finish |
| --- | --- |
| Q-1b | No discounted charge. The screen says the stated window is not applied. |
| Q-1c, Q-1d, Q-1e | No expiry, refund, or tax invoice. Reconciliation says it does not apply those. |
| Q-4 | The intake lead's buy control stayed disabled. The visible reason is that verification is required and no provider is selected. No case was completed. |
| Q-5 | Recharge stopped on the unavailable panel. Nothing was charged. |
| Q-6 | Qualification did not show marketplace consent. This window did not write consent. |
| Q-7 | No WhatsApp or other live message. The support ticket was an in-app row only. |
| Q-8 | No upload and no download of file bytes. Export is 503. |
| Exotel, Sarvam | No call and no speech request. Voice health stayed simulated. |
| Meta Instant Form | Not built. |
| External staging | No public URL. |
| Platform secrets | Health still reports the loader as not integrated. |
| Client and security sign-off | Not given by this window. |
