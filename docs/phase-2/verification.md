# Verification Record

What has actually been checked in kkl-web, and what has not. Carries forward the outstanding
items from C-11 of the approved baseline, which design approval did **not** discharge.

A check is only recorded here once it has been performed. "It renders" is not
verification — and, as the visual section below records, a route sweep passing
224/224 sat alongside every coloured panel in the application rendering the
wrong colour.

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
| Type check | `npm run typecheck` | Pass, 0 errors |
| Lint | `npm run lint` | Pass, 0 errors, 0 warnings |
| Production build | `npx next build` | Pass — 120 routes compiled |
| **Unit tests** | `npm test` | **27/27** — `node:test`, no framework added |
| Design tokens | `node scripts/verify-design-tokens.mjs ../kkl-design` | 27/27 tokens and 37/37 component literals appear in the approved design |
| Contrast | `node scripts/verify-contrast.mjs` | 24/24 declared pairs meet AA; **2 design-level findings** |
| Zoom | `node scripts/verify-zoom.mjs` | 32/32 — reflow at 320 CSS px and 200% text, 16 screens |
| Accessibility | `node scripts/verify-accessibility.mjs` | 22/22; **3 pending** (no tooling) |
| Visual values | `node scripts/verify-visual-baseline.mjs` | 22/22 measured values match the baseline's declared values |
| **Rendered comparison** | `node scripts/capture-visual-comparison.mjs` | **25 pairs captured**, 17 screens — see `visual/` |
| Route sweep | `node scripts/verify-route-sweep.mjs` | 224/224 — 112 routes × 2 widths |
| Enquiry flow | `node scripts/verify-enquiry-flow.mjs` | 17/17 behaviour checks pass; 3 limitations reproduce |
| Seller flow | `node scripts/verify-seller-flow.mjs` | 26/26 behaviour checks pass; 2 limitations reproduce |
| Builder flow | `node scripts/verify-builder-flow.mjs` | 48/48 behaviour checks pass; 3 limitations reproduce |
| Admin flow | `node scripts/verify-admin-flow.mjs` | 36/36 behaviour checks pass; 3 limitations reproduce |
| Forms without JavaScript | `node scripts/verify-no-javascript.mjs` | 50/50 forms work with scripting disabled |
| Sample-mode guard | `./scripts/verify-sample-mode-guard.sh` | 10/10 + **2 pending** — each scenario against a bundle actually built that way |

All nine scripts are committed and repeatable, against one production build
served by `next start`. **The whole set was run twice in a row against one
server with identical results**, which is what makes the reset claims mean
something rather than being an artifact of a fresh process.

`verify-design-tokens.mjs` is the only one that needs no browser and no server,
and the only one that compares this repository to the **design** rather than to
itself. Everything else compares the implementation with its own expectations.

**There are now unit tests, and no framework was added to get them.**
`node:test` and `node:assert` are built into Node 22. The 27 tests cover what
the browser suites cover *poorly*: the ledger invariant as a property over 500
randomised sequences rather than four examples, idempotency keys reused with
**different** inputs, all eight status/verification combinations in both
directions, the scope field against 23 hostile values, note containment over
all 16 interleavings, and the deployment guard's full 72-combination space.

They are not a substitute for the harnesses and do not try to be — each file
states where it mirrors a rule rather than importing the module, and what that
costs. There are still **no component tests**.

