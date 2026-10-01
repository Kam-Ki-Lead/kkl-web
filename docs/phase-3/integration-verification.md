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

## Builder enquiry inbox, 1 October 2026

This section is a later run. It does not change the runs above, and it does
not repeat the support, refund, or notification checks.

The same backend process was still listening on `http://127.0.0.1:4010`
(pid 24008). The checkout was still
`abf89fce39f6f38a689fccc352391bcae9bef0d7` (implementation
`d4116b3b072c6050326cf1591acc69359c7b8502`, OpenAPI `1.0.0-phase3.l`).
The frontend application for this section is `53ee3c3`. `next build` then `next start` on port 3811. The switches are
the same set as the domain-switch section. `POST /v1/dev/sessions` was not
used. No development secret was set on the frontend.

`GET /v1/enquiries` has no offset or limit. Pagination was not added.

### Accounts actually exercised

| Display name | Role | Account id | How |
|---|---|---|---|
| Review Builder | builder | `99aa72e3-4602-4f7a-a01e-936dfc535993` | Published sign-in form, local code. Number ends 0104. |
| Review Seller | seller | `b13b9e12-eb0c-405d-9508-9c0454d02b2c` | Separate Chrome profile, published sign-in form, local code. |

One local code was used for each. Neither code was a production message.
The builder has no listings and no enquiry is addressed to that account.
The two existing enquiries remain unrouted (`recipient_account_id` null).
They are not this builder’s inbox.

### Browser

| Check | Result |
|---|---|
| No session opening `/builder/enquiries` | PASS as a refusal. The browser landed on `/auth?next=/builder/enquiries`. It did not show the sample enquiries (Rina Sen, Arun Das, Manish Kapoor, Sharmila Bose) or an active subscription. |
| Review Builder inbox | PASS as an empty inbox. “No enquiries yet.” The contact card said access is awaiting confirmation and named the three undecided rules. No name, number, or mask was shown. The shell said “No subscription”, not the sample plan. |
| Unread filter | PASS as an empty filter. “Nothing matches this filter.” Still no sample names. This is not a populated inbox. |
| Enquiry detail for `1d8549f8-4fbb-49cc-a039-e49b79f4bbf8` | PASS as a refusal. That row is unrouted and belongs to another buyer. The builder received 404. The message was not shown. |
| Dashboard and properties | PASS as not using the sample builder. Published and draft tiles are “—”, “Not this account's property list.” Properties says the sample builder’s projects are not shown. Enquiry count is 0. |
| Reload after a frontend restart | PASS. The same empty inbox and the 0 enquiry count were still there. Nothing had been written. |
| Review Seller in a second browser, while Review Builder’s dashboard was open | PASS as a refusal. The seller page said the session is a seller account and does not open the sample builder, and named Review Seller. It did not show “No enquiries yet” or the sample names. |
| Backend unreachable | PASS as a failure. With `KKL_BACKEND_BASE_URL` pointed at a closed port, `/builder/enquiries` said the service is not responding and that the records are not served from this process. The sample names were not shown. The API process on 4010 was left running. The frontend was then pointed back at 4010. |

### Restrictions, not completions

- A populated inbox was not in the fixture. The empty list is the stored state. It is not evidence that a row would render.
- Contact access stays `awaiting_decision` (Q-2a). The recipient projection includes no contact and no message (Q-2b). No mask was composed.
- No subscription resource is published. The shell does not show the sample “Active” plan.
- Builder property projects are still not this account’s list. The sample projects are withheld rather than presented as Review Builder’s.

### What still blocks listing submission

The stored owner draft `PL-5362CF550A` already has a title and a property type.
`POST /v1/listings/{listingId}/submission` still requires, for an owner listing:

- `locationId`
- `priceInr`
- `transaction`
- `configuration`
- `contactName`
- `contactPreference`
- at least one `listing_media` row with `kind = image`

Those fields are missing on the draft. A builder listing does not require the
owner-only fields or the photograph row; it still requires title, property
type, location, and price.

Object storage (Q-8) means the file bytes are not kept. `POST /v1/listings/{listingId}/media`
still inserts a media row without a storage key, and the photograph rule counts
that row. Storage being unconfigured does not by itself make submission
impossible. The owner photograph step records file names in the browser and
does not call that media endpoint, so the draft also has no image row.

Submission does not publish. `to: published` stays refused
(`publication_not_decided`).

### What remains for the sample KYC and property-review queues

These are not the same gap as storage.

- `/admin/kyc` still lists sample applications. The published verification
  resources are cases and queues, already used by `/admin/verification`. No
  published route accepts or lists KYC document applications. Replacing that
  queue needs that contract. It does not need listing-media storage.
- `/admin/properties` still lists sample moderated portal listings (reported,
  published, unpublished). The published staff queue is
  `GET /v1/listings/queue`, already used by owner submissions. No published
  route moderates a live portal listing or a buyer report. Replacing that
  queue needs that contract. It does not need listing-media storage.

The inbox checks above are not a verified inbox journey. Empty and
unread-empty states, a missing session, a non-builder session, and an
unreachable API were tested. A populated recipient detail, mark-read and
status actions, and isolation of an enquiry routed to this builder were not.
No enquiry has this builder as recipient.

The sentence above that the photograph step does not call the media endpoint
described the screen. The listing adapter still posted a media row from a
file name, and it invented a byte size when the form sent a label such as
“1.2 MB”. That post is removed in the section below.

## Owner listing draft, 1 October 2026

This section is a later run. It does not change the runs above.

The same backend process was still listening on `http://127.0.0.1:4010`
(pid 24008). The checkout was still
`abf89fce39f6f38a689fccc352391bcae9bef0d7` (implementation
`d4116b3b072c6050326cf1591acc69359c7b8502`, OpenAPI `1.0.0-phase3.l`).
The frontend application for this section is `6f12b11`. `next build` then
`next start` on port 3811. The switches are the same set as the domain-switch
section. `POST /v1/dev/sessions` was not used. No development secret was set
on the frontend. Local codes were used for Review Seller, Review Staff, and
Review Builder. They are not production messages.

### Contract, by role

An owner listing (`posted_as = owner`) must have title, property type,
location, price, transaction, configuration, contact name, contact preference,
and at least one image row before submission. A builder listing must have
title, property type, location, and price. It is not held to the owner contact,
configuration, or photograph rules. This frontend does not copy a builder
price range into `priceInr`, and it does not add owner fields to satisfy
validation.

### Browser

The draft is `PL-5362CF550A` (`dce729f6-eeda-405c-a455-f0b628a3d907`), owned by
Review Seller, `posted_as` owner, status draft.

