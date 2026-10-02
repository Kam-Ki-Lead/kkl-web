# Phase 4 frontend integration — handoff

Start here for qualification, calling and WhatsApp Admin work on
`claude/phase-2-frontend`. This directory is the frontend record of that run.
It does not revise Phase 2 sample-service docs or the Phase 3 commerce record.

| Document | What it answers |
|---|---|
| **[screens.md](screens.md)** | Approved Admin screens Phase 4 must connect, what is already wired on other switches, and exact handoff requests H4-1…H4-8 |
| **[integration-verification.md](integration-verification.md)** | Checks run for this frontend revision against published OpenAPI `1.0.0-phase3.t` |

## Scope (authoritative)

From `kkl-backend/docs/delivery-plan.md`: Phase 4 is *AI voice calling
(kkl-voice): Exotel + Sarvam integration, LLM qualification flow, WhatsApp
funnel*. Phase 3 built lead/consent/suppression state and published
voice-bridge **stubs** (`501 not_implemented`) for kkl-voice → kkl-backend.
Those stubs are not Admin read APIs.

Approved design remains kkl-design `5bc3512`. Frontend continues on
`claude/phase-2-frontend`. Logo palette and responsive layouts are retained.

## Starting point

| | |
|---|---|
| Frontend branch | `claude/phase-2-frontend` |
| Last completed frontend checkpoint before Phase 4 | `02687ea` (purchase confirmation against backend `16afab5` / OpenAPI `1.0.0-phase3.t`) |
| Backend OpenAPI at handoff | `1.0.0-phase3.t` @ `a6d6d4d` |
| Geometry | `docs/phase-2/visual/geometry-1440.json` and unrelated local work are preserved and not part of this record |

## Rules this frontend keeps

- Question definitions ≠ qualification-level mapping. Show **mapping not configured** where applicable. Do not assign Levels 1–10 from answer counts or model guesses.
- Queued ≠ delivered. Conversation completion ≠ sale eligibility. Generated summary ≠ verified facts.
- No invented endpoints. No sample-data fallback when a Phase 4 switch is on.
- No real calls/messages, no review-data reset, no development identity as production auth, no weakened consent.
- No merge, deployment or acceptance claim from this directory.
