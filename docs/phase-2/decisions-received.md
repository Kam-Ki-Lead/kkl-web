# Decisions received — CR01 to CR07

What has actually been answered, who answered it, and exactly which workflow
each answer authorizes. Written so that a reader can tell, for any behaviour in
the build, whether it rests on an instruction or on a judgement of mine.

## How approval is recorded here

**A signed DOCX is not the only form of approval, and this register does not
demand one.** An explicit written instruction from the project owner is
approval, and the four answers below are exactly that: written, unambiguous,
given in response to a question that set out the options and their consequences.
They are recorded and acted on as instructions.

What the unsigned confirmation document does still mean: the *rest* of that
document — every field list, status name, policy and workflow it proposes and
which nobody has answered — remains a proposal. Its signature line and its
Approve/Revise block are blank, so it cannot stand in for the answers that have
not been given. The four below are approved. The document's remainder is not.

One more distinction, kept throughout: these answers come from the project
owner. Whether the end client has separately signed them off is the owner's to
state and is not recorded here as fact.

---

## The four answers

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
  archived direction has been guessed at.

---

## My implementation decisions, which nobody approved

These are mine. Each is a judgement made to keep the build coherent, and each is
reversible on one instruction.

| Decision | What I decided | Why, and what would change it |
|---|---|---|
| Owner listings are their own type, not `ListingDraft` | An owner is not a Builder subscriber, so `OwnerListing` has no RERA, no total units, no price range and no `published` state | Reusing the Builder type would have made an owner a subscriber in the data whatever the screens said. A `published` state would have pre-decided A-2's remainder |
| Owner drafts, orders and verification cases stay in process memory | Only CR03 was stated as a persistence requirement | Say the word and any of them can move to kkl-backend the way CR03 did |
| A lead order shows **no** separate invoice | The taxable event was the recharge, and per-order documents and tax treatment are undecided | A decision on D-13 turns this into an issued invoice with a real document |
| Requesting leads requires no verification | The specification does not say; the call did not cover it | **Awaiting confirmation — see below.** This one is flagged on screen and guarded in production |
| Which "lead marketplace" sentences were renamed | Destination labels became Buy Leads; the footer and metadata taglines describing the product did not | "A Buy Leads for verified brokers" is not English, and the instruction was explicitly not to replace every occurrence |
| `request_leads` and `publish_owner_listing` rows exist in the policy at all | The policy table needs a row per action or the gap is invisible | Both are marked for what they are: one an assumption, one a rule for an action that does not happen yet |

---

## Open: does requesting leads require verification?

**This was not among the four answers, and I need it confirmed.**

- **Built as:** *not required.* Asking the team to find leads moves no money and
  publishes nothing, so under A-3's own principle — a check where money or
  publication is at stake — no check applies.
- **Labelled as an assumption**, not a rule, on `/seller/verification`: the row
  carries "This one is an assumption, not a confirmed rule — it is on the list of
  decisions still to be made."
- **Guarded against silent production use.** `assertVerificationPolicyAcknowledged()`
  runs in `src/proxy.ts` ahead of every request and refuses to serve a
  deployment with `KKL_ENV=production` while an unconfirmed rule is in force. An
  operator who has read this can proceed deliberately by setting
  `KKL_ACK_UNCONFIRMED_VERIFICATION=request_leads`; the common case — nobody set
  anything — fails loudly instead of quietly applying a rule nobody agreed to.

  **What that guard can and cannot do today, precisely.** It cannot fire yet.
  The deployment guard beside it refuses production-with-sample-services first,
  so the only configuration that reaches this one is production with `api` — and
  that cannot be built until the kkl-backend API client exists. The check is in
  place *ahead* of that day rather than protecting anything now, and it should
  not be described as an active control. What is protecting the assumption today
  is the caveat on the screen and this record.
- **To close it:** confirm either "requesting leads needs no verification" or
  "requesting leads requires verification", and the rule's `confirmed` flag in
  `src/lib/config/verification-policy.ts` flips. The guard then retires by
  itself and the on-screen caveat disappears.

---

## Open: CR06, and the question that may dissolve it

Two things, and deliberately nothing else:

1. **The authoritative logo file.** Whichever file is the real one — not a
   screenshot of it, not an export from a deck.
2. **The screenshot or file meant by "Type 1".** A filename, a link, or an
   image. Nothing else is needed to start.

**If "Type 1" means the homepage already approved**, say so and CR06 closes with
no work at all: that design is what is live in this build, untouched. That
clarification is worth more than any redesign, and asking for it is cheaper than
producing one. No archived direction will be treated as Type 1 on a guess.