| Check | Result |
|---|---|
| Review Builder opening that draft before any of these fields were saved | PASS as a refusal. 404. The listing title was not shown. |
| Save through the existing controls | PASS. Selling, Rajarhat, ₹72,00,000, 3 BHK, contact name Review Seller, preference phone. The photograph step was saved with no file and added no media row. |
| Reload | PASS. The listing page showed ₹72,00,000, Rajarhat, Kolkata, 3 BHK, no photographs, and the photograph blocker only. |
| Edit | PASS. The price was changed to ₹71,00,000 and saved. After a frontend restart the same page still showed ₹71,00,000, Rajarhat, and 4 of 6 steps. Status stayed draft. |
| Review Builder opening the same draft after those saves | PASS as a refusal. 404. The price and title were not shown. |
| Submission | PASS as validation, not publication. Preview listed one blocker: add at least one photograph. Send for review stayed disabled. A submit from that form did not leave the preview, did not show “Sent for review”, and left the row `status = draft` with `images = 0`. The page still says nothing publishes. |
| Staff opening `/admin/kyc` and `/admin/properties` | PASS as labelled fixtures. KYC says the rows are sample applications and are not verification cases. Property review says the rows are sample portal listings and are not owner submissions. A seller session is refused before either queue. |
| Review Builder properties | PASS as not this account’s list. The screen does not start a listing or record a photograph count, and it says a builder listing is not held to an owner’s contact, configuration, or photograph requirement. |

Stored after the edit: `transaction = sale`, location set, `price_inr = 7100000`,
`configuration = 3`, contact name set, `contact_preference = phone`, image
count 0, status draft, same account.

### Photographs

A file name held in the browser is not uploaded and is not written as a media
row. The photograph step remains saveable. The preview says no photograph is
stored and that send for review stays blocked until a file can be stored.
`POST /v1/listings/{id}/media` can still insert a row without a storage key,
and the photograph rule counts that row. This frontend does not call it to
clear the blocker. `uploadMedia` already refuses with `storage_not_configured`
(Q-8).

For the backend window: please leave the photograph count tied to a stored
file. A metadata-only image row should not satisfy an owner submission while
Q-8 is open. This frontend will not create those rows.

### What this does not verify

- The builder enquiry inbox is not verified as a whole. Empty, unread-empty,
  session, role, and service-failure checks stand. Populated recipient detail,
  read and status actions, and recipient-specific isolation remain untested.
- A builder draft was not created. The sample editor’s price range and
  photograph count are not the contract fields, so they are not written in
  their place.
- KYC applications and live or reported property moderation still need
  contracts. Verification cases and the owner-submission queue were not used
  as substitutes. Both sample queues stay labelled.
- Publication remains refused (`publication_not_decided`, Q-3). Submission
  validation and publication are different checks.

## Photograph availability, 1 October 2026

This section is a later run. It does not change the runs above.

Backend checkout `a8d9b1af43ee26ef07b9d86899b917d677763e86`
(`a8d9b1a`, “Require a confirmed upload before a photograph counts”),
OpenAPI `1.0.0-phase3.m`, migration `018_listing_media_availability.sql`.
The API was already listening on `http://127.0.0.1:4010` (pid 29692). It was
not restarted. Health reported storage `storesBytes: false`, `integrated: false`,
dependency Q-8. The frontend application for this section is `4b4334e`.
`next build` then `next start` on port 3811 (pid 22048). The switches are the
same set as the domain-switch section. `POST /v1/dev/sessions` was not used.
No development secret was set on the frontend. One local code was used for
Review Seller. That is not a production message.

The media contract, read from the API and not from the migration name:

- `POST /v1/listings/{id}/media` stores a row as `availability: declared` and
  `stored: false`. A client storage key, provider, or confirmation is ignored.
- `availability` is `declared`, `unavailable`, or `available`. `stored` is true
  only for an image the storage adapter has confirmed.
- `POST /v1/listings/{id}/media/upload` refuses while storage is unconfigured
  and does not mark a row available.
- An owner submission with no image row is `photograph_missing` (“Add at least
  one photograph of the property.”). An image row that is not available is
  `photograph_not_available` (“No uploaded photograph is available. A file
  record does not satisfy the requirement.”). Submission does not publish.

### What persisted

The same owner draft, `PL-5362CF550A`
(`dce729f6-eeda-405c-a455-f0b628a3d907`), Review Seller, `posted_as` owner.
After this frontend was rebuilt, the listing page still showed ₹71,00,000,
Rajarhat, Kolkata, 3 BHK, contact preference phone, and status draft.
A save of the photograph step with no newly selected file left the existing
row in place and did not add a second one.

### Media states and submission

| Check | Result |
|---|---|
| No image row, before this save | The listing page showed Photographs “None”, 4 of 6 steps, and “Add at least one photograph of the property.” |
| File selected, not yet saved | The photograph step listed `living-room.jpg` as “selected here, not saved” and said the file is not uploaded. |
| Save of that selection | One image row: `image/jpeg`, 2048 bytes, `availability = declared`, no storage key, `confirmed_at` unset. The byte size is the selected file’s size. |
| After reload | Photographs “None stored · 1 file record, not uploaded”. The list says “no photographs”. The photograph step is not marked complete. Preview says “none stored” and “declared, not uploaded”. |
| Upload while storage is unconfigured | The save calls the upload route. The row stayed declared and unconfirmed. Health still reports that storage does not store bytes. This run did not observe an `available` row. |
| `availability = unavailable` | Not produced by this upload refusal, so that label was not exercised on a live row. |
| Submission | Preview blocker: “No uploaded photograph is available. A file record does not satisfy the requirement.” Send for review stayed disabled. A submit from that form stayed on the preview and left `status = draft`. Nothing was published. |

### What this does not verify

- The builder enquiry inbox is not verified as a whole. Populated recipient
  detail, read and status actions, and recipient-specific isolation remain
  pending until a legitimate routed fixture exists.
- A builder draft was not created. The approved builder editor posts a price
  range, not `priceInr`, so that range is still not written as the listing price.
  A builder listing is still not held to an owner’s contact, configuration, or
  photograph requirement.
- No photograph bytes were stored. A successful upload is not claimed.
- KYC applications and live or reported property moderation still need
  contracts. Verification cases and the owner-submission queue were not used
  as substitutes.
- Publication remains a separate operation and was not changed
  (`publication_not_decided`, Q-3).

## Photograph eligibility, 1 October 2026

This section is a later run. It does not change the runs above.

Frontend application `f0eb675`. The same backend `a8d9b1a` stayed on
`http://127.0.0.1:4010`. One predicate, `isStoredPhotograph`, is what the
owner steps, summaries, cards and staff screens use. A row counts only when
`retained` is true and `availability` is `available`. A missing availability
does not count. The cover is the first row that passes that test. A sample
preview may still label the first chosen name, and only when no row carries
an availability. That label is not a stored cover.

`tests/listing-photographs.test.mjs` passed, 8 of 8. Those fixtures are not
rows in `kkl_review`. They cover no media, declared with `stored` false,
unavailable, available with `stored` true, missing and inconsistent fields,
and a mixed list whose count and cover are the one stored row. A repeated
declaration of the same name, type and size is not added again.

### Review draft

`PL-5362CF550A`, Review Seller, against `a8d9b1a`.

