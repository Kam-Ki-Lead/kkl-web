# Phase 3 frontend integration — handoff

Start here for the real-backend run. This directory is the frontend record
of that run. It does not revise the Phase 2 sample-service handoff in
`docs/phase-2/`.

| Document | What it answers |
|---|---|
| **[integration-verification.md](integration-verification.md)** | The `611bca9` run against backend `abf89fc`, then the domain switches, the admin-queue check, the builder inbox, the owner listing draft, the photograph-eligibility check at `f0eb675` against backend `a8d9b1a`, the inspection at `d9fe279` that those admin routes were unpublished, the wiring at `eaab830` against backend `3b4cbda` / OpenAPI `1.0.0-phase3.n`, the capability and unread-count correction at `3912c3d`, the builder draft and seller profile save at `5c99b26`, the configuration-price and account-name correction at `978f4e6`, the project range, billing, and separate account-name check at `2dc98fc` against backend `a802bb4` / OpenAPI `1.0.0-phase3.o`, the shortlist, requirement-location, and listing-word check at `4334601`, the guest-shortlist, listing-count, and draft-delete check at `4b0db0a`, the header-state, alert-control, and draft-delete confirmation at `891e8bd`, and the unsigned-delete sign-in check at `1de518a`, including the later action-level session check, against the review API on `94fa614` / OpenAPI `1.0.0-phase3.p`, recorded separately from the earlier `1.0.0-phase3.o` evidence, and the seller and builder alert-preference save at `409ba40` against the review API on `64cbc93` / OpenAPI `1.0.0-phase3.q`, the provisional pricing editor at `20bc990`, the settled-credit preview at `db90ccd`, and the separate unsold-lead application at `cb2eb41`, against the review API on `d527835` / OpenAPI `1.0.0-phase3.r`, and the published impact and apply routes at `62d5388` against the review API on `f6bd666` / OpenAPI `1.0.0-phase3.s` |

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
