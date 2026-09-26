# Client Change Register — CR01 to CR07

Prepared 26 September 2026 against HEAD `e6ec30b` (working tree clean, verified
by fetch). Sources: `KKL_UI_Spec.docx` (the client's written specification) and
`KKL_Client_Change_Confirmation.docx` (review version 1), plus the accompanying
call instructions.

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

Updated as the work lands. "Done" means implemented and verified in this build;
"prepared" means the artifact exists for review and is labelled as the proposal
it is; "blocked" names the decision that must land first.

| Record | Status | What that means |
|---|---|---|
| CR01 — Buy Leads wording | **Done** | Marketplace entries, page titles and buying actions renamed; property Buy/Rent untouched; suites updated |
| CR02 — Distinct journeys | **Prepared** | `/post-property` renders the owner journey and the specification's guided form, disabled and labelled (D-18). Seller semantics unchanged; no role renamed; Builder rules not applied to owners |
| CR03 — Request Leads | **Done, as sample** | Full journey: create with idempotency, reference, tracking, Admin queue, public replies vs internal notes, status history, audit. **Persistence is process memory and is not claimed as durable** — `service-contract.md` §2.12 lists the required records and endpoints |
| CR04 — Purchase orders | **Reconciled, blocked** | The existing flow already is preview → direct order → payment → release → invoice/history. Cart, gateway and request→order conversion await decisions 3 and 4; no gateway work started |
| CR05 — Locations | **Done** | Central records (India → West Bengal → Kolkata → 55 areas), stable ids, searchable picker, hierarchy-aware matching; applied to search, listings, lead filters and lead requests. Rental units explicit where rentals appear |
| CR06 — Visual direction | **Blocked** | Decision 9: the authoritative logo asset and the "Type 1" referent are both unsupplied. The approved homepage stays |
| CR07 — KYC policy | **Prepared** | `kyc-policy-matrix.md` — the role/action matrix, outcome model and queue rules for confirmation. No gate moved, no provider selected |

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
