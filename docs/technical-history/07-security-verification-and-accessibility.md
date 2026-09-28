# 7. Security, verification and accessibility

Every suite, what it tests, what it does **not** prove, and which commit its
recorded result came from.

> **No suite was re-run to produce this documentation.** PRM-020 forbade it.
> Every figure below is a *recorded historical result*, attributed to the commit
> it was measured at. Nothing here is described as newly verified.

## 7.1 Evidence classes

Results are not interchangeable, so they are kept apart.

| Class | Meaning | Example |
|---|---|---|
| **H** Historical | Recorded at an earlier commit, not re-run since | token/contrast/zoom suites at `5c3a658` |
| **A** Audit-rerun | Independently re-executed during the 27 Sep audit | route sweep, lead-request flow, guard suite |
| **C** CR-pass | Run during the 27–28 Sep CR work, at the commit stated | owner posting 31/31 at `f74deb2` |
| **S** Source inspection | Read, not executed | business-rules module, RLS policy text |
| **V** Visual inspection | A person looked at rendered output | Type 1 comparison (PRM-018) |
| **G** Geometry/token | Mechanical DOM or value comparison | `verify-screen-geometry.mjs` |
| **L** Known limitation | Reproduced as documented — reproduction is **not** a pass | OTP bypass, shared sample account |

**Assistive-technology testing: class absent.** No screen reader, no braille
display, no voice control has been used. `verify-accessible-names.mjs` reports
what a screen reader *would* announce by reading the accessibility tree — useful,
and not the same thing. This is stated because conflating the two would be the
easiest false claim in the package.

## 7.2 The suites

Thirty-four scripts in `scripts/`, four unit-test files in `tests/`. All browser
suites need a **production build served by `next start`**, not the dev server,
plus a Playwright Chromium.

| Suite | Tests | Does **not** prove | Last recorded result · commit · class |
|---|---|---|---|
| `verify-route-sweep.mjs` | 134 addresses × 1440/390 px: HTTP 200 or documented redirect, no page error, no console error, no failed sub-resource, no horizontal overflow | That a journey works. A route can render and do nothing | 268/268 · `36114f5` build · C |
| `verify-enquiry-flow.mjs` | Enquiry beyond the happy path: reload, direct access, repeat, two tabs, two sessions, expired OTP/draft | Real OTP delivery — none is sent | 17/17 · `c2ec702` · C |
| `verify-seller-flow.mjs` | Purchase, credits, failure states, reset determinism | That money moved. Balances are numbers in one process | 26/26 + 2 limitations · `c2ec702` · C |
| `verify-builder-flow.mjs` | Builder journey, subscription and access states | Publishing to a real portal | 48/48 + 3 limitations · `c2ec702` · C |
| `verify-admin-flow.mjs` | Admin queues, reason-gated decisions, cross-role joins, internal-note containment | Staff authentication — there is none | 36/36 + 3 limitations · `c2ec702` · C |
| `verify-lead-request-flow.mjs` | CR03 journey against **either** store | Permanence — it never restarts anything | 15/15 both stores · `1940f11` · C |
| `verify-lead-request-persistence.mjs` | Files a request, `SIGKILL`s kkl-backend, restarts, reads it back; cross-account 404; anonymous 401 | **Authentication.** It proves a *given* identity is confined, not who the caller is | 9/9 · `1940f11` · C |
| `verify-owner-posting-flow.mjs` | CR02 end to end, incl. internal-note absence from HTML and "cleared ≠ published" | That any photograph was stored — none was | 31/31 · `f74deb2` · C |
| `verify-lead-order-flow.mjs` | CR04, incl. a genuine replay of one idempotency key across two tabs | Payment. No provider is contacted | 20/20 · `6b7f777` · C |
| `verify-verification-policy.mjs` | CR07 structure: not-required ≠ verified, no case from registering, split queue, outage ≠ pass, reason-gated decisions | Compliance. No provider, no document | 23/23 · `2dd368c` · C |
| `verify-labels-and-locations.mjs` | CR01 by where each label links; CR05 across six surfaces, ranked search, parent replaces child | That the launch scope is right | 23/23 · `c2ec702` · C |
| `verify-no-javascript.mjs` | Every form with scripting off | That the JS-only behaviours work — it says which do not exist | 51/51 · `5c3a658` · H |
| `verify-b15-navigation.mjs` | Edit → Back → Forward, exactly what is retained, saved or lost | That Back shows the dialog — it does not | 9/9 · `5c3a658` · H |
| `verify-design-tokens.mjs` | Every colour token against the design's own source values | Rendered appearance | 30/30 + 43/43 · `5c3a658` · G/H |
| `verify-contrast.mjs` / `-corrections.mjs` | WCAG contrast per text-on-surface pair; the two corrections where they render | Perceived legibility | 24/24 + 12/12 · `5c3a658` · G/H |
| `verify-typography.mjs` | Type precedence per context | Every one of 152 call sites | 11/11 · `5c3a658` · G/H |
| `verify-zoom.mjs` / `-firefox-text-zoom.mjs` | Native zoom and text-only zoom at 200% | Firefox text zoom — **not run**, needs a Firefox build not installed | 32/32 · `5c3a658` · H; Firefox pending |
| `verify-forced-colors.mjs` | Forced-colors emulation | Real Windows High Contrast | 13/13 · `5c3a658` · H |
| `verify-accessibility.mjs` | Keyboard navigation, dialog focus, validation announcement | That a screen reader user succeeds | 22/22 · `5c3a658` · H |
| `verify-accessible-names.mjs` | The accessibility tree's names | **Not** assistive-technology testing | 24/24 · `5c3a658` · H |
| `verify-screen-geometry.mjs` | Both DOMs measured, screen by screen | Pixel fidelity | sweeps at 1440/390/768 · `5c3a658` · G/H |
| `verify-visual-baseline.mjs` | Representative screens against the design's values | Everything not representative | at `5c3a658` · G/H |
| `verify-sample-mode-guard.sh` | Builds and serves 8 scenarios | The 72-combination rule — that is the unit test | 10/10 + 2 pending a backend · `707d77b` · H |
| `tests/*.test.mjs` | Guard truth table (72 combinations), access boundaries over every combination, idempotency, ledger invariant | Anything requiring a browser | 27/27 · `2dd368c` · C |
| `kkl-backend` `npm test` | REST surface, RLS past the handlers, no identity leak across a pooled connection, durability across `SIGKILL` | Authentication | 19/19 · `4fb7b9d` · C |

