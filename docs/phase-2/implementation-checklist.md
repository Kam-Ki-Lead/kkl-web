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
| C-01 | Colour tokens | ✓ | n/a | · | ✓ **26/26 tokens and 37/37 literals checked mechanically** — three were wrong until then | `src/app/globals.css` `@theme` |
| C-02 | Typography | ✓ | n/a | · | ✓ scale compared | `src/app/globals.css` `.t-*`, `src/app/layout.tsx` |
| C-03 | Navigation systems | ✓ public header/footer/drawer and the dashboard rail, shared by both consoles | ✓ | · | ✓ public nav, Seller rail, Builder rail, at both widths | `src/components/layout/` |
| C-04 | Form controls | ✓ | ✓ | · | ~ keyboard and focus checked; not screen-reader tested | `src/components/ui/button.tsx`, `field.tsx` |
| C-06a | Card overrides | ✓ **fixed** — the base surface beat every caller's colour | n/a | · | ✓ asserted by the visual-values check | `src/components/ui/card.tsx` |
| C-05 | Filters, tables, pagination | ~ pagination controls not built — no sample list is long enough to need them | ✓ | · | ~ filters, chips, sort | `src/components/search/`, `chip.tsx` |
| C-06 | Cards | ✓ property, project and lead cards | ✓ | · | ✓ property, project and lead cards, both consoles | `src/components/property/property-card.tsx`, `src/components/console/lead-card.tsx` |
| C-07 | Dialogs, uploads, notifications | ~ file-choice fields and notification lists built; **no dialog component** | ~ a file is named, never uploaded | · | ~ the file fields and notification lists; no dialog to check | `src/components/builder/section-forms.tsx`, `src/app/*/notifications` |
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
| S-01 | Seller registration | `/seller/register` | ✓ | ~ validates and advances; creates no account | · | ✓ both phases, incl. no-JS (validation, rejected code, completion) |
| S-02 | Onboarding — business details | `/seller/onboarding` | ✓ | ✓ saves, validates, GSTIN format-checked | · | ✓ states exercised, incl. no-JS |
| S-03 | KYC submission (PAN, Aadhaar) | `/seller/kyc` | ✓ | ~ records that files were chosen; **uploads nothing** | · | ✓ validation exercised, incl. no-JS |
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
| S-21 | Billing information | `/seller/billing/details` | ✓ | ✓ | · | ✓ states exercised, incl. no-JS |
| S-22 | Support tickets | `/seller/support` | ✓ | ✓ four statuses, empty state | · | ✓ |
| S-23 | New ticket | `/seller/support/new` | ✓ | ✓ **creates a real ticket** — *disconnected step 2 closed in sample* | · | ✓ creation driven, incl. no-JS; attachments absent by design |
| S-24 | Ticket detail & replies | `/seller/support/:id` | ✓ | ✓ reply and resolve | · | ✓ states exercised, incl. no-JS |
| S-25 | Profile & settings | `/seller/profile` | ✓ | ✓ | · | ✓ states exercised, incl. no-JS |

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
| B-01 | Builder registration | `/builder/register` | ✓ | ~ validates and advances; creates no account | · | ✓ both phases, incl. no-JS |
| B-02 | Builder KYC & verification | `/builder/verification` | ✓ | ~ records that files were chosen; **uploads nothing**; **document list open, D-15** | · | ✓ validation and four states, incl. no-JS |
| B-03 | Subscription overview | `/builder/subscription` | ✓ | ✓ four states; **no price shown — D-01** | · | ✓ incl. an assertion that no figure appears |
| B-04 | Subscription payment result | `/builder/subscription/payment` | ✓ | ✓ active, pending, failed | · | ✓ all three, plus direct access refused |
| B-05 | Renewal & expiry | `/builder/subscription/renewal` | ✓ | ✓ expiry blocks publishing; **live-listing outcome open, D-02** | · | ✓ expiry blocks publishing and does *not* hide live listings |
| B-06 | Builder dashboard | `/builder` | ✓ | ✓ counts derived from listings and enquiries | · | ✓ 1440 · 390 |
| B-07 | My properties | `/builder/properties` | ✓ | ✓ published, draft, empty | · | ✓ incl. unpublish and republish |
| B-08 | Create listing — basics | `/builder/properties/:id/basics` | ✓ | ✓ saves and validates | · | ✓ save and advance, incl. no-JS |
| B-09 | Create listing — location | `…/:id/location` | ✓ | ✓ | · | ✓ |
| B-10 | Create listing — pricing & configuration | `…/:id/pricing` | ✓ | ✓ | · | ✓ |
| B-11 | Create listing — specifications & amenities | `…/:id/specs` | ✓ | ✓ | · | ✓ |
| B-12 | Create listing — media | `…/:id/media` | ✓ | ~ records that photographs were chosen; **stores no bytes** | · | ✓ the limitation is asserted, not the upload |
| B-13 | Create listing — preview & publish | `…/:id/preview` | ✓ | ✓ blockers per section, publish, **portal continuity — *disconnected step 1 closed in sample*** | · | ✓ blockers named, publish reaches `/search`, incl. no-JS |
| B-14 | Listing actions | *nested — within B-07* | ✓ | ✓ edit, unpublish, republish, delete a draft | · | ✓ |
| B-15 | Edit listing & unsaved changes | `/builder/properties/:id/basics` *(same editor)* | ✓ | ~ mark, dialog, reload warning and Back-safety; **no dialog on browser Back** | · | ~ 20 checks; the Back case is closed for data loss, open for the dialog |
| B-16 | Enquiries on my listings | `/builder/enquiries` | ✓ | ✓ seeded **plus Buyer enquiries from the portal** | · | ✓ a portal enquiry reaches the console |
| B-17 | Enquiry detail | `/builder/enquiries/:id` | ✓ | ✓ both alternatives; **disclosure rule open, D-05** | · | ✓ incl. a mask-containment check over the whole HTML |
| B-18 | New-enquiry notification | `/builder/enquiries/notifications` | ✓ | ✓ read/unread; **D-05** | · | ✓ |
| B-19 | Access restrictions | `/builder/restrictions` | ✓ | ✓ suspension and verification as separate axes | · | ✓ suspension does not rewrite verification |
| B-20 | Lead marketplace (Builder) | `/builder/marketplace` | ✓ | ✓ the Builder's own lead pool; **prices open, D-03** | · | ✓ separate pool from the Seller's |
| B-21 | Purchased leads (Builder) | `/builder/leads` | ✓ | ✓ + server-generated CSV | · | ✓ export, and 404 for a lead not owned |
| B-22 | Billing & credits (Builder) | `/builder/billing` | ✓ | ✓ separate balance, ledger, invoices | · | ✓ reconciliation and separation from the Seller wallet |
| B-23 | Support (Builder) | `/builder/support` | ✓ | ✓ separate queue, creation and replies | · | ✓ incl. a check that a Builder ticket stays out of the Seller queue |
| B-24 | Profile & settings (Builder) | `/builder/profile` | ✓ | ✓ edit, validation, confirmation; **dual role open, D-08** | · | ✓ incl. no-JS |

