# Phase 4 — screens and H4 map (OpenAPI 1.0.0-phase4.b)

Backend process: `claude/phase-4-qualification` @ `39d26fd` on
`http://127.0.0.1:4011`. Runtime handoff docs @ `9dcd1a1`.

## H4-1 … H4-8

| Id | Status | Published path | Frontend stance / evidence |
|---|---|---|---|
| H4-1 Staff lead inventory | **open** | — | A-12 refuses under `KKL_QUALIFICATION`. Runs (`inventory: false`) are not substituted. `GET /v1/leads?eligible=false` is not a staff-only inventory. |
| H4-2 Staff lead detail | **partial** | Run detail has Q&A | A-13 still refuses as a lead document; Q&A on `/admin/voice/[runId]` |
| H4-3 Call / run list | **verified** | `GET …/runs` | Browser: staff list shows `QUAL-*`, `inventory: false`, SYNTHETIC, `not_configured` |
| H4-4 Run detail | **verified** | `GET …/runs/{runId}` | Browser: level unset, marketplaceConsent unchanged, SYNTHETIC, not_configured |
| H4-5 WhatsApp runs | **verified** | same list, channel filter | Browser: no delivery claim from fixtures |
| H4-6 Question sets / window / opt-out | **verified** | GET/POST question-sets, calling-window, opt-out | Browser: saved window/opt-out reload; SYNTHETIC set listed |
| H4-7 Review + recovery + start-run | **verified** | review, recover(resume), POST runs | Browser: review form gated when not pending; retry/due-retries not offered; start-run → `not_configured` |
| H4-8 Voice-bridge | **partial** | Admin routes; bridge 503 here | Admin never calls `/v1/voice-bridge` |

## Switch

```
KKL_QUALIFICATION=backend
KKL_AUTH=backend
KKL_BACKEND_BASE_URL=http://127.0.0.1:4011
```

No sample fallback. Login via `POST /v1/auth/code` then
`GET /v1/dev/challenges/{id}/code` with `x-kkl-dev-secret`, then
`POST /v1/auth/sessions`. Staff fixture `+919800004010`; seller
`+919800004011` (403 on qualification).

## Honesty

- Level: mapping not configured / null
- Intent: model-reported, not a level
- marketplaceConsent: unchanged
- Synthetic sets labelled SYNTHETIC
- Phone: masked only (`phoneMasked`)
- Retry invokes dial — gated in Admin UI
