# Verification Record

What has actually been checked in kkl-web, and what has not. Carries forward the outstanding
items from C-11 of the approved baseline, which design approval did **not** discharge.

A check is only recorded here once it has been performed. "It renders" is not verification.

## How these checks are run

Against a **production build** (`next build` + `next start`), not the dev server.

Two facts were observed about the dev server in this sandbox: pages do not
hydrate, and its HMR WebSocket connection is blocked.

**The causal link between them is unresolved.** An earlier version of this
document stated the page "does not hydrate as a result" of the blocked
WebSocket. That was a guess presented as a finding. No experiment isolated the
WebSocket as the cause — the two were observed together and nothing more.
Possible alternatives were never eliminated. Treat it as: hydration does not
happen on the dev server here, reason unknown, possibly environment-specific.

What does not depend on the cause: dev-server observations in this environment
are not evidence of client behaviour, a genuine prerender error stayed hidden
until the first production build, and every client-side check recorded below was
run against `next start`.

## Automated checks

| Check | Command | Result |
|---|---|---|
| Type check | `npx tsc --noEmit` | Pass, 0 errors |
| Lint | `npx eslint .` | Pass, 0 errors, 0 warnings |
| Production build | `npx next build` | Pass — 82 routes compiled |
| Route sweep | `node scripts/verify-route-sweep.mjs` | 148/148 — 74 routes × 2 widths |
| Enquiry flow | `node scripts/verify-enquiry-flow.mjs` | 17/17 behaviour checks pass; 3 limitations reproduce |
| Seller flow | `node scripts/verify-seller-flow.mjs` | 26/26 behaviour checks pass; 2 limitations reproduce |
| Builder flow | `node scripts/verify-builder-flow.mjs` | 28/28 behaviour checks pass; 2 limitations reproduce |
| Forms without JavaScript | `node scripts/verify-no-javascript.mjs` | 36/36 forms work with scripting disabled |
| Sample-mode guard | `./scripts/verify-sample-mode-guard.sh` | 8/8 — build time and run time, both directions |
| Unit / integration tests | — | **None written. No test runner is configured.** |

All six scripts are committed and repeatable, against one production build
served by `next start`. Everything outside that table — the visual comparison
and the accessibility work below — was done by hand.

**There are still no unit or integration tests.** Six browser-driven harnesses
are not a substitute: they cover the journeys, not the functions, and a
reconciliation invariant that is asserted through a web page is asserted more
slowly and less precisely than it could be.

