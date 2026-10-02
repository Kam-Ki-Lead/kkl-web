# Phase 4 — screens and H4 map (OpenAPI 1.0.0-phase4.a)

Backend: `claude/phase-4-qualification` @ `a606665`.

## H4-1 … H4-8

| Id | Status | Published path | Frontend stance |
|---|---|---|---|
| H4-1 Staff lead inventory | **open** | — | A-12 refuses under `KKL_QUALIFICATION`; runs are not substituted |
| H4-2 Staff lead detail | **partial** | Run detail has Q&A | A-13 still refuses as a lead document; Q&A on `/admin/voice/[runId]` |
| H4-3 Call / run list | **satisfied** | `GET /v1/admin/qualification/runs` | A-24 lists voice-channel runs |
| H4-4 Run detail | **satisfied** | `GET /v1/admin/qualification/runs/{runId}` | A-25 answers, summary, evidence, review |
| H4-5 WhatsApp runs | **satisfied** | same list, channel filter | A-26 WhatsApp-channel runs + message status |
| H4-6 Question sets / window / opt-out | **satisfied** | question-sets, calling-window, opt-out | A-15 — not pricing prompts |
| H4-7 Review + recovery | **satisfied** | review, recover, retries/run | A-25 forms + A-31 due retries |
| H4-8 Voice-bridge | **partial** | Admin routes; bridge stubs 501 | Admin never calls `/v1/voice-bridge` |

## Switch

`KKL_QUALIFICATION=backend` — no sample fallback. Requires a Phase 4 review
API (runtime handoff from backend). Do not conclude absence by probing the
old Phase 3 process.

## Honesty

- Level: mapping not configured / null
- Intent: model-reported, not a level
- marketplaceConsent: unchanged
- Synthetic sets labelled SYNTHETIC
- Phone: masked only (`phoneMasked`)
