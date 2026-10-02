# Phase 4 frontend integration — handoff

Start here for qualification, calling and WhatsApp Admin work on
`claude/phase-2-frontend`. This directory is the frontend record of that run.

| Document | What it answers |
|---|---|
| **[screens.md](screens.md)** | Approved screens, H4-1…H4-8 status against OpenAPI `1.0.0-phase4.a` |
| **[integration-verification.md](integration-verification.md)** | Checks for this frontend revision |

## Contract in force

| | |
|---|---|
| Backend branch | `claude/phase-4-qualification` |
| Backend commit | `a606665` |
| OpenAPI | `1.0.0-phase4.a` |
| Migration | `026_qualification.sql` |
| Frontend base before Phase 4 prep | `02687ea` (records purchase confirmation for frontend `16afab5`) |
| Earlier Phase 4 prep | `dc2f275` / `6acfc2f` (consulted Phase 3 OpenAPI `1.0.0-phase3.t` @ backend `a6d6d4d`) |

## Rules

- A run is not a lead. A run outcome is not provider delivery when `providerVerified` is false.
- Pricing prompts are not qualification question sets.
- `qualification.level` stays unset; `modelReportedIntent` is model output only.
- `marketplaceConsent` stays `unchanged`.
- Synthetic questions stay visibly SYNTHETIC.
- No live calls/messages, merge, deployment or acceptance claim.
