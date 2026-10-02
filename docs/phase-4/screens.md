# Phase 4 — screens and H4 map (OpenAPI 1.0.0-phase4.c)

Backend process: `claude/phase-4-qualification` @ `e7ffdb6` on
`http://127.0.0.1:4011`. Runtime handoff docs @ `773dc96`.

## H4-1 … H4-8

| Id | Status | Published path | Frontend stance / evidence |
|---|---|---|---|
| H4-1 Staff lead inventory | **wired** | `GET …/leads` | A-12 loads staff inventory with qualification/review filters and pagination. Marketplace `/v1/leads` is not substituted. Seller denied. |
| H4-2 Staff lead detail | **wired** | `GET …/leads/{leadId}` | A-13 shows lead snapshot, level unset, run paths via `run.path` → Admin UI. |
| H4-3 Call / run list | **verified** | `GET …/runs` | Browser: staff list shows `QUAL-*`, `inventory: false`, SYNTHETIC, `not_configured` |
| H4-4 Run detail | **verified** | `GET …/runs/{runId}` | Browser: level unset, marketplaceConsent unchanged, SYNTHETIC, capabilities shown |
| H4-5 WhatsApp runs | **verified** | same list, channel filter | Browser: no delivery claim from fixtures |
| H4-6 Question sets / window / opt-out | **verified** | GET/POST question-sets, calling-window, opt-out | Saved vs form; `configured`/`provenance`; `staff_saved` ≠ client-approved |
| H4-7 Review + recovery + start-run | **partial** | review, recover, POST runs | Start-run exercised (effect / dispatched=false). Review save, resume, retry mutations await backend synthetic outcomes. |
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
- `configured: false` = unset
- Resume never dispatches; retry gated by capabilities
- Retry invokes dial when `dispatchesProvider` — not pressed on this review host
