# Phase 3 integration — verification record

Executed **30 September 2026** on `kkl-web` `claude/phase-2-frontend` against
the review server already listening at `http://127.0.0.1:4010`. The frontend
was a production build (`next build`, then `next start` on port 3811). The
dev server was not used. `auth-dev-stub.mjs` was not used. `POST /v1/dev/sessions`
was not used.

This file records that run. It is not a production-readiness claim and it is
not client acceptance.

## Revisions

| | |
|---|---|
| Frontend | `611bca9dceb9fcec24916c1bfb5f889fa3ea0489` |
| Backend process | `abf89fce39f6f38a689fccc352391bcae9bef0d7` |
| Backend implementation | `d4116b3b072c6050326cf1591acc69359c7b8502` |
| OpenAPI | `1.0.0-phase3.l` |
| Database | `kkl_review` on `127.0.0.1:5433` |
| Migrations | Through 017, as reported for that process. This run did not re-apply migrations or run `verify:migrations`. |

Adapter unit tests in `tests/*.test.mjs` (41/41 on this commit) check the
frontend adapters in process. They are not evidence that this backend revision
was called.

## What was retained

No log file and no screenshot from the run was saved into this repository.
The sentences and status codes below are the results observed at the time.
Where a raw transcript was not kept, this record says so rather than
reproducing one.

While this file was written, the fixture counts in `kkl_review` were read
again. That read did not repeat the behavioural checks.

## Evidence levels

| Level | Meaning |
|---|---|
| Browser-tested | A person used the screen on the production build, with the settings below, against port 4010. |
| API-tested | The published HTTP API was called with a session from `POST /v1/auth/sessions`, or the frontend's server rendered that API's response into HTML. |
| Code inspection | The screen's action was read and matched to an endpoint the API check already called. The control itself was not used. |
| Not exercised | This run did not do it. |

## Settings

Build-time:

```
NEXT_PUBLIC_KKL_ENV=review
NEXT_PUBLIC_KKL_DATA_SOURCE=sample
```

Runtime on the process that served port 3811:

```
KKL_ENV=review
KKL_DATA_SOURCE=sample
KKL_AUTH=backend
KKL_BACKEND_BASE_URL=http://127.0.0.1:4010
KKL_STAFF_ORDERS=backend
KKL_INTAKE=backend
KKL_ENQUIRIES=backend
```

`KKL_DEV_AUTH_SECRET` and `KKL_LEAD_REQUESTS_DEV_SECRET` were unset on the
frontend. Local codes were read with `GET /v1/dev/challenges/{challengeId}/code`
and the review server's own development secret. That channel is local code
delivery. It is not a production OTP provider, and the sign-in screen says so.

`kkl-backend/docs/phase-3/integration.md` at `abf89fc` lists older domain
switches and omits `KKL_AUTH`, `KKL_STAFF_ORDERS`, and `KKL_INTAKE`. Those
three were set on this run. They were not inferred from that file.

### Enabled for this run

| Switch | What the screens called |
|---|---|
| `KKL_AUTH=backend` | `POST /v1/auth/code`, `POST /v1/auth/sessions`, refresh, logout |
| `KKL_STAFF_ORDERS=backend` | `GET /v1/orders?scope=all`, order detail, `POST /v1/orders/{id}/cancellation` |
| `KKL_INTAKE=backend` | Intake batch list and batch detail |
| `KKL_ENQUIRIES=backend` | `POST /v1/enquiries`, `GET /v1/enquiries/{enquiryId}` |

### Left on sample data

These switches were unset, so their adapters stayed on sample data. This run
does not verify them:

`KKL_LEAD_REQUESTS`, `KKL_LOCATIONS`, `KKL_PROFILES`, `KKL_LISTINGS`,
`KKL_MARKETPLACE`, `KKL_BUILDER_ENQUIRIES`, `KKL_SUPPORT`, `KKL_NOTIFICATIONS`,
`KKL_VERIFICATION`, `KKL_ADMIN_OPERATIONS`.

`KKL_DATA_SOURCE=sample` also stays on for the public portal. Sample property
pages, the site-wide sample banner, and the confirmation sentence "Sample
mode: nothing was sent to a builder and no notification was delivered" all
come from that. An enquiry filed from those pages is still a row in
`kkl_review`: `subject_ref` is the portal id `p-ivy-court`, the recipient is
null, and the row is unrouted. The sample page and the persisted enquiry
coexist. Nothing was sent to a builder.

Admin rail badges for the domains left on sample data still come from the
sample dashboard. That was visible during the staff browser session and was
not treated as a backend result.

