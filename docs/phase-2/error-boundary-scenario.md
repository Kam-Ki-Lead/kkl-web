# Error boundaries: a committed mutation behind a failed render

**Date** 5 October 2026. **Mode** sample data, production build, headless
Chromium. Nothing live: the sample store is in-process, no provider was
contacted, no payment was taken, no message was sent.

## Why this was run

`src/app/error.tsx` and `src/app/global-error.tsx` told the customer
*"Nothing you had entered has been submitted, and no credits have been
spent."*

Neither boundary is in a position to say that. A server action can complete
— deduct the credits, create the order, release the contact — and the render
that follows it can still throw. A boundary receives an error, not an
outcome. In the case that matters most it was telling somebody their
purchase had failed when it had succeeded, which invites them to buy the
same lead twice.

This run establishes that the premise is real, not theoretical, and that the
corrected copy does not contradict it.

## Method

A production build served with `KKL_ENV=development`,
`KKL_DATA_SOURCE=sample` on `127.0.0.1:3821`. A temporary page under
`(public)/zz-render-failure-probe` threw on render; it was removed after the
run and is not in the repository. The mutation was driven through the real
Seller UI, not through a service call.

## What happened

| Step | Observed |
|---|---|
| 1 | Purchases screen: no leads owned. |
| 2 | Marketplace offered four buyable leads. Opened `/seller/leads/L-4471/buy`, pressed **Confirm and buy**. |
| 3 | Purchases screen: **L-4471 owned.** The mutation committed. |
| 4 | `/zz-render-failure-probe` answered **500** and the boundary rendered. |
| 5 | Boundary copy contained **none** of the five false claims checked for. |
| 6 | Purchases screen: **L-4471 still owned.** Billing screen: **credit balance ₹3,250**, down from ₹4,200 — the 950 credits for L-4471 really were spent. |

Step 6 is the point. Had the boundary still said *"no credits have been
spent"*, the customer could have read that sentence and then seen 950
credits missing on the next screen.

## The copy the customer saw at step 4

> This page could not be loaded
>
> Something failed while this page was being built. If you had just
> submitted something — a purchase, an enquiry or a form — this screen
> cannot tell you whether it went through. Open your dashboard and check
> your orders, purchases or enquiries before sending it again, so you do not
> do it twice. Quote reference 3545461741 if you contact support.
>
> [Reload this page] [Go to the homepage]
>
> Reloading this page does not resend anything.

Checked at step 5, all passing: says the outcome is unknown from here;
points at the order record; warns against resubmitting; labels the recovery
control as a reload rather than a retry; states that reloading resends
nothing; renders no form or submit control; shows `digest` and never
`error.message`, which Next withholds in production.

## What is not claimed

The boundary gives no outcome in either direction. It does not say the
purchase succeeded either — it does not know. The record does, and that is
where the customer is sent.

It does not link to `/seller/orders` or any other console route. The
boundary sits at the root segment and cannot know the signed-in role; a
buyer sent to a Seller route would get an access panel rather than help. The
places are named in words instead.

## Standing regression

`tests/error-boundary-claims.test.mjs` pins the wording: seven tests over
both files asserting the forbidden claims are absent in both directions, the
required guidance is present, no submit control exists, `error.message` is
not rendered, and the root boundary links to no role-specific console. The
wording is the defect, so the wording is what is pinned; this scenario is
the evidence that the premise behind it is real.
