# Phase 4 integration — verification record

Started **2 October 2026** on `kkl-web` `claude/phase-2-frontend` alongside
the backend qualification window. This file records frontend preparation
against published OpenAPI `1.0.0-phase3.t`. It is not a live Phase 4
integration claim, not client acceptance, and not a deployment record.

## Revisions

| | |
|---|---|
| Frontend base | `02687ea` (purchase confirmation against backend implementation `16afab5`) |
| Backend OpenAPI consulted | `1.0.0-phase3.t` @ `a6d6d4d` on `claude/phase-3-backend` |
| Geometry / unrelated | `docs/phase-2/visual/geometry-1440.json` left unstaged; not part of this record |

## Evidence levels

| Level | Meaning |
|---|---|
| Unit-tested | Adapter/honesty checks in `tests/qualification-contract.test.mjs` |
| Code inspection | Screen dual-mode matched to unpublished staff contracts |
| Browser-tested | Not claimed for Phase 4 staff paths — contracts not published |
| Live provider | Not claimed — no Exotel / WhatsApp Business / Sarvam exercise |

## What this revision did

1. Identified approved screens A-10…A-13, A-15, A-24…A-28, A-31 and refused to
   duplicate A-10/A-11/A-27/A-28 already on other switches.
2. Added `KKL_QUALIFICATION` and fail-closed adapters in
   `src/lib/services/backend/qualification*.ts` that name handoffs H4-1…H4-8
   instead of inventing endpoints or calling voice-bridge stubs from Admin.
3. Dual-mode UI on A-12, A-13, A-24, A-25, A-26, A-31: backend mode shows the
   refusal; sample mode keeps labelled fixtures with honesty copy (queued ≠
   delivered, summary ≠ verified facts, mapping not configured).
4. A-15 reads published pricing question prompts when
   `KKL_ADMIN_OPERATIONS=backend`, always showing **mapping not configured**.
5. Documented exact external handoffs in [screens.md](screens.md).

## Checks run

| Check | Result |
|---|---|
| `node --test tests/qualification-contract.test.mjs` | PASS — 5/5 |
| `npm test` | PASS — 114/114 |
| `npx tsc --noEmit` | PASS |
| Authenticated browser against live voice/WhatsApp | **Not exercised** — staff contracts unpublished; no real call/message initiated |
| Provider recovery journeys | **Untested** — H4-7 |

## External dependencies still open

| Id | Dependency | Blocks |
|---|---|---|
| H4-1 | Staff lead inventory API | A-12 live data |
| H4-2 | Staff lead detail + Q&A / review states | A-13 live data |
| H4-3 | Staff call list | A-24 live data |
| H4-4 | Staff call detail / transcript permissions | A-25 live data |
| H4-5 | Staff WhatsApp journey with delivery states | A-26 live data |
| H4-6 | Qualification question schema vs pricing prompts; level mapping | A-15 mapping |
| H4-7 | Provider failure + authorised recovery | A-31 voice/WhatsApp |
| H4-8 | Frozen voice-bridge schemas for kkl-voice | Voice service write path |

Already connected elsewhere (not re-claimed here as Phase 4 completion):
intake (`KKL_INTAKE`), suppressions (`KKL_ADMIN_OPERATIONS`), notification
deliveries (`KKL_NOTIFICATIONS`), marketplace leads without qualification
(`KKL_MARKETPLACE`).

## Untested provider journeys

- Exotel outbound dial, webhook signature verification, quiet-hour hold
- Sarvam STT/TTS and LLM qualification turns
- WhatsApp Business template send, delivery receipts, STOP handling
- Consent evidence validation that grants `consent_status=granted`
- Any authorised recovery that retries a failed provider job

Synthetic Admin fixtures and unit refusals are not a completed live Phase 4
integration.

## Honesty retained

- Levels 1–10 are not assigned from answer counts or model guesses.
- `questionMapping` / mapping not configured is shown explicitly.
- Queued delivery attempts are not shown as sent.
- Conversation completion is not treated as sale eligibility.
- Generated summaries are labelled as not verified facts.
