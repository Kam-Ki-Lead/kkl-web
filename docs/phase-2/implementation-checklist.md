# Phase 2 Implementation Checklist

Mapped to the screen inventory in the approved baseline
(`KKL Phase 1 - Screen Inventory.dc.html`, kkl-design @ `5bc3512`).

## How to read this

The inventory has **113 rows. They are not 113 pages.** The distinction matters:

| Kind | Count | Meaning |
|---|---|---|
| **Route** | 95 | Has its own URL |
| **Nested state** | 6 | Lives inside another screen — P-21, S-10, B-14, B-18, B-19, A-07 |
| **Shared component group** | 12 | C-01 to C-12 — the library, not screens |

The inventory marks nested rows with `—` or `within …` in its route column. Building those as
separate pages would contradict the design.

## Status: four separate dimensions

One mark per row hid more than it showed. A screen can be built and look right
while its sample service does nothing, or work perfectly against fixtures and be
nowhere near a real backend. Each row therefore carries four independent columns:

| Column | Question it answers |
|---|---|
| **Screen** | Is the screen built — layout, states, responsive behaviour, matching the approved design? |
| **Sample** | Does it behave through a typed sample service, including validation, empty, error and confirmation states? |
| **Real** | Is it reading or writing kkl-backend? |
| **Verified** | Has it been checked, at the scope named in `verification.md`? |

Marks: `✓` done · `~` partial, with the gap named · `·` not started ·
`n/a` not applicable to this row.

**Every row in the Real column is `·`.** kkl-backend has not published its
versioned OpenAPI spec, so no API client exists. Selecting `api` fails closed
rather than falling back to fixtures. No screen in this repository has ever
talked to a real service, and none of the marks below should be read as
suggesting otherwise.

A `✓` in **Verified** means the checks listed in `verification.md` were run and
passed at the stated widths and states. It does not mean screen-reader tested,
per-chip contrast measured, or zoom checked — those three remain outstanding for
every row (C-11).

---

## C — shared components and states (the library)

| ID | Group | Screen | Sample | Real | Verified | Where |
|---|---|---|---|---|---|---|
| C-01 | Colour tokens | ✓ | n/a | · | ✓ values transcribed and compared | `src/app/globals.css` `@theme` |
| C-02 | Typography | ✓ | n/a | · | ✓ scale compared | `src/app/globals.css` `.t-*`, `src/app/layout.tsx` |
| C-03 | Navigation systems | ~ public header/footer/drawer only; dashboard rails not built | ✓ | · | ~ public nav only | `src/components/layout/` |
| C-04 | Form controls | ✓ | ✓ | · | ~ keyboard and focus checked; not screen-reader tested | `src/components/ui/button.tsx`, `field.tsx` |
| C-05 | Filters, tables, pagination | ~ pagination controls not built | ✓ | · | ~ filters, chips, sort | `src/components/search/`, `chip.tsx` |
| C-06 | Cards | ~ lead card not built | ✓ | · | ~ property and project cards | `src/components/property/property-card.tsx` |
| C-07 | Dialogs, uploads, notifications | · | · | · | · | — |
| C-08 | Content states | ✓ | ✓ | · | ✓ | `src/components/ui/states.tsx` |
| C-09 | Access & session states | ✓ | ✓ | · | ✓ | `src/components/ui/states.tsx` |
| C-10 | Journey map | n/a design artefact | n/a | n/a | n/a | — |
| C-11 | Verification report | n/a | n/a | n/a | carried into `verification.md` | — |
| C-12 | Client decision list | ✓ | ✓ encoded as unresolved rules | · | ✓ | `src/lib/config/business-rules.ts` |

## P — public portal and Buyer