| Check | Result |
|---|---|
| Save the same selected file twice | One row remained: `living-room.jpg`, JPEG, 2048 bytes, `availability = declared`, no storage key, not confirmed. |
| Remove and reload | The row was gone. The listing showed Photographs “None”, 4 of 6 steps, and “Add at least one photograph of the property.” Send for review stayed disabled. Status stayed draft. |
| Save metadata again and reload | “None stored · 1 file record, not uploaded.” The photograph step was not marked complete. The record says the name, type and size were recorded and the bytes were not uploaded. |
| Submission | “No uploaded photograph is available. A file record does not satisfy the requirement.” Send for review stayed disabled. Status stayed draft. |
| Staff detail | The same wording: “1 file record, not uploaded”, and no image was drawn. |
| Staff queue | The unsent draft is not in the waiting queue. |

`availability = unavailable` and `availability = available` with `stored` true
were not created in `kkl_review`. No image retrieval was exercised, so this
record does not say that a stored photograph is drawn. No upload succeeded.

The builder inbox populated check remains pending. Publication was not changed.

## Admin KYC and property review, 1 October 2026

This section is a later inspection. It does not change the photograph
sections above, and it does not start another photograph cycle.

Backend checkout `a8d9b1af43ee26ef07b9d86899b917d677763e86`
(`a8d9b1a`), OpenAPI `1.0.0-phase3.m`. The API was still listening on
`http://127.0.0.1:4010`. It was not restarted. Health still reported
storage `storesBytes: false` and `integrated: false`. No frontend
application change was made. `docs/phase-2/visual/geometry-1440.json`
was left unstaged.

### What the screens still call

`/admin/kyc` and `/admin/kyc/[id]` call `listApplications`,
`getApplication`, `setDocumentVerdict`, `toggleCheck`, and
`decideApplication`. Those methods exist only on the sample admin store.
The queue says the rows are sample KYC applications and are not
verification cases. Decisions are approve, reject, and resubmit. Approval
is gated on the sample checklist. The documents on the review screen are
names, not files.

`/admin/properties` and `/admin/properties/[id]` call `listListings`,
`getListing`, and `moderateListing`. Those methods exist only on the
sample admin store. The queue says the rows are sample portal listings
and are not owner submissions. The actions are unpublish and dismiss a
report. There is no approve action. The screen says no media is shown.

`liveAdminQueues` still leaves the KYC and property-review tiles on those
sample counts. Support, refunds, and the other switched tiles are counted
from their own backend calls. The dashboard badges for these two queues
therefore still match the sample pages.

### What the published contract contains

The path list in `docs/api/v1.yaml` at this revision has no KYC
application resource and no buyer-report or live-listing moderation
resource. Slice C’s “moderation” in the document introduction is the
staff decision on a listing submission (`/v1/listings/{listingId}/decision`),
already used by `/admin/owner-listings`. It is not unpublish or dismiss
report.

These published paths were read and were not used as substitutes:

| Path | Why it is not this queue |
|---|---|
| `GET /v1/verification/cases`, `GET /v1/verification/queues` | Verification cases. Already used by `/admin/verification`. A case is not a PAN/Aadhaar application, and deciding one does not approve KYC. |
| `GET /v1/listings/queue` | Owner submissions waiting on a reviewer. Already used by `/admin/owner-listings`. An unsent draft is not in it. |
| `GET /v1/properties` | The public portal inventory. It returns published listings only. |
| `GET /v1/leads` | The Seller and Builder marketplace. Already used there. It is not the staff lead-lifecycle queue. |
| `POST /v1/accounts/{accountId}/status` | Suspend or reinstate one known account. There is no list of accounts, so `/admin/users` was not rewired. |

### Review-server probe, unauthenticated

These calls did not use a session and did not use `POST /v1/dev/sessions`.

| Request | Result |
|---|---|
| `GET /health` | 200. Storage still does not store bytes. |
| `GET /v1/properties` | 200. `properties` length 0. The note says publication is not a decided rule (Q-3) and no listing is published. |
| `GET /v1/kyc`, `GET /v1/kyc/applications`, `GET /v1/reports` | 401 `unauthorized`. |
| `GET /v1/listings/queue`, `GET /v1/verification/cases`, `GET /v1/verification/queues` | 401 `unauthorized`. |

The 401 is the session gate. The handler requires an identity before it
walks the rest of the route table, and an unmatched `/v1` path after that
returns 404. The 401 does not mean a KYC or report route exists. No staff
session was spent to observe that 404: the route table in this checkout
has no match for those paths.

### What stays unavailable

Approve, reject, and resubmit on a KYC application; document verdicts;
the approval checklist; unpublish; dismiss report. Verification policy
(Q-4) and publication policy (Q-3) were not changed. The sample notices
stay in place so the queues are not presented as the verification queue
or the owner-submission queue.

### Other documented work that is still blocked

- A populated builder inbox needs an enquiry whose recipient is Review
  Builder. The two stored enquiries are still unrouted.
- A builder draft was not created. The approved editor posts a price
  range, and that range is not `priceInr`.
- Seller business details, KYC submission, and billing address stay on
  the sample seller record. The profile resource has a company name,
  a full name, about text, contact fields, and two opt-ins. It does not
  have a GSTIN, a PAN, an Aadhaar record, a business type, service areas,
  or an invoice address. The seller alert toggles are not those opt-ins.
- Voice-bridge paths are published as not implemented.

No pagination, empty or populated queue, customer denial, reload
persistence, or service-failure check was run for these two admin
queues. Those checks wait on a contract that lists the applications and
the moderated listings. This inspection is not that check.

## Admin KYC and live-property queues, wired 1 October 2026

The inspection above was written against backend `a8d9b1a` / OpenAPI
`1.0.0-phase3.m`, and it was right for that revision: those routes were not
published. Backend `3b4cbda05685d39273d8a7e128f55c88074f17a6` (`3b4cbda`,
“Serve the admin KYC and live-property queues from the records that already
exist.”) publishes them in OpenAPI `1.0.0-phase3.n`, with migration
`019_listing_unpublished.sql`. The frontend application is `eaab830`. This
section is that wiring. It does not reopen the photograph check, and
`docs/phase-2/visual/geometry-1440.json` stayed unstaged.

The API stayed on `http://127.0.0.1:4010`, process 30804. It was not
restarted and `kkl_review` was not reset. The frontend was rebuilt with
`NEXT_PUBLIC_KKL_ENV=review` and `NEXT_PUBLIC_KKL_DATA_SOURCE=sample`, then
served with `next start -p 3811` (listener 26164) and the documented runtime
switches. No development secret was set on the frontend.

### Switches

There is no new variable.

| Queue | Switch | Sample behaviour |
|---|---|---|
| `/admin/kyc` | `KKL_VERIFICATION=backend` | Unset stays on the sample application store. |
| `/admin/properties` | `KKL_LISTINGS=backend` | Unset stays on the sample portal listings. |

`/admin/verification` stays the staff case workflow
(`GET /v1/verification/queues`). `/admin/owner-listings` stays the submission
queue. When either switch is backend, a failed read does not fall back to
the sample store. Dashboard tiles and rail badges for these two queues use
the same backend totals. A count that could not be read is “—”. A real zero
stays 0. `filter=all` on KYC is open cases only.

### Review-server checks, staff session

Review Staff, against `3b4cbda`. The only open application is
`VER-EC4FAE39` (Review Seller, purchase lead, `needs_review`, opened
2026-09-30 18:05:45 UTC, about 16 hours old). It was not failed and it was
not asked to resubmit. `kkl_review` has no published or unpublished listing.
The owner draft `PL-5362CF550A` was not published.

