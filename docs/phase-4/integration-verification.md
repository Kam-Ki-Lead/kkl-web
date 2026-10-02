# Phase 4 integration — verification record

Continued **2 October 2026** on `kkl-web` `claude/phase-2-frontend` against
the Phase 4 review runtime. This is not a live provider integration claim
and not client acceptance.

## Revisions

| | |
|---|---|
| Frontend (this pass) | `16a5efb` |
| Prior phase4.a wiring | `04b54ab` / `e765da3` |
| Earlier Phase 4 prep | `dc2f275` / `6acfc2f` |
| Frontend purchase confirmation | `16afab5` (frontend; not a backend commit) |
| Backend process | `39d26fd` on `http://127.0.0.1:4011` |
| Runtime handoff docs | `9dcd1a1` |
| OpenAPI | `1.0.0-phase4.b` |
| Migration | `026_qualification.sql` on `kkl_phase4` |
| Phase 3 | left on `4010` / `kkl_review` |
| Geometry | `docs/phase-2/visual/geometry-1440.json` left unstaged |

## Configuration (handoff correction)

Backend `review-runtime.md` listed domain switches but omitted auth and
qualification. Readers in `src/lib/services/backend/config.ts` require:

| Name | Value |
|---|---|
| `KKL_AUTH` | `backend` (browser session; no development-identity fallback) |
| `KKL_QUALIFICATION` | `backend` |
| `KKL_BACKEND_BASE_URL` | `http://127.0.0.1:4011` |
| `KKL_LEAD_REQUESTS_BASE_URL` | `http://127.0.0.1:4011` |
| `KKL_LOCATIONS_BASE_URL` | `http://127.0.0.1:4011` |
| Domain switches from handoff | `backend` as listed |
| `KKL_ALLOW_LIVE_CALLS` / messaging | unset |
| `KKL_LEAD_REQUESTS_DEV_SECRET` on frontend | unset (challenge code read is verification-only) |

Frontend served on **3812** (production build). Phase 3 process on 4010
untouched. Login used the documented challenge-code endpoint with the local
credential file — secret not committed.

## What this revision wired / verified

Against `39d26fd` / `1.0.0-phase4.b`:

- GET calling-window and opt-out; saved configuration shown separately from the edit form
- Admin start-run (`POST …/runs`) — side-effect on this host is `not_configured`, not a live dial
- Run list/detail honesty: `inventory: false`, level unset, SYNTHETIC provenance, masked phone
- Transcript section on run detail
- Retry and due-retries **not offered** in UI (invoke dial); resume only when incomplete
- Browser script: `scripts/verify-phase4-qualification.mjs` — **14/14** plus unavailable-service on 3813

## Browser evidence (exact)

| Check | Result |
|---|---|
| Missing session → `/auth` | PASS |
| Staff run list (`inventory: false`, SYNTHETIC, not_configured) | PASS |
| Staff run detail (level unset, consent unchanged) | PASS |
| Review form gated when `reviewStatus` ≠ pending | PASS |
| Retry control absent | PASS |
| WhatsApp page no delivery claim | PASS |
| Settings reload of fixture window/opt-out | PASS |
| Calling-window save/reload | PASS |
| Opt-out save | PASS |
| A-12 leads refuse (not run list) | PASS |
| Due-retries not submitted from A-31 | PASS |
| Start-run → not_configured | PASS (`10ebf32c-…`) |
| Seller 403 / staff-only message | PASS |
| 4011 ≠ 4010 health | PASS |
| Unavailable backend (3813 → port 9) | PASS — “account could not be read”; no sample runs |

## Checks run (offline)

| Check | Result |
|---|---|
| `npm test` | PASS |
| `npx tsc --noEmit` | PASS |
| `npx next build` | PASS |
| `scripts/verify-phase4-qualification.mjs` | **14/14** |
| Live Exotel / WhatsApp / Sarvam | **Not exercised** |
| Retry / due-retries | **Not pressed** (dial path) |

## Remaining gaps

| Gap | Notes |
|---|---|
| H4-1 staff lead inventory | Still open; do not use runs or `eligible=false` leads as the staff inventory |
| H4-2 staff lead document | Run detail covers Q&A; lead-centric Admin page still open |
| H4-8 voice-bridge | Bridge not configured on this host; Admin does not call it |
| Review **save** while pending | Seeded runs are `not_required`; form correctly gated. Pending review save awaits an incomplete/pending fixture from voice-bridge outcomes |
| Resume while incomplete | Same — resume UI present only for `incomplete`; seeded run is `collecting` |
| Simulated-provider retry | Requires isolated simulated providers; not this review host |

Synthetic fixtures and UI verification are not a completed live Phase 4
provider integration.