## Results

| Capability | Level | Result |
|---|---|---|
| Sign-in through `POST /v1/auth/code` and `POST /v1/auth/sessions` | Browser-tested | A wrong code stayed on the code step with "That code is not correct." A correct local code established a session. The form states that the local channel is not production sign-in. |
| Refresh | API-tested | Refresh rotated both cookies. `GET /auth/refresh` returned 307 and set `kkl_access` and `kkl_refresh`. |
| Logout of the current session | Browser-tested and API-tested | `DELETE /v1/sessions/current` returned 204, and that refresh then returned 401. The account "Sign out" button returned `/account` to `/auth?next=/account`. |
| Logout of every session | API-tested. Button: code inspection | `DELETE /v1/sessions` made another refresh return 401. The account button posts `everywhere=1`. `revokeSession(true)` calls `DELETE /v1/sessions`. The button was not clicked. |
| Suspension | API-tested | A new `POST /v1/auth/sessions` while suspended returned 403 `account_suspended` with "This account is suspended. Contact support." The account was then set back to active. |
| Invalid or revoked session | Browser-tested and API-tested | A revoked refresh returned 401. A rejected access cookie redirected to `/auth` and the response did not contain sample order ids or the sample staff name. |
| Enquiry draft | Browser-tested | The draft survived the redirect to `/auth?next=/enquiry/confirm` with the mobile prefilled. After sign-in, the account page showed Ivy Court and the draft message. |
| Enquiry confirmation address | Browser-tested | The first confirmation URL used the submission token and returned 404. `611bca9` addresses the confirmation by the enquiry id the write returned. A later enquiry opened `/enquiry/0da03478-edc9-4b57-8c2b-c001811f8e85/confirmed`. |
| Enquiry ownership | API-tested | Buyer `ac962441-b535-46b5-9f4c-93ec435a4425` received 404 `not_found` for enquiry `1d8549f8-4fbb-49cc-a039-e49b79f4bbf8`. That id was absent from their own list. The session was then logged out with 204. |
| Two customer accounts | API-tested, sequential | Two customer tokens each received 404 for the seller's order. The sessions were one after another. Two browser profiles open at the same time were not exercised. |
| Customer denial of staff orders and intake | Browser-tested and API-tested | `GET /v1/orders?scope=all` and the intake batch list returned 403 `staff_only`. The signed-in customer's orders page showed "Listing every order is a staff operation." Intake showed "Lead intake is a staff operation." Both say the signed-in session is the only identity used. Sample order and intake ids were absent. |
| Staff order list, detail, filters, pagination | Browser-tested and API-tested | 101 orders, page size 100. Page 2 contained `FE1630-0000`. A past-end offset kept the total and showed an empty page. Pending, completed, and cancelled filters matched the stored rows. Detail included the lead and, for staff, the contact. `buyerDisplayName` was on the list. The detail payload observed in this run did not include it. |
| Order search | Browser-tested | The API publishes no search parameter. The count line says the search looks through the orders on this page. `FE1630-0000` is absent from page 1 and present on page 2 for the same query. |
| Pending cancellation | Browser-tested and API-tested | The browser cancelled pending `FE1630-0098` and stored the reason. Repeating it showed "Cancellation was refused" and "That order is already cancelled." The first reason remained. Cancelling completed `FE1630-0100` showed the Q-1d sentence and left the row completed. A cancellation body without a reason returned 422 `validation_failed`. |
| Intake list, detail, pagination, empty and past-end | API-tested, including HTML rendered by the frontend | Empty before the fixtures. 51 batches, page size 50, a second page, and a past-end page. Detail kept `invalid_phone` and did not include the rejected phone or name. |
| Unreachable backend | Browser-tested and API-tested | A second frontend process used the same switches with `KKL_BACKEND_BASE_URL=http://127.0.0.1:4017`, where nothing was listening. Staff orders returned the unavailable sentence. Sample rows and the sample staff name "A. Dutta" were absent. The review server on 4010 was not stopped for this check. |

## Fixes in `611bca9`

The commit changes three files and no behaviour outside them.

1. `src/app/actions/enquiry.ts` — a backend confirmation is addressed by the enquiry id returned from `POST /v1/enquiries`. The sample store still uses the submission token. The published read is `GET /v1/enquiries/{enquiryId}`, and the submission token is only the idempotency key.
2. `src/app/admin/orders/page.tsx` — when a query is present, the count line says the search looks through the orders on this page.
3. `src/components/admin/admin-shell.tsx` — an account read that fails because the service is unavailable stays on the fail-closed orders message. It does not substitute the sample staff name.

