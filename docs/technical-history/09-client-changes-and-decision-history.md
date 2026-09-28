# 9. Client changes and decision history

CR01–CR07 arrived on 26–27 September against already-approved scope. This
chapter records what each asked, what was decided, what was built, and what is
still owed.

> **Phase 1 approval does not cover any of this.** PRM-014 stated it: "Phase 1
> was approved by the client… That approval does not automatically approve later
> deviations or new workflows."

## 9.1 How approval is recorded

A signed document is **not** required for an explicit written instruction to
count as approval, and none is demanded. Six answers from the project owner are
recorded in `docs/phase-2/decisions-received.md` with source, date, and the
exact workflow each authorizes.

What is **not** approval, stated once so it is not argued later: an environment
variable, a sample-mode default, a review control, a screen that has been
rendering a rule for weeks, or a passing test. Where the code needs a decision it
does not have, it refuses rather than offering a switch (chapter 03 §3.5).

The remainder of `KKL_Client_Change_Confirmation.docx` — every field list,
status name and workflow it proposes that nobody answered — remains a proposal.

## 9.2 The six decisions

| ID | Date | Answer | Authorizes | Explicitly does **not** authorize |
|---|---|---|---|---|
| A-1 | 27 Sep | "Direct order + wallet" | CR04's order journey and order record | A cart, any gateway, any tax treatment, any refund path |
| A-2 | 27 Sep | "Submit for review, never auto-publish" | CR02 through to a staff decision | Publishing a cleared listing, charging an owner, awarding a verification |
| A-3 | 27 Sep | "Selective, action-based" verification | CR07's whole structure; retains the purchase restriction | A provider, document collection, a compliance claim, an expiry period |
| A-4 | 27 Sep | "I'll supply both" (CR06 assets) | Nothing — superseded by A-6 | — |
| A-5 | 28 Sep | Lead requests need no verification | `request_leads` = not required, as a **product decision** | Any other action; any compliance determination |
| A-6 | 28 Sep | Type 1 is the attached image | CR06-a complete — it is the existing approved homepage | CR06-b, which still needs the logo file |

### A-5 in full, because its framing matters

> "Submitting a lead request does not require KYC. Keep the existing
> verification restriction on purchasing leads. This instruction does not remove
> verification requirements from other actions."
>
> "Record this as my product decision… Do not describe it as a legal-compliance
> determination."

This is carried structurally, not editorially. `PolicyBasis` is
`specification | product_decision | assumption` and **has no `compliance`
value**. The customer row says only what a customer needs; the attribution,
date, and the distinction from a compliance determination live on the Admin case
detail and in the policy documentation (PRM-018).

**If a compliance adviser later says a check is legally required, that overrides
this decision and is a different kind of input.**

## 9.3 CR01 — "Buy Leads" wording

**Asked.** Use "Buy Leads" for the lead-marketplace entry and lead-buying
context; keep property Buy/Rent distinct; *do not replace every occurrence of
Buy across the product*.

**Built.** Rails, marketplace headings, buying actions, and the sentences
pointing at them. Six body-copy references that named the destination were
changed on 27 September (`c2ec702`).

**Deliberately not changed.** The property portal's Buy intent, and the footer
and metadata taglines describing KKL as "a property portal and a lead
marketplace" — prose about what the product is. "A Buy Leads for verified
brokers" is not English, and the instruction was explicit.

**Verified** by where each label links, not by word counts: `Buy` → `/search`,
`Buy Leads` → `/brokers`.

**Status.** Implemented, wording only. No dependency.

## 9.4 CR02 — individual owner property posting

**Asked.** Replace the inert `/post-property` with a working journey; reuse
suitable listing components "without treating an individual owner as a Builder
subscriber or a lead-buying broker"; disclose sample uploads; do not silently
publish, charge or award verification.

**Decided (A-2).** Submit for review; never auto-publish.

**Built.** `/post-property` → `/owner/listings` → six steps at their own URLs →
preview → submit → the listing record; plus `/admin/owner-listings` and its
detail. Eleven inventory rows. Decisions require reasons and append to history.

**What it refuses to say.** The button is "Send for review". "Cleared" reads
"Cleared — not published". The photographs step states the files are not stored,
and the Admin screen tells a reviewer that a photograph review is not possible.

**Sample vs persistent.** Process memory. No persistence requirement was stated
for owner drafts, so none is claimed.

**Remaining.** Photo storage; publication policy (whether a cleared listing
publishes, when, on what terms, at what cost); draft persistence.

## 9.5 CR03 — Seller lead requests

**Asked.** Complete the journey end to end, and — the part that mattered —
"Permanent storage is an explicit client requirement. Do not claim process
memory, browser storage or a sample store fulfils it." With authorization to
build narrowly in `kkl-backend`, and: "Do not substitute a mock and call it
done."

**Built.** `kkl-backend` branch `claude/cr03-lead-requests`: four migrations,
RLS policies, server-side sessions, a nine-route REST surface. `kkl-web` calls
it through the existing service interface when `KKL_LEAD_REQUESTS=backend`.

