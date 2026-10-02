# Phase 4 frontend integration — handoff

Start here for qualification, calling and WhatsApp Admin work on
`claude/phase-2-frontend`. This directory is the frontend record of that run.

| Document | What it answers |
|---|---|
| **[screens.md](screens.md)** | Approved screens, H4-1…H4-8 status against OpenAPI `1.0.0-phase4.c` |
| **[integration-verification.md](integration-verification.md)** | Checks for this frontend revision |

## Contract in force

| | |
|---|---|
| Backend branch | `claude/phase-4-qualification` |
| Backend commit (process) | `e7ffdb6` |
| Runtime handoff docs | `773dc96` (`docs/phase-4/review-runtime.md`, `handoff.md`) |
| OpenAPI | `1.0.0-phase4.c` |
| Migration | `026_qualification.sql` |
| Review URL | `http://127.0.0.1:4011` (`kkl_phase4`) |
| Phase 3 (unchanged) | `http://127.0.0.1:4010` (`kkl_review`) |

## Frontend switches the handoff omitted

The backend review-runtime table omits auth and qualification. This frontend
requires them explicitly, all on the **same** Phase 4 origin:

```
KKL_AUTH=backend
KKL_QUALIFICATION=backend
KKL_BACKEND_BASE_URL=http://127.0.0.1:4011
KKL_LEAD_REQUESTS_BASE_URL=http://127.0.0.1:4011
```

Do not mix Phase 3 tokens or data from port 4010 with Phase 4 requests.
Do not set a development-identity fallback when `KKL_AUTH=backend`.
Leave `KKL_ALLOW_LIVE_CALLS` and `KKL_ALLOW_LIVE_MESSAGING` unset.

## Rules

- Staff inventory is `GET /v1/admin/qualification/leads` (`inventory: true`). Marketplace `GET /v1/leads` is not that inventory.
- A run is not a lead (`inventory: false` on the runs list). A run outcome is not provider delivery when `providerVerified` is false.
- `configured: false` means unset, not a client default. `staff_saved` is not client-approved.
- Resume never dispatches. Retry follows returned `capabilities.retry` (offer only when allowed without provider dispatch on this host).
- Start-run `effect` may be `adapter_invoked` or `recorded_only`; live acceptance is only `providerDispatch.dispatched`.
- Pricing prompts are not qualification question sets.
- `qualification.level` stays unset; `modelReportedIntent` is model output only.
- `marketplaceConsent` stays `unchanged`.
- Synthetic questions stay visibly SYNTHETIC.
- No live calls/messages, merge, deployment or acceptance claim.