| Check | Result |
|---|---|
| `/admin/kyc` pending | 1–1 of 1. `VER-EC4FAE39`, Review Seller. Documents, checks and approval unavailable. Rail badge 1. |
| `filter=resubmitted` | “Resubmission is unavailable”, with the API sentence. The case is not listed as a resubmission. |
| `filter=ageing` | “None of the open cases are over 24 hours old.” The caption says the classification does not approve a case and does not promise a response time. |
| `filter=all` | “Open cases only.” The same one open case. |
| pending `offset=50` | Past the end. Previous and First page. No Next. |
| Detail `VER-EC4FAE39` | No approve action. Fail and ask-for-more-information are offered. History is the required event and the needs-review event. |
| Empty-reason fail | 422, “Record why.” Reload still shows the case pending, history unchanged, badge still 1. |
| `/admin/properties` published | “No listing is published.” Reporting unavailable. Publication is not a request this queue can make. No property-review rail badge. |
| `filter=reported` | “Reporting is unavailable”, with the API sentence. |
| `filter=unpublished` | “No listing has been taken down.” |
| `filter=all` | “No live or taken-down listing is stored.” |
| Owner draft id on `/admin/properties/{id}` | 404. |
| Dashboard | KYC tile 1, “None opened more than 24 hours ago.” Listings tile 0, “Reports are not part of this count.” |
| `/admin/verification` | Still the case workflow. Needs a person 0, with the service 0. The notice says required open cases are on the KYC queue. |

### Session, role, and a closed API

| Check | Result |
|---|---|
| No cookie, `/admin/kyc` and `/admin/properties` | 307 to `/auth?next=…`. |
| Review Seller session | API `GET /v1/admin/kyc/applications` returned 403. Both pages say the session is a seller account and do not open the sample queues. Sample applicant names are absent. |
| `KKL_BACKEND_BASE_URL` pointed at closed port 4019, staff cookie kept | Both pages say the account could not be read and do not open the sample queues. The queue loader was not reached, because the session read uses the same base URL. The API process on 4010 was left running. The frontend was then pointed back at 4010. |

### Isolated tests, not browser checks

`tests/admin-queues.test.mjs` passed, 10 of 10. Those fixtures are not rows
in `kkl_review`. They cover an unavailable resubmission versus an empty
pending page, `filter=all` staying open, blocked documents, checks and
approval, a missing total, reporting unavailable versus an empty published
list, offset pagination, a failed count versus a real zero, an unread age
split, and a takedown notice that does not say the notification was
delivered. `npx tsc --noEmit` passed. `next build` passed.

A populated live listing and a successful unpublish were not created in
`kkl_review`. No dedicated synthetic KYC case was available, so a successful
reject or resubmit was not submitted. `approved` was not posted. Dismiss
report is not an action on the backend screen. A recorded notification is
not described as a delivered message.

### Still separate

A populated builder inbox, builder pricing (`priceInr`), and the seller
business, KYC and billing profile fields remain as recorded earlier. They
do not block these two queues.

## Capability flags and unread counts, 1 October 2026

Frontend `3912c3d`, still against backend `3b4cbda` / OpenAPI
`1.0.0-phase3.n`. The API process stayed 30804 on port 4010. The frontend
was rebuilt with `NEXT_PUBLIC_KKL_ENV=review` and
`NEXT_PUBLIC_KKL_DATA_SOURCE=sample`, then served on port 3811 (listener
13956) with `KKL_ENV=review`, `KKL_DATA_SOURCE=sample`, `KKL_AUTH=backend`,
`KKL_VERIFICATION=backend`, `KKL_LISTINGS=backend`, and
`KKL_BACKEND_BASE_URL=http://127.0.0.1:4010`. Locations and lead requests
use their own base URL, also `http://127.0.0.1:4010`. No development secret
was set.

A resubmitted or reported page is unavailable only when that response
capability says so (`available: false` or `reachable: false`). When the
flag is true, the page renders the returned rows or an empty state. A
missing flag, a non-boolean flag, or a missing `code` or `message` is
rejected as a contract error and does not become an empty queue. Documents,
checks, approval, and publication use the same reading. A null tile or rail
count stays “—”. Support and refund badges no longer turn a missing tile
into zero. Owner-submission and verification-case counts are unchanged.

### Review-server checks

Review Staff. `VER-EC4FAE39` was not failed and was not asked to resubmit.
No listing was published.

| Check | Result |
|---|---|
| `filter=resubmitted` | “Resubmission is unavailable”, using the API sentence. Documents, checks, and approval each say unavailable and quote the API message. Approval is not a working action. |
| `filter=ageing` | “None of the open cases are over 24 hours old.” The caption does not treat that as an approval rule or a promised response time. |
| `filter=all` | “Open cases only.” The same one open case, `VER-EC4FAE39`. |
| pending `offset=50` | “This page is past the end.” Previous and First page. |
| Detail `VER-EC4FAE39` | Documents and checks unavailable. “Approval is not authorised.” Fail and ask-for-more-information are offered. No approve action. History unchanged. |
| `filter=reported` | “Reporting is unavailable”, with the API sentence. Publication message says a listing cannot be created here. |
| published | “No listing is published.” |
| unpublished | “No listing has been taken down.” |
| `filter=all` | “No live or taken-down listing is stored.” |
| Owner draft `dce729f6-eeda-405c-a455-f0b628a3d907` | 404. |
| Dashboard | KYC tile 1. Listings tile 0, with reports excluded from the count. Rail badge 1 for KYC and no property-review badge. |
| No cookie | 307 to `/auth` for both queues. |
| Review Seller | Applications API 403. Both pages say the session is a seller account. Sample applicant names are absent. |
| Frontend pointed at closed port 4019 | `/admin/kyc` and `/admin/properties` say the account could not be read and do not open the sample queues. `/admin` shows the service error page because the dashboard’s support read fails before the tiles; it does not show sample rows or a zero KYC count. The API on 4010 was left running. The frontend was pointed back at 4010. |

### Isolated tests

`tests/admin-queues.test.mjs` passed, 15 of 15. Those fixtures are not
`kkl_review` rows. Added coverage: an available resubmission with no rows
is an empty page; a resubmitted filter without a capability flag is
rejected; reporting available with no rows is an empty reported page; a
property page without a reports flag is rejected; a null rail count stays
“—” and a real zero stays hidden. `npx tsc --noEmit` passed. `next build`
passed.

An available resubmission and an available reports list were not returned
by `3b4cbda`, so those empty states were not browser checks. A successful
reject, resubmit, or unpublish was not run: no dedicated synthetic case or
published listing was used, and `VER-EC4FAE39` was left open. Populated
takedown remains an isolated-test fixture, not a browser check.

## Builder drafts and seller profile names, 1 October 2026

The admin-queue slice stays closed at `8079ee0`. Successful reject, resubmit
and unpublish were not browser-tested there, and those checks were not
repeated. This section is the next integration: a builder listing draft, and
the seller profile fields the published profile already carries. Backend
`3b4cbda`, OpenAPI `1.0.0-phase3.n`. The frontend application is `5c99b26`.
`docs/phase-2/visual/geometry-1440.json` stayed unstaged. `kkl_review` was
not reset. The API process 30804 on port 4010 was not restarted.