| ID | Screen | Route | Screen | Sample | Real | Verified |
|---|---|---|---|---|---|---|
| P-01 | Homepage | `/` | ✓ | ✓ | · | ✓ 1440 · 768 · 390 |
| P-02 | Search results | `/search` | ✓ | ✓ | · | ✓ filters, sort, empty |
| P-03 | Property / project detail | `/property/:slug` | ✓ | ✓ | · | ✓ |
| P-04 | Enquiry form | `/property/:slug/enquiry` | ✓ | ✓ | · | ✓ incl. 20 edge-case checks |
| P-05 | Site-visit request | `/property/:slug/site-visit` | ✓ | ✓ | · | ~ happy path only |
| P-06 | Mobile OTP sign-in / register | `/auth` | ✓ | ✓ simulated, labelled | · | ✓ incl. rejected code, no-JS |
| P-07 | Enquiry confirmation | `/enquiry/:receipt/confirmed` | ✓ | ✓ | · | ✓ reload, replay, two tabs, two sessions |
| P-08 | Requirement capture (5 steps) | `/find-my-match` | ✓ | ✓ URL-driven, works without JS | · | ✓ |
| P-09 | Requirement review | `/find-my-match/review` | ✓ | ✓ | · | ✓ |
| P-10 | Matched properties | `/matches` | ✓ | ✓ | · | ✓ scoring checked after budget fix |
| P-11 | Shortlist | `/account/shortlist` | ~ signed-out state only | ~ saving needs accounts | · | ~ |
| P-12 | Buyer dashboard | `/account` | ✓ | ✓ | · | ✓ |
| P-13 | My enquiries | `/account/enquiries` | ✓ | ✓ | · | ✓ incl. session-submitted enquiries appearing |
| P-14 | Enquiry detail | `/account/enquiries/:id` | ✓ | ✓ | · | ✓ |
| P-15 | Profile & settings | `/account/profile` | ✓ | ✓ edit, validation, cross-field rule, confirmation | · | ~ states exercised; not compared to baseline at both widths |
| P-16 | Notifications | `/account/notifications` | ✓ | ✓ read/unread, mark one, mark all, empty | · | ~ states exercised; not compared to baseline at both widths |
| P-17 | For builders | `/builders` | ✓ | ✓ | · | ✓ |
| P-18 | For brokers | `/brokers` | ✓ | ✓ | · | ✓ |
| P-19 | Contact & support | `/support` | ✓ | ~ form not connected, says so | · | ~ |
| P-20 | Policy page template | `/legal/:slug` | ✓ | ~ copy-pending state | · | ✓ |
| P-21 | System states | *nested — within C-08 / C-09* | ✓ | ✓ | · | ✓ 404, empty, error, access-denied, expired |

### P-15 and P-16 — what "Sample ✓" does and does not mean

Both screens are built and behave, through `ProfileService` and
`NotificationService`. Saving a profile validates server-side and returns the
stored value; marking a notification read changes what the list and the unread
count show.

None of it is an account. `account-store.ts` is one object in the server
process, shared by every visitor and lost on restart. There is no sign-in, so
there is nothing to scope it to. The mobile number is deliberately not editable,
because changing a verified identifier is a re-verification flow that does not
exist. Both screens carry the sample disclosure, the save confirmation says the
change is held in memory, and the form shows a "Not connected to an account"
chip. **Do not read these rows as account integration.**

## S — Seller / broker