## Fixture footprint

Rows were added to `kkl_review` for this run. They were not deleted, and the
database was not reset.

The backend handoff's three accounts were already present. This run did not
sign in as them:

| Display name | Role | Account id | Status when this file was written |
|---|---|---|---|
| Review Staff | staff | `90c42fb8-498e-41c1-8044-2c09d8bd4981` | active |
| Review Seller | seller | `b13b9e12-eb0c-405d-9508-9c0454d02b2c` | active |
| Review Buyer | buyer | `e173a27a-0e40-4662-91ea-7a70c87e8f1c` | active |

The run's own accounts use the prefix `FE1630` in the display name, except
the two enquiry sign-ins, which keep the masked number the authenticator
stored. Phones are the dedicated range `+919163016957` through
`+919163016964`. All eight were active when this file was written.

| Display name | Role | Account id | Purpose |
|---|---|---|---|
| FE1630 staff | staff | `8d3b257d-4fd3-439a-9776-0330eb544224` | Staff API session |
| FE1630 buyerA | buyer | `d3392960-8553-4483-864d-d2e79eddd12a` | Customer isolation. Suspended, then set active again |
| FE1630 buyerB | buyer | `ac962441-b535-46b5-9f4c-93ec435a4425` | Second customer. Read of the other enquiry returned 404 |
| FE1630 seller | seller | `2ec65c99-6f79-4c46-975a-a99e12236d96` | Owns the 101 orders |
| FE1630 staff two | staff | `a483479a-aae1-4d1c-829f-d49776ac879b` | Browser staff session. Cancelled `FE1630-0098` |
| FE1630 buyer c | buyer | `329e14db-678f-4734-ab44-08073a03c3f7` | Suspension sign-in, then set active again |
| ••••6963 | buyer | `6a22acaf-99b1-47eb-bba9-fbb03dd8807a` | Enquiry draft. Created by sign-in, not pre-provisioned |
| ••••6964 | buyer | `d8284637-04d0-4873-a068-70aa37b9923f` | Confirmation retest after `611bca9` |

Orders: 101 rows, references `FE1630-0000` through `FE1630-0100`, 40 credits
each, request fingerprint `fe1630`. When this file was written: 98 pending,
2 cancelled (`FE1630-0098`, `FE1630-0099`), 1 completed (`FE1630-0100`).
`FE1630-0000` is the oldest and is the row used to show page 2. These pending
rows were inserted as the seller because a purchase cannot be left pending
while lead price is unconfigured. They are fixtures, not purchases.

Leads: 101, references of the form `LD-` plus hex. Intake: 51 batches,
references of the form `IN-` plus hex. One batch has source `import`
(`IN-B3A581F3`); 50 have source `manual`. Item outcomes: 101 accepted, 1
rejected, 1 duplicate. The rejected item's stored problem is `invalid_phone`.
The submitted rejected phone and name are not on the result row.

Enquiries, both unrouted, subject `p-ivy-court`, status `new`:

| Enquiry id | Reference | Buyer |
|---|---|---|
| `1d8549f8-4fbb-49cc-a039-e49b79f4bbf8` | `EN-52C86387` | ••••6963 |
| `0da03478-edc9-4b57-8c2b-c001811f8e85` | `EN-FD6B7154` | ••••6964 |

## Remaining dependencies

- Code delivery is the local development channel. No OTP provider is configured (`Q-7`).
- Payments are unconfigured (`Q-5`). Lead price is unconfigured (`Q-1a`). Completed cancellation refuses because a refund path is `Q-1d`.
- `buyerDisplayName` was present on the order list and absent from the detail payload observed in this run.
- Order search has no published parameter, so it covers the loaded page only. The screen says that.
- Two browser profiles at the same time were not opened.
- The "Sign out of every session" button was not clicked.
- The domain switches listed under "Left on sample data" were not part of this run.
- Caller OTP limit is 10 codes per 15 minutes. The close-out enquiry-ownership check used one further local code for FE1630 buyerB.

## Domain switches, 30 September 2026

This section is a later run. It does not change the `611bca9` results above,
and it does not attribute those results to the handoff accounts.

The same backend process was still listening on `http://127.0.0.1:4010`.
Health stayed 200. The checkout was still `abf89fce39f6f38a689fccc352391bcae9bef0d7`
(implementation `d4116b3b072c6050326cf1591acc69359c7b8502`, OpenAPI
`1.0.0-phase3.l`). The frontend application is `cfa60bd`. The production build served on
port 3811 was that tree. `next start` was used. `POST /v1/dev/sessions`
was not used. Local code delivery is not production OTP.