The frontend was rebuilt with `NEXT_PUBLIC_KKL_ENV=review` and
`NEXT_PUBLIC_KKL_DATA_SOURCE=sample`, then served with `next start -p 3811`
(listener 22692) and the documented runtime switches. No development secret
was set on the frontend. There is no new switch: listings stay on
`KKL_LISTINGS=backend` and the profile stays on `KKL_PROFILES=backend`.

### The price mismatch

The approved builder editor collects configuration checkboxes (1–5 BHK) and
one project range, lowest price and highest price. The published listing
stores one `priceInr` for the whole listing, and each configuration object
may store its own `priceInr`. Neither of those is a minimum or a maximum.
Rewriting `configurations` replaces every row, so a price already stored on
a configuration is copied back onto that same name. The range is not written
into the listing price, not chosen as the minimum, and not split across the
configurations.

Submission of a builder listing still requires the single `priceInr`. This
screen does not invent one, so the preview says the listing cannot be
published yet and the publish control stays disabled. No request publishes a
listing. No request deletes one.

### What a builder draft stores

Review Builder, in the browser, created draft
`d48bd9ea-b31b-4a55-ae97-ed838b5def4f`. A fresh tab reload, which does not
restore the previous tab’s unsaved possession target, showed:

| Field | Result |
|---|---|
| Title | “Phase 3 builder draft”, then edited to “Phase 3 builder draft revised” and reloaded. |
| Property type | Apartment. The value list remains the D-09 proposal. |
| Description | Saved and reloaded. |
| Possession target | Typed as Dec 2028. Absent on a fresh-tab reload. It is not a listing field. |
| Locality and address | Rajarhat, “12 Main Road”. |
| Configurations | 2 BHK and 3 BHK checked on reload. No price was attached. |
| Lowest and highest price | 5000000 and 9000000 were typed. Both fields were empty on reload. Preview says “No listing price stored”. |
| Total units | 40, reloaded. |
| Carpet-area range and amenities | Typed, empty on reload. |
| RERA number | `WBRERA/P/NOR/2024/000001`, reloaded. The “RERA registered” checkbox was not restored. A number is not a registry check. |
| Photographs | Not stored. The list says photographs are not on this list. |
| Publish | Disabled. The preview names the missing `priceInr` and says no request publishes a listing. |
| Delete | Not offered. The list says no request deletes a listing. |

The list shows the draft, “Price not stored”, and “Enquiry count is not on
this list.” A staff session on `/builder/properties` is refused and does not
open the sample projects. Review Seller opening that draft’s editor receives
404 and does not see the project name. After signing back in as Review
Builder, the same draft is still on the list.

### What a seller profile stores

Review Seller saved contact name “Review Seller” and agency “Review Agency
Phase 3”. A reload showed both, with the sign-in phone still masked and
disabled. An alert switch that was turned on was off after reload. The page
says those switches are not stored and does not report a verification status.

Business details, billing details and the identity form refuse the save.
The business and billing screens do not show the sample agency “Sen
Properties”. The verification-status screen does not show a sample timeline.
Submitting business details did not replace the saved agency name.

Review Builder’s own profile page shows an empty contact name and agency,
and a phone ending 0104. It does not show “Review Agency Phase 3”.

No cookie on `/seller/profile` or `/builder/properties` returns 307 to
`/auth`.

With the frontend pointed at closed port 4019, both pages say the service
is not responding and that the records are not served from this process.
They do not show sample projects or the sample agency. The API on 4010
(process 30804) was left running, and the frontend was pointed back at it
(listener 22692).

### Isolated tests

`tests/builder-seller-contract.test.mjs` passed, 5 of 5. Those fixtures are
not `kkl_review` rows. They cover the range staying out of `priceInr`, a
stored configuration price being kept, unsupported draft fields being
omitted, and the profile patch being limited to full name, display name and
company name. `npx tsc --noEmit` passed. `next build` passed. The isolated
tests are not the browser checks above.

### Backend handoff

Absent from the published contract, so the frontend does not invent them:

| Approved UI | What it means | Validation already documented | What stays blocked |
|---|---|---|---|
| Lowest price and highest price | One range across the project, not one price. | The sample editor treats the range as rupee amounts. The API’s price rule is a positive whole-rupee integer, with the message “Enter the amount in figures — for example 7200000.” | A builder listing cannot be submitted while `priceInr` is empty, and the range must not be copied into it. |
| Price on each configuration | The API already has `configurations[].priceInr`. The approved checkboxes collect a name (“2 BHK”), not an amount per configuration. | A configuration price, when present, must be a positive integer. | The editor cannot collect or change a per-configuration price until the screen is extended. A stored one is shown and kept. |
| Possession target | A date-like label, blank for ready to move. | Free text on the sample form. | Not saved. |
| Carpet area range | Smallest and largest carpet area, as text such as “985 sq ft”. | Not an integer. `areaSqft` is one whole number. | Not saved. |
| Amenities | A set of named facilities. | Checkbox names on the sample form. | Not saved. |
| Photograph count and video URL | A count is not an uploaded file. | Owner photographs use the media route and stay `declared` until storage confirms them (Q-8). A builder is not held to that rule. | Not saved. Publication of a file is still Q-8. |
| “RERA registered” checkbox | A claim that the project is registered. | `reraId` is letters, digits, hyphens and slashes, max 64. It is recorded and not checked. `reraVerified` is absent. | The checkbox is not saved. The number is. |
| Seller alert toggles | Three preferences: new leads, a viewed lead on sale, low balance. | They are not `whatsappOptIn` or `emailOptIn`. | Not saved. Turning one on does not start delivery. |
| Business type, service areas, GSTIN | S-02. GSTIN format on the sample form is `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$`. | Whether GST is mandatory is D-13 and is not settled here. | The form refuses. Nothing is written. |
| Billing name, address, invoice email | S-21 invoice details. | Name at least 2 characters, address at least 6, invoice email optional and must be an email when present. | The form refuses. Nothing is written. |
| PAN and Aadhaar | S-03 identity. PAN shape `^[A-Z]{5}[0-9]{4}[A-Z]$`. | Document bytes are not accepted by this frontend. | The form stores nothing. A PAN is not placed in another profile field. |

Unresolved product decisions, separate from those missing fields:

- D-09: the property-type list is a design proposal.
- D-03: the platform’s own lead prices.
- D-13: whether GST invoicing is mandatory.
- D-08: whether one person may hold both broker and builder roles.
- Password versus one-time-code sign-in only.
- Q-3: publication. No request creates a published listing.
- Q-4: a verification pass. Approval stays unauthorised.
- Q-8: object storage. A selected file is not a stored photograph.
- A populated builder inbox still needs an enquiry addressed to Review Builder. The stored enquiries remain unrouted.

## Configuration prices and the account name, 1 October 2026

The application is `978f4e6`. The earlier draft save at `5c99b26` stays as
recorded. This pass checks the configuration columns on the running review
server before treating the project range as unmapped, and it stops writing
contact name into both profile names.

