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
| Production build | `npx next build` | Pass — 24 routes compiled |
| Enquiry flow, 20 checks | `node scripts/verify-enquiry-flow.mjs` | Pass — all 20 behaved as expected |
| Seller flow, 22 checks | `node scripts/verify-seller-flow.mjs` | Pass — all 22 behaved as expected |
| Sample-mode guard, both directions | `./scripts/verify-sample-mode-guard.sh` | Pass — build-time and run-time |
| Unit / integration tests | — | **None written. No test runner is configured.** |

The two scripts above are committed and repeatable. Everything else in this
document was run by hand this session.

The ESLint flat config was broken on arrival (`FlatCompat` threw "Converting circular structure
to JSON"); lint could not run at all until it was repaired. Any earlier claim of a lint pass in
this repository predates a working config.

## Route sweep

All 18 implemented routes, at 1440px and 390px: **HTTP 200, no console errors, no page errors,
no failed sub-resources, no horizontal overflow.**

`/` · `/search` · `/property/:slug` · `/property/:slug/enquiry` · `/property/:slug/site-visit` ·
`/auth` · `/find-my-match` · `/find-my-match/review` · `/matches` · `/account` ·
`/account/enquiries` · `/account/enquiries/:id` · `/account/shortlist` · `/builders` ·
`/brokers` · `/support` · `/legal/:slug` · `/enquiry/unavailable`

Added since that sweep and **not yet included in it**: `/account/profile`,
`/account/notifications`. Their own states were exercised (below) but they have
not been through the 1440/390 sweep or compared against the baseline.

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
| 8 | Direct access to a confirmation with no session | ⚠️ **renders (200)** — see limitations |
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
| 19 | The confirm handoff does not require the OTP step | ⚠️ **a draft alone reaches confirmation** |
| 20 | The draft cookie is unsigned | ⚠️ **a crafted draft is accepted** |

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

### Limitations asserted, not passed

- **A second browser sees the first browser's purchase.** Sample mode has one
  Seller and no sign-in, so state is shared across browsers. Per-account
  isolation is kkl-backend's and is not demonstrated.
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
- No no-JavaScript pass over the Seller forms. The OTP-shaped registration form
  follows the pattern fixed in the Buyer flow, but that has not been re-driven
  with JavaScript disabled here.

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

Not compared at all: P-05, P-08 to P-11, P-15 to P-20, and every screen at 768
except the homepage.

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

The application's console is checked on every sweep, separately from the baseline's own console
state. **Clean on all 18 routes at both widths.** The baseline's unresolved homepage console
defect is not inherited — see `approved-baseline.md` §6.

## Not claimed

- No screen is connected to a real service. Everything renders from sample fixtures.
- No accessibility conformance claim at any level.
- No performance or load testing.
- No cross-browser testing; all checks ran in Chromium.
- Two committed scripts exist (`scripts/verify-enquiry-flow.mjs`,
  `scripts/verify-sample-mode-guard.sh`). There is no test runner and no unit or
  component tests; the route sweep, journey walkthrough, accessibility checks and
  visual comparisons were run by hand this session and are not regression tests.
- The visual match is not complete — primary imagery differs, as above.
- Screen-reader behaviour, per-chip contrast and zoom are unverified.
- The dev-server hydration failure has no established cause.
