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
npx next build
NEXT_PUBLIC_KKL_ENV=review \
NEXT_PUBLIC_KKL_DATA_SOURCE=sample \
KKL_ENV=review \
KKL_DATA_SOURCE=sample \
npx next start -p 3811
```

Then open <http://127.0.0.1:3811>.

**All four are required.** The `NEXT_PUBLIC_*` pair is frozen into the bundle at
build time; the unprefixed pair is read from the process on every request. A
served build that does not set `KKL_ENV` and `KKL_DATA_SOURCE` refuses to serve
at all, and the guard also refuses when the two pairs disagree — a bundle built
for one environment and deployed as another is not the bundle that environment
asked for.

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

## Verifying the flows

```bash
PLAYWRIGHT=/path/to/playwright/index.mjs node scripts/verify-enquiry-flow.mjs
PLAYWRIGHT=/path/to/playwright/index.mjs node scripts/verify-seller-flow.mjs
```

```bash
PLAYWRIGHT=/path/to/playwright/index.mjs node scripts/verify-no-javascript.mjs
```

The enquiry harness runs seventeen behaviour checks covering reload, direct access, replay,
two tabs, two independent browser sessions, expired and missing drafts, and
personal data in URLs. The Seller harness runs twenty-six covering mask
containment, deduction and the ledger, a replayed idempotency key, a sold lead,
insufficient credits, unverified and suspended accounts, all three payment
outcomes, direct access to both result screens, the CSV export, reset
determinism and ledger reconciliation. The third drives twenty-one form
submissions with JavaScript disabled.

Behaviour checks and **known limitations are counted separately**. Reproducing
an OTP bypass or shared-account state is not a control passing — it is a control
that does not exist, confirmed still absent. A limitation that stops reproducing
fails the run, so closing one is noticed rather than silently absorbed.

Run the Seller suite twice against the same server: the results are identical,
which is what makes the reset claim mean something.
