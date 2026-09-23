# Phase 2 Frontend — Handoff

Start here.

| Document | What it answers |
|---|---|
| **[acceptance.md](acceptance.md)** | **Is this ready?** Remaining work split into frontend defects, verification gaps, backend dependencies and client decisions — and the recommendation |
| [implementation-checklist.md](implementation-checklist.md) | Screen and state coverage, 113 inventory rows across four dimensions, with every partial explained |
| [verification.md](verification.md) | What was checked, how, and what was **not** — including three claims this record has had to withdraw |
| [service-contract.md](service-contract.md) | What the frontend needs from kkl-backend. **Proposed, not agreed** — nothing here is a negotiated contract |
| [decisions.md](decisions.md) | The 16 open client decisions, and how to read an inert control |
| [local-review.md](local-review.md) | Exact commands to run and review this build |
| [approved-baseline.md](approved-baseline.md) | What was taken from kkl-design @ `5bc3512`, and the deliberate departures |
| [visual/](visual/) | Rendered side-by-side captures, 25 pairs across 17 screens |

## The short version

**Every screen in the 113-row inventory is built and behaves against typed
sample services.** That is not the same as Phase 2 being complete, and the
distinction is the point of `acceptance.md`.

- **One open frontend item.** B-15's approved dialog does not appear on browser
  Back. Edits are no longer lost — that defect is fixed — but the interaction
  differs from in-app navigation. It needs a decision, not more work.
- **Nine backend capabilities** are missing. The frontend for each is complete:
  interface, sample implementation, built and verified states. **These are not
  unfinished frontend work.**
- **Sixteen client decisions** are open, six of which block launch. Several
  screens are deliberately inert because of them.
- **96 of 113 rows have not been visually compared**, and imagery is missing
  from the comparison because the environment denies the image host.
- **Screen-reader, forced-colors and voice-control checks are pending** for
  want of tooling, and two contrast findings need a design decision.

## What is verified, in one table

| | Command | Result |
|---|---|---|
| Types, lint | `npm run typecheck`, `npm run lint` | 0 errors, 0 warnings |
| Unit tests | `npm test` | 27/27 — `node:test`, no framework added |
| Design tokens | `verify-design-tokens.mjs` | 27 tokens, 37 literals, all in the baseline |
| Contrast | `verify-contrast.mjs` | 24/24 AA, **2 design findings** |
| Zoom | `verify-zoom.mjs` | 32/32 across 16 screens |
| Accessibility | `verify-accessibility.mjs` | 22/22, **3 pending** |
| Visual values | `verify-visual-baseline.mjs` | 22/22 |
| Route sweep | `verify-route-sweep.mjs` | 224/224 — 112 routes × 2 widths |
| Buyer enquiry | `verify-enquiry-flow.mjs` | 17/17 + 3 limitations |
| Seller | `verify-seller-flow.mjs` | 26/26 + 2 limitations |
| Builder | `verify-builder-flow.mjs` | 48/48 + 3 limitations |
| Admin | `verify-admin-flow.mjs` | 36/36 + 3 limitations |
| Without JavaScript | `verify-no-javascript.mjs` | 50/50 forms |
| Deployment guard | `verify-sample-mode-guard.sh` | 8/8 |

Run twice against one server with identical results.

**Known limitations are counted separately from passing checks throughout.**
Reproducing an OTP bypass, shared-account state or an unauthenticated console
is *not* a control passing — it is a control that does not exist, confirmed
still absent. A limitation that stops reproducing fails the run.

## Boundaries maintained

No live services. No public deployment. No payments, authentication, calls or
messaging. The sample-mode guard refuses to serve a production deployment
running sample services and was not weakened to make anything pass.
