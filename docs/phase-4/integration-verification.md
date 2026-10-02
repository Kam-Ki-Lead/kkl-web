# Phase 4 integration — verification record

Continued **2 October 2026** on `kkl-web` `claude/phase-2-frontend` against
the Phase 4 review runtime at OpenAPI `1.0.0-phase4.c`. This is not a live
provider integration claim and not client acceptance.

## Revisions

| | |
|---|---|
| Frontend (this pass) | `2fe8c37` |
| Prior phase4.b verification | `e91a2dc` / `16a5efb` |
| Prior phase4.a wiring | `04b54ab` / `e765da3` |
| Backend process | `e7ffdb6` on `http://127.0.0.1:4011` |
| Runtime handoff docs | `773dc96` |
| OpenAPI | `1.0.0-phase4.c` |
| Migration | `026_qualification.sql` on `kkl_phase4` |
| Phase 3 | left on `4010` / `kkl_review` |
| Geometry | `docs/phase-2/visual/geometry-1440.json` left unstaged |

## Configuration

| Name | Value |
|---|---|
| `KKL_AUTH` | `backend` |
| `KKL_QUALIFICATION` | `backend` |
| `KKL_BACKEND_BASE_URL` | `http://127.0.0.1:4011` |
| `KKL_LEAD_REQUESTS_BASE_URL` | `http://127.0.0.1:4011` |
| `KKL_LOCATIONS_BASE_URL` | `http://127.0.0.1:4011` |
| Domain switches from handoff | `backend` as listed |
| `KKL_ALLOW_LIVE_CALLS` / messaging | unset |

Frontend served on **3812** (fresh `next build` + `next start` after this
wiring). Phase 3 process on 4010 untouched.

## What this revision wired

Against `e7ffdb6` / `1.0.0-phase4.c` / docs `773dc96`:

- **H4-1 / H4-2 (wired)** — Admin leads list/detail →
  `GET /v1/admin/qualification/leads` (+`/{leadId}`) with
  `qualification` / `review` filters, pagination, `latestRun.path` /
  `run.path` → Admin UI. Marketplace `GET /v1/leads` is not used.
  Failure does not fall back to samples.
- Calling-window / opt-out: `configured: false` = unset; saved block vs
  form defaults; `staff_saved` labelled as not client-approved
  (reconciled with the `e7ffdb6` GET shape: `configured` /
  `provenance` / `setAt`).
- Start/resume/retry use returned `capabilities`. Resume never
  dispatches. Retry offered only when `allowed && !dispatchesProvider`.
- Start-run refuses `providerDispatch.dispatched === true` and surfaces
  `effect` (`adapter_invoked` | `recorded_only`).
- **H4-7 stays partial** — mutation presses need backend seed fixtures
  (see request below). Prior phase4.b **14/14** browser evidence at
  `16a5efb` is preserved; this pass does not re-claim those mutations.

## Fixture / access requests

1. **Clear OTP daily rate-limit** for staff fixture `+919800004010` on
   `kkl_phase4` (or provision a second staff phone). Full staff browser
   re-run is blocked: `429` “This number has requested too many codes
   today” (`retryAfterSeconds` ~21232 at check time).
2. **Load mutation fixtures** on `kkl_phase4` with the published backend
   command (do not ask the frontend to invent rows):
   `npm run seed:phase4-mutations` from `kkl-backend` @ `e7ffdb6`
   (`data/phase4-mutation-fixtures.json`). Expected runs:
   - `QUAL-69c430f2` — completed / pending review
   - `QUAL-53e12f64` — incomplete / pending / resume allowed
   - `QUAL-960ac12c` — interrupted incomplete / resume allowed
   - `QUAL-8f50bc26` — suppressed / `409 suppression_in_force`
3. No live providers. Safe retry on this host remains only when
   `capabilities.retry.dispatchesProvider === false`.

## Browser / API evidence (this pass)

| Check | Result |
|---|---|
| Missing session → `/auth` on `/admin/leads` | **PASS** (partial script) |
| Seller denied staff lead inventory | **PASS** — admin shell staff-only; API `403 staff_only` “Only staff manage qualification.” |
| Seller denied qualification runs | **PASS** |
| 4011 ≠ 4010 health (`liveTelephony: false`) | **PASS** |
| Staff OTP for `+919800004010` | **BLOCKED** — daily rate limit (documented) |
| Staff lead inventory / detail / filters / past-end | **Code wired**; staff browser re-run awaiting OTP clear |
| Prior phase4.b 14/14 (runs, settings, start-run, …) | **Preserved** at `16a5efb` / `e91a2dc` — not re-claimed as phase4.c mutation verification |
| Review save / resume / suppressed / disallowed | **Awaiting** `seed:phase4-mutations` + staff OTP |

Partial script: `scripts/verify-phase4-partial.mjs` — **5/5**.
Full script: `scripts/verify-phase4-qualification.mjs` — blocked on staff OTP.

## Checks run (offline)

| Check | Result |
|---|---|
| `npm test` | **PASS** (117) |
| `npx tsc --noEmit` | **PASS** |
| `npx next build` | **PASS** |
| `scripts/verify-phase4-partial.mjs` | **5/5** |
| Live Exotel / WhatsApp / Sarvam | **Not exercised** |
| Review save / resume / suppressed | **Awaiting fixtures + staff OTP** |

## H4 coverage (per operation)

| Id | Status | Notes |
|---|---|---|
| H4-1 | **wired** | Staff inventory adapter + A-12 UI; seller denial checked; staff UI pending OTP |
| H4-2 | **wired** | Staff detail adapter + A-13 UI; staff UI pending OTP |
| H4-3…H4-6 | **verified** | Prior 14/14 + phase4.c reading/forms for provenance |
| H4-7 | **partial** | Capabilities gating wired; mutations untested on this host |
| H4-8 | **partial** | Admin does not call voice-bridge |

Synthetic fixtures and UI verification are not a completed live Phase 4
provider integration.
