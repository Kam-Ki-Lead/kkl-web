# Client Change Register — CR01 to CR07

Prepared 26 September 2026 against HEAD `e6ec30b`. **Implementation pass 27
September 2026**, from `537a265` — see the status table below for what each
record now is. Sources: `KKL_UI_Spec.docx` (the client's written specification)
and `KKL_Client_Change_Confirmation.docx` (review version 1), plus the
accompanying call instructions.

> **Four decisions have been given in writing and are acted on as instructions.**
> They are recorded in `decisions-received.md` with their source and the exact
> workflow each one authorizes. A signed DOCX is not required for an explicit
> written instruction to count as approval, and none is demanded here.
>
> **The rest of the confirmation document remains a proposal.** Every field list,
> status name, policy and workflow it suggests that nobody has answered is
> unapproved, and each record below names the decision that blocks whatever
> cannot yet be built.
>
> The Phase 1 baseline (kkl-design `5bc3512`) and the existing frontend remain
> the reference for every screen these changes do not touch. Nothing here
> reopens them.

Decision numbers (1–10) refer to the confirmation document's decision list.
D-numbers (D-01…) refer to the pre-existing register in `decisions.md`, which
these changes extend but do not close.

---

## Implementation status at a glance

Status words are used narrowly. Most of them do not mean finished.

- **Complete** — nothing outstanding on this record. Used once so far, for
  CR06-a, where the answer was that the work was already done.
- **In progress** — started or unblocked in principle, but waiting on a named
  input before it can proceed. Says what has *not* been done yet.
- **Implemented, sample services** — the journey works end to end and its records
  live in process memory. Named dependencies remain.
- **Implemented, durable integration** — the records are in PostgreSQL and
  survive a restart. Authentication is still unbuilt; see below.
- **Implemented, wording only** — no behaviour changed.

**Only CR06-a is complete.** Every other row carries something outstanding,
listed in its own column, and none of them should be read as finished.
Approval is recorded in `decisions-received.md`: six answers from the project
owner authorize specific workflows, and the rest of the confirmation document
remains a proposal.

| Record | Status | What works | What is outstanding |
|---|---|---|---|
| CR01 — Buy Leads wording | **Implemented, wording only** | Marketplace entries, page titles, buying actions and the sentences pointing at them read Buy Leads; property Buy/Rent intent and the descriptive taglines untouched | Nothing. This one has no dependency |
| CR02 — Individual owner posting | **Implemented, sample services** | Six-step journey, preview, submit-for-review, the owner's record, the Admin queue, decisions with reasons and history. Nothing publishes, nothing is charged, no verification is awarded | **Photo storage** — files are recorded by name and not kept anywhere. **Publication policy** — whether a cleared listing publishes, when, on what terms, at what cost. **Draft persistence** — process memory |
| CR03 — Request Leads | **Implemented, durable integration** | PostgreSQL rows that survive a restart; row-level security the application role cannot bypass; server-side sessions with revocation and expiry; internal notes withheld by policy, not by a filter | **Authentication is not built.** Identities are issued by a development authenticator for review — see `cr03-authentication-boundary.md`. Also open: withdrawal, retention for closed requests |
| CR04 — Purchase orders | **Implemented, sample services** | Selection → review → wallet checkout → result → My purchases → order detail, in both consoles. Payment traced to its ledger entry; replayed submissions reported as repeats; masking preserved | **Payments** — no provider chosen, none contacted; balances move numbers in one process. **Tax treatment and per-order invoicing** (D-13). **Refund policy** (D-14) — why there is no refund control. Cart and gateway remain a later addition |
| CR05 — Locations | **Implemented, sample records** | One hierarchy on all six surfaces that pick a location, stable ids, ranked locality search, parent replacing child, honest empty results | **Database-backed location management** — the 55 records are a fixture, not an administered table |
| CR06-a — Type 1 reference | **Complete** | Type 1 identified 28 September 2026 as the existing approved homepage — the kkl-design Round 3 prototype, already built. Compared at 1209px: header, hero and search card match, copy word for word. **No redesign required** | Nothing. Differences found were photography (imagery dependency), listing count (sample-data volume) and the review banner — none of them design |
| CR06-b — Logo colours | **In progress** | Nothing yet — **colour verification has not started**, and cannot until the file arrives. The current palette and the accessibility corrections are retained unchanged in the meantime | **The authoritative logo file, awaited from the client.** Colours in use are then checked against it and divergences reported before anything changes. No colour is inferred from a screenshot and no palette value moves until the file is in hand |
| CR07 — Verification policy | **Implemented, sample services** | Per-action outcomes, Not required distinct from Verified, no case opened by registering, cases with references and history, the Admin queue split, a provider failure that can never become a pass, existing purchase restriction retained | **Identity-provider integration** — no provider selected, no document collected, no compliance claimed. Expiry period, consent and retention undecided. The `request_leads` rule was decided on 28 September (A-5) and is no longer outstanding |

### Dependencies, kept separate from frontend completion

These four are not frontend work and are not waiting on frontend work. The
journeys above are finished as frontend; each of these is a separate, named
piece of a different kind.

| Dependency | Blocks | Owner |
|---|---|---|
| **Photo storage** — object storage, virus scanning, a retention rule | CR02 showing a real photograph to an owner or a reviewer | kkl-backend |
| **Payments** — a provider, settlement, reconciliation, tax treatment | CR04 taking real money and issuing a real invoice | kkl-backend + a client decision |
| **Identity-provider integration** — provider selection, consent, retention, and the authenticator itself | CR07 being a compliance control rather than a structure; CR03 being authenticated | kkl-backend + the client's compliance adviser |
| **Publication policy** — whether, when and on what terms an owner's listing goes live | CR02's journey continuing past "cleared" | Client decision |

### What is sample and what is genuinely integrated

| | Backed by a database, survives a restart | Process memory, lost on restart |
|---|---|---|
| CR03 lead requests | ✓ with `KKL_LEAD_REQUESTS=backend` | ✓ without it (and the screens say which) |
| CR02 owner listings | — | ✓ |
| CR04 orders | — | ✓ (derived from the purchase and its ledger entry) |
| CR07 verification cases | — | ✓ |

Everything in the right-hand column is a kkl-backend dependency. Only CR03 was
stated as a client requirement, and only CR03 has been made real.

**"Durable" is not "authenticated".** CR03's records persist and are isolated per
account by database policy, and both were demonstrated. Establishing that a
caller *is* the account they claim is a separate, unbuilt thing — identities are
issued by a development authenticator for review. See
[`cr03-authentication-boundary.md`](cr03-authentication-boundary.md) before
describing CR03 to anyone.

---

## Decisions received, and what is still open

Recorded in full, with source and the exact workflow each answer authorizes, in
**[`decisions-received.md`](decisions-received.md)**. Six answers so far. In
brief:

| Answer | Authorizes | Explicitly does not authorize |
|---|---|---|
| Direct order + wallet | CR04's order journey and order record | A cart, any gateway, any tax treatment, any refund path |
| Submit for review, never auto-publish | CR02's journey through to a staff decision | Publishing a cleared listing, charging an owner, awarding a verification |
| Selective, action-based verification | CR07's whole structure, and keeping the purchase restriction | A provider, document collection, a compliance claim, an expiry period |
| "I'll supply both" (CR06 assets) | Superseded by the two answers below | — |
| Lead requests need no verification (28 Sep) | CR07's `request_leads` rule, as a product decision; purchase restriction retained | Any other action; any compliance determination |
| Type 1 is the attached image (28 Sep) | CR06-a complete — it is the existing approved homepage | CR06-b, which still needs the logo file |

### Waiting on you — one item

**CR06-b · The authoritative logo file.** The file was received on
2 October 2026. Palette implementation and its verification are recorded in
`brand-revision.md` and are not a resolution of any other open item. The
paragraphs below are the waiting rule that applied until that file arrived.

Until then, and stated so nobody has to infer it:

- **The current palette is retained unchanged.** No token, no hex value, nothing.
- **The accessibility corrections are retained** — E-P2a's focus-ring companion
  edge and E-P2b's darkened control border both stay exactly as they are.
- **No colour is inferred from a screenshot.** Sampling the Type 1 JPEG would
  produce a hex value read off a lossy render of a rendered page: a guess
  presented as a measurement, and worse than waiting.

When the file arrives: the colours in use are compared against it, divergences
are reported **before** anything changes, and where a logo colour and a contrast
requirement disagree that is put to you as a decision rather than settled
quietly in either direction.

**CR06-a is complete.** Type 1 is the existing approved homepage, already built;
no redesign is required. Evidence in `evidence/cr06/`. Splitting CR06 in two is
what let this half close on its own while the other half waits on a file.

### A separate question, not part of CR06-b

The Type 1 screenshot shows the homepage search card with a locality and a
budget pre-selected. **This build preserves "All of Kolkata" and "Any budget",
and will keep them unless you instruct otherwise.** A prototype screenshot is
usually posed for the shot, and pre-filling a buyer's search with a locality and
a price they did not choose is a product decision rather than a styling one.
Tracked on its own so it neither blocks CR06-b nor rides along with it.

### Decided on 28 September

**Submitting a lead request requires no verification.** Recorded as a **product
decision** by the project owner — a decision about how KKL works, explicitly
**not** a legal-compliance determination. The verification restriction on
**purchasing** leads is unchanged, and no other action moved. Full record in
[`decisions-received.md`](decisions-received.md) §A-5.

The guard that refused production while this rule was unconfirmed **no longer
has an environment override**. An environment variable, a sample-mode default or
a review control is not client approval of an unresolved business rule; where
the code needs a decision it does not have, it refuses rather than offering a
switch.

### Still undecided, in the order they block work

| | Blocks | Register |
|---|---|---|
| Owner publication terms and owner charges | CR02 past "cleared" | D-10, D-18 |
| Verification provider, expiry, consent, retention | CR07 being a compliance control | — |
| Refund eligibility and destination | Any refund control on an order | D-14 |
| Tax treatment and per-order invoicing | An issued invoice on a lead order | D-13 |
| Seller withdrawal and retention for closed lead requests | CR03's lifecycle | kkl-backend CR03 doc |

Each of these is a statement the screens currently decline to make, not a piece
of missing frontend.

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

> **As implemented (28 September 2026).** Decision 7 was answered *"submit for
> review, never auto-publish"*, and the journey is built to it: six steps, a
> preview, a submission into the Admin owner-submission queue, and a
> confirmation that says the listing is awaiting review. Nothing publishes,
> nothing is charged, no verification is awarded, and staff have no publish
> action. Photographs are recorded by name and the files are **not stored**,
> disclosed on every screen that shows them. Drafts are process memory.
> Remaining dependencies: photo storage, publication policy, draft persistence.


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

> **As implemented (28 September 2026).** Decision 4 was answered *"direct order
> + wallet"*, which is the path already built; what this pass added is the
> **order as a record** — My purchases and order detail in both consoles, the
> payment traced to its ledger entry, the invoice position stated rather than
> implied, and a replayed submission reported as a repeat. No cart, no gateway,
> no tax treatment, no refund control. Remaining dependencies: payments, tax
> treatment and per-order invoicing (D-13), refund policy (D-14).


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

> **CR06-a complete; CR06-b in progress, awaiting the file (28 September 2026).**
>
> **CR06-a — complete.** Type 1 is the existing approved homepage: the kkl-design
> Round 3 prototype, already built. Compared at 1209px — header, hero and search
> card match, copy word for word. **No redesign required.** Evidence and the full
> comparison in `evidence/cr06/`.
>
> **CR06-b — in progress, awaiting the authoritative logo file from the client.
> Colour verification has not started.** The current palette and the
> accessibility corrections (E-P2a, E-P2b) are retained unchanged until the file
> arrives. No colour is inferred from a screenshot: a hex read off a lossy JPEG
> is a guess presented as a measurement.
>
> Splitting CR06 in two is what let the first half complete on its own while the
> second waits on a file.


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

> **As implemented (28 September 2026).** The conflict was resolved by the
> answer *"selective, action-based"*: no check for browsing or enquiring, a
> check where money or publication is at stake, **Not required as its own state
> that is never Verified**, no case opened by registering, cases with references
> and history, the Admin queue split between what needs a person and routine
> processing, a provider failure that can never become a pass, and the existing
> Seller purchase restriction retained. The checking is done by a labelled
> **sample verification service**; no provider is selected, no identity document
> is collected and no compliance is claimed. **The `request_leads` rule is this
> implementation's assumption, not a decision** — it is marked as such on screen
> and production refuses to serve while it is unconfirmed.


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