## 7.3 Test data and reset

Fixtures are deterministic and seeded. `sampleReviewControls.reset()` restores
Seller, Admin, lead requests, owner listings and verification **together**;
resetting one and not the others leaves two views disagreeing.

Review-only controls live on `/seller/review-state` and `/admin/review-state`
and are available in sample mode only. They set which designed screen renders —
KYC status, account status, next payment outcome, balance, and the CR07 sample
provider's next answer. They approve nothing and move no money.

`resetForReview` once retained ledger entries, invoices and counters while
clearing purchases — the reset only appeared to work. The technique that catches
it, from PRM-008, is now standing practice: **run the flow suite twice against
the same running server.**

## 7.4 Evidence provenance

Every capture is labelled with the commit it was taken at. A refresh does not
replace an older capture — `e-p3-attribution-b95e81e.png` still sits beside
`e-p3-attribution-b9e7e53.png`.

**D-20, the mobile-frame fault.** `proto-width.mjs` selected the prototype's
width tab but did not confirm the stage had taken it. When selection silently
failed, "mobile" evidence was captured at desktop width and looked plausible.
The script now *asserts* the stage frame's width and throws otherwise; the
affected captures were re-taken and the superseded ones are labelled, not
deleted. `4f125ec` closed the evidence impact.

**Do not combine commits.** The figures in §7.2 come from six different commits.
There is no build at which all of them were measured together, and none is
claimed. `owner-review.md` §5 previously presented `5c3a658`'s figures without
saying they predate all CR work; that was corrected at `36114f5`.

## 7.5 Known limitations, reproduced as documented

Reproduction is not a pass. From PRM-008: "Do not count successful reproduction
of OTP bypass or shared-account state as passing security controls."

| # | Limitation | Where |
|---|---|---|
| L1 | OTP is simulated; any code is accepted | Seller and Buyer registration |
| L2 | One shared sample account per role; no sign-in | all consoles |
| L3 | Balances are numbers in one process; no gateway, no reconciliation, lost on restart | Seller/Builder billing |
| L4 | No intake pipeline, qualification caller, WhatsApp journey or notification sender exists | Admin |
| L5 | Owner photographs are recorded by filename; no bytes are stored | CR02 |
| L6 | Verification is a labelled sample service; no provider selected | CR07 |

## 7.6 Pending verification

| What | Why it is pending |
|---|---|
| Firefox text-only zoom | Needs a Playwright Firefox build not installed in this environment |
| Real assistive-technology testing | No screen reader available; the tree check is not a substitute |
| Real Windows High Contrast | Only emulation was run |
| Sample-guard rows 11 and 12 | Need a real backend to point `api` mode at |
| Photograph fidelity | Licensed imagery has not been settled (E-P3) |
