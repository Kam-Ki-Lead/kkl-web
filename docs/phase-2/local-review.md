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

**And then the corrected instructions returned a 503 too, and that one was the
code's fault.** `runtime.ts` read the build-time values through a computed
`process.env[name]` lookup, which the bundler does not substitute, so on the
server the "bundle" side of the comparison was reading the live process
environment. A server given only the unprefixed pair saw the build side as
`development` and refused a bundle that in fact matched it. The configuration
documented above is now the one that works, and
`scripts/verify-sample-mode-guard.sh` runs exactly it rather than quietly
passing the prefixed pair at start time as it used to.

A served build that sets neither `KKL_ENV` nor `KKL_DATA_SOURCE` refuses to
serve at all.

### With the baseline's review photography

```bash
NEXT_PUBLIC_KKL_ENV=review \
NEXT_PUBLIC_KKL_DATA_SOURCE=sample \
NEXT_PUBLIC_KKL_REVIEW_IMAGERY=on \
npx next build
```

then start as above. This hotlinks the seven Unsplash photographs the approved
baseline references, with their credits drawn over the images. It is off by
default and is not tied to sample mode, so nobody gets third-party hotlinks by
accident just by running with fixtures.

**Where `images.unsplash.com` is unreachable** — as it is in the environment
this was built in, whose proxy rejects CONNECT to that host — add an origin
serving stand-in files under the same photo ids:

```bash
node scripts/make-review-photos.mjs /tmp/kkl-prototype-review/vendor/photos
# ... NEXT_PUBLIC_KKL_IMAGE_ORIGIN=http://127.0.0.1:8099/vendor/photos npx next build
```

Those files are placeholders, not the baseline photographs, and each says so on
its face. See `src/lib/services/sample/review-imagery.ts` and
`docs/phase-2/visual/README.md`.

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

Ten scenarios, each against a bundle actually built the way it claims: two
build-time refusals, the documented configuration serving, three
missing-declaration cases, production with sample services, a data-source
disagreement, a review bundle deployed as production, and a check that setting
`NEXT_PUBLIC_*` at start time cannot launder a mismatched bundle.

Two further scenarios are reported **PENDING**, not passing: a production/api
bundle that must serve, and a production bundle deployed as review that must
refuse. An api build prerenders against kkl-backend and fails without one, and
that refusal is correct behaviour which must not be weakened to raise the
number. Run them once kkl-backend serves the public catalogue.

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

## Resetting the Admin console

The Admin console needs no state switches — its queues are reached by acting on
them — but it does need a reset, because staff decisions are one-way: an
approved application leaves the queue.

```
/admin/review-state?reset=1     restore every seed value, across all three consoles
/admin/review-state&to=/admin   where to go afterwards
/admin/review-state             prints the list
```

**The reset is the whole platform, not just the Admin store.** A verification
decision writes into the Seller or Builder console, so resetting Admin alone
would leave those two carrying the last pass's decisions while this console
showed a fresh queue. The Seller and Builder resets do the same in the other
direction.

Nothing here authenticates anybody, because there is nobody to authenticate.

## Verifying the flows

### No browser or server needed

```bash
npm run typecheck                                     # 0 errors
npm run lint                                          # 0 errors, 0 warnings
npm test                                              # 27 unit tests
node scripts/verify-design-tokens.mjs ../kkl-design   # 27 tokens, 37 literals
node scripts/verify-contrast.mjs                      # 24 pairs + 2 findings
```

### Against a running server

```bash
export PLAYWRIGHT=/path/to/playwright/index.mjs
export BASE_URL=http://127.0.0.1:3811

node scripts/verify-route-sweep.mjs      # 112 routes x 2 widths
node scripts/verify-enquiry-flow.mjs     # 17 behaviour + 3 limitations
node scripts/verify-seller-flow.mjs      # 26 behaviour + 2 limitations
node scripts/verify-builder-flow.mjs     # 48 behaviour + 3 limitations
node scripts/verify-admin-flow.mjs       # 36 behaviour + 3 limitations
node scripts/verify-no-javascript.mjs    # 50 forms
node scripts/verify-visual-baseline.mjs  # 22 measured values
node scripts/verify-zoom.mjs             # 32 checks, 16 screens
node scripts/verify-accessibility.mjs    # 22 checks + 3 pending
```

### Rendered comparison against the approved prototypes

The prototypes load React and Babel from a CDN and fonts from Google Fonts.
Where the network policy denies those, this builds a local review copy from the
**same pinned versions** fetched from the npm registry. **kkl-design is never
modified** — the script verifies it is byte-identical and aborts if not.

```bash
# Missing-media state: both sides without photography.
KKL_REVIEW_PHOTOS=off \
  ./scripts/setup-prototype-review.sh ../kkl-design /tmp/kkl-prototype-nophoto
(cd /tmp/kkl-prototype-nophoto && python3 -m http.server 8098 &)

PROTO_URL=http://127.0.0.1:8098 BASE_URL=http://127.0.0.1:3811 \
  PLAYWRIGHT=/path/to/playwright/index.mjs \
  node scripts/capture-visual-comparison.mjs   # 25 pairs into docs/phase-2/visual/

# Image-present state: both sides with the stand-ins. Needs an application
# build carrying NEXT_PUBLIC_KKL_REVIEW_IMAGERY=on and
# NEXT_PUBLIC_KKL_IMAGE_ORIGIN=http://127.0.0.1:8099/vendor/photos.
./scripts/setup-prototype-review.sh ../kkl-design /tmp/kkl-prototype-review
(cd /tmp/kkl-prototype-review && python3 -m http.server 8099 &)

PROTO_URL=http://127.0.0.1:8099 BASE_URL=http://127.0.0.1:3811 \
  CAPTURE_SUFFIX=-photos ONLY=P-01-home,P-02-search,P-03-property \
  PLAYWRIGHT=/path/to/playwright/index.mjs \
  node scripts/capture-visual-comparison.mjs   # 5 pairs
```

