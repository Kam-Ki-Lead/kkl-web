# Decisions received — CR01 to CR07

What has actually been answered, who answered it, and exactly which workflow
each answer authorizes. Written so that a reader can tell, for any behaviour in
the build, whether it rests on an instruction or on a judgement of mine.

## How approval is recorded here

**A signed DOCX is not the only form of approval, and this register does not
demand one.** An explicit written instruction from the project owner is
approval, and the answers below are exactly that: written, unambiguous, given in
response to a question that set out the options and their consequences. They are
recorded and acted on as instructions.

**What is *not* approval, stated once so it is not argued later:** an
environment variable, a sample-mode default, a review control, a screen that has
been rendering a rule for weeks, or a passing test. None of those decides an
unresolved business rule. Where the code needs a decision it does not have, it
refuses rather than offering a switch.

What the unsigned confirmation document does still mean: the *rest* of that
document — every field list, status name, policy and workflow it proposes and
which nobody has answered — remains a proposal. Its signature line and its
Approve/Revise block are blank, so it cannot stand in for the answers that have
not been given. The four below are approved. The document's remainder is not.

One more distinction, kept throughout: these answers come from the project
owner. Whether the end client has separately signed them off is the owner's to
state and is not recorded here as fact.

---

## The answers received

### A-1 · Lead purchase: cart or direct order, wallet or gateway

- **Source:** project owner, written answer, 27 September 2026, in response to a
  question setting out direct-order-plus-wallet against cart-plus-gateway.
- **Answer:** *"Direct order + wallet."*
- **Authorizes, exactly:** select a lead → order review → checkout settled from
  wallet credits → result → My purchases → order detail with a stated invoice
  position. The order is a record with its own reference, and the deduction is
  traceable to its ledger entry.
- **Does not authorize:** a cart, any payment provider, any tax treatment, any
  refund path. Nothing in the build names or contacts a gateway, and there is no
  refund or cancel control.
- **Implemented in:** `/seller/orders`, `/seller/orders/[reference]`,
  `/builder/orders`, `/builder/orders/[reference]`, and the duplicate-submission
  notice on the purchase result.

### A-2 · Owner property posting: what submission does

- **Source:** project owner, written answer, 27 September 2026, in response to a
  question setting out submit-for-review against publish-on-submit.
- **Answer:** *"Submit for review, never auto-publish."* With it: owners save
  drafts and submit; the listing enters a moderation queue; the confirmation
  says plainly it is awaiting review; nothing goes live and nothing is charged.
- **Authorizes, exactly:** the six-step owner journey, the submission into an
  Admin queue, the awaiting-review confirmation, and staff outcomes that record
  a decision without publishing anything.
- **Does not authorize:** publication of a cleared listing, any owner charge, or
  any verification being awarded by posting. "Cleared" is therefore labelled
  **"Cleared — not published"** everywhere it appears, and the owner journey ends
  there.
- **Implemented in:** `/post-property`, `/owner/listings`,
  `/owner/listings/[id]` and its six steps, `/admin/owner-listings`,
  `/admin/owner-listings/[id]`.

### A-3 · Verification policy

- **Source:** project owner, written answer, 27 September 2026, in response to a
  question setting out blanket, selective and none.
- **Answer:** *"Selective, action-based."* With it: no check for browsing or
  enquiring; verification required only where money or publication is at stake;
  "Not required" is its own state and never Verified; existing Seller purchase
  restrictions stay until replaced.
- **Authorizes, exactly:** the per-action outcome model, the seven outcomes, the
  case record with a reference and history, the Admin queue split between cases
  needing a person and routine provider processing, the rule that a provider
  failure is never an approval, and the retention of the existing purchase gate.
- **Does not authorize:** a provider choice, any collection of real identity
  documents, any compliance claim, any expiry period, or a rule for requesting
  leads — see the open item below.
- **Implemented in:** `src/lib/config/verification-policy.ts`,
  `/seller/verification`, `/admin/verification`,
  `/admin/verification/[reference]`.

### A-4 · CR06 assets

- **Source:** project owner, written answer, 27 September 2026.
- **Answer:** *"I'll supply both"* — the logo file and the identification of the
  Type 1 reference.
- **Authorizes:** nothing yet. The assets have not arrived.
- **Consequence:** CR06 is untouched. The approved homepage stands, and no
  archived direction has been guessed at. The ask is now split into two items —
  see the bottom of this file.

---

### A-5 · Lead requests and verification  *(closes the question left open on 27 September)*

- **Source:** project owner, written answer, 28 September 2026.
- **Answer, verbatim:** *"Submitting a lead request does not require KYC. Keep
  the existing verification restriction on purchasing leads. This instruction
  does not remove verification requirements from other actions."*
- **Recorded as:** a **product decision**. It is a decision about how KKL works.

> **It is not a legal-compliance determination, and must never be written up as
> one.** Nobody in this programme is in a position to determine what any law
> requires. If a compliance adviser later says a check is legally required for
> this action, that overrides this decision and is a different kind of input
> entirely. The code carries this distinction structurally — `PolicyBasis` has
> `specification`, `product_decision` and `assumption`, and deliberately has no
> `compliance` value for anyone to reach for.