The ESLint flat config was broken on arrival (`FlatCompat` threw "Converting circular structure
to JSON"); lint could not run at all until it was repaired. Any earlier claim of a lint pass in
this repository predates a working config.

## Route sweep

`scripts/verify-route-sweep.mjs` loads **74 routes at 1440px and 390px** — 148
renders — and asserts five things on each: HTTP 200, no uncaught page error, no
console error, no failed sub-resource, and no horizontal overflow
(`scrollWidth > clientWidth + 1`).

**148/148 clean.**

Overflow is in that list deliberately. It is the responsive failure a screenshot
at a fixed width hides: the page looks correct and scrolls sideways, and nobody
notices until someone uses it on a phone.

Parameterised routes are swept with real seeded identifiers, not with the
literal `[id]` segment — `/seller/billing/invoices/INV-2026-0821`,
`/builder/enquiries/E-8801`, `/builder/properties/bl-greenview/specifications`
and so on. A sweep of `[id]` would prove nothing. Writing this sweep caught five
routes where the identifier I had recorded in the earlier hand-run sweep did not
exist; they returned 404 and the sweep failed until they were corrected. The
hand-run sweep had not noticed, because a person reading a 404 page recognises
it and types a different URL.

The earlier version of this section recorded 18 routes checked by hand, and
listed `/account/profile` and `/account/notifications` as "added since that
sweep and not yet included in it". That gap is closed: both are in the sweep,
along with every Seller and Builder route.

## Journey walkthrough (driven in a browser, production build)

Homepage → hero search → search results → property detail → enquiry form → validation failure →
OTP → invalid code → valid code → confirmation → enquiry tracking → enquiry detail → back.

| Behaviour | Result |
|---|---|
| Hero search produces a correct filtered URL | ✅ `/search?locality=new-town` |
| Invalid enquiry shows field-level errors | ✅ both name and mobile, with the reason |
| Entered values survive a failed submit | ✅ message text preserved verbatim |
| Draft survives the OTP step | ✅ held server-side, not in client storage |
| `000000` shows the invalid-OTP state | ✅ error rendered and announced |
| Valid code reaches confirmation with a reference | ✅ shown on screen; the URL carries an opaque receipt instead |
| Reloading the confirmation is safe | ✅ no second enquiry — see the enquiry section below for why |
| Re-visiting the confirm step | ✅ names expired or missing specifically, and does not duplicate |
| Browser Back through the journey | ✅ no lost state |
| Unknown property | ✅ 404 |
| Over-narrow filters | ✅ empty state naming the filters and offering to clear |

## How these results are counted

Two registers, kept apart on purpose.

**Behaviour checks** assert that something claimed to work does. A pass means
the claim holds.

**Limitations** record a known gap reproducing as documented. Reproducing an OTP
bypass, an unsigned cookie, an unprotected URL or shared-account state is **not
a control passing** — it is a control that does not exist yet, confirmed still
absent. Counting those in one total with real assertions would inflate the
number with things that are wrong on purpose.

A limitation that stops reproducing fails the run, because it means either the
gap was closed (and the check should become an assertion) or the test drifted.

## Enquiry flow beyond the happy path

Run with `node scripts/verify-enquiry-flow.mjs` against a production build.
Twenty checks, all behaving as expected. Three of them assert a **limitation**
rather than a guarantee; they pass while the limitation is present.

### The sample storage mechanism

Two separate stores, with different jobs. Neither is a model for production.

**1. The draft — an httpOnly cookie, `kkl_enquiry_draft`.** Written by the
server when the enquiry form is submitted, read back at the confirm step,
deleted once used. Thirty-minute TTL, carried as a `createdAt` inside the
payload so an expired draft can be told apart from a missing one. `httpOnly`,
`SameSite=Lax`, `Secure` under a production build, path `/`. It holds the
enquiry draft and nothing else: no identity claim, no consent, no ownership, no
financial state.

Limitations:

- **It is not signed.** A crafted cookie is accepted and produces an enquiry
  (check 20). A real implementation must sign it or hold the draft server-side
  keyed by an opaque id.
- **It is client-held**, so it is lost if cookies are cleared mid-journey.

**2. The enquiry record — `src/lib/services/sample/enquiry-store.ts`**, two
`Map`s in the Node process: submission token → reference, and reference →
enquiry.

Limitations, all stated in the file itself:

- **Memory only.** Restarting the server loses every submitted enquiry.
- **Per-process.** Two instances, or a serverless deployment where requests land
  on different instances, would not share it — so the idempotency guarantee
  would not hold across them.
- **No eviction.** Fine for a review session; unbounded under sustained use.
- **Not partitioned by account**, because sample mode has no accounts.

### Why duplicate submission is prevented

**Not by clearing the draft.** A cleared cookie only means one browser stops
asking. It says nothing about a second tab that already loaded the page, a
retried request, or a replay — and it is not evidence of anything.

Each draft carries a `submissionToken` (a `randomUUID`) minted once, when the
draft is created. The service treats that token as an idempotency key: the same
token twice returns the first enquiry and records nothing new. Proven by
deliberately **putting the cleared cookie back** and submitting again (check
10): the replay resolved to the same enquiry and the list length did not change.
That is the check that matters, because it removes the cookie from the
explanation entirely.

Two people enquiring about the same property get two distinct enquiries
(check 14). The reference used to be a hash of `propertyId:kind`, which
collided across buyers — one could open another's confirmation. References now
come from a sequence, never from the payload.

### The checks

| # | Check | Result |
|---|---|---|
| 1 | No personal detail in the URL after the enquiry form | ✅ `/auth?next=/enquiry/confirm` only |
| 2 | Draft cookie is httpOnly and invisible to page JavaScript | ✅ `document.cookie` empty |
| 3 | Draft retains entered details across the OTP step | ✅ |
| 4 | Verification screen shows the number without it travelling in the URL | ✅ read server-side from the draft |
| 5 | Happy path records exactly one enquiry | ✅ list grew by one |
| 6 | Confirmation URL carries an opaque receipt, not the reference | ✅ UUID in URL, `e-…` on screen |
| 7 | Reloading the confirmation records nothing further | ✅ |
| 8 | *(moved to limitation L1)* | — |
| 9 | A guessed or enumerated reference cannot open a confirmation | ✅ 404 for both `e-50004` and `e-50001` |
| 10 | Replaying the same draft after it was cleared | ✅ no second enquiry |
| 11 | Two tabs on the same draft | ✅ one enquiry, both tabs land on the same receipt |
| 12 | A second session cannot see the first session's draft | ✅ separate tokens, separate payloads |
| 13 | Session B's verification screen shows B's number, never A's | ✅ |
| 14 | Same property, two people | ✅ two distinct enquiries |
| 15 | Expired draft | ✅ refused, named as expired |
| 16 | Missing draft | ✅ refused, named as missing |
| 17 | Expired and missing show different copy | ✅ not one generic error |
| 18 | A rejected code keeps the draft | ✅ error shown, draft intact |
| 19 | *(moved to limitation L2)* | — |
| 20 | *(moved to limitation L3)* | — |

**Limitations, not results:** L1 an exact receipt URL is not access-controlled ·
L2 the confirm handoff does not require the OTP step · L3 the draft cookie is
unsigned. Each reproduces as documented, and none of them is a control passing.

### On "expired OTP"

There is nothing to expire. In sample mode no code is issued and none is stored:
any six digits pass and `000000` shows the invalid state, which is the
prototype's stated behaviour. So an OTP expiry state could not be tested,
because it does not exist. What was tested is the adjacent real case — a
rejected code (check 18) and an expired **draft** (check 15). Real code issue,
expiry and rate limiting belong to kkl-backend.

### Cross-session isolation — what holds and what does not

**Holds:** one browser cannot read another's draft. The draft is an httpOnly
cookie scoped to this origin, so it is unreachable from page JavaScript and
never crosses sessions (checks 2, 12, 13).

**Holds:** the confirmation screen is addressed by the submission receipt, not
the enquiry reference. References are sequential and would be trivially
enumerable in a URL; the receipt is random and was only ever in the submitting
browser's cookie. A guessed reference 404s (check 9).

**Does not hold:** if the exact receipt URL is handed to another browser, it
renders (check 8). That is obscurity, not authorization. Sample mode has no
accounts, so there is nothing to check a request against. **Per-account access
control is kkl-backend's and is not demonstrated here.**

**Does not hold:** the sample OTP step is not a control. A valid draft reaches
confirmation without a code being entered at all (check 19).

## Seller journey (S-01 to S-25)

Run with `node scripts/verify-seller-flow.mjs` against a production build. All
22 behaved as expected; two of them assert a limitation rather than a guarantee.

### Route sweep

All 23 Seller routes at 1440 and 390: **HTTP 200, exactly one `h1`, no console
errors, no page errors, no horizontal overflow.**

Aborted `?_rsc=` prefetches are excluded. Next prefetches every `<Link>` as an
RSC payload and closing the page cancels the in-flight ones; counting those as
failures made every screen in the console look broken when nothing was.

### Mask containment

The strongest check in this area, because it is the one a mistake would be
invisible in. The full HTML of S-08 — including the RSC payload, not just the
visible text — contains none of the seed lead's name, mobile or email. The
values are not sent, so there is nothing in the client to reveal.

This holds because `MarketplaceLead` has no contact fields. The sample store
keeps them on a seed type the masked screens cannot reach, and `toMasked` lists
the fields it copies explicitly rather than spreading and deleting, so adding a
contact field to the seed cannot leak it by default.

### Purchase and credits

| Check | Result |
|---|---|
| A purchase deducts exactly the lead price | ✅ ₹4,200 → ₹3,250 for a ₹950 lead |
| The deduction is a ledger entry, not an edited balance | ✅ one row appended; the balance column derives from it |
| Contact details are released only after purchase | ✅ the result screen shows what S-08 never received |
| A sold lead cannot be bought again | ✅ no confirm control on revisit, balance unchanged |
| Replaying a used idempotency key does not deduct twice | ✅ re-posted the same key; balance unchanged |
| Each purchase gets its own key | ✅ per-visit `randomUUID`, not a per-lead hash |
| Balance below price blocks before the button | ✅ confirm control absent, shortfall named, recharge offered |
| An unverified account cannot reach the confirm control | ✅ and browsing stays available |
| Suspension names what is blocked and what still works | ✅ C-09 — and does not rewrite verification |
| All three payment outcomes render their own screen | ✅ credited adds credits; pending and failed add none |
| A result screen opened directly cannot claim a purchase | ✅ redirected; no outcome was recorded for that browser |
| A payment result cannot be reached without an outcome | ✅ redirected to billing |
| CSV export is server-generated and attached | ✅ `text/csv`, `content-disposition: attachment` |
| Exporting a lead not owned | ✅ 404, not an empty file |

### Reset determinism and ledger reconciliation

Two defects found by reading the store rather than the screens, both now fixed
and both covered by checks 19–24:

- **Reset was incomplete.** It restored the account, balance and purchases and
  left the ledger, invoices, support threads and every counter carrying whatever
  the previous review pass had done to them. A reviewer who reset and opened the
  transaction history saw the last run's entries. Initialisation and reset now
  derive from one `freshState()` factory, so a field that is not reset is a
  field that does not exist. Verified by disturbing every kind of record — a
  purchase, a recharge, a created ticket, a reply, a balance adjustment and a
  KYC change — then resetting and comparing the full snapshot.

- **The wallet did not reconcile.** The seed ledger's four entries summed to
  3,180 while the wallet reported 4,200, the running-balance column did not
  chain, and the store kept a `balanceCredits` field alongside the ledger while
  the screen told Sellers that "balances are derived from these entries, never
  edited directly". There is now no balance field: the balance is the last
  entry's running total, computed from an explicit opening balance of zero.
  Seven seed entries, recharges 8,000 and purchases 3,800, netting the 4,200 the
  approved screens show, with the balance never going negative.

  The invariant is exposed at `/seller/review-state?reconcile=1` and asserted
  after a purchase, a recharge, a review adjustment and a reset — not just at
  rest. Even the review balance switch posts an adjustment entry rather than
  assigning a number, so it cannot break the invariant it helps test.

**The suite was run three times against one running server**, with identical
results, which is what makes the reset claim meaningful rather than an artifact
of a fresh process.

### Forms without JavaScript

`scripts/verify-no-javascript.mjs` drives **36 submissions across both
consoles** with `javaScriptEnabled: false`. All 36 work.

Seller (checks 1–21): registration through both phases including the rejected
code, business details with GSTIN format checking, KYC validation, ticket
creation, reply and resolve, recharge validation and completion, a lead
purchase, marketplace filtering, billing details and profile.

Builder (checks 22–36): registration and its validation, PAN and document
validation, creating a listing, saving an editor section, advancing between
sections, publishing, **the published listing reaching `/search`**,
unpublishing, unlocking a contact (credit deduction and reveal on a plain form
post), starting a subscription, the profile form, and raising a support ticket.

This matters because the defect it guards against shipped once: an action passed
to `useActionState` must be the server action itself, and a client closure that
dispatches between two of them only exists after hydration — so the form has no
action at all before then. The Apply-filters button on S-07 is server-rendered
and hidden only once the change handler is live, which is why filtering works
either way.

### Limitations reproduced, not passed

- **A second browser sees the first browser's purchase.** Sample mode has one
  Seller and no sign-in, so state is shared across browsers. Per-account
  isolation is kkl-backend's and is not demonstrated. This is not an
  access-control pass.
- **`/seller/review-state` is reachable in sample mode.** It is how S-04, S-05,
  S-10 and S-16 are reached without an administrator or a gateway. It returns
  404 outside sample mode — **and that path is untestable today**, because a
  build with `DATA_SOURCE=api` fails at build time, so no non-sample build
  exists for the route to be absent from. Recorded as untestable, not verified.

### The sample storage mechanism, and a defect it hid

Seller state lives in `seller-store.ts`, held on `globalThis` via
`process-state.ts`. Limitations: memory only, one process, no eviction, one
Seller with no account partitioning, and deduct-then-release as two statements
rather than a transaction.

It was module-scope `let` first, and that was wrong in a way worth recording.
Route handlers, pages and server actions are bundled separately in Next, so the
same source module is instantiated more than once per server and each copy keeps
its own variables. The review route set the balance to zero, returned 200, and
every page went on rendering ₹4,200. The same hazard sat under the enquiry
store's idempotency guarantee, where it would have held only within whichever
bundle served a given request. All three sample stores now share one instance
per process by construction.

### Not verified in this area

- No screen-by-screen measured comparison against the baseline. The rail,
  header, stat tiles, lead cards, tables and state panels line up on a reading
  of screenshots at 1440 and 390; that is not a measurement.
- Two deliberate departures, both consistent with the Buyer journey: figures are
  derived from fixtures rather than carried over as illustrative totals (so the
  dashboard shows 4 new leads, not 12), and recent activity shows dates rather
  than relative times, because a relative time computed server-side is wrong as
  soon as it is cached.
- ~~No no-JavaScript pass over the Seller forms.~~ **Closed.** All 21 Seller
  forms are driven with scripting disabled, including the OTP-shaped
  registration form, and all 21 work.

## Builder journey (B-01 to B-24)

Run with `node scripts/verify-builder-flow.mjs` against the same production
build. **28 behaviour checks pass; 2 known limitations reproduce.** The two
registers are kept apart for the reason set out above.

### Route sweep

All 33 Builder routes are in the 148-render sweep at 1440px and 390px. Clean.

### The two joins

The prototype leaves publishing and enquiries disconnected (C-10). Both are
joined here at the service layer, in `portal-bridge.ts`, and both are asserted
in both directions rather than only the happy one.

**Listing → public portal** (checks 1–4, 13, 15):

- A published listing appears on the portal.
- A listing seeded unpublished is absent from it.
- Unpublishing in the console removes it from the portal.
- Republishing puts it back.
- A listing *created in the console* and published appears as a new property,
  not just an existing fixture reappearing.
- An expired subscription blocks publishing and does **not** hide live listings.

That last one is the check that caught a contradiction in my own work. The first
implementation had `portalListings()` hide a Builder's live listings when the
subscription expired — quietly choosing alternative B of D-02 while B-05 was
still telling the client the decision was theirs. The rule now applied is the
defined one only: **a listing is on the portal because it is published**, and
the subscription gates publishing, not continued visibility. Check 15 fails if
that ever changes without D-02 being decided.

**Buyer enquiry → Builder** (check 5): an enquiry submitted through the public
portal about one of this Builder's listings appears in B-16, joined by listing
ownership. An enquiry about someone else's property does not.

Two things this join is not. It is not routing — nothing is delivered, no
notification is sent, and B-18's "notification" is a list the console reads. And
the portal's enquiry form does not collect a requirement, a budget band or a
timeline, so the Builder sees "Not specified" rather than an invented value.

### Contact access and mask containment

D-05 — whether a Builder sees an enquirer's number with the subscription, or
unlocks it with credits — is **open**. Both alternatives are built and
`/builder/review-state?contact=` chooses which renders. Checks 6–9:

- Alternative A shows the contact without unlocking.
- Alternative B withholds the number entirely.
- **The locked enquiry leaks no number into the detail page HTML.** Asserted
  against the whole served document, not against what the screen displays.
  Masking here is the absence of data, not CSS: `projectEnquiry()` drops
  `phone` rather than rendering it hidden, so there is nothing in the markup,
  the RSC payload or the client state to reveal.
- Unlocking reveals the contact and deducts the price.

### The six-section editor

Checks 10–12 drive B-08 to B-13. An empty listing names **every** blocker with
the section it belongs to, rather than a single "incomplete" message; publish is
unavailable while any blocker remains; and a complete listing clears its
blockers and previews as the portal will show it.

### Records that must stay separate

The Builder reuses the Seller's marketplace, credits, billing and support
modules. Reuse of a module must not mean sharing an account, so checks 19–22
assert the separation in four places:

- separate balances,
- separate lead pools (L-4530/L-4521/L-4498 against the Seller's L-4471/L-4468/L-4402),
- separate support queues,
- and a Builder purchase spending only the Builder's credits.

Check 36 of the no-JavaScript suite asserts the last of these on the plain-form
path too, where a hidden `scope` field is the only thing keeping the two queues
apart. A hidden field is exactly the kind of thing that survives a markup
refactor while losing its meaning on the server, so both directions are
asserted: the ticket lands in the Builder queue **and** does not land in the
Seller's.

### Suspension and verification stay separate

Checks 16–18. Verification pending blocks publishing; the restrictions screen
states the account's current position on both axes; and suspending an account
does **not** rewrite its verification status. They are two independent states
and the screens say which is which.

### Reconciliation and reset

Checks 23–24, the same invariant as the Seller wallet over the Builder's own
ledger: an explicit opening balance, a chained running-balance column, and the
displayed balance derived from the last entry rather than stored alongside it.
Exposed at `/builder/review-state?reconcile=1`. Seed: recharges 3,000,
purchases 1,150, net 1,850.

Reset restores the Builder ledger, and **resets the two consoles
independently** — `/builder/review-state?reset=1` does not touch the Seller's
records and vice versa, because they are separate accounts.

### No price is invented

Check 26 asserts that no subscription figure appears anywhere on B-03. D-01 is
open; the screen says so and shows nothing that could be read as a price. The
check exists because a plausible-looking number is the easiest thing in the
world to add to a subscription screen and the hardest thing to notice later.

### Limitations reproduced, not passed

- **A second browser sees the same Builder account.** Sample mode has one
  Builder and no sign-in. Per-account isolation is kkl-backend's and is not
  demonstrated.
- **Choosing a photograph uploads nothing.** The media section records that a
  file was named. No bytes are stored, scanned or served. The count is a review
  stand-in and the screen says so.

### A cross-journey consequence, recorded rather than smoothed over

Joining the Builder's listings to the portal changed what the portal contains,
and that broke a Buyer test. `scripts/verify-enquiry-flow.mjs` enquired about
Orchid Grove; Orchid Grove belongs to the sample Builder and is **seeded
unpublished**, so once the join existed it was correctly absent from `/search`
and had no enquiry form. The suite timed out on a form that should not have been
there.

The application was right and the test was wrong, so the test moved to a
property no console can unpublish. It is recorded here because it is the first
place a change in one journey has silently altered another, and because the
suites now share one server and therefore share state: the Builder suite mutates
the portal, and a run that fails part-way can leave it mutated for whatever runs
next.

### Not verified in this area

- No screen-by-screen measured comparison against the prototype. Builder screens
  were compared by reading screenshots at 1440 and 390 against the approved
  baseline; the rail, header, stat tiles, cards, the six-section editor stepper,
  tables and state panels line up. That is a reading, not a measurement.
- **B-15's unsaved-changes prompt is not built.** Each section saves on submit
  and navigation between sections goes through that save, so the state the
  prompt guards — leaving with unsaved edits — arises only through the browser's
  own Back or closing the tab. Guarding it needs a `beforeunload` handler and a
  router interception. Not built, not verified, not marked partial-and-forgotten.
- **Publishing is not moderation.** A published listing reaches `/search`
  immediately. Whether a real listing is reviewed before or after going live is
  **D-10 and open**, and A-08's queue does not exist. What is demonstrated is
  the mechanism, not the policy.
- The three accessibility checks below are outstanding for these screens as for
  every other.

## Accessibility — checked

| Check | Result |
|---|---|
| Focus ring on every interactive element | ✅ 3px saffron at 2px offset, verified under real keyboard focus |
| Focus ring is immediate | ✅ after a fix — see below |
| Tab order through the enquiry journey | ✅ header → breadcrumb → fields → submit, no traps, nothing skipped |
| Form controls have associated labels | ✅ zero unlabelled controls on the enquiry form, search filters, requirement capture, auth |
| One `h1` per page, sensible heading order | ✅ checked on homepage, search, property detail, enquiries |
| Mobile drawer | ✅ toggles, `aria-expanded` and `aria-controls` correct, dismisses |
| Minimum target size | ✅ 44px enforced in the control components (48px where a thumb is likely) |

**Focus-ring defect found and fixed.** Controls carrying Tailwind's `transition-colors` also
transition `outline-color`, so the focus indicator faded in from `currentColor` over 150ms —
effectively invisible on filled buttons at the moment focus lands. The transition now names its
properties explicitly and excludes `outline-color`. A base-layer override was tried first and
does not work: a utility class outranks it.

## Accessibility — NOT checked

Carried forward from C-11. None of these may be reported as passed without being performed.

1. **Screen-reader testing.** None performed, on the baseline or the application.
2. **Individual status-chip contrast.** Not measured chip by chip.
3. **Native browser zoom and Firefox text-only zoom.** Unverified. The baseline checked only a
   *simulated* 200% text enlargement, on one screen at one width, and recorded it **Partial**.
   Nothing here improves on that.

## Visual comparison against the approved baseline

**This comparison is not complete, and the implementation should not be
described as matching the baseline.** Primary property imagery differs: the
baseline shows photography in every media slot, this implementation shows the
designed no-image fallback unless the review-imagery flag is on — and that path
has never been seen rendered, because the build environment blocks
`images.unsplash.com`. Structure, type, colour and copy were compared and line
up; the photographs, which are the most visually dominant element on the
homepage, search results and detail screens, were not.

Method: baseline prototype and application screenshotted at matching widths and compared. The
baseline's own width tabs are used to obtain its true responsive layouts — a browser viewport
alone does not reflow it.

| Screen | Widths | Result |
|---|---|---|
| P-01 Homepage | 1440, 768, 390 | Structure, order, type scale, colour and copy match, including the distinct mobile layout |
| P-02 Search results | 1440 | Filter row, possession chips, applied-filter bar, sort set, card grid and count line match |
| P-03 Property detail | 1440 | Gallery split, spec grid, pricing table, amenities, location, possession panel and sidebar match in layout; gallery contents differ |
| S-06 Seller dashboard | 1440, 390 | Rail, header, stat tiles, lead list and credits panel match; rail collapses to the drawer as designed |
| S-07 Lead marketplace | 1440, 390 | Tabs, filter row, sort set and masked lead cards match |
| B-06 Builder dashboard | 1440, 390 | Rail, header, stat tiles, enquiry list and the two side cards match |
| B-07 My properties | 1440, 390 | Listing rows, status chips, per-listing action set and enquiry counts match |
| B-13 Listing editor — preview & publish | 1440, 390 | Six-section stepper, preview card and the blocker list match |
| B-17 Enquiry detail | 1440, 390 | Enquiry panel, contact block in both D-05 alternatives, and the reply area match |

**Those six console rows are reading comparisons, and the mark they earn is
weaker than the first three.** Homepage, search and property detail were
compared screenshot against screenshot at matching widths. The Seller and
Builder rows were compared by opening the baseline screen beside the
implementation and checking structure, order, type scale, colour and copy agree.
Nothing was measured in either case, and no pixel diff was taken anywhere.

Not compared at all: P-05, P-08 to P-11, P-15 to P-20, S-01 to S-05, S-08 to
S-25, B-01 to B-05, B-08 to B-12, B-14 to B-16, B-18 to B-24, and every screen
at 768 except the homepage.

Differences, recorded in `approved-baseline.md` §5:

- **Photography (open, not deliberate).** The baseline vendors no images of its
  own; it references seven Unsplash photographs by URL and credits each, and
  states that every one must be replaced with licensed project photography
  before launch. Those URLs are wired behind `NEXT_PUBLIC_KKL_REVIEW_IMAGERY=on`
  with their credits drawn over the images, and two listings are deliberately
  excluded so the missing-media state stays visible. **The flag path is
  unverified** — it typechecks and builds, and the images have never loaded
  here. This is the specific outstanding asset dependency.
- **Listing counts (deliberate).** Derived from fixtures rather than the
  baseline's illustrative 244/128, because a homepage claiming 128 listings that
  searches to nine is incoherent.

Defects found by comparison and fixed: hero fallback caption colliding with hero copy; project
card image overlapping its content; "1 listings"; three nav items marking themselves active at
once; carpet-area unit dropped from the first pricing row.

## Console output

The application's console is checked on every route of every sweep, separately
from the baseline's own console state. **Clean on all 74 routes at both
widths** — no console errors, no uncaught page errors, no failed sub-resources.
That assertion is now part of `scripts/verify-route-sweep.mjs` rather than
something a person watched for, so it cannot quietly stop being true.

The baseline's unresolved homepage console defect is not inherited — see
`approved-baseline.md` §6.

## Not claimed

- No screen is connected to a real service. Everything renders from sample
  fixtures. Authentication, authorization, KYC, lead ownership, contact
  disclosure, credits and payments are all simulated, and every screen that
  touches one says so on the screen.
- No accessibility conformance claim at any level. Screen-reader behaviour,
  per-chip contrast and native/text-only zoom are unverified.
- No performance or load testing.
- No cross-browser testing; every check ran in headless Chromium.
- **No unit or component tests, and no test runner.** Six committed browser
  harnesses cover the journeys end to end; they are not a substitute for tests
  of the functions underneath, and the visual comparison and accessibility work
  above were done by hand this session and are not regression tests.
- The visual match is not complete. Primary imagery differs, the review-imagery
  path has never been seen rendered, six console screens were compared by
  reading rather than measuring, and most screens were not compared at all.
- `/seller/review-state` and `/builder/review-state` returning 404 outside
  sample mode is **untestable, not verified**: a build with
  `NEXT_PUBLIC_KKL_DATA_SOURCE=api` fails at build time because no API client
  exists, so no non-sample build can be produced for the routes to be absent
  from. The guard was not weakened to make one.
- The deployment guard **cannot detect that it is running in production.**
  It requires the deployment to declare itself and refuses to serve when it has
  not. A deployment that declares `KKL_ENV=review` while serving real users is
  not detectable here, and nothing in a frontend could detect it. That residual
  risk is operational, not a code control.
- The dev-server hydration failure has no established cause.
- Admin (A-01 to A-31) does not exist. Nothing in this document covers it.
