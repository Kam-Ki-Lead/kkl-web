# Frontend → Backend Service Dependencies

What this frontend needs from kkl-backend, and — stated at the top because it
changes how everything below should be read —

> **Nothing in this document is an agreed API contract.**
>
> kkl-backend has not published a versioned OpenAPI specification. Every
> interface here is a **proposal derived from what the approved screens
> actually need**. They are the shapes the frontend already codes against, so
> they are a useful starting point and a complete statement of requirements.
> They are not a negotiated contract, and kkl-backend is free to reject any of
> them.

The interfaces themselves live in `src/lib/services/contracts.ts` — 12
interfaces, 102 methods. This document is the summary and the dependency list.

---

## Status key

| Mark | Meaning |
|---|---|
| **Proposed** | Derived by this repository from the approved screens. Not agreed |
| **Agreed** | Confirmed against a published kkl-backend contract |
| **Blocked** | Cannot be proposed until a client decision lands |

**Every row below is Proposed or Blocked. None is Agreed.** That is not a
formality: an "Agreed" row would mean somebody on the backend had signed it
off, and nobody has.

---

## 1. The boundary, and why it is where it is

One module resolves the service implementation:

```
src/lib/services/index.ts   →  sample (fixtures)  |  api (does not exist)
```

Selecting `api` **fails closed at build time** rather than falling back to
fixtures. That is deliberate and has a consequence worth knowing: no non-sample
build can currently be produced at all, which is why the `/…/review-state`
routes' 404-outside-sample-mode behaviour is *untestable* rather than verified.

No screen imports a store. No screen constructs a URL. Every data access goes
through an interface, so replacing the sample implementation is one module.

---

## 2. Dependencies, by capability

### 2.1 Authentication and identity — **Blocked on nothing; Proposed**

| Need | Shape the screens assume |
|---|---|
| Buyer OTP sign-in | Request a code for a mobile; verify; establish a session |
| Seller / Builder sign-in | Same, plus an account record |
| Staff sign-in | Out of scope for the shapes below — see D-16 |
| Session → actor | **Server-derived.** See the warning below |

> **The actor must come from the session, never from the request.**
>
> `src/lib/domain/identity.ts` models `AccountRef` and `StaffRef` explicitly,
> and every mutating Admin method takes one. **That is modelling, not
> authorization.** In this build the actor is a constant the server owns and no
> form can name it. A real implementation must derive it from an authenticated
> session server-side and check permissions on every call.
>
> The `scope` field that Seller/Builder actions carry is **untrusted input**.
> It is validated to one of two known values so a junk value cannot select no
> service. It does not establish that a caller may act as a Builder, because in
> this build nothing can.

### 2.2 Authorization and staff roles — **Blocked**

Not modelled at all. There is one staff identity and nothing is separated by
permission. Who may approve a document, adjust a balance or read a transcript
are kkl-backend's to define and enforce.

**Required before any staff console is deployed anywhere.**

### 2.3 Lead marketplace and purchase — **Proposed**

| Need | Notes |
|---|---|
| List leads, filtered and sorted | Filtering must be **server-side**; sending every lead and hiding some is the failure this exists to prevent |
| Masked lead detail | Masking is the **absence of the field**, not a hidden one. The projection must not include contact data at all |
| Purchase with an idempotency key | See §3 — the key must bind to the *request*, not only the outcome |
| Purchased lead with contact | The only response that carries contact data |
| CSV export | Server-generated; a repeat download must not re-charge |

### 2.4 Credits, ledger and payment — **Proposed**, partly **Blocked**

| Need | Notes |
|---|---|
| Wallet balance | **Derived from the ledger**, not stored. See §3 |
| Ledger entries with a running balance | The chain is the invariant |
| Recharge with an idempotency key | Three designed outcomes: credited, pending, failed |
| Payment gateway handoff | The frontend must never see or hold credentials |
| Staff credit adjustment | Audited ledger event with a mandatory reason. **Never a balance overwrite** — this is kkl-backend's own wording |
| Credit expiry | **Blocked on D-04** |
| Refunds | **Blocked on D-06** — eligibility *and* destination both unset |