| ID | Screen | Route | Screen | Sample | Real | Verified |
|---|---|---|---|---|---|---|
| S-01 | Seller registration | `/seller/register` | ✓ | ~ validates and advances; creates no account | · | ~ both phases driven; no-JS path not re-checked |
| S-02 | Onboarding — business details | `/seller/onboarding` | ✓ | ✓ saves, validates, GSTIN format-checked | · | ~ states exercised |
| S-03 | KYC submission (PAN, Aadhaar) | `/seller/kyc` | ✓ | ~ records that files were chosen; **uploads nothing** | · | ~ validation exercised |
| S-04 | KYC status | `/seller/kyc/status` | ✓ | ✓ all four states, timeline, rejection reason | · | ✓ four states via review route |
| S-05 | Restricted / suspended account | `/seller/restricted` | ✓ | ✓ suspension and verification as separate axes | · | ✓ |
| S-06 | Seller dashboard | `/seller` | ✓ | ✓ | · | ✓ |
| S-07 | Lead marketplace | `/seller/leads` | ✓ | ✓ filters, sort, Sale tab, withheld count | · | ✓ incl. empty state |
| S-08 | Lead preview (masked) | `/seller/leads/:id` | ✓ | ✓ | · | ✓ mask containment asserted against the full HTML |
| S-09 | Purchase review & confirm | `/seller/leads/:id/buy` | ✓ | ✓ idempotency key per visit | · | ✓ |
| S-10 | Purchase failure states | *nested — within `/seller/leads/:id/result`* | ✓ | ✓ five outcomes | · | ✓ insufficient, sold, unverified, suspended |
| S-11 | Purchase success & contact reveal | `/seller/leads/:id/result` | ✓ | ✓ | · | ✓ incl. direct access refused |
| S-12 | Purchased leads | `/seller/purchased` | ✓ | ✓ empty and populated | · | ✓ |
| S-13 | Purchased lead detail | `/seller/purchased/:id` | ✓ | ✓ + server-generated CSV | · | ✓ export, and 404 for a lead not owned |
| S-14 | Credits & balance | `/seller/billing` | ✓ | ✓ | · | ✓ |
| S-15 | Recharge credits | `/seller/billing/recharge` | ✓ | ~ no payment is taken or simulated as taken | · | ✓ |
| S-16 | Payment handoff & result | `/seller/billing/payment` | ✓ | ✓ credited, pending, failed | · | ✓ all three, plus direct access refused |
| S-17 | Transactions & usage history | `/seller/billing/history` | ✓ | ✓ ledger with derived balances | · | ✓ incl. filters |
| S-18 | Credit expiry & renewal | `/seller/billing/expiry` | ✓ proposed states only | n/a — **gated on D-04** | · | ✓ renders as unresolved |
| S-19 | Invoices | `/seller/billing/invoices` | ✓ | ✓ | · | ✓ |
| S-20 | Invoice detail | `/seller/billing/invoices/:id` | ✓ | ✓ no tax line — **GST open, D-13** | · | ✓ |
| S-21 | Billing information | `/seller/billing/details` | ✓ | ✓ | · | ~ states exercised |
| S-22 | Support tickets | `/seller/support` | ✓ | ✓ four statuses, empty state | · | ✓ |
| S-23 | New ticket | `/seller/support/new` | ✓ | ✓ **creates a real ticket** — *disconnected step 2 closed in sample* | · | ~ creation driven; attachments absent by design |
| S-24 | Ticket detail & replies | `/seller/support/:id` | ✓ | ✓ reply and resolve | · | ~ states exercised |
| S-25 | Profile & settings | `/seller/profile` | ✓ | ✓ | · | ~ states exercised |

### Not a screen: `/seller/review-state`

The approved prototype reached S-04's four verification states, S-05's
suspension, S-16's three payment outcomes and S-10's insufficient balance
through a reviewer bar across the top of every screen. That bar is reviewer
tooling and is not in the application, so those switches live at
`/seller/review-state` — a URL nothing links to, which returns 404 outside
sample mode.

It sets which designed screen renders. It does not authenticate, authorise,
approve a document, take a payment or move money.

**Its 404 path is currently untestable**, not verified: a build with
`NEXT_PUBLIC_KKL_DATA_SOURCE=api` fails at build time because the API client
does not exist, so no non-sample build can be produced for the route to be
absent from. That is a stronger position than the 404 — the route cannot exist
outside sample mode — but it is not the same claim, and the check is recorded as
untestable rather than passed.

### What "Sample ✓" does not mean in this area

More strongly than anywhere else in the application, because these are the
screens where money, identity and lead ownership appear:

- **No authentication.** There is no sign-in. One sample Seller is shared by
  every visitor to the process, so a purchase made in one browser is visible in
  another. Verified as check 19 of `verify-seller-flow.mjs` — it asserts the
  limitation.
- **No authorization.** Nothing checks whether a caller may buy a lead.
  `kycStatus` and `accountStatus` decide what the screens say.