- **Authorizes, exactly:** `request_leads` is `required: false`, basis
  `product_decision`, `confirmed: true`. The row on `/seller/verification` now
  reads *"Submitting a lead request needs no verification… This is a product
  decision about how KKL works — not a statement that no law requires a check"*,
  attributed to the project owner and dated.
- **Explicitly preserves:** the verification restriction on **purchasing leads**,
  unchanged. `purchase_lead` stays `required: true`, and an unverified account
  still cannot buy.
- **Explicitly does not touch:** any other action. Browsing and enquiring remain
  *not required*; publishing an owner listing and publishing a Builder listing
  remain *required*. A check asserts the whole table, not just the changed row.
- **Implemented in:** `src/lib/config/verification-policy.ts`,
  `src/app/seller/verification/page.tsx`; checks 6, 6b, 6c and 6d of
  `verify-verification-policy.mjs`.

#### What this decision retired

The guard that refused production while this rule was unconfirmed had an
environment-variable override. **That override is gone**, and the reason is now
written into the code:

> An environment variable is not a decision. Neither is a sample-mode default, a
> review control, or the fact that a screen has been rendering a rule for weeks.
> Whoever sets a variable on a server is not the person who gets to decide
> whether someone must prove their identity before an action.

`assertVerificationPolicyConfirmed()` remains in `src/proxy.ts` with no way past
it. Every rule is confirmed today, so it cannot fire; it stays because the next
rule added defaults to `assumption`, and this is what stops that one reaching
production on nobody's authority.

---

### A-6 · Type 1 identified  *(closes CR06-a)*

- **Source:** project owner, 28 September 2026, as an attached image.
- **What the image is:** the kkl-design prototype viewer, Round 3 — its own
  chrome reads *"ROUND 3 · Kam Ki Lead — responsive portal homepage · Prototype ·
  fit to window, 1209px · synthetic listings, stock photography"*.
- **Therefore:** **Type 1 is the homepage that was already approved and already
  built.** CR06-a closes with no redesign, which is the outcome worth having.
- **Checked, not assumed.** The build was captured at the same 1209px width and
  compared: header, nav, hero eyebrow, title, body copy, price, action and the
  whole search card match — the copy word for word. Both images and the
  comparison are in `evidence/cr06/`.
- **Differences found, none of them design:** stock photography (the known
  imagery dependency, no licence settled); "Search 128 properties" against
  "Search 8 properties" (sample-data volume); and the review build's SAMPLE DATA
  strip, which a design would not carry.
- **One thing I did not act on:** Type 1's search card shows a locality and a
  budget pre-selected where this build shows "All of Kolkata" and "Any budget".
  A prototype screenshot is usually posed, and pre-filling a buyer's search is a
  product decision rather than a styling one, so it is recorded as a question
  rather than changed.

### Still open: CR06-b

Colour verification needs the **authoritative logo file**. Sampling colours from
the Type 1 screenshot is not a substitute — it is a lossy JPEG of a rendered
page, and a hex value read from it would be a guess presented as a measurement.

## My implementation decisions, which nobody approved

These are mine. Each is a judgement made to keep the build coherent, and each is
reversible on one instruction. The list is shorter than it was: "requesting
leads requires no verification" moved off it on 28 September 2026 and is now
A-5, a decision.

| Decision | What I decided | Why, and what would change it |
|---|---|---|
| Owner listings are their own type, not `ListingDraft` | An owner is not a Builder subscriber, so `OwnerListing` has no RERA, no total units, no price range and no `published` state | Reusing the Builder type would have made an owner a subscriber in the data whatever the screens said. A `published` state would have pre-decided A-2's remainder |
| Owner drafts, orders and verification cases stay in process memory | Only CR03 was stated as a persistence requirement | Say the word and any of them can move to kkl-backend the way CR03 did |
| A lead order shows **no** separate invoice | The taxable event was the recharge, and per-order documents and tax treatment are undecided | A decision on D-13 turns this into an issued invoice with a real document |
| Which "lead marketplace" sentences were renamed | Destination labels became Buy Leads; the footer and metadata taglines describing the product did not | "A Buy Leads for verified brokers" is not English, and the instruction was explicitly not to replace every occurrence |
| `request_leads` and `publish_owner_listing` rows exist in the policy at all | The policy table needs a row per action or the gap is invisible | Both are marked for what they are: one an assumption, one a rule for an action that does not happen yet |

---

## CR06, as two separate items

### CR06-a · Type 1 reference — **complete, 28 September 2026**

Type 1 is the **existing approved homepage**, already built. **No redesign
required.** See A-6 above and `evidence/cr06/`.

### CR06-b · Logo colours — **in progress, awaiting the file**

**Awaiting the authoritative logo file from the client. Colour verification has
not started** and cannot begin until the file is in hand — the real file, not a
screenshot of it or an export from a deck.

**What is retained while it waits:**

- the **current palette**, unchanged — no token, no hex value;
- the **accessibility corrections** — E-P2a's focus-ring companion edge and
  E-P2b's darkened control border. A logo file is a reason to check colours, not
  a reason to undo an accessibility fix.

**No colour is inferred from a screenshot.** A hex read off a lossy JPEG of a
rendered page is a guess presented as a measurement.

**What happens when it arrives:** the colours in use are compared against the
file, and any divergence is reported **before** anything changes. Where a logo
colour and a contrast requirement disagree, that is put to you as a decision
rather than settled quietly in either direction.
