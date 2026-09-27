# Client Change Register — CR01 to CR07

Prepared 26 September 2026 against HEAD `e6ec30b`. **Implementation pass 27
September 2026**, from `537a265` — see the status table below for what each
record now is. Sources: `KKL_UI_Spec.docx` (the client's written specification)
and `KKL_Client_Change_Confirmation.docx` (review version 1), plus the
accompanying call instructions.

> **The confirmation document is a proposal for review, not evidence that every
> suggested field, policy or workflow has been approved.** Each record below
> separates what the call confirmed from what the document merely proposes, and
> names the decision that blocks whatever cannot yet be built.
>
> The Phase 1 baseline (kkl-design `5bc3512`) and the existing frontend remain
> the reference for every screen these changes do not touch. Nothing here
> reopens them.

Decision numbers (1–10) refer to the confirmation document's decision list.
D-numbers (D-01…) refer to the pre-existing register in `decisions.md`, which
these changes extend but do not close.

---

## Implementation status at a glance

Updated as the work lands. "Done" means implemented and verified in this build
by a suite that would fail if it were not; "prepared" means the artifact exists
for review and is labelled as the proposal it is; "blocked" names the decision
that must land first.

**These statuses are mine, not the client's.** The change-confirmation document
is unsigned — its signature line and its Approve/Revise block are both blank —
so nothing below is client-approved. "Done" means built and verified, and says
nothing about acceptance.

| Record | Status | What that means |
|---|---|---|
| CR01 — Buy Leads wording | **Done** | Marketplace entries, page titles, buying actions and the sentences that point at them all read Buy Leads; property Buy/Rent intent and the descriptive taglines untouched. Verified by where each label links, not by word counts — `verify-labels-and-locations.mjs` 1–8 |
| CR02 — Individual owner posting | **Done, as sample** | A working six-step journey: `/post-property` → `/owner/listings` → steps → preview → submit → the listing record, plus the Admin owner-submission queue. Submission enters a review queue; nothing publishes, nothing is charged, no verification is awarded. Drafts are process memory and the screens say so. Photographs are recorded by name and the files are **not** stored, disclosed on every screen that shows them — `verify-owner-posting-flow.mjs` 31/31 |
| CR03 — Request Leads | **Done, genuinely persistent** | Served by kkl-backend (branch `claude/cr03-lead-requests`) when `KKL_LEAD_REQUESTS=backend`: a request is a PostgreSQL row that survives a restart, and row-level security the application role cannot bypass refuses one account the rows of another. Proven by restarting the service mid-run — `verify-lead-request-persistence.mjs` 9/9 — and by `kkl-backend/tests/rls.test.mjs` past the handlers. Without that variable the sample store answers and the screens say records last for the session only. There is no fallback between the two |
| CR04 — Purchase orders | **Done on the confirmed path** | Decision 4 resolved to direct order settled from wallet credits. The order is now a record of its own: My purchases and order detail in both consoles, payment traced to its ledger entry, invoice state stated rather than implied, replayed submissions reported as repeats. No gateway, no refund control, no tax treatment. Cart and a gateway alternative remain a later addition — `verify-lead-order-flow.mjs` 20/20 |
| CR05 — Locations | **Done** | Central records (India → West Bengal → Kolkata → 55 areas), stable ids, searchable picker, hierarchy-aware matching, on all six surfaces that pick a location — property search, the owner and Builder listing forms, both marketplace filter rows, the Seller lead-request form — plus the Admin views that show an area. A locality's own name now ranks above the sub-localities whose labels contain it; before this pass, typing "New Town" and pressing Enter selected Action Area I — `verify-labels-and-locations.mjs` 9–17 |
| CR06 — Visual direction | **Blocked** | Decision 9: the authoritative logo asset and the "Type 1" referent are both unsupplied. You said you would send both; they have not arrived, so the approved homepage stays untouched and no archived direction has been guessed at |
| CR07 — Verification policy | **Done, as labelled sample** | Decision 5/6 resolved to a selective, action-based policy: no check for browsing or enquiring, a check where money or publication is at stake, "Not required" as its own state that is never Verified, no case opened by registering, cases with references and history, the Admin queue split between what needs a person and routine processing, and a provider failure that can never become a pass. The existing Seller purchase restriction is unchanged. No provider selected, no identity document collected, no compliance claimed — `verify-verification-policy.mjs` 19/19 |

### What is sample and what is genuinely integrated

| | Backed by a database, survives a restart | Process memory, lost on restart |
|---|---|---|
| CR03 lead requests | ✓ with `KKL_LEAD_REQUESTS=backend` | ✓ without it (and the screens say which) |
| CR02 owner listings | — | ✓ |
| CR04 orders | — | ✓ (derived from the purchase and its ledger entry) |
| CR07 verification cases | — | ✓ |

Everything in the right-hand column is a kkl-backend dependency. Only CR03 was
stated as a client requirement, and only CR03 has been made real.

---

## Decisions received in this pass, and what they changed

Four answers arrived during the implementation pass. Each is recorded with what
it settled and what it deliberately left open.

| Decision | Answer received | What it settled | What it did not settle |
|---|---|---|---|
| 4 — cart vs direct order, wallet vs gateway | **Direct order, settled from wallet credits** | CR04's path is the one already built; the order becomes a record with payment traced to its ledger entry | No payment provider is chosen, and a cart remains a later addition. Nothing names or contacts a gateway |
| 7 — owner publication | **Submit for review; never auto-publish** | CR02's journey: drafts, submission into a moderation queue, and a confirmation that says plainly the listing is awaiting review | Whether a cleared listing publishes at all, when, on what terms, and at what cost. "Cleared" therefore reads "Cleared — not published" everywhere |
| 5/6 — verification policy | **Selective, action-based** | CR07's whole structure: no check for browsing or enquiring, a check where money or publication is at stake, Not required as its own state, existing purchase restriction retained | Which provider does the checking; whether verifications expire and after how long; whether requesting leads needs a check (built as "not required" and marked on screen as an assumption) |
| 9 — logo and Type 1 homepage | **"I'll supply both"** | Nothing yet — the assets have not arrived | CR06 in its entirety. The approved homepage is untouched and no archived direction has been guessed at |

### Still outstanding, in the order they block work

1. **The CR06 assets** — the authoritative logo file, and which screenshot or
   file is "Type 1". CR06 cannot start without them and nothing else waits on
   them.
2. **Owner publication terms** (decision 7's remainder) — whether a cleared
   owner listing publishes, on what terms, and what an owner is charged. Until
   this lands, `cleared` is the end of the owner journey.
3. **Whether requesting leads requires verification** — implemented as "not
   required" and labelled on screen as an assumption rather than a rule.
4. **Verification provider, expiry period, retention and consent** — no
   provider is selected and no compliance claim is made.
5. **Refund eligibility and destination** (D-14) — why there is no refund or
   cancel control on an order, and no `refunded` status.
6. **Tax treatment and whether a per-order invoice is issued** (D-13) — why the
   order's invoice block states that no separate document exists rather than
   offering one.
7. **Whether a Seller may withdraw a lead request, and retention for closed
   requests** — kkl-backend's CR03 slice documents both as open.

None of these is blocking the frontend work that remains; each is blocking a
statement the screens currently decline to make.

---

## CR01 — "Buy Leads" wording

**Source.** Call request, restated in the confirmation document: *"Use Buy Leads
for the lead marketplace entry and lead-buying context. Keep property search and
individual-owner listing actions distinct. Do not replace every occurrence of
Buy across the product."*

**Requested behaviour.** The lead-marketplace entry points and lead-purchasing
actions read "Buy Leads". Property Buy/Rent intent wording is a different
concept and is untouched. Order-confirmation and payment actions keep clear,
specific labels.

**Affected screens, services, tests.**

| Surface | Today | Change |
|---|---|---|
| `src/components/seller/seller-nav.ts` | Rail item "Lead marketplace" | "Buy Leads" |
| `src/components/builder/builder-nav.ts` | Rail item "Lead marketplace" | "Buy Leads" |
| `src/app/seller/leads/page.tsx` | Shell title + metadata "Lead marketplace" | "Buy Leads" |
| `src/app/builder/marketplace/page.tsx` | Shell title + metadata "Lead marketplace" | "Buy Leads" |
| `src/components/console/lead-card.tsx` | Button "Buy for ₹…" | Retained — already a clear lead-buying action; reviewed in context |
| `src/app/seller/leads/[id]/buy/page.tsx` | Purchase confirmation copy | Reviewed; order/payment labels kept specific |
| `src/components/layout/public-footer.tsx`, `src/app/builder/page.tsx` | "Lead marketplace" links | Reviewed in context — footer link describes the section, not the action |
| `verify-accessible-names.mjs`, route sweep, flow suites | Assert current labels | Updated with the labels |

**Existing behaviour replaced.** "Lead marketplace" as the navigation name of
the buying surface. No service, route or data change.

**Confirmed vs proposed.** Confirmed: the "Buy Leads" label for the marketplace
entry and buying actions; the prohibition on a global "Buy" replacement.
Proposed (decision 1): whether the *role* is renamed Broker/Agent — that is a
CR02 question and does not block the label change.

**Blocking decisions.** None.

---

## CR02 — Distinct property and lead journeys

**Source.** Call distinction plus specification §4. Confirmation document CR02
and the audience table.

**Requested behaviour.** Four audiences stay distinct: home seekers browsing and
enquiring; brokers/agencies buying leads; **individual owners posting their own
properties** (a new "Post Property" route); builders managing projects. The
existing Seller role means a lead-buying broker/agency and must not silently
become the individual-owner role.

**Affected screens, services, tests.**

| Surface | Today | Change |
|---|---|---|
| `src/lib/domain/types.ts` | `Role = buyer \| seller \| builder \| admin` | Owner is an addition to the role model; shape proposed, not applied silently |
| `src/app/(public)/` | No owner area | New Post Property flow, **labelled proposed** |
| `src/app/seller/` | Broker/agency console | Unchanged in meaning; naming awaits decision 1 |
| `src/app/builder/` | Project/listing management | Unchanged; owner rules must not overwrite Builder rules |
| `docs/phase-2/decisions.md` | D-08 (dual role), D-10 (moderation timing) | Extended, not closed |

**Existing behaviour extended.** The role model gains a fourth audience. Nothing
about Seller, Builder or Buyer journeys is redesigned.

**Confirmed vs proposed.** Confirmed: the four audiences are distinct; the owner
Post Property route exists as a journey to prepare; Builder subscription rules
are **not** assumed to apply to owners. Proposed (decisions 1, 7): role rename,
multi-role access, owner charges, moderation before/after publication, enquiry
routing, rental support, verified badge.

**Blocking decisions.** Decision 7 (owner charges/access, moderation timing,
enquiry routing, rentals) blocks any charging or publishing behaviour. It does
**not** block preparing the flow skeleton, which ships labelled as proposed.

---

## CR03 — Seller requests for leads ("Request Leads")

**Source.** Call request. Confirmation document CR03: *"Admin visibility and
permanent storage are required; detailed fields and handling are proposed."*

**Requested behaviour.** A separate journey, provisionally named **Request
Leads**: the Seller describes the area and type of leads needed → receives a
reference → tracks the request → Admin sees and handles the same record. It is
not automatically a paid purchase order or an entitlement to contact details,
and it stays separate from purchasing an available lead.

**Affected screens, services, tests.**

| Layer | Change |
|---|---|
| `src/lib/domain/types.ts` | New types: `LeadRequest`, `LeadRequestStatus`, `LeadRequestResponse` (public reply vs internal note), status history entry |
| `src/lib/services/contracts.ts` | New `LeadRequestService` (create with idempotency key, listMine, getMine) + Admin methods (list, get, respond, setStatus); requester derived from the service identity, never a trusted hidden field |
| `src/lib/services/sample/` | New sample store, labelled as process memory — **not** the durable record the client requires |
| `src/app/seller/requests/` | New: create form, "My Lead Requests" list, detail with status history and public replies |
| `src/app/admin/requests/` | New: queue (filter by area, date, status), detail with public reply vs internal note — reusing the support console's `internal: boolean` separation |
| `src/components/seller/seller-nav.ts`, `src/components/admin/admin-nav.ts` | New rail items |
| `docs/phase-2/service-contract.md` | New proposed endpoints and durable records, after inspecting the existing contract (done — §2.8's internal-note rule and §3.2's idempotency invariant both apply) |
| Tests | New verify suite: validation, duplicate submission, ownership, Seller/Admin record consistency, note separation |

**Existing behaviour extended.** None replaced — this is a new capability. It
reuses three existing patterns: enquiry idempotency (`enquiry-store.ts`),
public/internal reply separation (`replyToTicket`'s `internal` flag), and the
Admin queue page shape.

**Confirmed vs proposed.** Confirmed: the journey exists; a reference is issued;
Seller and Admin see the same record; requester is the authenticated account;
public replies are separated from internal notes; **permanent storage is an
explicit requirement** — a process-memory store, browser storage or a sample
demonstration does not satisfy it. Proposed (decision 2): the form's name, its
field list (area/localities, property and requirement type, quantity and
timing, additional requirements), the status names (Submitted, Under review,
Needs clarification, Fulfilled, Closed), assignment and cancellation. Decision
3 (request → quote/order conversion, payment timing) is open and nothing here
pre-empts it.

**Phase 2 scope, stated plainly.** This phase implements the frontend and a
clearly labelled sample service. Persistence is **not** claimed: the sample
store is process memory and loses records on restart. The durable records and
endpoints kkl-backend must provide are documented in `service-contract.md`;
persistence is complete only when records survive restart and are retrieved
with appropriate account access.

**Blocking decisions.** None for the Phase 2 frontend. Decisions 2 and 3 shape
field/status names and any later conversion flow.

---

## CR04 — Purchase orders

**Source.** Specification §1.

**Requested behaviour.** Reconcile the client's sales-order flow with the
existing single-lead purchase: preview → cart or direct order → checkout →
successful payment → authorized contact release → invoice and order history.

**Affected screens, services, tests.**

| Surface | Today |
|---|---|
| `src/app/seller/leads/[id]/page.tsx` | Masked preview — contact fields absent from the type, not hidden |
| `src/app/seller/leads/[id]/buy/page.tsx` + `result/page.tsx` | Direct single-lead order with credits, idempotent |
| `src/lib/services/contracts.ts` — `LeadMarketService.purchase`, `CreditService` | Wallet-credit purchase; invoices; order history (`listPurchased`) |
| `src/app/admin/orders/` | Admin order visibility exists |

**Existing behaviour extended.** The current flow *is* preview → direct order →
payment (from credits) → contact release on success → invoice and history. The
client's flow matches it with two additions under decision: a cart, and a
gateway alternative to wallet credits.

**Confirmed vs proposed.** Confirmed: genuine masking is retained — contact
details are never sent before authorized release (already true: masking is
absence, not CSS blur; `tests/access-boundaries.test.mjs` covers it); Admin
keeps order visibility. Open (decision 4): cart versus direct order; wallet
and/or gateway checkout; which gateway. The specification lists Razorpay, PayU
and Cashfree — **naming three gateways selects none, and all three will not be
implemented.** Decision 3: whether an accepted lead request converts into a
quote or purchase order, and when payment is taken.

**Blocking decisions.** Decision 4 blocks checkout changes. The reconciliation
analysis is written without it.

---

## CR05 — Locations

**Source.** Specification §2.

**Requested behaviour.** India → State → City → Area, launching India → West
Bengal → Kolkata → Area. Searchable locality selection; centrally maintained
location records with stable identifiers and dependent selections (state
controls city, city controls area); no hardcoded city/locality logic across
components. Applied consistently to property search, listings, lead filters and
lead requests. Rental support and rental price units are explicit.

**Affected screens, services, tests.**

| Surface | Today |
|---|---|
| `src/lib/domain/types.ts` | `LocationNode` tree type exists but is **unused** |
| `src/lib/services/sample/fixtures.ts` | Hardcoded six-locality list; `locationPath` is a string array matched by name-munging |
| `src/components/search/search-filters.tsx`, `home/home-search-card.tsx` | Plain `<select>` of localities; "All of Kolkata" hardcoded |
| `src/components/console/lead-filters.tsx` | Area filter from service-supplied options |
| `src/components/builder/section-forms.tsx`, `account/profile-form.tsx`, `src/lib/requirement.ts`, `src/lib/format.ts` | Locality handling scattered across ~18 files |

**Existing behaviour replaced.** Name-keyed string paths and per-component
locality lists give way to one central location record set with stable ids,
served through the service boundary, with a searchable area picker.

**One visible change to name plainly.** The homepage search card previously
defaulted its locality select to New Town; over the central records it now
defaults to "All of Kolkata", because a default that silently narrows a search
is a filter the user never chose. Everything else about the approved homepage
is untouched (CR06 keeps it in place regardless).

**Confirmed vs proposed.** Confirmed: the hierarchy, the launch values,
searchable selection, central records with stable ids, dependent selections,
consistent application, explicit rental units. Proposed (decision 8): who
maintains state/city/locality records — a backend administration question that
does not block the frontend model. Decision 7: rental listing coverage.

**Blocking decisions.** None for the launch hierarchy and model.

---

## CR06 — Visual direction

**Source.** Specification §3.

**Requested behaviour.** Extract exact colours from the client-confirmed logo
asset; map "Type 1" to a specific screenshot or design file; retain
accessibility corrections.

**Status: blocked.** Neither the authoritative logo asset nor the "Type 1"
referent has been supplied (decision 9). Per the call instruction, "Type 1" is
**not** assumed to mean the current Portal Layout or an archived Direction A
screen, and **the current approved homepage stays** until the mapping is
confirmed. No code change is made under this record.

**Blocking decisions.** Decision 9 — the whole record.

---

## CR07 — KYC and verification queue

**Source.** Specification §4 versus the call: the document proposes third-party
verification before owner publication; the call says KYC is compliance-based
and mostly unnecessary. **The conflict is unresolved.**

**Requested behaviour.** Neither remove all KYC gates nor make KYC mandatory
for everyone. Prepare a role/action policy matrix for confirmation.

**Affected screens, services, tests.**

| Surface | Today |
|---|---|
| `src/lib/domain/types.ts` | `KycStatus = not_submitted \| pending \| approved \| rejected` |
| `src/app/seller/kyc/`, `src/app/builder/verification/` | Document submission and status |
| `src/app/admin/kyc/` | Staff queue: every applicant is a pending case |
| `LeadMarketService.purchase` | `not_verified` refusal — the existing purchase gate, **retained until its replacement is confirmed** |

**Existing behaviour preserved.** The current purchase restriction stays. No
gate is removed, none is added, and no provider is selected.

**The matrix prepared for confirmation** (full version with the confirmation
document's proposed outcomes — Not required, Required, In progress, Verified,
Needs review, Failed, Expired):

- "Not required" is a distinct outcome from "Verified"; no badge is awarded
  because a check was unnecessary.
- Users who do not require a check never enter a pending KYC queue.
- Required checks are initiated and tracked through KKL, with case reference,
  account, affected action, reason, provider reference, status and event times.
- Routine provider processing is visible separately from cases needing staff
  attention; the Admin action queue holds review cases, failures, incomplete
  cases and provider errors.
- A provider failure never silently becomes a verification success.
- Account suspension, property moderation and verification stay three separate
  axes — as the current model already holds (`service-contract.md` §2.5).

Not done under this record: selecting a provider (DigiLocker, Signzy, Karza and
HyperVerge are listed for evaluation only), promising compliance, collecting
real identity documents, or changing any retention policy.

**Blocking decisions.** Decision 5 (which role/action combinations require
checks) blocks any gate change. Decision 6 (provider, manual-review authority,
retention) blocks integration. The matrix itself is deliverable now.

---

## What this register does not do

It does not mark the revised scope accepted on the client's behalf, does not
close any D-numbered decision, and does not treat the confirmation document's
field lists, status names or policies as approved. Implementation under these
records is limited to what the "Confirmed" rows say; everything else is
prepared and labelled as proposed.
