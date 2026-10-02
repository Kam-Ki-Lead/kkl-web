# Phase 4 frontend integration — handoff

Start here for qualification, calling and WhatsApp Admin work on
`claude/phase-2-frontend`. This directory is the frontend record of that run.

| Document | What it answers |
|---|---|
| **[screens.md](screens.md)** | Approved screens, H4-1…H4-8 status against OpenAPI `1.0.0-phase4.b` |
| **[integration-verification.md](integration-verification.md)** | Checks for this frontend revision |

## Contract in force

| | |
|---|---|
| Backend branch | `claude/phase-4-qualification` |
| Backend commit (process) | `39d26fd` |
| Runtime handoff docs | `9dcd1a1` (`docs/phase-4/review-runtime.md`, `handoff.md`) |
| OpenAPI | `1.0.0-phase4.b` |
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

- A run is not a lead (`inventory: false`). A run outcome is not provider delivery when `providerVerified` is false.
- Pricing prompts are not qualification question sets.
- `qualification.level` stays unset; `modelReportedIntent` is model output only.
- `marketplaceConsent` stays `unchanged`.
- Synthetic questions stay visibly SYNTHETIC.
- Retry / due-retries invoke dial() — not pressed on this review host.
- No live calls/messages, merge, deployment or acceptance claim.