### Not a screen: `/builder/review-state`

The same reviewer-tooling position as `/seller/review-state`, and the same
caveat: it sets which designed state renders — subscription, verification,
suspension, payment outcome — and it authenticates nothing, approves nothing and
moves no money. It returns 404 outside sample mode, and that 404 path is
**untestable for the same reason**: no non-sample build can be produced.

### B-15 — what is and is not built

The editor is one route (`/builder/properties/:id/:section`) reached both by
creating a listing and by editing one, which is what the prototype shows: B-08
to B-13 are the same six sections, and B-15 is that editor opened on an existing
listing. There is no separate edit screen and building one would duplicate it.

**The unsaved-changes experience is built and is partial.** The header mark,
the three-way exit dialog, the reload warning and the section/rail interception
are all present and verified. What is **not** present is the dialog on browser
**Back** — and that is a decision rather than unfinished work.

Two things about it are worth recording rather than leaving to be rediscovered:

- **Dirtiness is read from the DOM against each control's own default**, not
  from a snapshot taken at mount. That is exactly the state `form.reset()`
  restores, so "discard" and "is it dirty" cannot disagree. Typing a value back
  to what was saved clears the mark rather than latching.
- **File inputs are excluded.** In sample mode nothing is uploaded and
  `photoCount` is what actually saves, so a chosen file could never become
  "saved" — counting it would leave the editor permanently dirty.

**Browser Back does not show the dialog, and no longer loses work.** Back is
not cancellable: by the time `popstate` fires the navigation has happened, so a
history trap has to undo it — breaking Forward, growing the stack and competing
with the router. Instead the section's unsaved values are held per tab and put
back on return, with a notice. Closing B-15 fully needs a decision between
accepting that, adopting Cache Components (a whole-application migration, and
still best-effort at three routes), or a history trap. See
`acceptance.md` §2.