The ESLint flat config was broken on arrival (`FlatCompat` threw "Converting circular structure
to JSON"); lint could not run at all until it was repaired. Any earlier claim of a lint pass in
this repository predates a working config.

## Route sweep

`scripts/verify-route-sweep.mjs` loads **112 routes at 1440px and 390px** — 224
renders — and asserts five things on each: HTTP 200, no uncaught page error, no
console error, no failed sub-resource, and no horizontal overflow
(`scrollWidth > clientWidth + 1`).

**224/224 clean.**

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

`scripts/verify-no-javascript.mjs` drives **50 submissions across all three
consoles** with `javaScriptEnabled: false`. All 50 work.

Seller (checks 1–21): registration through both phases including the rejected
code, business details with GSTIN format checking, KYC validation, ticket
creation, reply and resolve, recharge validation and completion, a lead
purchase, marketplace filtering, billing details and profile.

Builder (checks 22–36): registration and its validation, PAN and document
validation, creating a listing, saving an editor section, advancing between
sections, publishing, **the published listing reaching `/search`**,
unpublishing, unlocking a contact (credit deduction and reveal on a plain form
post), starting a subscription, the profile form, and raising a support ticket.

Admin (checks 37–50): the A-04 reason gate refusing and then accepting, the two
axes staying separate on the plain-form path, the A-06 checklist gate, four
checklist ticks as four separate posts, the approval reaching the Seller
console, the A-19 amount and reason gates, **the adjustment landing in the
Seller's own ledger with its reason**, an A-23 reply reaching the right thread
and not the other one, and the A-29 CSV export.

The Admin forms matter most here. A reason gate that only worked with
JavaScript on would be no gate at all, and an internal tool is exactly where
somebody is running a locked-down browser. One detail is asserted rather than
assumed: A-23's reply-mode toggle is a client control, so with scripting off the
hidden field keeps its rendered value — `public`. That is the right default to
fail to, because a staff note shown to a user is a leak while a reply also
visible to staff is not.

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
build. **43 behaviour checks pass; 3 known limitations reproduce.** The two
registers are kept apart for the reason set out above.

### Route sweep

All 33 Builder routes are in the 224-render sweep at 1440px and 390px. Clean.

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

### B-15 — unsaved changes (checks 27–41)

Fifteen checks over the approved experience: the header mark, the exit dialog's
three ways out, and the browser-level warning.

- **27–29 — the mark is a comparison, not a flag.** An untouched section is
  clean; a keystroke marks it; **typing a value back to what was saved clears
  it again**. Dirtiness is read from the DOM against each control's own
  `defaultValue`, which is exactly what `form.reset()` restores, so "discard"
  and "is it dirty" cannot disagree.
- **30–33 — the dialog, and all three ways out.** Leaving opens it instead of
  navigating; "keep editing" preserves what was typed and keeps the mark up;
  "discard" leaves without saving, confirmed by reopening; "save draft and
  close" saves *and* lands where the Builder was going.
- **36–38 — every anchor, not just the obvious one.** The console rail and the
  section rail are both intercepted, by one capture-phase listener. Check 37
  matters most: moving to section 2 would otherwise have discarded section 1
  silently.
- **39 — the preview section is not guarded**, because it has no fields and
  nothing to lose. Asserted by the absence of a save control and of a dialog.
- **40–41 — the reload warning is armed and disarmed.** A synthetic
  `beforeunload` cannot open a browser's own prompt, but it does run the page's
  handler, and a handler that calls `preventDefault` is precisely what makes a
  real browser prompt. Check 40 asserts it is cancelled while dirty; check 41
  asserts it is not once saved, so a clean editor does not nag.

**Browser limitations, stated rather than glossed:**

- **No browser has honoured a custom `beforeunload` string since 2017.** Every
  one shows its own wording. The code sets `returnValue` for browsers that
  still require it and the comment says why; nothing in this application
  controls what that dialog says.
- **The prompt can be suppressed entirely.** A browser may skip it if the user
  has not interacted with the page, and some will not show it on a programmatic
  navigation at all. It is a courtesy, not a guarantee, and the in-app dialog is
  the part that is actually reliable.
- **Browser Back within the application is not intercepted.** The capture-phase
  click listener covers links; a Back press is a history event, and guarding it
  needs a `popstate` trap that pushes a state entry back, which trades one
  surprise for another. Not built, and recorded here rather than left to be
  discovered.
- **File inputs are excluded from dirty detection.** In sample mode nothing is
  uploaded and `photoCount` is what saves, so a chosen file could never become
  "saved" — counting it would leave the editor permanently dirty with no way to
  clear it. A consequence of limitation L2, not an independent choice.
- **None of it works without JavaScript**, and limitation L3 asserts the screen
  says so. What still works there: every control that leaves a section is a
  submit button, so moving through the editor saves on the way. The exposure
  that remains is Back and closing the tab, and the notice names both.

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
- ~~B-15's unsaved-changes prompt is not built.~~ **Closed** — see the section
  below.
- **Publishing is not moderation.** A published listing reaches `/search`
  immediately. Whether a real listing is reviewed before or after going live is
  **D-10 and open**, and A-08's queue does not exist. What is demonstrated is
  the mechanism, not the policy.
- The three accessibility checks below are outstanding for these screens as for
  every other.

## Admin console (A-01 to A-31)

Run with `node scripts/verify-admin-flow.mjs` against the same production
build. **36 behaviour checks pass; 3 known limitations reproduce.**

**Most of this suite is negative, deliberately.** A staff console's interesting
failures are things that must *not* happen — a reply reaching the wrong person,
an internal note reaching anyone, a suspension quietly revoking a verification —
and a suite that only walks happy paths cannot see one of them.

### Route sweep

All 38 Admin routes are in the 224-render sweep at 1440px and 390px. Clean.

### A-01 authenticates nobody, and says so

Checks 1–2. Every field on the sign-in screen is asserted `disabled`, and the
screen is asserted to say in its own words that no password is checked, no
session is created and no second factor is asked for. D-16 is named as open, so
no MFA step is drawn.

That is the opposite of most verification: the check exists to confirm the
screen does **not** work.

### Reasons are enforced where the record changes

Checks 3–4, 16. Every staff decision refuses an empty reason *before* it changes
anything, and the refusal is asserted along with the fact that nothing moved.
The gate lives in the store rather than in each form, so a new screen reaching
for the same service cannot skip it — and, as checks 37, 40 and 44 of the
no-JavaScript suite show, it still holds with scripting off.

Approval on A-06 has a second gate: the full checklist. Check 5 asserts the
refusal, check 6 completes the checklist, check 7 asserts the approval then
succeeds.

### The cross-role joins, asserted in both directions

| What | Checks | The negative half |
|---|---|---|
| KYC decision → Seller verification | 5–9 | — |
| Suspension → status, **not** verification | 10–14 | 11, 12: verification unchanged, both surfaces |
| KYC decision → **not** account status | 15 | the reverse of 11 |
| Credit adjustment → the account's own ledger | 16–19 | — |
| Public reply → the requester's thread | 20–21, 26 | 22, 27: absent from the other console |
| Internal note → Admin only | 23 | 24, 25: absent from the thread *and* the HTML |
| Purchases → Admin orders | 28 | — |

Two of those deserve spelling out.

**Suspension and verification are independent, and the audit log proves it.**
Check 11 asserts both chips on A-04, check 12 asserts the Seller console agrees,
check 14 asserts the audit entry carries `kyc_status` as a before/after pair
that is deliberately *unchanged*. Check 15 runs the same assertion the other
way: a rejection does not un-suspend an account. The log records what was not
touched, not only what was.

**Internal notes are contained structurally, not filtered.** Check 24 asserts
the note is absent from the requester's thread; check 25 asserts it is absent
from the whole served document, including the RSC payload. It is not hidden
there — it is not there, because the console's `TicketMessage` type has no field
that could carry one and no Seller- or Builder-facing service reads the Admin
store. A filter is the thing a future screen forgets.

### Nothing is invented

Checks 29–34, one per open decision:

- **A-21 shows no subscription amount.** D-01 is open; the column reads
  "Sample". A plausible figure on a staff screen is how an unapproved price
  becomes a fact somebody quotes.
- **A-08 has no approve action**, and says why. D-10 is open and the Builder
  console publishes straight to the portal; an approve step here would settle
  that by implication. Dismissing a report is recorded as *not* an approval.
- **A-20 moves nothing.** D-06 leaves the eligibility rule and the destination
  both open, so approving writes no ledger entry at all.
- **A-28 has no remove control**, and the service interface has no method for
  one. A suppression is created by the person who refused.
- **A-31 has no credential field**, anywhere in the console.
- **A-14's price fields are disabled.** D-03 is open.

### Limitations reproduced, not passed

- **The whole console is reachable without signing in.** A-01 authenticates
  nobody; anything that reaches `/admin` gets everything. Staff authentication
  is kkl-backend's and is not demonstrated. **This is not an access-control
  pass** — it is the absence of one, confirmed.
- **The operational screens read fixtures.** There is no intake pipeline, no
  qualification caller, no WhatsApp journey and no notification sender anywhere
  in this repository. A-10 to A-13 and A-24 to A-27 exist so their layout and
  states can be reviewed.
- **Balances are numbers in one process.** No gateway, no reconciliation, lost
  on restart.

### Not verified in this area

- **No staff roles exist, so none were tested.** Who may approve a document,
  adjust a balance or read a transcript is not modelled at all. Nothing here
  says anything about whether a real staff member could be stopped.
- **No screenshot comparison against the Admin prototype** — see below.

**A requirement this document previously invented, now withdrawn.** An earlier
version listed "no four-eyes rule on money" here, as though a two-person
approval on A-19 and A-20 were an outstanding gap. **No approved source asks
for one.** The screen inventory does not mention it, the approved prototypes do
not draw it, and kkl-backend's access matrix specifies the opposite shape: an
Admin may "issue refund / adjust ledger", qualified only by "audited ledger
event only, never a manual balance overwrite" — which is exactly what is built.

Single-actor with a mandatory reason and an audit entry *is* the specified
control. Recorded here because an invented requirement in a verification
document is worse than a missing one: it reads as a defect, and somebody would
have built it.

## Accessibility

Three of C-11's carried-forward items are now closed. Two remain, plus two
design-level findings that are not this implementation's to resolve.

### Measured and passing

| Check | Result | Script |
|---|---|---|
| **Status-chip contrast, all five** | **5/5 pass**, 5.26:1 to 8.07:1 | `verify-contrast.mjs` |
| Text and surface pairs | 24/24 pass AA | same |
| **Reflow at 320 CSS px** (1.4.10) | **16/16 screens** | `verify-zoom.mjs` |
| **Text-only zoom 200%** (1.4.4) | **16/16 screens** | same |
| Every control labelled | 5 screens, one per console | `verify-accessibility.mjs` |
| One h1, no skipped levels | 5 screens | same |
| Keyboard reaches field and submit | pass | same |
| No positive tabindex | pass | same |
| Dialog: focus in, named, Tab trapped, Escape keeps the edit | 4/4 | same |
| Validation announced with `role="alert"` | 2 screens | same |
| Invalid field points at its own message | pass | same |
| Mobile drawer: opens, reports state, Escape closes | 3 consoles | same |
| Focus ring immediate, not transitioned | pass | fixed earlier |
| Minimum target size 44px | enforced in the control components | — |

**C-11's chip-contrast item is closed.** It had been carried forward since
design approval as though it needed a person with a colour meter; it is
arithmetic on values this repository already held.

Checks are run **on a screen from each console**, not on one shared component.
A component being right does not make a screen right: a page can hand-roll an
input, or label one control and forget the next.

### Two reflow defects, found and fixed

Both looked perfectly fine and passed every other check:

- **`sr-only` on a `<table>` does not remove it from layout.** A table cannot
  shrink below its min-content width, so `width:1px` is ignored; it is hidden
  visually and still occupied 305px, pushing `/seller/billing` 23px wide at
  320 CSS px. Now wrapped in a `div`, which does shrink.
- **The Admin search form did not wrap**, pushing `/admin/users` 43px wide.

### Pending — tooling or platform unavailable

Recorded as pending. **Not passed, not failed.**

| Check | What is needed |
|---|---|
| **Screen reader** (NVDA, JAWS, VoiceOver) | A screen reader. None is installed here and none can be |
| **Forced-colors / High Contrast** | A Windows host. A *real* risk: the application sets explicit backgrounds and borders throughout, the usual cause of failure |
| **Voice control** (Dragon, Voice Access) | The tooling |

What is checked above is the **markup that would produce announcements** —
roles, live regions, `aria-describedby` wiring — not what a user would hear.
That is the difference between "the page says the right things" and "the page
is usable without sight", and **only the first is claimed.**

### Two design-level findings

Both are values the **approved baseline** declares. Changing either alters the
approved appearance, so they are reported with numbers and a proposed remedy
rather than quietly darkened. Neither was changed unilaterally.

**Focus ring on a light background — 2.11:1, needs 3:1** (WCAG 1.4.11).
C-01 names the focus ring as one of saffron's three permitted uses, so the
colour is part of the identity. *Proposed:* keep saffron and pair it with a
dark companion — an outline plus a 1px ink box-shadow reads as one indicator
and clears 3:1 on any background — or darken the ring on light surfaces only.

**Control border on white — 1.60:1, needs 3:1** (WCAG 1.4.11). A text input is
identified by its border; the approved `#C6CCE0` is 1.60:1. *Proposed:* darken
it on light surfaces, or give controls a filled surface distinct from the card.

The card hairline is **not** in scope: it groups visible content rather than
identifying a component. The controls were using it (1.27:1) until this pass,
and that part is fixed.

## Visual comparison against the approved baseline

**The prototypes now render locally, and screens were compared.** An earlier
version of this document recorded that they could not be rendered here at all —
they load React, ReactDOM and Babel from `unpkg.com` and fonts from Google
Fonts, and this environment's network policy denies both.

`scripts/setup-prototype-review.sh` resolves that without touching the
baseline: it fetches the **same pinned versions** (react 18.3.1, react-dom
18.3.1, @babel/standalone 7.29.0) from the npm registry, which the policy does
allow, and the same three font families from `@fontsource`, then writes a
separate copy of each prototype pointing at those local files. The script
verifies kkl-design is byte-identical before it finishes and aborts if not.

**25 pairs across 17 screens** are captured in `docs/phase-2/visual/`, driven
through the prototype's own screen picker and width tabs so it reflows as
designed. The full list of what was compared, the differences found and fixed,
the deliberate departures, and what remains uncompared are in
**`docs/phase-2/acceptance.md` §3**.

### Six differences the rendered comparison found

None of them could have been seen by a token check, a computed-style check or
a route sweep — every one of those was passing at the time.

1. **Card headings were at the screen-heading step** — `.t-heading` (26px/800)
   where C-02 declares "Card and section title — Archivo 700 · 17px". The right
   ladder, the wrong rung, across 12 headings in all four journeys.
2. **The Credits card figure was 34px**; the approved Seller card declares 30px.
3. **The Admin rail used the Seller's step.** The approved A-02 sets 14px with
   tighter padding because twenty destinations do not fit at 16px.
4. **Form controls used the card hairline** `#E1E4EE` where the design uses the
   control border `#C6CCE0` at 1.5px — 124 occurrences against 268.
5. **The P-03 gallery was sized by aspect ratio** where the approved screen
   declares fixed heights: `galleryMainH` 400/320/220 and `thumbH` 194/150/120,
   breaking at 1060 and 620. At 1440 it rendered 802×551 against the design's
   843×400.
6. **The public container was 64px too narrow on every page.**
   `max-w-[1280px]` was read as a border-box width, giving 1216px of content;
   the baseline's wrappers are content-box, so its 1280px *is* 1280px of
   content inside a 1344px box.

Findings 5 and 6 were invisible until photography was wired into the
comparison — an empty slot collapses to a box that resembles the design. They
also share a cause worth naming: **the approved prototypes are content-box and
Tailwind is border-box, so a number copied across without that adjustment is
short by its own borders and padding.** The first attempt at fixing 5 landed
exactly 2px short at every width and every breakpoint for that reason.

After the fix, implementation and prototype measure identically at 1440:
843 image, 845 wrapper, 1280 grid, 1344 container.

### And one earlier, from measurement

`Card`'s base classes beat the caller's overrides, so **every warning, success
and danger panel in the application rendered white with a grey hairline**.
Tailwind emits `bg-white` and `bg-[#FFF7E8]` as two rules of equal specificity;
stylesheet order decides, not class-attribute order.

### Imagery — now compared, with a stated limit

An earlier version of this document recorded this as blocked. The blockage is
real and unchanged: **this environment's network policy denies
`images.unsplash.com`** — re-confirmed this pass, the proxy rejects CONNECT —
so the baseline's actual photographs cannot be fetched here.

What was wrong was stopping there. `scripts/make-review-photos.mjs` generates
seven deterministic stand-in images under the photo ids the baseline names;
the prototype copy is rewritten to fetch them and the application reaches the
same files through `NEXT_PUBLIC_KKL_IMAGE_ORIGIN`. Both sides receive the
identical file.

**What that does and does not establish.** It establishes slot geometry:
aspect ratio, crop, rounding, overlay and caption placement — which is how
findings 5 and 6 above were caught. It establishes nothing about photographic
fidelity, and cannot: the images are placeholders and say so on their face.
To compare the real photographs, run the capture where `images.unsplash.com`
is reachable and omit `NEXT_PUBLIC_KKL_IMAGE_ORIGIN`.

The two states are captured as separate sets — `-photos` for image-present,
unsuffixed for missing media — and **neither stands in for the other**. Both
sides of a pair are always in the same state: the missing-media set uses a
second prototype copy built with `KKL_REVIEW_PHOTOS=off`.

One difference the image-present state shows and leaves open: the
implementation draws an attribution band on every card carrying review
imagery, where the approved homepage draws one on the project cards but not
the property cards. It exists only on the review-imagery path, which is off by
default, and disappears when licensed project photography replaces the
stand-ins.

### What is still not compared

**96 of 113 inventory rows.** The shared *values* are right everywhere, because
they come from shared components — that says nothing about the layout of a
screen nobody opened.

## Console output

The application's console is checked on every route of every sweep, separately
from the baseline's own console state. **Clean on all 112 routes at both
widths** — no console errors, no uncaught page errors, no failed sub-resources.
That assertion is now part of `scripts/verify-route-sweep.mjs` rather than
something a person watched for, so it cannot quietly stop being true.

The baseline's unresolved homepage console defect is not inherited — see
`approved-baseline.md` §6.

## Not claimed

- **No screen is connected to a real service.** Authentication, authorization,
  KYC, lead ownership, contact disclosure, credits and payments are all
  simulated, and every screen that touches one says so on the screen.
- **There is no staff sign-in and there are no staff roles.** Anything that
  reaches `/admin` gets the whole console. Reproducing that is limitation L1 of
  the Admin suite, and reproducing it is not a pass.
- **The Admin operational screens read fixtures.** No intake pipeline,
  qualification caller, WhatsApp journey or notification sender exists here.
- **No accessibility conformance claim at any level.** Screen-reader
  behaviour, forced-colors and voice control are pending on all 113 rows, and
  two design-level contrast findings are open.
- **96 of 113 rows have not been visually compared.** 17 were, by rendered
  screenshot; the shared values are right everywhere, which says nothing about
  the layout of a screen nobody opened.
- **Imagery is not in the comparison.** `images.unsplash.com` is denied by this
  environment's network policy, so the review-imagery path has never been seen
  rendered.
- **B-15 is partial.** Edits survive browser Back, but the approved dialog does
  not appear for it. The trade-off and the three options are in
  `acceptance.md` §2.
- **No performance or load testing.** **No cross-browser testing** — every
  check ran in headless Chromium. **No component tests.**
- **`/seller/review-state`, `/builder/review-state` and `/admin/review-state`
  returning 404 outside sample mode is untestable, not verified**: a build with
  `NEXT_PUBLIC_KKL_DATA_SOURCE=api` fails at build time because no API client
  exists. The guard was not weakened to make one.
- **The guard's own comparison was inert until this pass.** The build-time
  values were read through a computed `process.env[name]` lookup, which the
  bundler does not substitute, so on the server both sides of the
  bundle-versus-server check read the same live process environment. Fixed,
  and the fix is covered by a scenario that proves supplying `NEXT_PUBLIC_*`
  at start time cannot launder a mismatched bundle.
- **The deployment guard cannot detect that it is running in production.** It
  requires the deployment to declare itself. A deployment declaring
  `KKL_ENV=review` while serving real users is not detectable here, and nothing
  in a frontend could detect it. Operational, not a code control.
- **The dev-server hydration failure has no established cause.**

### Claims this document has had to withdraw

Five, kept rather than deleted — a verification record that quietly corrects
itself is worth less than one that shows its corrections.

1. **"C-01 values transcribed and compared."** Three colour tokens and nine
   component literals were wrong, all near-misses, while a route sweep of 224
   renders passed with a clean console. A comparison performed by a person
   reading two lists of hex codes is the one comparison a near-miss survives.
   Now `verify-design-tokens.mjs`.
2. **"The prototypes cannot be rendered in this environment."** True of the
   default setup and not true of what was reachable: the npm registry is
   allowed, so the pinned versions could be fetched and served locally. The
   conclusion was right about the blockage and wrong to stop there.
3. **"No four-eyes rule on money."** Listed as an outstanding gap. **No
   approved source asks for one** — kkl-backend's access matrix specifies an
   audited ledger event, single-actor, which is what is built. An invented
   requirement in a verification document reads as a defect, and somebody would
   have built it.
4. **"Sample-mode guard: 8/8, build time and run time, both directions."** The
   script passed `NEXT_PUBLIC_*` on the `next start` line of every scenario, so
   both sides of the bundle/server comparison came from one process. It never
   ran the documented configuration — which in fact returned 503 — and its
   mismatch scenarios would have passed against any bundle at all. It built
   once, with no `NEXT_PUBLIC_*` set, and tested that bundle under every label.
   **A green count from a test that cannot fail is worse than no test**: it was
   cited as evidence the guard worked. Each scenario now builds the bundle it
   claims to test; 10/10, with two scenarios reported pending because they need
   a backend that does not exist yet.
5. **"Imagery cannot be compared."** True of the baseline's actual
   photographs, which this environment cannot fetch, and not true of the
   comparison: stand-ins served to both sides establish slot geometry, and did
   so — they caught two layout defects that had survived every other check.
   The same shape of error as (2): right about the blockage, wrong to stop at
   it.