**Run each state against an application build in the matching state.** A
prototype showing photographs next to an application that requests none is not
a comparison of anything.

The pairs are **for a person to look at.** No pass is claimed from capture
alone.

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

The **Admin** harness covers the reason gate on every decision, the KYC
checklist gate, and the cross-role joins in both directions — a verification
decision reaching the Seller console, a suspension *not* rewriting verification,
a credit adjustment landing in the account's own ledger, a reply reaching the
right thread and not the other one, and an internal note reaching neither. Most
of it is negative: a staff console's interesting failures are things that must
not happen.

The **no-JavaScript** harness drives 50 form submissions across all three
consoles with scripting disabled.

**`verify-design-tokens.mjs` is the only check that compares this repository to
the design** rather than to itself, and the only one that needs no browser and
no server. Point it at a checkout of kkl-design. It found three wrong colour
tokens and nine wrong component literals that a human comparison had passed.

**`verify-visual-baseline.mjs` measures computed styles against the values the
baseline declares.** It is not a screenshot comparison — the approved
prototypes cannot be rendered here, because they boot React from a CDN the
sandbox blocks — and it says so in its own output. It establishes that the
values are right; it establishes nothing about layout.

Run the guard script last, or in its own shell: it starts and stops its own
servers and will take down one you started on the same port.

## What the Admin console is not

It is the one surface in this build most likely to be read as authoritative,
because it looks like the inside of the system. Four things it is not:

1. **Nobody is signed in.** `/admin/login` collects an address and a password
   and authenticates no one; its fields are disabled and the screen says so.
   Anything that reaches `/admin` gets the entire console.
2. **There are no staff roles.** Nothing is separated by permission. Who may
   approve a document, adjust a balance or read a transcript is kkl-backend's
   to decide and enforce.
3. **No money moves.** A credit adjustment posts an entry in an in-memory
   ledger. A refund decision is recorded and moves nothing at all, because the
   policy and the destination are both undecided (D-06).
4. **The operational screens read fixtures.** There is no intake pipeline, no
   qualification caller, no WhatsApp journey and no notification sender.

What *is* connected: decisions on the two accounts whose consoles exist here —
verification, suspension, credit adjustments, support replies — reach those
consoles through the sample service layer. That demonstrates the join. It
demonstrates nothing about whether a real account could be stopped from doing
anything.

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

## CR03 — reviewing against durable lead requests

By default `/seller/requests` and `/admin/requests` are served by the in-memory
sample store, and the screens say records are kept for the session only. To
review the same journeys against records that actually persist, run
kkl-backend's lead-request slice underneath:

```sh
# kkl-backend, branch claude/cr03-lead-requests. See its
# docs/cr03-lead-requests.md for the database setup.
MIGRATE_DATABASE_URL='postgres://postgres@127.0.0.1:5433/kkl' npm run migrate
DATABASE_URL='postgres://kkl_app@127.0.0.1:5433/kkl' \
KKL_DEV_AUTH_SECRET='local-review-secret' PORT=4010 npm start
```

Then serve kkl-web with three extra variables. They have no `NEXT_PUBLIC_`
prefix on purpose — they are read from the server process per request, and the
shared secret must never reach a browser bundle:

```sh
KKL_ENV=review KKL_DATA_SOURCE=sample \
KKL_LEAD_REQUESTS=backend \
KKL_LEAD_REQUESTS_BASE_URL=http://127.0.0.1:4010 \
KKL_LEAD_REQUESTS_DEV_SECRET=local-review-secret \
npx next start -p 3811
```

The build is unchanged: this is a server-side switch, so the same bundle serves
both. The list page's closing sentence changes to match whichever store is
answering, and there is no fallback between them — with `KKL_LEAD_REQUESTS=backend`
and kkl-backend down, the screens report an error rather than quietly serving
memory.

What this does and does not make real: lead-request *records* become durable and
account-isolated, enforced by the database. Everything else on the screen —
sign-in, credits, payments, contact reveal — is still sample, and there is still
one sample Seller because kkl-web has no sign-in.

### Verifying it

```sh
# The journey, against whichever store is configured.
PLAYWRIGHT=/path/to/playwright/index.mjs node scripts/verify-lead-request-flow.mjs

# Permanence and cross-account isolation. Restarts kkl-backend mid-run.
BACKEND_DIR=/path/to/kkl-backend BACKEND_URL=http://127.0.0.1:4010 \
KKL_DEV_AUTH_SECRET=local-review-secret \
PLAYWRIGHT=/path/to/playwright/index.mjs \
node scripts/verify-lead-request-persistence.mjs
```

Only a green run of the second one justifies saying records are stored.
