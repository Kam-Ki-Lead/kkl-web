# Confirmed Rules vs. Unresolved Decisions

**Read this before designing any screen that shows a price, a credit rule, a contact detail, or a
verification promise.**

The client has not settled several commercial rules. A design that shows a specific number or
promise tends to become the thing everyone assumes was agreed. This document exists to stop that
happening. Where a screen needs one of these values, **show a visible placeholder, not a
plausible-looking figure.**

## Part A — Confirmed. Design to these.

These come directly from the client's source documents and can be treated as settled.

| Rule | Detail |
|---|---|
| Credit unit | **1 INR = 1 credit.** |
| Credit consumption | Credits are consumed when purchasing leads. |
| Credit expiry exists | Credits **do** have an expiry date, and billing includes recharge, renew, expiry tracking, usage history and invoices. (Only the *existence* is confirmed — see Part B.) |
| Lead exclusivity | One lead is sold to exactly one purchaser. |
| Masked preview | Marketplace leads show a limited preview; sensitive contact details are hidden until purchase. |
| Delivery rule | Lead contact details are delivered only after a successful credit deduction. |
| Aged-lead discount | Leads aged **2–10 days** move to a "Sale" tab at an automatic **20% discount**. |
| Lead lifecycle | new → qualifying → qualified → listed → on-sale → sold / delivered / disqualified. |
| Download format | Purchased leads download as Excel/CSV. |
| Buyer registration | Mobile number + OTP, free. |
| Buyer boundary | Buyers have no access to the lead marketplace or seller data. |
| Seller KYC | Mobile OTP + PAN + Aadhaar submission; **admin approval activates the account.** |
| Builder requirements | Same KYC as Seller, **plus** a monthly subscription to activate the account and list properties. |
| Builder notification | The builder is notified when a buyer enquires on a listed property. |
| Admin accounts | Created internally only. |
| Location hierarchy | India → West Bengal → Kolkata → New Town → Action Area → Project. |
| Hero search fields | Location + property type + BHK + budget. |
| Requirement capture fields | Budget, location, handover timing, configuration, investment-vs-end-use. |
| Theme | Clean, light. |

## Part B — Unresolved. Do not state as fact.

### B1. Subscription pricing — no price exists

**No source document states a builder subscription price, plan tier, billing period beyond
"monthly", or any trial/discount.**

- ❌ Do not show "₹4,999/month" or any other figure. The rejected prototype invented that number
  and it must not be carried forward.
- ✅ Design the subscription screen with a clear price slot and a visible placeholder such as
  `₹[TBC]/month`, and design for the possibility of more than one plan tier existing later.

### B2. Credit expiry mechanics — only the existence is confirmed

Unresolved: the expiry period; what "renew credits" actually does (extend unused credits, or buy
new ones); consumption order when credits have different expiry dates; whether expired credits are
refundable; and tax treatment.

- ❌ Do not show "90-day batch", "valid for 12 months", or any specific expiry period.
- ❌ Do not design a billing history that implies a specific consumption order.
- ✅ Design the expiry indicator and the usage-history row so a period can be dropped in. Use
  `[EXPIRY PERIOD TBC]` where a duration would appear.

### B3. Credit pack sizes and lead prices — none exist

No source document gives recharge denominations or what a lead costs.

- ❌ Do not present "₹1,000 / ₹5,000 / ₹10,000" recharge tiers or per-lead prices like "₹120" as
  though they were product decisions.
- ✅ Use obvious placeholders. If sample numbers are unavoidable for layout, label them visibly
  as sample data within the design.

### B4. Builder own-listing contact reveal — the two source documents contradict each other

The roles specification describes the builder receiving an **instant notification** when a buyer
enquires on their listing, with no purchase step. The proposal lists **"pay-to-unlock screens"**
in the builder portal scope. These imply different products and different revenue models.

- ❌ Do not design the builder enquiry screen as though either answer is settled. The rejected
  prototype showed full buyer phone numbers revealed instantly and free — that is one possible
  answer, not the answer.
- ✅ Design the enquiry card so it works **both** ways: a masked state with an unlock affordance,
  and a revealed state. Keep the reveal mechanism a component decision, not a layout assumption.

### B5. Subscription expiry behaviour — unresolved

What happens when a builder's subscription lapses: do published listings stay visible, go
read-only, or unpublish? Is there a grace period? Does marketplace lead purchasing continue
independently of subscription status?

- ❌ Do not state "your listings remain live" or "marketplace access continues" as product
  behaviour. The rejected prototype asserted that marketplace purchase is not gated by
  subscription — that was a working assumption, not a decision.
- ✅ Design the expired/lapsed state as a clearly-flagged state whose consequences are written in
  a single editable content slot.

### B6. Verification turnaround — a target, not a promise

The roles specification mentions admin approval "within 24 hours." **The client has confirmed this
is an internal operational target, not an automatic approval and not a promise to users.** Nothing
in the system approves anything automatically.

- ❌ Do not write user-facing copy that promises "approved within 24 hours", "usually within 24
  hours", or shows a countdown implying a guarantee.
- ✅ User-facing KYC states should communicate honestly: submitted, under review, approved,
  rejected-with-reason. An internal admin queue may show ageing to help staff prioritise — that is
  an ops tool, not a customer promise.

### B7. Other open items

| Item | Status |
|---|---|
| Buyer registration: OTP-only, or OTP plus password? | Unresolved. Design the OTP path; keep a password step removable. |
| Can one identity hold multiple roles (e.g. Buyer who later becomes a Seller)? | Unresolved. Avoid designing an account switcher as though it is settled. |
| What can a Seller/Builder see before KYC approval? | Unresolved. A pending state is needed; its permissions are not fixed. |
| Do Buyers get a support ticket channel? | Unresolved. Sellers and Builders definitely do. |
| Can an unregistered visitor submit an enquiry before OTP verification? | Unresolved — affects the enquiry flow design directly. Design the OTP step so it can sit before or after the form submit. |
| Data retention / document purge schedule | Unresolved; affects KYC screen copy only. |

## How to handle a placeholder in the design

Make it obvious rather than plausible. A design reviewer should not be able to mistake a
placeholder for a decision:

- `₹[TBC]/month` rather than `₹4,999/month`
- `Credits valid for [PERIOD TBC]` rather than `Credits valid for 90 days`
- `[UNLOCK RULE TBC]` on the builder enquiry card rather than a revealed phone number
- Mark sample listing prices, credit balances and lead prices visibly as sample data

If a layout genuinely cannot be evaluated without a number, use one **and** annotate it in the
design file as unconfirmed.
