# Phase 4 frontend integration — handoff

Start here for qualification, calling and WhatsApp Admin work on
`claude/phase-2-frontend`. This directory is the frontend record of that run.

| Document | What it answers |
|---|---|
| **[screens.md](screens.md)** | Approved screens, H4-1…H4-8 status against OpenAPI `1.0.0-phase4.c` |
| **[integration-verification.md](integration-verification.md)** | Checks for this frontend revision against **`d4c2532`** |
| **[mutation-browser-evidence.json](mutation-browser-evidence.json)** | Before/after fixture states from browser verification |

## Contract in force

| | |
|---|---|
| Backend branch | `claude/phase-4-qualification` |
| Backend commit (process) | **`d4c2532`** |
| Voice | **`52abd00`** |
| OpenAPI | `1.0.0-phase4.c` |
| Migration | `026_qualification.sql` |
| Review URL | `http://127.0.0.1:4011` (`kkl_phase4`) |
| Phase 3 (unchanged) | `http://127.0.0.1:4010` (`kkl_review`) |

Do not cite `e7ffdb6` as the revision for checks performed against this process.

## Frontend switches

```
KKL_AUTH=backend
KKL_QUALIFICATION=backend
KKL_BACKEND_BASE_URL=http://127.0.0.1:4011
KKL_LEAD_REQUESTS_BASE_URL=http://127.0.0.1:4011
```

Leave `KKL_ALLOW_LIVE_CALLS` and `KKL_ALLOW_LIVE_MESSAGING` unset.

## Rules

- Staff inventory is `GET /v1/admin/qualification/leads` (`inventory: true`).
- `configured: false` means unset; `staff_saved` is not client-approved.
- Resume never dispatches. Retry follows capabilities; **do not click retry** on the shared review host.
- `providerDispatch.dispatched: true` cannot be undone by the frontend — report the returned result.
- Keep `synthetic:true` / `providerVerified:false` visible where relevant.
- No live calls/messages, merge, deployment or acceptance claim.