### 2.5 Verification (KYC) — **Proposed**, partly **Blocked**

| Need | Notes |
|---|---|
| Submit documents | Storage, virus scanning and a retention rule. None exists |
| Verification status | Four states. **Independent of account status** |
| Staff decision with reason | Approve / reject / request resubmission |
| Which documents a Builder must submit | **Blocked on D-15** |

> **Account status and verification are two axes and must stay two.** A
> suspension must not rewrite verification and a verification decision must not
> change suspension. All eight combinations are reachable, including "approved
> and suspended", which the design specifically calls out.

### 2.6 Listings and the public portal — **Proposed**, partly **Blocked**

| Need | Notes |
|---|---|
| Draft, six-section editing, publish | Publishing is what puts a listing on the portal |
| Media storage | No byte is stored anywhere today |
| Publish gating | Subscription gates *publishing*. What happens to live listings on expiry is **Blocked on D-02** |
| Moderation | **Blocked on D-10** — before or after publishing is unset. There is deliberately no approve action |

### 2.7 Enquiries — **Proposed**, partly **Blocked**

| Need | Notes |
|---|---|
| Submit, idempotently | A replay must not create a second enquiry |
| Route to the owning Builder | By listing ownership |
| Contact disclosure to a Builder | **Blocked on D-05** — both alternatives are built; a switch chooses |

### 2.8 Support — **Proposed**

| Need | Notes |
|---|---|
| Create, reply, resolve — per account | Seller and Builder queues must stay separate |
| Staff view of a thread | User messages **plus internal notes** |
| **Internal notes** | Must be **structurally excluded** from the user's thread. Not filtered — a user-facing message type with no field that could carry one |
| Reply routing | Destination read from the **ticket**, never from the request |

### 2.9 Operational capabilities — **Proposed**, none implemented anywhere

Lead intake, voice qualification (kkl-voice), the WhatsApp journey,
notification delivery, consent and suppression, integration health. A-10 to
A-13 and A-24 to A-28 are built over fixtures and say so on their own faces.

Suppression is the one with teeth: **a suppressed number must be unreachable on
every channel**, including OTP for a new registration, and intake must reject
the row rather than create a lead. The Admin screen is deliberately read-only
and the interface has no method to remove an entry.

### 2.10 Audit — **Proposed**

Append-only, one entry per staff action, carrying actor, timestamp, entity,
reason and field-level before/after. Some pairs are recorded **unchanged** on
purpose — a suspension logs `kyc_status` as it was — so the log can prove what
was *not* touched. Nothing may edit or delete an entry.

### 2.11 Locations (CR05) — **Proposed**

The client requires India → State → City → Area with centrally maintained
records and stable identifiers; launch values are India → West Bengal →
Kolkata → Area. The frontend reads every locality option through the location
service (`launchChain`, `children`, `areaOptions`, `displayPath`, `getMany`)
and stores the **record id**, never a name, on listings, searches, lead
filters and lead requests.

| Need | Notes |
|---|---|
| Location records with stable ids | One maintained tree; the frontend must not hardcode city or locality logic |
| Dependent selection | Children of a parent (state → city → area), for pickers and filters |
| Search within a city | `areaOptions({ cityId, query })` backs the searchable locality combobox |
| Display paths | Pre-composed labels (e.g. "Action Area I, New Town") so screens never assemble names ad hoc |
| Hierarchy-aware matching | A filter on a parent locality must include its sub-areas (New Town includes Action Areas I–III) |

Rental support and rental price units are part of the same model and remain
explicit — see the change register (CR05) and decision 6.

### 2.12 Lead requests (CR03) — **Proposed**, persistence **required by the client**

"Request Leads": a Seller describes the area and kind of leads they need,
receives a reference, and tracks the request; staff see and handle the same
record. The field set and status names are the confirmation document's
proposal (D-17), not confirmed rules.