Settings, in addition to the `611bca9` set (`KKL_AUTH`, `KKL_STAFF_ORDERS`,
`KKL_INTAKE`, `KKL_ENQUIRIES`):

`KKL_LOCATIONS=backend`, `KKL_LOCATIONS_BASE_URL=http://127.0.0.1:4010`,
`KKL_PROFILES=backend`, `KKL_LEAD_REQUESTS=backend`,
`KKL_LEAD_REQUESTS_BASE_URL=http://127.0.0.1:4010`, `KKL_LISTINGS=backend`,
`KKL_BUILDER_ENQUIRIES=backend`, `KKL_SUPPORT=backend`,
`KKL_NOTIFICATIONS=backend`, `KKL_VERIFICATION=backend`,
`KKL_ADMIN_OPERATIONS=backend`, `KKL_MARKETPLACE=backend`.

`KKL_DATA_SOURCE` stayed `sample`. The site-wide sample banner stays because
portal listings are still the sample catalogue. No development secret was set
on the frontend.

### Accounts actually exercised

These are the handoff fixtures. The FE1630 accounts were not used for this run.

| Display name | Role | Account id |
|---|---|---|
| Review Buyer | buyer | `e173a27a-0e40-4662-91ea-7a70c87e8f1c` |
| Review Seller | seller | `b13b9e12-eb0c-405d-9508-9c0454d02b2c` |
| Review Staff | staff | `90c42fb8-498e-41c1-8044-2c09d8bd4981` |

### Browser

| Check | Result |
|---|---|
| Public location search for “rajar” | PASS. The picker returned Rajarhat, Kolkata. |
| Review Buyer profile email | PASS. `review.buyer.phase3@example.com` was still present after reload. The in-memory profile card was absent. |
| Review Buyer opening `/seller/requests/new` | PASS as a refusal. The page said “The lead marketplace is for Seller and Builder accounts.” and named Review Buyer. It did not render the sample seller or the form. |
| Review Seller lead request | PASS. `LR-MUOEZMQQ2YV` (`47ab81d7-df3c-4b6c-b466-2e0e0136e3f5`), notes “Phase 3 Review Seller request for Rajarhat.” Still present after reload. Staff list labelled it `Account b13b9e12-eb0c-405d-9508-9c0454d02b2c`, not the sample seller. |
| Review Seller wallet and marketplace | PASS as reads and a refusal. Balance ₹0. Buy Leads showed 0 leads and “Lead prices are not yet set by the client.” Recharge said no payment provider credentials are configured (Q-5) and that nothing was charged. |
| Review Seller support ticket | PASS. `TK-02F76F84`, subject “Phase 3 seller support check”, still present after reload and in the staff queue under Review Seller. Attachments remain unavailable. No external message was sent. |
| Review Seller notifications | PASS. Empty list, with the sentence that records are stored and no WhatsApp, email or push was sent. |
| Verification case `VER-EC4FAE39` | PASS as a stored case and a refusal to pass it. Submission recorded “Verification cannot be carried out: no provider is selected” (Q-4). The case was still there after the server was rebuilt. |
| Property draft `PL-5362CF550A` | PASS as a draft. `dce729f6-eeda-405c-a455-f0b628a3d907`, title “Phase 3 Rajarhat apartment”, type Apartment, still present after reload. Send for review stayed disabled. The preview named missing locality, price, intent, configuration, contact name, contact method, and a photograph. Photographs need storage (Q-8). The draft was not published. |
| Review Seller opening `/builder` | PASS as a refusal, after the fix. The page said the session is a seller account and did not show the sample builder’s listings or an active subscription. Before the fix, the same URL rendered the sample builder dashboard (2 published, 1 draft, subscription Active). |
| Sign out of every session | PASS. The button was clicked on Review Seller’s browser session. A second session for the same account, opened through `POST /v1/auth/code` and `POST /v1/auth/sessions`, then received 401 `unauthorized` on refresh. |
| Staff wallets | PASS as a read. Review Buyer and Review Seller were listed at ₹0 with no ledger entries. An adjustment was not submitted. |
| Staff lead-request and support queues | PASS as reads of the rows above. |

### Restrictions, not completions