The API process 30804 was not restarted. Its working directory is the
backend checkout. That checkout is `3b4cbda` (`2026-10-01 15:24:03 +0530`),
the tree was clean, and `server.mjs`, `listings.mjs` and `docs/api/v1.yaml`
were last written before the process started at 15:24:53. `GET /health` on
port 4010 returned `ok: true` and `environment: review`. OpenAPI is
`1.0.0-phase3.n`.

The process is connected to database `kkl_review` on port 5433. The
application role cannot read `schema_migrations` (SQLSTATE 42501). The live
table `listing_configurations` was probed and has `price_inr` (bigint),
`area_sqft` (integer), `available` (integer) and `sort_order` (integer).
Those four columns are created together by migration `007_listings.sql`.
No later migration changes them. `sortOrder` is not a field on the published
listing configuration object. The write sets `sort_order` from the array
position, and a read comes back in that order.

### What the editor can store

| Approved field | Published field | This save |
|---|---|---|
| Configuration checkbox “N BHK” | `configurations[].configuration` | Written. Existing rows stay in their stored order, which keeps `sort_order`. A newly checked name is appended. |
| A price, area or availability already stored on that name | `priceInr`, `areaSqft`, `available` | Copied back onto the same name. An available count of zero is kept. The form does not collect a new amount, area or count. |
| Lowest price and highest price | None. Listing `priceInr` is one whole-rupee integer. A configuration `priceInr` is one integer on one name. | Not written, and not converted. The save says “Not stored: Lowest price, Highest price.” |
| Possession target, carpet-area text, amenities, “RERA registered” | None | Not written. A save that sends one names it. |
| Photograph file, photograph count, video link | Media bytes are still Q-8. A count is not a photograph. | Not written. The save says they were not stored. The count field is left blank. A blank field is not zero photographs. |

Review Builder, in the browser, saved lowest 5100000 and highest 9100000 on
draft `d48bd9ea-b31b-4a55-ae97-ed838b5def4f`. The status said those two
amounts were not stored. A fresh load left both fields empty, left 2 BHK and
3 BHK checked, and the list still says “Price not stored”. A photograph
count of 3 was typed on the media section. The status said the photographs,
the count and the video link were not stored, and the count field was blank
afterwards. The list says photographs are not on this list, and “Enquiry
count is not on this list.” It does not show a zero.

All and Draft both show that draft, labelled Draft. Published shows
“Nothing in this state” and does not show the draft. This account has no
published listing, so a published row on All was not a browser check. The
isolated test covers a mixed list: All keeps published, and each named tab
returns only that status. A `submitted` row is not labelled Draft.

Publication and deletion stay refused. No request publishes a listing.

### Contact name

`displayName` is the account name. Support messages and “Signed in as” use
it, and the profile patch writes it with `setDisplayName`. `fullName` is
`account_profiles.full_name`, a separate column. The seller form has one
“Contact name” control, whose validation says it is the name support should
use. The patch sends `displayName` and `companyName`. It does not send
`fullName`.

Review Seller’s profile already had full name “Review Seller” from the
earlier save that wrote both names. Contact name was changed to “Review
Seller Desk” and an alert switch was turned on. After reload, contact name
was “Review Seller Desk”, the page said the profile full name stays “Review
Seller”, the agency was still “Review Agency Phase 3”, and the alert switch
was off. Contact name was then saved back to “Review Seller”. “Signed in as
Review Seller” confirms that restore. The sign-in phone stayed masked.

Review Seller opening the builder draft receives 404 and does not see the
project name. `/builder/properties` says the session is a seller account and
does not open the sample builder.

The earlier seller save at `5c99b26` did write both names. This correction
does not undo that past write. It stops a later contact-name save from
changing `fullName`.

### Checks

`tests/builder-seller-contract.test.mjs` passed, 7 of 7. Those fixtures are
not `kkl_review` rows. `npx tsc --noEmit` passed. `next build` passed with
`NEXT_PUBLIC_KKL_ENV=review` and `NEXT_PUBLIC_KKL_DATA_SOURCE=sample`. The
frontend was served with `next start -p 3811` (listener 39888) and the same
documented runtime switches. No development secret was set on the frontend.
The API on 4010 (process 30804) was left running. `kkl_review` was not
reset. `docs/phase-2/visual/geometry-1440.json` stayed unstaged.

Sign-in for the seller check used the local one-time-code channel. That is
not production authentication. The code is not recorded here.

The field gaps in the previous handoff still stand, with this correction:
the range remains unmapped because it has no equivalent, and contact name
maps to `displayName` only. Per-configuration price, area and availability
are stored when they already exist. The approved checkboxes still do not
collect a new amount. Publication (Q-3), a verification pass (Q-4), object
storage (Q-8) and a routed builder enquiry remain open. The admin-queue
slice stays closed at `8079ee0`.

## Project range, billing, and separate account names, 1 October 2026

Frontend `2dc98fc`. Backend implementation `a802bb4`, docs `d3aba31`,
OpenAPI `1.0.0-phase3.o`, migration `020`. The review API on 4010 was
process 32100, started after those files. The frontend on 3811 was process
32676, built with `NEXT_PUBLIC_KKL_ENV=review` and
`NEXT_PUBLIC_KKL_DATA_SOURCE=sample`, then started with `KKL_AUTH=backend`
and the documented domain switches. No development-identity secret was set.
Sign-in used the published form and one local OTP for the builder number.
The code is not recorded here.

| Screen | What the browser showed |
| --- | --- |
| Seller billing | Review Seller, number ending 0102. Saved and reloaded billing name, GSTIN, two address lines, invoice email and contact name. The status said no invoice or tax treatment was set. The contact name did not replace the account name. |
| Account profile | On the same seller session, full name was saved as a distinct value and reloaded. The caption kept the account name. A restore was submitted before the session changed; that second write was not reloaded. |
| Shortlist | The same session: zero saved, with the sentence that only a published property can be saved. |
| Find my match | The URL requirement was stored. The page said nothing is scored and returned no property cards. |
| Seller restricted | Verification is not reported from this profile. |
| Builder profile, seller session | Refused, and the sample builder was not shown. |
| Builder profile | Review Builder, number ending 0104. Company and email reloaded. Contact name stayed the account name. The typed RERA number was empty after reload. Alerts stayed unset and are described as not stored. Verification reads "Not on this profile" and subscription reads "None stored". |
| Subscription and restrictions | The activate button is disabled. Restrictions say the account is active and do not mark verification or subscription as this account. |
| Builder pricing | Draft `d48bd9ea-b31b-4a55-ae97-ed838b5def4f`. Lowest 5100000 and highest 9100000 reloaded, with 2 BHK and 3 BHK still selected. The page did not show a single listing price. |

Contract tests `tests/account-forms-contract.test.mjs` and
`tests/builder-seller-contract.test.mjs` passed, 12 of 12. `tsc --noEmit`
and `next build` passed before the server start. Amenities are mapped in
the specifications patch and were not reloaded in the browser.