**None of it works without JavaScript**, and the screen says so rather than
implying otherwise. What still works there is the part a Builder would actually
lose work to: every control that leaves a section is a submit button, so moving
through the editor saves on the way. Recorded as limitation L3 of the Builder
suite — a reproduction, not a pass.

### What "Sample ✓" does not mean for Builder

Everything under the Seller heading above applies unchanged — no
authentication, no authorization, no KYC, no money, nothing durable — and two
more, specific to this area:

- **Publishing is not moderation.** In sample mode a published listing reaches
  `/search` immediately. Whether a real listing is reviewed before or after it
  goes live is **D-10 and is open**; A-08's queue does not exist. The
  continuity demonstrated here is the mechanism, not the policy.
- **A published listing is not a verified project.** RERA registration is a
  field the editor collects and the portal displays. Nothing checks it against a
  register. The same is true of every specification, price and possession date.

## A — Admin

| ID | Screen | Route | Screen | Sample | Real | Verified |
|---|---|---|---|---|---|---|
| A-01 | Admin sign-in | `/admin/login` | ✓ **fields disabled — authenticates nobody; MFA open, D-16** | n/a — nothing to implement | · | ✓ asserted disabled and self-declaring |
| A-02 | Admin dashboard | `/admin` | ✓ | ✓ queue tiles counted from the queues | · | ✓ 1440 · 390 |
| A-03 | Users | `/admin/users` | ✓ | ✓ two rows read live state from their console | · | ✓ filters, search, empty |
| A-04 | User detail | `/admin/users/:id` | ✓ | ✓ suspend/reinstate, reason-gated | · | ✓ incl. two negative checks and no-JS |
| A-05 | KYC queue | `/admin/kyc` | ✓ | ✓ decided applications leave the queue | · | ✓ four filters |
| A-06 | KYC applicant review | `/admin/kyc/:id` | ✓ | ✓ documents, checklist, decision | · | ✓ checklist gate, incl. no-JS |
| A-07 | KYC decision | *nested — within A-06* | ✓ | ✓ three outcomes, each writing to the account | · | ✓ approve, reject, resubmit |
| A-08 | Property review queue | `/admin/properties` | ✓ | ✓ **no approve action — D-10 open** | · | ✓ asserted absent, with the reason on screen |
| A-09 | Property detail & moderation | `/admin/properties/:id` | ✓ | ✓ unpublish and dismiss, reason-gated | · | ✓ |
| A-10 | Lead intake overview | `/admin/leads/intake` | ✓ | ~ **fixtures — no intake pipeline exists** | · | ✓ renders; the limitation is asserted |
| A-11 | Intake results & failures | `/admin/leads/intake/:id` | ✓ | ~ fixtures; numbers masked in the data | · | ✓ |
| A-12 | Leads | `/admin/leads` | ✓ | ~ fixtures; six lifecycle states | · | ✓ filters, search |
| A-13 | Lead detail & history | `/admin/leads/:id` | ✓ | ~ fixtures; **no contact detail on the screen at all** | · | ✓ eligible and ineligible cases |
| A-14 | Lead pricing & aging rules | `/admin/settings/pricing` | ✓ **fields disabled — D-03** | n/a — gated on D-03 | · | ✓ asserted not editable |
| A-15 | Platform settings | `/admin/settings` | ✓ **read-only — D-09, calling hours** | n/a | · | ✓ |
| A-16 | Orders & purchases | `/admin/orders` | ✓ | ✓ **live purchases from both consoles** | · | ✓ a Seller purchase appears here |
| A-17 | Delivery & download records | `/admin/orders/:id/delivery` | ✓ | ✓ delivered and reversed-failure cases | · | ✓ both |
| A-18 | Wallet & credit oversight | `/admin/wallets` | ✓ | ✓ **balances derived from the consoles' own ledgers** | · | ✓ Admin and Seller agree |
| A-19 | Credit adjustment | `/admin/wallets/:id/adjust` | ✓ | ✓ posts a traceable entry with a mandatory reason | · | ✓ both gates, incl. no-JS |
| A-20 | Refund review | `/admin/refunds` | ✓ | ✓ decision recorded; **moves nothing — D-06** | · | ✓ asserted that nothing moves |
| A-21 | Subscriptions & billing | `/admin/subscriptions` | ✓ | ✓ live Builder row; **no amount shown — D-01** | · | ✓ asserted no figure appears |
| A-22 | Support queue | `/admin/support` | ✓ | ✓ **both consoles' tickets in one queue** | · | ✓ |
| A-23 | Ticket conversation | `/admin/support/:id` | ✓ | ✓ reply routing and internal notes | · | ✓ 5 checks incl. 3 negative, and no-JS |
| A-24 | Voice qualification overview | `/admin/voice` | ✓ | ~ **fixtures — kkl-voice is not connected** | · | ✓ |
| A-25 | Call detail | `/admin/voice/:id` | ✓ | ~ fixtures; no audio player | · | ✓ transcript and no-transcript cases |
| A-26 | WhatsApp funnel | `/admin/whatsapp` | ✓ | ~ fixtures | · | ✓ |
| A-27 | Notification delivery | `/admin/notifications` | ✓ | ~ fixtures; **read-only, no resend** | · | ✓ |
| A-28 | Consent & suppression | `/admin/consent` | ✓ | ✓ **read-only; the service has no remove method** | · | ✓ asserted absent |
| A-29 | Analytics & reports | `/admin/reports` | ~ one report, no picker or date range | ~ synthetic figures, labelled | · | ✓ incl. server-generated CSV |
| A-30 | Audit log | `/admin/audit` | ✓ | ✓ **append-only; every action here writes one** | · | ✓ incl. unchanged-field pairs |
| A-31 | Jobs & integration status | `/admin/system` | ✓ | ~ fixtures; **no credential field anywhere** | · | ✓ asserted |

