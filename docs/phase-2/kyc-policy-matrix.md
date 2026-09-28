# CR07 — Verification policy matrix, prepared for confirmation

Phase 2 · change request CR07 · status: **the policy shape is decided and
implemented** — selective and action-based (27 September 2026), with lead
requests confirmed as needing no check (28 September 2026). Provider selection,
expiry, consent and retention remain undecided. See
`decisions-received.md` for each answer and `change-register.md` for status.

> Both decisions below marked as product decisions are exactly that: decisions
> about how KKL works. Neither is a determination about what any law requires,
> and neither should be described as one.

This matrix exists because two sources disagree. The written specification
proposes Aadhaar/PAN-based third-party verification before an individual owner
may publish. The call says KYC is compliance-based and mostly unnecessary.
Neither statement defines which roles or actions actually require a check, so
this document prepares the question properly instead of answering it.

**Update, 28 September 2026.** This page began as a proposal; the structure it
proposed has since been decided and built (`src/lib/config/verification-policy.ts`
is the authoritative table, and the screens read it). The purchase restriction
it protected is unchanged: an unverified account still cannot buy a lead, and
that was explicitly retained when lead requests were confirmed as needing no
check. No gate has been removed, none added beyond the decided policy, and no
provider is selected.

---

## 1. The matrix to confirm

Handling is proposed **per action**, not per person — the same account can
need a check for one action and not for another.

| Role | Action | Proposed handling | To confirm |
|---|---|---|---|
| Home seeker | Browse and search properties | **Not required.** No blanket KYC gate solely for browsing. | — |
| Home seeker | Enquire about a property | **Not required** as document KYC. Mobile verification at enquiry stays a separate thing from document-based KYC. | Whether any additional requirement applies |
| Broker / agency (today's Seller) | Request leads (CR03) | **Not required.** Decided 28 September 2026 as a product decision by the project owner — requesting moves no money and publishes nothing. Not a legal-compliance determination. | Closed |
| Broker / agency (today's Seller) | Purchase a lead | **Retains the current gate** until the replacement is confirmed — the existing restriction is not removed by this proposal. | What replaces it, and for whom |
| Individual owner | Publish a property (CR02) | **Unresolved conflict** — the document says always verify first; the call says mostly unnecessary. Three readings are prepared: always required / conditionally required / not required for this action. | Decision 5 — pick one |
| Builder | Publish a listing / manage projects | Reviewed **separately** under the existing Builder verification and subscription conditions. Owner rules must not silently overwrite Builder rules. | Whether existing Builder conditions stand |
| Admin / staff | Any staff action | Staff roles and sign-in are a separate question (D-16). | — |

## 2. The outcome model

Seven outcomes, and the first distinction is the one the current model cannot
express:

| Outcome | Meaning |
|---|---|
| **Not required** | This action needs no check for this account. **Distinct from Verified** — no badge is awarded because a check was unnecessary. |
| **Required** | A check is needed before the action; the case has not started. |
| **In progress** | KKL has initiated the case with the provider; routine processing. |
| **Verified** | The check completed successfully. |
| **Needs review** | The case needs staff attention — an unclear result, an incomplete submission. |
| **Failed** | The check completed and did not pass. |
| **Expired** | A previously verified case no longer counts, where the policy sets an expiry. |

## 3. The queue rules

- **Users who do not require a check never enter a pending KYC queue.** Their
  state is "Not required", shown as such — never presented as "Verified".
- **Required checks are initiated and tracked through KKL.** Each case records:
  case reference, account, the action it gates, the reason the check is
  required, the provider reference, status, and event times.
- **Routine provider processing is visible separately from cases needing staff
  attention.** The Admin action queue holds: cases requiring review, failed
  checks needing follow-up, incomplete cases, and provider errors — as
  permitted by the agreed policy. It does not hold every routine "In progress"
  case.
- **A provider failure never silently becomes a verification success.** An
  outage or error is a case state of its own, not an approval.
- **Account suspension, property moderation and verification remain three
  separate axes.** A suspension is not a verification decision; a moderation
  hold is not a KYC state. The current model already keeps these apart
  (`service-contract.md` §2.5) and this proposal changes nothing there.

## 4. What this document deliberately does not do

- **No provider is selected.** DigiLocker, Signzy, Karza and HyperVerge are
  listed in the client document for evaluation; no provider, integration
  method, price or legal sufficiency is approved here.
- **No compliance is promised.** The client and its compliance adviser confirm
  the required checks, permitted access, consent and retention before any
  provider is selected.
- **No real identity documents are collected** in this build, and no retention
  policy changes. Documents are collected or retained only where the agreed
  provider process and retention policy require it.
- **No existing gate moves.** The Seller purchase restriction and the Builder
  verification flow stay exactly as they are until decision 5 lands.

## 5. What happens when it is confirmed

Decision 5 (which role/action combinations require checks) unblocks the gate
changes; decision 6 (provider, manual-review authority, required data,
retention, exception handling) unblocks integration. The outcome model above
then becomes a `VerificationCase` type beside — not inside — the existing
`KycStatus`, because "Not required" cannot be expressed by
`not_submitted | pending | approved | rejected` without pretending a check was
submitted.
