# Phase 4 integration — verification record

Continued **2 October 2026** on `kkl-web` `claude/phase-2-frontend` against
published OpenAPI `1.0.0-phase4.a`. This is not a live provider integration
claim and not client acceptance.

## Revisions

| | |
|---|---|
| Frontend (this wiring) | `04b54ab` |
| Earlier Phase 4 prep | `dc2f275` / `6acfc2f` |
| Frontend purchase confirmation | `16afab5` (frontend commit; earlier record wrongly called this a backend commit) |
| Frontend checkpoint before Phase 4 | `02687ea` |
| Backend | `a606665` on `claude/phase-4-qualification` |
| OpenAPI | `1.0.0-phase4.a` |
| Migration | `026_qualification.sql` |
| Geometry | `docs/phase-2/visual/geometry-1440.json` left unstaged |

## Provenance correction

`16afab5` is a **frontend** commit (“Confirm a purchase at the displayed price
and pricing version”). The matching backend purchase work is `a6d6d4d`
(OpenAPI `1.0.0-phase3.t`). The Phase 4 prep record had labelled `16afab5` as
backend; that was wrong and is corrected here.

## What this revision wired

Against `a606665` / `1.0.0-phase4.a`:

- Question sets (list + synthetic register) on A-15 — not pricing prompts
- Calling window and opt-out configuration on A-15
- Qualification run list/detail on A-24 / A-25 (voice channel)
- WhatsApp-channel runs on A-26 with message status labels
- Human review (`facts_recorded` / `needs_follow_up`) and recover (`resume` / `retry`)
- Due retries on A-31
- Honesty: level unset, model intent labelled, marketplaceConsent unchanged,
  synthetic labelled, providerVerified false not shown as live delivery
- H4-1 / lead-centric H4-2 remain open (a run is not a lead)

## Runtime handoff (browser checks deferred)

The backend has not supplied a running Phase 4 review environment for this
frontend window. Adapter and UI work proceeds against the published contract.
**Do not** probe the old Phase 3 API and conclude these routes are absent.

When the backend runtime handoff arrives, exercise with:

```
KKL_QUALIFICATION=backend
KKL_AUTH=backend
KKL_BACKEND_BASE_URL=<phase-4 review base>
```

Use only synthetic question sets (`provenance: synthetic_test`), with live
dispatch disabled / `providerVerified: false`. Verify save/reload of window and
opt-out, role denial (seller 403), session handling, empty lists, and service
failures without sample fallback.

## Checks run (offline)

| Check | Result |
|---|---|
| `npm test` | PASS (see commit) |
| `npx tsc --noEmit` | PASS |
| `npx next build` | PASS |
| Authenticated browser on Phase 4 review API | **Deferred** — awaiting backend runtime handoff |
| Live Exotel / WhatsApp / Sarvam | **Not exercised** |

## Remaining gaps

| Gap | Notes |
|---|---|
| H4-1 staff lead inventory | Still unpublished; do not use runs as leads |
| H4-2 staff lead document | Run detail covers Q&A; lead-centric Admin page still open |
| H4-8 voice-bridge schema freeze | Admin uses qualification routes; bridge stubs remain for kkl-voice |
| Calling-window / opt-out GET | OpenAPI publishes POST only — save returns the stored value; page reload cannot re-hydrate the form from a read |
| Start-run UI | `POST /v1/admin/qualification/runs` is published; no approved Admin start-run screen in this pass |
| Browser verification | Needs Phase 4 review process from backend handoff |
| Live provider journeys | Untested by design in this pass |

Synthetic fixtures and unit readings are not a completed live Phase 4
integration.