### Not a screen: `/admin/review-state`

The same position as the Seller's and Builder's, with one difference: the
Admin console needs almost no state switches, because its queues are reached by
acting on them. What it needs is a **reset**, because staff decisions are
one-way — an approved application leaves the queue.

Its reset is the whole platform, not just the Admin store. A verification
decision writes into the Seller or Builder console, so resetting Admin alone
would leave those two carrying the last pass's decisions while this console
showed a fresh queue.

### A-07 is not a route

The screen inventory marks it as a nested state within A-06's review flow, and
it is built that way: the decision panel sits below the checklist on A-06 and
the outcome replaces it in place. A reviewer who has just read four documents
should not be sent to another page to say what they concluded.

### Identity in the service interfaces

Admin is the first role that acts *on* accounts rather than as one, so the
account a service operates on became a parameter rather than an ambient
assumption. `src/lib/domain/identity.ts` introduces `AccountRef` and
`StaffRef`, and every mutating `AdminService` method takes an actor and a
subject explicitly.

**This is modelling, not authorization**, and the distinction is worth
repeating because the shape invites the confusion:

- The actor is supplied by the server — a constant this process owns — and is
  never read from a form. No field in any Admin form can name who acted.
- The console-scope field the Seller and Builder actions carry is **untrusted
  input**. It is validated to one of two known values so a junk value cannot
  select no service at all. That is a validator, not a check: it does not
  establish that a caller may act as a Builder, because in this build nothing
  can. A real implementation reads the role from the authenticated identity and
  ignores what the form said.

### What "Sample ✓" does not mean for Admin

Everything under the Seller and Builder headings applies, and three more that
are specific to a staff console — the surface where a screen most invites being
read as authoritative, because it looks like the inside of the system:

- **Nobody is signed in, and there are no staff roles.** A-01 authenticates no
  one; anything that reaches `/admin` gets the entire console. Who may approve a
  document, adjust a balance or read a transcript are kkl-backend's to decide
  and enforce, and nothing here is separated by permission. Asserted as
  limitation L1 of the Admin suite — a reproduction, not a pass.
- **The operational screens read fixtures.** There is no intake pipeline, no
  qualification caller, no WhatsApp journey and no notification sender anywhere
  in this repository. A-10 to A-13 and A-24 to A-27 exist so their layout and
  states can be reviewed, and each says so on its own face.
- **A recorded decision is not an enforced one.** The cross-role joins below are
  real reads and writes through the sample service layer. They demonstrate that
  the surfaces agree; they demonstrate nothing about whether a real Seller could
  be stopped from purchasing, which is a server-side check that does not exist.

### The cross-role joins, and what each one proves

| Join | Direction | Asserted by |
|---|---|---|
| KYC decision → Seller/Builder verification | write | Admin checks 5–9, 15; no-JS 40–43 |
| Suspension → account status, **not** verification | write | Admin checks 10–14, 15; no-JS 37–39 |
| Credit adjustment → the account's own ledger, with the reason | write | Admin checks 16–19; no-JS 44–46 |
| Public reply → the requester's own thread | write | Admin checks 20–22, 26–27; no-JS 47–49 |
| Internal note → **nowhere but Admin** | containment | Admin checks 23–25 |
| Purchases and credit activity → Admin records | read | Admin check 28 |
| Live account state → A-03, A-18, A-21 | read | Admin checks 11, 19; A-21 reads B-03's state |

