# Phase 2 Frontend — Handoff

Start here.

| Document | What it answers |
|---|---|
| **[acceptance.md](acceptance.md)** | **Is this ready?** Remaining work split five ways — frontend defects, frontend verification pending on tooling, asset dependencies, backend dependencies, client decisions and proposed deviations |
| **[coverage.md](coverage.md)** | **What was actually checked.** All 113 inventory rows mapped to a pair, nested-state evidence or a named pending check. Generated, not hand-written |
| [implementation-checklist.md](implementation-checklist.md) | Screen and state coverage, 113 inventory rows across four dimensions, with every partial explained |
| [verification.md](verification.md) | What was checked, how, and what was **not** — including three claims this record has had to withdraw |
| [service-contract.md](service-contract.md) | What the frontend needs from kkl-backend. **Proposed, not agreed** — nothing here is a negotiated contract |
| [decisions.md](decisions.md) | The 16 open client decisions, and how to read an inert control |
| [local-review.md](local-review.md) | Exact commands to run and review this build |
| [approved-baseline.md](approved-baseline.md) | What was taken from kkl-design @ `5bc3512`, and the deliberate departures |
| [visual/](visual/) | Rendered side-by-side captures: 25 pairs across 17 screens in the missing-media state, 5 more in the image-present state |

## The short version

**Every screen in the 113-row inventory is built and behaves against typed
sample services.** That is not the same as Phase 2 being complete, and the
distinction is the point of `acceptance.md`.

Two things this acceptance pass found and fixed, both of which every automated
check in this repository had been passing over:

- **Two layout defects** — the P-03 gallery sized by ratio where the design
  declares fixed heights, and the public container 64px too narrow on every
  page. Both invisible until photography was wired into the comparison.
- **The deployment guard's bundle-versus-server check was inert**, and the
  script verifying it could not have noticed, because it supplied the
  build-time variables at start time. Both fixed; the guard's own history is
  in `verification.md`.

- **No open frontend defects.** Category A is empty. Fourteen are closed,
  including four shared-component deviations this pass found: the Admin rail
  rendered brand-deep instead of ink, buttons at the wrong radius/weight/size,
  rail items a step too large, and the rail wordmark at the header's size.
- **Three deviations await a decision** — B-15's dialog on browser Back, the
  two contrast failures at the baseline's own values, and the attribution band
  on review imagery. None is closed by more frontend work.
- **Nine backend capabilities** are missing. The frontend for each is complete:
  interface, sample implementation, built and verified states. **These are not
  unfinished frontend work.**
- **Sixteen client decisions** are open, six of which block launch. Several
  screens are deliberately inert because of them.
- **All 113 rows are mapped**: 97 screens captured as pairs at 1440 and 390,
  4 nested states named against their parent, 12 library rows against the
  screens they are judged in. `coverage.md` has the matrix.
- **Measured divergence is not zero and is not claimed to be.** 655 of 2,314
  matched elements still differ at 1440 (28.3%), 612 of 1,115 at 390 (54.9%).
  The systematic causes are fixed; much of what remains waits on E-P4.
- **Photographic fidelity is not compared.** The environment denies the image
  host, so slot geometry was compared with stand-ins; the baseline's actual
  photographs have not been seen here.
- **Five verification checks are pending on tooling** — screen readers,
  forced-colors, voice control, Firefox text-only zoom, real devices. They are
  **frontend verification this repository owns**, not backend work.

## What is verified, in one table

| | Command | Result |
|---|---|---|
| Types, lint | `npm run typecheck`, `npm run lint` | 0 errors, 0 warnings |
| Unit tests | `npm test` | 27/27 — `node:test`, no framework added |
| Design tokens | `verify-design-tokens.mjs` | 28 tokens, 37 literals, all in the baseline |
| Contrast | `verify-contrast.mjs` | 24/24 AA, **2 design findings** |
| Zoom | `verify-zoom.mjs` | 32/32 across 16 screens |
| Accessibility | `verify-accessibility.mjs` | 22/22, **3 pending** |
| Visual values | `verify-visual-baseline.mjs` | 24/24 |
| Route sweep | `verify-route-sweep.mjs` | 224/224 — 112 routes × 2 widths |
| Buyer enquiry | `verify-enquiry-flow.mjs` | 17/17 + 3 limitations |
| Seller | `verify-seller-flow.mjs` | 26/26 + 2 limitations |
| Builder | `verify-builder-flow.mjs` | 48/48 + 3 limitations |
| Admin | `verify-admin-flow.mjs` | 36/36 + 3 limitations |
| Without JavaScript | `verify-no-javascript.mjs` | 50/50 forms |
| Deployment guard | `verify-sample-mode-guard.sh` | 10/10, **2 pending** |
| Screen geometry | `verify-screen-geometry.mjs` | 93 screens ranked by divergence, both widths |
| B-15 navigation | `verify-b15-navigation.mjs` | 9/9 — Back and Forward, both arrival paths |

Run twice against one server with identical results.

**A count is not coverage.** 224 route renders prove 224 routes render; they
prove nothing about whether a screen matches its design. That is what
`coverage.md` and the ranked geometry diff are for, and two of this pass's
defects had a passing check sitting on top of them.

**Known limitations are counted separately from passing checks throughout.**
Reproducing an OTP bypass, shared-account state or an unauthenticated console
is *not* a control passing — it is a control that does not exist, confirmed
still absent. A limitation that stops reproducing fails the run.

## Boundaries maintained

No live services. No public deployment. No payments, authentication, calls or
messaging. The sample-mode guard refuses to serve a production deployment
running sample services and was not weakened to make anything pass.
