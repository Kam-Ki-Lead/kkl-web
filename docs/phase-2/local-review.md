# Running kkl-web for review

The only configuration this repository supports for reviewing screens is a
**production build served by `next start`**. Not the dev server.

## Why not the dev server

The dev server in the sandbox this was built in does not hydrate: client
components render their server HTML and never become interactive, so forms,
drawers and filters appear broken. The dev server's HMR websocket is also
blocked in that sandbox.

**The causal link between those two facts is not established.** The correlation
was observed; no experiment isolated the websocket as the cause. Do not repeat
"the dev server cannot hydrate because HMR is blocked" as a finding — the honest
statement is that hydration does not happen there and the reason is unresolved.
It may behave differently on a normal machine. The practical consequence stands
either way: every client-side check in this project was run against
`next build` + `next start`, and that is the configuration to review in.

## The documented review configuration

```bash
npm install

NEXT_PUBLIC_KKL_ENV=review \
NEXT_PUBLIC_KKL_DATA_SOURCE=sample \
npx next build

KKL_ENV=review \
KKL_DATA_SOURCE=sample \
npx next start -p 3811
```

Then open <http://127.0.0.1:3811>.

**All four are required, and which line each pair goes on is not cosmetic.**
The `NEXT_PUBLIC_*` pair must be set on the **build**, because those values are
inlined into the bundle and frozen there; setting them on `next start` does
nothing at all. The unprefixed pair must be set on the **start**, because those
are read from the process on every request.

An earlier version of this document put all four on the start line. That build
defaults `NEXT_PUBLIC_KKL_ENV` to `development` while the server declares
`review`, and the run-time guard refuses the mismatch:

```
Refusing to serve: built with NEXT_PUBLIC_KKL_ENV=development but deployed
with KKL_ENV=review. NEXT_PUBLIC_* values are frozen at build time, so this
bundle is not the one this environment asked for.
```

That is the guard doing its job on its own documentation, and it is recorded
here rather than quietly corrected: a reviewer following the old instructions
got a 503, and the 503 was right.

A served build that sets neither `KKL_ENV` nor `KKL_DATA_SOURCE` refuses to
serve at all.

### With the baseline's review photography

```bash
NEXT_PUBLIC_KKL_REVIEW_IMAGERY=on npx next build
```

then start as above. This hotlinks seven Unsplash photographs referenced by the
approved baseline, with their credits drawn over the images. It is off by
default, is not tied to sample mode, and has never been seen rendered from this
repository — the build environment blocks `images.unsplash.com`. See
`src/lib/services/sample/review-imagery.ts`.

## What sample mode is not

Sample mode simulates sign-in, OTP, payment and contact reveal. Nothing is sent,
charged, verified or stored. It exists so the journeys can be reviewed end to
end before kkl-backend exists.

It must never serve real users, and two guards enforce that:

| Guard | Where | Catches |
| --- | --- | --- |
| Build-time | `src/lib/config/runtime.ts`, at module load | `NEXT_PUBLIC_KKL_ENV=production` built together with `NEXT_PUBLIC_KKL_DATA_SOURCE=sample`. The build fails. |
| Run-time | `src/proxy.ts`, ahead of every request | A served build that declares nothing; production with sample services; a bundle/server disagreement in either variable. Every request returns 503 with the reason. |

The second guard exists because the first cannot see the likelier accident. A
review build deployed to production with `NEXT_PUBLIC_KKL_ENV=production` set on
the server still has `"review"` inlined in its bundle, so the build-time check
stays quiet and simulated authentication serves real users. **That was verified
to happen** before the run-time guard was added.

### What the guard cannot do

It cannot tell where it is running. Nothing available to a Node process
distinguishes a production host from a laptop, and this code does not guess from
hostnames or cloud metadata — a guess that can be wrong is worse than a rule
that is explicit.

What it does instead is **require the deployment to declare itself**, and refuse
to serve when it has not. That turns "nobody configured this" from a silent
fallback into a visible failure.

The residual risk, stated plainly: a deployment that declares `KKL_ENV=review`
while serving real users is not detectable here, and nothing in a frontend could
detect it. That is an operational control, not a code one.

Verify both directions with:

```bash
./scripts/verify-sample-mode-guard.sh
```

Eight scenarios: the build-time refusal, the review build succeeding, the
documented configuration serving, three missing-declaration cases, production
with sample services, and a data-source disagreement.

## Reaching the Seller states a reviewer cannot otherwise get to

S-04's four verification states, S-05's suspension, S-16's three payment
outcomes and S-10's insufficient balance all depend on decisions taken
elsewhere — by an administrator, or by a payment gateway. The approved prototype
reached them with a reviewer bar across the top of every screen; that bar is
tooling and is not in the application.

Instead, visit these directly. Nothing in the interface links to them, and they
return 404 outside sample mode.

