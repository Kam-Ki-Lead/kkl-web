# Phase 3 frontend integration — handoff

Start here for the real-backend run. This directory is the frontend record
of that run. It does not revise the Phase 2 sample-service handoff in
`docs/phase-2/`.

| Document | What it answers |
|---|---|
| **[integration-verification.md](integration-verification.md)** | The `611bca9` run against backend `abf89fc`, and a later section for the remaining domain switches on the same process |

## Older records stay on their own revisions

The backend checklist and the slice verification files live in
`kkl-backend/docs/phase-3/`. At backend `abf89fce39f6f38a689fccc352391bcae9bef0d7`
that checklist still names `kkl-web` `e1b57c8` and browser figures against
`7b5a01b`. `verification-slice-*.md` and `verification-commerce.md` name the
revisions they were written for. This directory does not rewrite them.

`kkl-backend/docs/phase-3/integration.md` at that same commit lists the older
domain switches and omits `KKL_AUTH`, `KKL_STAFF_ORDERS`, and `KKL_INTAKE`.
The settings this run actually used are in
[integration-verification.md](integration-verification.md). An omitted switch
was not treated as enabled.