- **No KYC.** Documents are not uploaded, stored, scanned or seen. Submitting
  moves the account to `pending` and never approves it.
- **No money.** The balance is a number in the server's memory. No gateway is
  contacted, no payment is captured, no invoice is issued to anyone.
- **Not durable or transactional.** Restarting loses every purchase, ledger
  entry and ticket. Deduct-then-release is two statements in one process, not a
  transaction.

## B — Builder

| ID | Screen | Route | Screen | Sample | Real | Verified |
|---|---|---|---|---|---|---|
| B-01 | Builder registration | `/builder/register` | · | · | · | · |
| B-02 | Builder KYC & verification | `/builder/kyc` | · **documents open, D-15** | · | · | · |
| B-03 | Subscription overview | `/builder/subscription` | · **price open, D-01** | · | · | · |
| B-04 | Subscription payment result | `/builder/subscription/payment` | · | · | · | · |
| B-05 | Renewal & expiry | `/builder/subscription/renewal` | · **listing outcome open, D-02** | · | · | · |
| B-06 | Builder dashboard | `/builder` | · | · | · | · |
| B-07 | My properties | `/builder/properties` | · | · | · | · |
| B-08 | Create listing — basics | `/builder/properties/new` | · | · | · | · |
| B-09 | Create listing — location | `…/new/location` | · | · | · | · |
| B-10 | Create listing — pricing & configuration | `…/new/pricing` | · | · | · | · |
| B-11 | Create listing — specifications & amenities | `…/new/specs` | · | · | · | · |
| B-12 | Create listing — media | `…/new/media` | · | · | · | · |
| B-13 | Create listing — preview & publish | `…/new/preview` | · *disconnected step 1* | · | · | · |
| B-14 | Listing actions | *nested — within B-07* | · | · | · | · |
| B-15 | Edit listing & unsaved changes | `/builder/properties/:id/edit` | · | · | · | · |
| B-16 | Enquiries on my listings | `/builder/enquiries` | · | · | · | · |
| B-17 | Enquiry detail | `/builder/enquiries/:id` | · **contact disclosure open, D-05** | · | · | · |
| B-18 | New-enquiry notification | *nested* | · **D-05** | · | · | · |
| B-19 | Access restrictions | *nested* | · | · | · | · |
| B-20 | Lead marketplace (Builder) | `/builder/marketplace` | · **lead prices open, D-03** | · | · | · |
| B-21 | Purchased leads (Builder) | `/builder/leads` | · | · | · | · |
| B-22 | Billing & credits (Builder) | `/builder/billing` | · | · | · | · |
| B-23 | Support (Builder) | `/builder/support` | · | · | · | · |
| B-24 | Profile & settings (Builder) | `/builder/profile` | · **dual role open, D-08** | · | · | · |

## A — Admin