```
/seller/review-state?reset=1                     restore every seed value
/seller/review-state?kyc=pending                 S-04, S-05 — also not_submitted, approved, rejected
/seller/review-state?account=suspended           S-05
/seller/review-state?payment=failed              S-16 — also success, pending
/seller/review-state?balance=0                   S-10 insufficient credits
/seller/review-state                             prints the full list
```

Add `&to=/seller/leads` to land somewhere specific. Reset is applied before the
other parameters, so `?reset=1&balance=0` means "start clean, then set the
balance".

None of these approves a document, authorises an account or moves money. They
set which designed screen renders.

## Reaching the Builder states a reviewer cannot otherwise get to

The same position, for the same reason. B-02's verification states, B-03 and
B-05's subscription states, B-04's payment outcomes and B-19's restrictions all
depend on an administrator or a gateway.

```
/builder/review-state?reset=1                    restore every seed value
/builder/review-state?kyc=pending                B-02, B-19 — also not_submitted, approved, rejected
/builder/review-state?account=suspended          B-19
/builder/review-state?subscription=none          B-03, B-05 — also active, due, grace, expired
/builder/review-state?subscriptionOutcome=failed B-04 — also active, pending
/builder/review-state?contact=unlock             B-17 — also included; the two D-05 alternatives
/builder/review-state?payment=failed             B-22 recharge result — also success, pending
/builder/review-state?balance=0                  B-20 insufficient credits
/builder/review-state?reconcile=1                returns the ledger reconciliation as JSON
/builder/review-state                            prints the full list
```

`contact=` is the one switch here that is not a state an administrator would
set. D-05 — whether a Builder sees an enquirer's number with the subscription
or unlocks it with credits — is **open**, so both designs are built and this
chooses which renders. It is a review switch for an undecided rule, not a
permission.

`&to=/builder/properties` lands somewhere specific, and reset is applied first,
exactly as on the Seller route.

**The two reset switches are separate.** `/seller/review-state?reset=1` does not
touch the Builder's records and `/builder/review-state?reset=1` does not touch
the Seller's, because the two accounts hold separate balances, ledgers, leads
and support queues. Resetting one while reviewing the other will look like
nothing happened, and that is correct.

Neither route approves a document, authorises an account, starts a subscription
or moves money.

## Verifying the flows

```bash
export PLAYWRIGHT=/path/to/playwright/index.mjs
export BASE_URL=http://127.0.0.1:3811

node scripts/verify-route-sweep.mjs      # 74 routes x 2 widths
node scripts/verify-enquiry-flow.mjs     # 17 behaviour + 3 limitations
node scripts/verify-seller-flow.mjs      # 26 behaviour + 2 limitations
node scripts/verify-builder-flow.mjs     # 28 behaviour + 2 limitations
node scripts/verify-no-javascript.mjs    # 36 forms
```

```bash
./scripts/verify-sample-mode-guard.sh    # 8 scenarios; starts its own servers
```

The **route sweep** loads every route at 1440px and 390px and asserts a 200, no
page error, no console error, no failed sub-resource and no horizontal
overflow. Overflow is in the list because it is the responsive failure a
screenshot at a fixed width hides.

The **enquiry** harness covers reload, direct access, replay, two tabs, two
independent browser sessions, expired and missing drafts, and personal data in
URLs.

The **Seller** harness covers mask containment, deduction and the ledger, a
replayed idempotency key, a sold lead, insufficient credits, unverified and
suspended accounts, all three payment outcomes, direct access to both result
screens, the CSV export, reset determinism and ledger reconciliation.

The **Builder** harness covers publish/unpublish continuity to the public
portal, a Buyer enquiry reaching the Builder, both contact-disclosure
alternatives with a mask-containment check, the six-section editor and its
publish blockers, subscription and verification gating, the separation of
Builder and Seller records, and Builder ledger reconciliation.

The **no-JavaScript** harness drives 36 form submissions across both consoles
with scripting disabled.

Run the guard script last, or in its own shell: it starts and stops its own
servers and will take down one you started on the same port.

Behaviour checks and **known limitations are counted separately**. Reproducing
an OTP bypass or shared-account state is not a control passing — it is a control
that does not exist, confirmed still absent. A limitation that stops reproducing
fails the run, so closing one is noticed rather than silently absorbed.

Run the Seller suite twice against the same server: the results are identical,
which is what makes the reset claim mean something. The same holds for the
Builder suite, over its own records.

**The suites share one server and therefore share state.** The Builder suite
publishes and unpublishes portal listings; the enquiry suite enquires about
portal properties. They are written to leave the seed state behind them, but if
a run fails part-way the next suite may start from a mutated portal. Reset both
consoles (`/seller/review-state?reset=1`, `/builder/review-state?reset=1`) or
restart the server before reading a second run's results as clean.