Five of those seven checks are **negative** — they assert that something does
*not* happen. A staff console's interesting failures are a reply reaching the
wrong person, a note reaching anyone, or a suspension quietly revoking a
verification, and a suite that only walks happy paths cannot see any of them.

---

## The two deliberately disconnected steps

The design prototype leaves these unconnected and says so in C-10. Both are now
connected in sample mode, at the service layer rather than at the component
layer.

1. **Builder publish → public portal visibility.** *Closed in sample.*
   Publishing in B-13 changes a listing's status; `/search` and the portal read
   published listings through `portal-bridge.ts`, which joins the Builder's
   listings to the portal's properties. Verified end to end: publish, see it on
   `/search`, unpublish, see it gone, republish, see it back — with JavaScript
   and without.

   **The rule applied is the defined one, and only that one.** A listing is on
   the portal because it is published. Whether a listing is reviewed before or
   after it goes live is **D-10 and open**; whether a live listing comes down
   when a subscription lapses is **D-02 and open**. Nothing here decides either:
   subscription gates *publishing*, not continued visibility, and B-05 puts the
   three alternatives to the client. Real behaviour is kkl-backend's and stays
   **pending**.

2. **Seller ticket creation → Admin support queue.** *Half closed.* S-23 creates
   a real ticket through the support service instead of opening the existing
   thread, so the created ticket is in the queue the service exposes. The Admin
   side of the join (A-22) is not built, so nothing reads that queue as an
   administrator yet. Demonstrated as far as it can be, **pending** for real.

A third join was not in C-10 and is implemented for the same reason: a Buyer's
enquiry from the public portal reaches the Builder who owns that listing
(`buyerEnquiriesForBuilder`), joined by listing ownership rather than by "every
enquiry in the process".

Neither is faked at the component layer, and none is presented as connected to a
real system.

## Progress

Counted per dimension, because they are not the same question.

| Area | Rows | Screen built | Sample behaviour | Real integration | Verified |
|---|---|---|---|---|---|
| C library | 12 | 11 (2 partial) | 9 (1 partial) | **0** | 8 (3 partial) |
| P public + Buyer | 21 | 21 (2 partial) | 19 (3 partial) | **0** | 16 (5 partial) |
| S Seller | 25 | 25 (1 partial) | 22 (3 partial) | **0** | 25 (8 partial) |
| B Builder | 24 | 24 | 24 (4 partial) | **0** | 24 (1 partial) |
| A Admin | 31 | 31 (1 partial) | 22 (10 partial, 3 n/a) | **0** | 31 |

**Every screen in the inventory is now built.** The shared foundation, the
public portal, the Buyer journey, the Seller journey, the Builder journey and
the Admin console all behave against sample services.

**That is not the same as Phase 2 being complete**, and the gap is not a
formality:

- **Nothing is connected to a real service.** Not partially, not against a
  staging API: zero. Every authentication, authorization, verification,
  ownership, contact-disclosure, credit and payment decision in this repository
  is simulated.
- **Ten of the 31 Admin rows carry a partial Sample mark**, and three are `n/a`.
  A-10 to A-13 and A-24 to A-27 render fixtures for pipelines that do not exist;
  A-01, A-14 and A-15 have nothing to implement because the decisions behind
  them are open.
- **Sixteen client decisions are still open** (D-01 to D-16). Several of them
  are the reason a screen is deliberately inert rather than unfinished — no
  approve action on A-08, no amount on A-21, no movement on A-20, no editable
  price on A-14.
- **The visual comparison is incomplete and the accessibility work is
  outstanding**, as below.

Two of those deserve spelling out, because a "screens are done" reading walks
straight past them:

1. **Three accessibility checks are outstanding for every row** — screen-reader
   testing, per-chip contrast measurement, and native plus text-only zoom. They
   were outstanding at design approval (C-11) and design approval did not
   discharge them. No row's Verified mark includes them, on any of the 113 rows.
2. **The visual comparison against the baseline is not complete.** 17 of the
   113 rows were compared against a rendered prototype, eleven of those at 1440
   only. The image-present state was compared with generated stand-ins, which
   establishes slot geometry and nothing about the baseline's own photography —
   the build environment blocks `images.unsplash.com`. See `acceptance.md` §3
   and `approved-baseline.md`.