Still refused, and still not a completed journey: publication (Q-3), so the
shortlist and the public catalogue have no published listing; a matching
rule (`matching_not_decided`); a verification pass and documents (Q-4);
subscription storage and any charge (Q-5, and no subscription field);
per-configuration amounts, which the approved checkboxes do not collect;
object storage (Q-8); a routed builder enquiry. The admin-queue slice stays
closed at `8079ee0`.

## Shortlist, requirement locations, and listing words, 1 October 2026

Frontend `4334601`. This section does not replace the `2dc98fc` results above.

The review API on 4010 was process 32100 at the start of the browser pass
(checkout then `d3aba31`, implementation `a802bb4`, OpenAPI `1.0.0-phase3.o`,
migration `020`). During the pass the backend window replaced that process.
The listener at the later checks is process 28328, started at 22:58 local,
after implementation `e482dfc` (22:57) and docs `94fa614` (22:58). Its command
is `node src/http/server.mjs` from that checkout. OpenAPI in the checkout is
`1.0.0-phase3.p`. Migrations `021` and `022` are the specification and video
files named by that handoff. The possession words, carpet-area words, and
https video link were saved and came back on reload, so the running database
accepted those columns. This frontend did not query the migration table and
did not restart 4010.

The frontend on 3811 for the later reload is process 40620. It was built with
`NEXT_PUBLIC_KKL_ENV=review` and `NEXT_PUBLIC_KKL_DATA_SOURCE=sample`, then
started with `next start` and the documented domain switches, including
`KKL_PROFILES=backend`, `KKL_LOCATIONS=backend`, and `KKL_LISTINGS=backend`.
No development-identity secret was set. Sign-in used the published form.
This slice used one local OTP for the buyer number ending 0103, one for the
seller number ending 0102, and one later OTP for the builder number ending
0104. The codes are not recorded here.

| Screen | What the browser showed |
| --- | --- |
| Builder profile RERA | Review Builder, number ending 0104, on the API before the restart. The RERA box was disabled and empty. The helper said the profile contract does not accept it and that a listing can store a number. Company, contact name, and email stayed. Saving that form cannot write a typed RERA value. |
| Listing RERA and amenities | Same builder draft `d48bd9ea-b31b-4a55-ae97-ed838b5def4f`. Lift stayed checked after reload. Total units stayed 40. RERA number `WBRERA/P/NOR/2024/000001` stayed. The registered checkbox is not a field. |
| Possession, carpet words, video | After process 28328 was listening, and again after the frontend rebuild: possession `Dec 2027` reloaded; carpet words `985 sq ft` and `1420 sq ft` reloaded; video `https://example.test/tour` reloaded. The media helper says an https address is stored and is not an uploaded file. Photographs are still not stored. `priceInr` stayed unset on the list (`Price not stored`). |
| Shortlist header | Signed-in builder and signed-in buyer both showed `Shortlist (0)`. That is an empty authenticated read. Unavailable stays a different label; the unit test covers it. The public catalogue entry is not a UUID, and its page says it cannot be shortlisted. No published listing exists, so add and remove were not clicked in the browser. |
| Find my match | The locality list is the location service (56 labels, including Rajarhat, Kolkata). `locality=not-a-place` stayed selected as unavailable. A stored buyer requirement with no query prefilled Rajarhat, Kolkata. The page said nothing is scored. |
| Buyer profile | Number ending 0103. Full name was saved as a distinct value and reloaded, then restored to `Review Buyer` and reloaded. The caption kept the account name. |
| Buyer requirement | The same buyer session stored locality `rajarhat`, 2 BHK, the ₹50L – ₹1Cr band, handover Ready to move, and intent end use. The page said the requirement is stored and nothing is scored. |
| Seller account name | Number ending 0102. Full name reloaded as `Review Seller`, and the caption said the account name stays Review Seller. It was not changed again. |
| Builder property list | After the rebuild, the draft row showed `0 enquiries` and a Delete control. Delete was not clicked. The review draft was not removed. |

Contract tests `tests/account-forms-contract.test.mjs` and
`tests/builder-seller-contract.test.mjs` passed, 16 of 16. `tsc --noEmit`
and `next build` passed before this server start.

### Commerce, per screen

These rows keep the earlier evidence. This slice did not repeat the staff
order cycle and does not fold those screens into the sample catalogue.

| Screen or action | Status |
| --- | --- |
| Staff order list, detail, filters, pagination, cancellation | Backend (`KKL_STAFF_ORDERS`). Browser-tested at `611bca9`: 101 orders, page size 100, filters, detail, and cancellation. Not repeated here. |
| A customer opening staff orders or intake | Browser-tested at `611bca9`. 403 `staff_only`. Sample rows were absent. |
| Staff orders when 4010 is unreachable | Browser-tested at `611bca9` against a second frontend pointed at an empty port. The unavailable sentence was shown. Sample rows were absent. The review API was not stopped. |
| Seller and builder My purchases | `KKL_MARKETPLACE=backend` calls `GET /v1/orders` as the signed-in account. This slice did not open those screens. They are not the staff list and they are not the sample order ids. |
| Seller wallet and recharge | Browser-tested earlier on Review Seller. Balance ₹0. Recharge refused because no payment provider credentials are configured (Q-5). Nothing was charged. |
| Buy Leads | Browser-tested earlier. 0 leads, with the sentence that prices are not set (Q-1a). |
| Purchase | The hold uses the lead blockers when the marketplace switch is backend. A purchase was not completed. |
| Purchased-lead export | The backend store throws unavailable. It does not write a sample CSV. |
| Staff wallets | Browser-tested earlier as a read. Review Buyer and Review Seller at ₹0. An adjustment was not submitted. |
| Admin refund approval and wallet adjustment | The screens explain D-06 and do not move credits. Not repeated here. |

Still refused, and still not a completed journey: publication (Q-3), so the
shortlist stays empty and the public catalogue stays the sample set; a
matching rule (`matching_not_decided`); a verification pass and documents
(Q-4); lead price, aging, credit expiry, refunds, and tax (Q-1a through
Q-1e); builder contact entitlement (Q-2a); notification wording (Q-2b);
payment credentials (Q-5); consent provenance (Q-6); message delivery (Q-7);
object storage (Q-8); a routed builder enquiry. Phase 3 is not complete.
The admin-queue slice stays closed at `8079ee0`.

## Guest shortlist, listing counts, and draft delete, 1 October 2026

Frontend `4b0db0a`. This section does not replace the `4334601` results.

The review API was still process 28328, started at 22:58 local, command
`node src/http/server.mjs`, on checkout `94fa614` (implementation `e482dfc`,
OpenAPI `1.0.0-phase3.p`). Migrations `021` and `022` are the files that
handoff names. This frontend did not restart the API, did not change that
checkout, and did not query the migration table. The possession words,
carpet-area words, https video link, enquiry count, image-record count, and
draft delete were accepted by that process.

The frontend on 3811 for this pass is process 30044, built with
`NEXT_PUBLIC_KKL_ENV=review` and `NEXT_PUBLIC_KKL_DATA_SOURCE=sample`, then
`next start` with the documented domain switches. No development-identity
secret was set. One further local OTP was used for the buyer number ending
0103. The code is not recorded here.