**Permanent storage is an explicit client requirement.** The sample
implementation keeps records in process memory so the journey can be reviewed
end to end; it does not satisfy the requirement, and persistence is not
claimed until records survive a restart and are retrieved with appropriate
account access.

| Need | Notes |
|---|---|
| Create request | Idempotent on a client-minted key — a retried or double submit returns the first request's reference and records nothing new |
| Requester association | From the **authenticated session server-side**, never from a form field; the frontend carries no account input, hidden or otherwise |
| List / detail, per account | A requester sees **only their own** requests; another account's id is indistinguishable from nonexistent (`not_found` either way) |
| Staff queue and detail | Same record, plus requester identity and internal notes |
| Public replies vs internal notes | Same structural rule as §2.8: the requester-facing type has no field that could carry an internal note |
| Status history | Appended, never overwritten; the record shows how it arrived where it is |
| Audit | Staff status moves are audit-logged like every other staff action (§2.10) |

A request is **not** an order: handling one moves no credits and releases no
contact details. Whether an accepted request converts into a quote or an order
is change-confirmation decision 3 — open.

---

## 3. Three invariants the frontend depends on

If kkl-backend does not hold these, screens that are correct today become
wrong. Each is covered by `tests/` as well as the browser suites.

### 3.1 The balance is derived, never stored

The wallet balance must be the last ledger entry's running total. A stored
balance beside the entries is a second number that drifts — it did, in this
repository, before it was removed.

Covered: `tests/ledger.test.mjs`, 500 randomised sequences checked at every
prefix.

### 3.2 An idempotency key binds to the request, not only the outcome

The sample stores map key → outcome. A key reused with **different** inputs
therefore returns the first outcome: a caller asking to recharge ₹5,000 on a
key that settled ₹100 is told ₹100 succeeded. Safe against double-charging,
wrong about what it reports.

**kkl-backend must record the request a key settled and refuse a mismatch.**
For a purchase the consequence is worse than an amount: releasing the wrong
lead's contact details.

Covered: `tests/idempotency.test.mjs`, both the current behaviour and the
required behaviour.

### 3.3 Masking is absence, not concealment

A masked lead and a locked enquiry must not include contact data in the
response at all. Not hidden by CSS, not present-and-ignored — absent from the
payload. The projections list their fields explicitly rather than
spreading-and-deleting, because a spread keeps working when a field is added
and silently ships it.

Covered: `tests/access-boundaries.test.mjs`, plus mask-containment checks
against the whole served document in the Seller, Builder and Admin suites.

---

## 4. What the frontend will need at integration time

| Need | Why |
|---|---|
| A versioned OpenAPI specification | The `api` client does not exist and cannot be written without one |
| Stable error shapes | Every refusal here is a **designed state**, not a stack trace. `ServiceErrorKind` is the proposed vocabulary |
| Pagination | `Paged<T>` exists; no sample list is long enough to exercise it |
| A media host | `next.config.ts` has empty `remotePatterns` deliberately — no arbitrary origin is allowed to serve images |
| Rate-limit and lockout semantics | OTP and sign-in screens have no designed state for either |
| Server time | Several screens format dates; the sample pins Asia/Kolkata |

---

## 5. What this frontend must never be trusted for

Stated because the shapes above could be read as a division of labour, and this
half is not negotiable:

- **Frontend visibility is not permission enforcement.** A hidden control is a
  hidden control. Every request must be authorised server-side.
- **No masked contact detail may reach the client**, in HTML, in a client
  payload or in a network response.
- **No secret, key or token belongs in frontend code or in a server-rendered
  page.** There is no such field anywhere in the Admin console.
- **`localStorage` and `sessionStorage` are not authoritative** for
  authentication, authorization, consent, lead ownership or anything financial.
  The one use in this repository is a per-tab draft of a Builder's own unsaved
  listing text, cleared on save.