| ID | Screen | Route | Screen | Sample | Real | Verified |
|---|---|---|---|---|---|---|
| A-01 | Admin sign-in | `/admin/login` | · **MFA open, D-16** | · | · | · |
| A-02 | Admin dashboard | `/admin` | · | · | · | · |
| A-03 | Users | `/admin/users` | · | · | · | · |
| A-04 | User detail | `/admin/users/:id` | · | · | · | · |
| A-05 | KYC queue | `/admin/kyc` | · | · | · | · |
| A-06 | KYC applicant review | `/admin/kyc/:id` | · | · | · | · |
| A-07 | KYC decision | *nested — within A-06* | · | · | · | · |
| A-08 | Property review queue | `/admin/properties` | · **pre/post publish open, D-10** | · | · | · |
| A-09 | Property detail & moderation | `/admin/properties/:id` | · | · | · | · |
| A-10 | Lead intake overview | `/admin/leads/intake` | · | · | · | · |
| A-11 | Intake results & failures | `/admin/leads/intake/:id` | · | · | · | · |
| A-12 | Leads | `/admin/leads` | · | · | · | · |
| A-13 | Lead detail & history | `/admin/leads/:id` | · | · | · | · |
| A-14 | Lead pricing & aging rules | `/admin/settings/pricing` | · **D-03** | · | · | · |
| A-15 | Platform settings | `/admin/settings` | · | · | · | · |
| A-16 | Orders & purchases | `/admin/orders` | · | · | · | · |
| A-17 | Delivery & download records | `/admin/orders/:id/delivery` | · | · | · | · |
| A-18 | Wallet & credit oversight | `/admin/wallets` | · | · | · | · |
| A-19 | Credit adjustment | `/admin/wallets/:id/adjust` | · | · | · | · |
| A-20 | Refund review | `/admin/refunds` | · **refund policy open, D-06** | · | · | · |
| A-21 | Subscriptions & billing | `/admin/subscriptions` | · | · | · | · |
| A-22 | Support queue | `/admin/support` | · | · | · | · |
| A-23 | Ticket conversation | `/admin/support/:id` | · | · | · | · |
| A-24 | Voice qualification overview | `/admin/voice` | · | · | · | · |
| A-25 | Call detail | `/admin/voice/:id` | · | · | · | · |
| A-26 | WhatsApp funnel | `/admin/whatsapp` | · | · | · | · |
| A-27 | Notification delivery | `/admin/notifications` | · | · | · | · |
| A-28 | Consent & suppression | `/admin/consent` | · **D-14** | · | · | · |
| A-29 | Analytics & reports | `/admin/reports` | · | · | · | · |
| A-30 | Audit log | `/admin/audit` | · | · | · | · |
| A-31 | Jobs & integration status | `/admin/system` | · | · | · | · |

---

## The two deliberately disconnected steps

The design prototype leaves these unconnected and says so in C-10. They are represented through
the service interfaces so they connect once, at the right layer:

1. **Builder publish → public portal visibility.** In the prototype, publishing in B-13 does not
   reach the portal, which uses fixed sample listings. Here it belongs to the property service:
   publishing changes a listing's status, and public search reads published listings through the
   same service. The sample implementation will demonstrate it end to end; the real behaviour is
   kkl-backend's and stays **pending** until the API exists.

2. **Seller ticket creation → Admin support queue.** In the prototype, S-23 opens the existing
   thread rather than creating a queue item. Here both surfaces read one support service, so a
   created ticket appears in the Admin queue. Demonstrated in sample, **pending** for real.

Neither is faked at the component layer, and neither is presented as connected to a real system.

## Progress

Counted per dimension, because they are not the same question.

| Area | Rows | Screen built | Sample behaviour | Real integration | Verified |
|---|---|---|---|---|---|
| C library | 12 | 9 (2 partial) | 8 | **0** | 6 (4 partial) |
| P public + Buyer | 21 | 21 (2 partial) | 19 (3 partial) | **0** | 16 (5 partial) |
| S Seller | 25 | 25 (1 partial) | 22 (3 partial) | **0** | 25 (8 partial) |
| B Builder | 24 | 0 | 0 | **0** | 0 |
| A Admin | 31 | 0 | 0 | **0** | 0 |

**Phase 2 is not complete.** The shared foundation, the public portal, the Buyer
journey and the Seller journey are built and behave against sample services.
Builder and Admin — 55 rows — have not been started. Nothing anywhere is
connected to a real service.

Three things that a "screens are done" reading would miss:

1. **No real integration exists at all.** Not partial, not stubbed against a
   staging API: zero. kkl-backend has not published its API, so authentication,
   authorization, lead ownership, contact disclosure, credits and payments are
   all simulated. Every screen that touches one says so on the screen.
2. **Three accessibility checks are outstanding for every row** — screen-reader
   testing, per-chip contrast measurement, and native plus text-only zoom. They
   were outstanding at design approval (C-11) and design approval did not
   discharge them. No row's Verified mark includes them.
3. **The visual comparison against the baseline is not complete.** Primary
   property imagery still differs: the baseline shows photography, this
   implementation shows it only when the review-imagery flag is on, and that
   path has never been seen rendered because the build environment blocks
   `images.unsplash.com`. See `approved-baseline.md`.