| Check | Result |
| --- | --- |
| Signed-out header | An unsigned homepage contains `Shortlist` with `/auth?next=/account/shortlist`. It does not say unavailable. |
| Signed-in empty shortlist | The builder session’s menu showed `Shortlist (0)`. |
| Builder profile RERA | The box stayed disabled and empty. The helper says to add the number on the property listing, and that this profile does not store it. |
| Amenities and listing words | Draft `d48bd9ea-b31b-4a55-ae97-ed838b5def4f` reloaded Lift checked, 40 units, RERA number `WBRERA/P/NOR/2024/000001`, carpet words `985 sq ft` and `1420 sq ft`. |
| Listing counts | The same draft’s list row showed `0 enquiries` and `0 image records. An image record is not a stored photograph.` A missing count is not rendered as zero. |
| Draft delete | A new draft `6483906a-b62c-4d90-bbc4-1ec15d23888d`, titled `Disposable delete check`, was opened on its confirmation page and then deleted. The shared draft stayed on the list. Delete was not used on that shared draft. |
| Buyer profile | Number ending 0103. Full name reloaded as `Review Buyer`. The caption said the account name stays Review Buyer. |
| Buyer requirement locations | `/find-my-match` with no query prefilled `Rajarhat, Kolkata` from the location list (56 options). The page said no matching rule is approved and nothing is scored. |

Contract tests passed 16 of 16 before this server start. `tsc --noEmit` and
`next build` passed.

### Scope that is engineering, not a new client decision

- Public “Report a listing” opens `/support`. The staff property queue already
  records `property_reports_not_decided` for the reported filter and for
  `dismiss_report`. No separate public report-intake route was found in the
  published path list. That is an unwired route, not a new decision recorded here.
- A routed builder enquiry is still a fixture dependency. It is not a new
  business rule.
- Profile fields that the contract still does not accept stay off the save:
  the three alert choices, a subscription price, and identity numbers.

Phase 3 is not complete. Publication (Q-3), matching, verification (Q-4),
Q-1a through Q-1e, Q-2a, Q-2b, Q-5, Q-6, Q-7, Q-8, and a routed builder
enquiry remain. The admin-queue slice stays closed at `8079ee0`.

## Header states, alert controls, and draft-delete confirmation, 2 October 2026

Frontend `891e8bd`. This section does not replace the `4334601` results,
which were recorded against OpenAPI `1.0.0-phase3.o`, and it does not
replace the `4b0db0a` results.

The review API for this pass was still process 28328, started at 22:58
local on 1 October, command `node src/http/server.mjs`, on checkout
`94fa614` (implementation `e482dfc`, OpenAPI `1.0.0-phase3.p`). This
frontend did not restart that API and did not change that checkout.

The frontend on 3811 for the checks below is process 31740, built with
`NEXT_PUBLIC_KKL_ENV=review` and `NEXT_PUBLIC_KKL_DATA_SOURCE=sample`, then
`next start` with the documented domain switches. No development-identity
secret was set. One local OTP was used for the builder number ending 0104.
The code is not recorded here. The earlier persistence reloads of amenities,
carpet words, possession, the video link, and the buyer name were not
repeated.

| Check | Result |
| --- | --- |
| Signed-out header | An unsigned homepage link reads `Shortlist`, accessible name `Shortlist`, and goes to `/auth?next=/account/shortlist`. It does not say unavailable. |
| Signed-in empty shortlist | Desktop and the mobile menu both showed visible text `Shortlist (0)`, accessible name `Shortlist (0), 0 saved`, and `/account/shortlist`. |
| Populated shortlist | No published listing exists, so the header was not filled above zero. The label for a count of 3 is covered by the contract test, and both links use that same label. |
| Failed shortlist read | Not induced against the live API. The unavailable label is `Shortlist (unavailable)` on both links, and its destination stays `/account/shortlist`. |
| Builder profile RERA | The box stayed disabled and empty. The helper says to add the number on the property listing, and that this profile does not store it. |
| Alert choices | The three choices were disabled before any click, with no field name, and the note above them said they are unavailable, this profile does not store them, and no alert is sent. They stay on the remaining-work list. |
| Owner counts | My property listings showed `0 stored photographs`, `0 image records. An image record is not a stored photograph.`, and `0 enquiries` for the signed-in draft. A missing count is not rendered as zero. A public property page does not include those counts. |
| Draft delete, cancel | Disposable draft `257c9f0d-1d57-40b6-8667-8ea29b4b1370`, titled `Disposable cancel then delete`, was opened on its confirmation page. Keep the draft returned to the list, and a reload still showed that title. |
| Draft delete, confirm | The same draft was then deleted. A reload of the list no longer showed it. Shared draft `d48bd9ea-b31b-4a55-ae97-ed838b5def4f` stayed. |
| Draft delete, failure | Opening delete for an id that is not on this account showed `This listing was not deleted` and `That listing is not on this account`. It did not say the draft was deleted. Ownership `404` and the two `409` conflicts stay failures in the contract test, including a code named `deleted`, which is reported as unavailable. |

Contract tests passed 16 of 16. `tsc --noEmit` passed. `next build` passed,
including the later message for a listing that is not on the account.

The three alert choices remain an approved feature that this profile does
not store. Publication (Q-3), matching, verification (Q-4), Q-1a through
Q-1e, Q-2a, Q-2b, Q-5, Q-6, Q-7, Q-8, and a routed builder enquiry remain.
Phase 3 is not complete. The admin-queue slice stays closed at `8079ee0`.

## Unsigned delete reaches sign-in, 2 October 2026

Frontend `1de518a`. This section does not replace the `891e8bd` checks.
Cancel, successful deletion, and the reload that showed the disposable
draft gone are the results already recorded there for
`257c9f0d-1d57-40b6-8667-8ea29b4b1370`. That draft was not created again.
Shared draft `d48bd9ea-b31b-4a55-ae97-ed838b5def4f` was not deleted.

The review API was still process 28328 on `94fa614` / OpenAPI
`1.0.0-phase3.p`. This frontend did not restart it. The frontend on 3811
for this check is process 24476. No development-identity secret was set.
No further OTP was used.

An unsigned request for
`/builder/properties/00000000-0000-4000-8000-000000000099/delete` returned
307 to `/auth?next=` that same path. The response did not say the draft was
deleted. A 401 from the delete mapper is `sign-in`. A missing listing, a
submitted listing, and an enquiry conflict stay refusals. A 200 that does
not carry `deleted: true` is not treated as success.

Contract tests passed 16 of 16. `tsc --noEmit` and `next build` passed.

The three alert choices remain an approved feature that this profile does
not store. Publication (Q-3), matching, verification (Q-4), Q-1a through
Q-1e, Q-2a, Q-2b, Q-5, Q-6, Q-7, Q-8, and a routed builder enquiry remain.
Phase 3 is not complete. The admin-queue slice stays closed at `8079ee0`.

## Older records

`kkl-backend/docs/phase-3/verification-slice-*.md` and `checklist.md` name
the revisions they were written against. At `abf89fc` the checklist still
cites `kkl-web` `e1b57c8` and browser figures against `7b5a01b`. Those files
were not edited by this commit, and this record does not replace them.
`docs/phase-2/verification.md` remains the Phase 2 sample-service record.