- Purchase, recharge, refund, invoice, and a verification pass still refuse. Enabling the switches did not configure a price, a payment provider, or a verification provider.
- Builder enquiries were not exercised. None of the three handoff accounts is a builder. A seller session is refused by the Builder console and is not promoted.
- Listing submission for review was not completed. The draft is missing required fields, and a photograph cannot be stored while storage is unconfigured (Q-8).
- Admin rail badges for KYC, property review, refunds, support and notifications still come from the sample dashboard. The support queue itself showed one backend ticket while the rail badge still said 6.
- Seller business profile, KYC and billing-address screens are still the sample seller record. The shell name and the wallet are the signed-in account.
- Portal property cards remain the sample catalogue because `KKL_DATA_SOURCE=sample`.
- Two browser profiles were not open at the same time. This browser shares one cookie jar. Account separation in this run is the buyer refusal, the seller refusal on the Builder console, and the second-session revoke above.

### Fixture request

A builder account, if the Builder enquiry inbox is to be exercised in a later run. Do not create one through `/v1/dev/sessions` from this frontend.

## Admin queues and two browser contexts, 30 September 2026

This section is a later run. It does not change the `611bca9` results or the
domain-switch results above.

The same backend process was still listening on `http://127.0.0.1:4010`
(pid 24008, started 18:23:54). Health stayed 200. The checkout was still
`abf89fce39f6f38a689fccc352391bcae9bef0d7` (implementation
`d4116b3b072c6050326cf1591acc69359c7b8502`, OpenAPI `1.0.0-phase3.l`).
The frontend application for this section is `75944cf`.
`next build` then `next start` on port 3811. `POST /v1/dev/sessions` was not
used. One further local code was issued for Review Buyer, through the sign-in
form, so a second browser profile could sign in. That code was not a
production message.

The switches are the same set as the domain-switch section. No development
secret was set on the frontend.

### Accounts actually exercised

Review Staff stayed in the IDE browser. Review Buyer was signed in through
the published form in a separate headless Chrome profile (`--user-data-dir`
of its own, remote debugging on port 9333). Both were open at the same time.
Review Seller was not signed in again. The earlier “sign out of every session”
result was not repeated.

### Browser

| Check | Result |
|---|---|
| Staff operations dashboard | PASS as a mixed read. Support tile and rail badge were 1, with “1 awaiting first reply”. Refund tile and badge were 0, “No refund request is stored”. Notifications had no failed badge. The fixture alerts for a failed send, intake run INT-2291, and webhook retries were absent. KYC stayed 4 and property review stayed 4, and the notice says those queues are still fixtures. Today’s six volume figures stayed labelled as fixtures. |
| Staff support queue | PASS. The only row was `TK-02F76F84`, Review Seller, awaiting reply. The rail badge was 1. |
| Staff notification deliveries | PASS as an empty read. “0 of 0 delivery attempts”. The empty state says a queued row is not a delivered message. Filters include Queued, Sending, Suppressed, and Not configured. No fixture recipient was shown. |
| Staff refunds | PASS as an empty read and a refusal to move money. No sample dispute was listed. D-06 stayed open. |
| Staff consent | PASS as an empty read. “No suppression is stored.” “0 entries.” The caption says no address is stored and this screen does not deliver a message. No address was added. |
| Review Buyer on `/admin` in the other browser, while staff remained on `/admin/consent` | PASS as a refusal. The buyer page said the session is a buyer account and does not open the sample queues, and named Review Buyer. It did not show `TK-02F76F84` or the sample seller. The staff page still showed the suppression list and support badge 1. |
| Review Buyer on `/seller/requests/new` in that same separate profile | PASS as a refusal. “The lead marketplace is for Seller and Builder accounts.” Named Review Buyer. Did not show the sample seller. |

### Restrictions, not completions

- KYC applications and property review on the operations dashboard are still the sample queues. Their badges still match those sample pages. Owner submissions and verification cases were already counted from the backend and stayed empty.
- No delivery attempt was stored, so a queued, unconfigured, or suppressed row was not observed. The screen can show those states. None of them is treated as sent or failed.
- A credit adjustment was not submitted.
- Builder enquiries remain blocked on a builder account. The fixture request above still stands.
- Listing submission for review remains blocked by missing fields and storage (Q-8).
- Seller business profile, KYC, and billing-address screens remain the sample seller record.
- Portal property cards remain the sample catalogue.
- Local code delivery is not production OTP. A queued notification is not a delivered message.

## Older records

`kkl-backend/docs/phase-3/verification-slice-*.md` and `checklist.md` name
the revisions they were written against. At `abf89fc` the checklist still
cites `kkl-web` `e1b57c8` and browser figures against `7b5a01b`. Those files
were not edited by this commit, and this record does not replace them.
`docs/phase-2/verification.md` remains the Phase 2 sample-service record.
