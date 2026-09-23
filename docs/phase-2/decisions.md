# Client Decision Register

Sixteen decisions the client has not taken. They are listed separately from
defects and from backend dependencies because they are a different kind of
outstanding: **nobody can build these until somebody decides them**, and
several screens are deliberately inert as a result.

A reviewer seeing a disabled field, a missing button or a placeholder where a
figure should be is, in most cases, seeing one of these.

The authoritative copy is `src/lib/config/business-rules.ts`, which the screens
read at render time so the wording on screen and the wording here cannot drift.

---

## Blocks launch — six

### D-01 · Builder subscription price and billing cycle

**Nothing shows a figure.** A-21's amount column reads "Sample"; B-03 shows no
price; the subscription flow completes without charging.

*Consequence of deciding:* the amount appears on A-21, B-03 and B-04, and the
subscription becomes a real payment flow.
*Consequence of not deciding:* Builders cannot be billed and A-21 cannot report
revenue.

### D-02 · What happens to published listings when a subscription expires

Three alternatives were put to the client in B-05. **The implementation applies
neither of the hiding options**: subscription gates *publishing*, not continued
visibility, because that is the only defined rule. An expired subscription
blocks new publishing and does not remove live listings.

*If the client chooses to hide listings*, `portal-bridge.ts` changes and
`verify-builder-flow.mjs` check 15 — which currently asserts that live listings
are **not** hidden — is rewritten.

### D-03 · Lead price list

A-14's price fields are **disabled placeholders**. Four bands and a 20% aging
discount are carried from the design so the table's shape can be reviewed; none
is agreed. The Sale tab says so on screen.

*Also open within it:* whether price varies by locality as well as band;
whether the discount steps down again after the Sale window; what happens to a
lead that reaches 10 days unsold.

### D-04 · Credit expiry period, and whether expired credits can be renewed

S-18 renders as an unresolved rule rather than a working screen. Every ledger
entry has `expiresAt: null` — **a computed date would put a fabricated deadline
in front of a Seller.**

### D-05 · Whether a Builder pays to see contact details on their own enquiries

**Both alternatives are built.** `?contact=included` shows the number with the
subscription; `?contact=unlock` withholds it and charges credits. A review
switch chooses, and B-17 renders either.

This is the one decision where the frontend is finished for both outcomes.

### D-06 · Refund eligibility and destination

**Two halves, both open:** whether a delivered lead qualifies at all, and
whether a refund returns credits or reverses the original payment.

A-20 therefore **records a decision and writes no ledger entry**. The screen
says so. Approving moves nothing.

---

## Changes a flow — six

### D-07 · What an unverified account may see

Affects S-05, B-19 and every gated screen. The implementation shows the
designed restriction states; what is actually visible behind them is unset.

### D-08 · Whether one person may hold both Broker and Builder roles

B-24 notes it. The two consoles keep entirely separate records today, which is
the conservative reading — if one account may hold both, the record separation
becomes a view concern rather than a data one.

### D-09 · Property type list

Four types in the editor and on A-15, marked as a design proposal. A-15 is
read-only for this reason.

### D-10 · Whether listing review happens before or after publishing

**A-08 and A-09 have no approve action, deliberately.** Publishing in B-13
reaches the portal immediately; an approval step in the Admin console would
settle this by implication and contradict the Builder console.

Dismissing a report is recorded as *not* an approval, and its audit entry logs
`listing_status` as unchanged.

### D-14 · Whether partner-feed leads carry a usable consent basis

A-28 records the partner feed as **"basis not established — treated as no
consent until a call captures one"**, which is the conservative reading. If the
client establishes a basis, the qualification gate changes.

### D-15 · Which company documents a Builder must submit

B-02 collects PAN, Aadhaar and incorporation; A-06 reviews whatever was
submitted. The list is a proposal.

---

## Wording only — four

### D-11 · Verification turnaround as a user-facing promise
No duration appears on S-04 or B-02. A number here is a commitment.

### D-12 · Support response-time commitment
A new ticket opens as "open", never "replied". No automated reply is
fabricated and no response time is published.

### D-13 · GST treatment on credits and subscriptions
Invoices carry **no tax line**. An invented one would be a tax statement.

### D-16 · Whether staff sign-in requires a second factor
**A-01 draws no second factor.** Its fields are disabled and it says on its own
face that it authenticates nobody. Inventing an MFA step would be inventing a
security control.

---

## How to read an inert control

| What you see | Which decision | Not a defect because |
|---|---|---|
| No price on A-21 or B-03 | D-01 | A plausible figure becomes a quoted price |
| Disabled price fields on A-14 | D-03 | A price typed into a staff screen becomes agreed |
| A-20 approves and moves nothing | D-06 | Both the rule and the destination are unset |
| No approve action on A-08 | D-10 | It would contradict B-13 and settle D-10 |
| S-18 renders as unresolved | D-04 | A computed expiry date is a fabricated deadline |
| No tax line on an invoice | D-13 | An invented tax line is a tax statement |
| A-15 read-only | D-09 | Editable controls imply the taxonomy is agreed |
| No MFA on A-01 | D-16 | A drawn second factor implies one exists |
| Live listings survive expiry | D-02 | Hiding them would pick one of three alternatives |

---

## What decisions do not unblock

Deciding all sixteen would **not** make this frontend production-ready. Every
backend capability in `service-contract.md` would still be missing, and there
would still be no authentication, no authorization and no staff roles.

These two lists are independent, and neither is a frontend defect.