**Sample vs persistent.** **The only genuinely persistent domain.** A request is
a PostgreSQL row that survives a restart; one account cannot read another's,
enforced by the database. Without the variable the sample store answers and the
screens say records last for the session only. No fallback between them.

**Remaining.** **Authentication is not built** — chapter 11 §11.5. Also open:
whether a Seller may withdraw a request, and retention for closed requests.

## 9.6 CR04 — lead purchase orders

**Asked.** Complete the order journey; preserve genuine masking; keep payment
and invoice interfaces explicit; "Do not invent prices, tax treatment, refund
policy or a gateway selection."

**Decided (A-1).** Direct order settled from wallet credits.

**Built.** The existing flow already was preview → direct order → wallet payment
→ release → history. What was added is **the order as a record**: My purchases
and order detail in both consoles, payment traced to its ledger entry, invoice
state stated rather than implied, and a replayed submission reported as a repeat.

**What it refuses.** No `refunded` status and no refund or cancel control (D-14
open). No gateway named or contacted. No invoice download — the taxable event
was the recharge, and per-order documents and tax treatment are open (D-13).

**Remaining.** Payments; tax treatment and per-order invoicing; refund policy.
Cart and gateway remain a later addition.

## 9.7 CR05 — expandable location search

**Asked.** Consistent India → State → City → Area selection across property
search, owner and Builder listing forms, lead-marketplace filters, Seller
lead-request forms and relevant Admin views; stable identifiers; a parent change
must clear incompatible children; no duplicated hardcoded locality lists.

**Built.** One hierarchy (55 area records, launch scope West Bengal/Kolkata),
stable ids in URLs and storage, a searchable picker on all six surfaces, and
hierarchy-aware matching. A defect was found and fixed during verification
(chapter 08 §8.13).

**On the parent/child rule.** The area picker is a single selection, so choosing
a parent *replaces* a child — asserted in the suite. A city-level parent change
is not reachable in the launch scope, because Kolkata is the only city.

**Remaining.** Database-backed location management — the 55 records are a
fixture, not an administered table.

## 9.8 CR06 — visual direction

Split into two items on 28 September so neither holds up the other.

**CR06-a — Complete.** Type 1 is the **existing approved homepage** — the
kkl-design Round 3 prototype, already built. Compared at 1209 px: header, hero
and search card match, copy word for word. **No redesign required.** Evidence in
`docs/phase-2/evidence/cr06/`.

Differences found, none of them design: stock photography (the imagery
dependency), "Search 128 properties" against "Search 8" (sample-data volume),
and the review build's SAMPLE DATA strip.

**CR06-b — In progress.** Awaiting the authoritative logo file. **Colour
verification has not started.** Retained meanwhile:

- the **current palette**, unchanged — no token, no hex value;
- the **accessibility corrections** E-P2a and E-P2b. A logo file is a reason to
  check colours, not to undo an accessibility fix;
- **no colour inferred from a screenshot** — a hex read off a lossy JPEG is a
  guess presented as a measurement.

When the file arrives, divergences are reported *before* anything changes, and a
logo colour that disagrees with a contrast requirement goes to the owner as a
decision.

**Tracked separately.** Type 1's search card shows a locality and a budget
pre-selected. **The build preserves "All of Kolkata" and "Any budget" and keeps
them unless instructed otherwise.** A prototype screenshot is usually posed, and
pre-filling a buyer's search is a product decision, not a styling one.

## 9.9 CR07 — verification policy

**Asked.** Resolve the written-document/call conflict: the specification
proposes third-party verification before an owner may publish; the call says KYC
is compliance-based and mostly unnecessary.

**Decided (A-3, then A-5).** Selective and action-based.

**Built.** Seven outcomes with `not_required` distinct from `verified`; no case
opened by registering; cases with references and history; the Admin queue split
between what needs a person and routine processing; a provider failure that can
never become a pass; reason-gated decisions with history and audit; and the
existing Seller purchase restriction retained.

**Sample vs persistent.** Process memory, and a labelled **sample verification
service**. No provider selected, no identity document collected, no compliance
claimed.

**Remaining.** Identity-provider integration; expiry period, consent and
retention.

## 9.10 Status check against later evidence

Every distinction this chapter is required to preserve was re-checked against
the repository at `36114f5`, and none has been changed by later work:

| Statement | Still true at `36114f5`? | Evidence |
|---|---|---|
| Submitting a lead request needs no verification — product decision | Yes | `verification-policy.ts` `request_leads`: `required: false`, `basis: "product_decision"` |
| Lead purchasing retains its verification requirement | Yes | same file, `purchase_lead`: `required: true` |
| Product decisions are not legal-compliance determinations | Yes | `PolicyBasis` has no `compliance` value; screen copy says so |
| CR06-a: Type 1 is the existing approved homepage | Yes | `evidence/cr06/`, `change-register.md` |
| CR06-b in progress; colour verification not started | Yes | `change-register.md`, `owner-review.md` §4b |
| Current palette and accessibility corrections retained | Yes | no token changed since `5c3a658`; E-P2a/E-P2b still applied |
| Search defaults remain "All of Kolkata" and "Any budget" | Yes | homepage renders both; no instruction changed them |
| Phase 1 approval does not cover later deviations | Yes | `change-register.md` header |
