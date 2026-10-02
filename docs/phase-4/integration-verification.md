# Phase 4 integration — verification record

Continued **2 October 2026** on `kkl-web` `claude/phase-2-frontend` against
the Phase 4 review process **`d4c2532`** (not `e7ffdb6`). This is not a live
provider integration claim and not client acceptance.

## Revisions

| | |
|---|---|
| Frontend (this pass) | `4473dd2` |
| Prior staff inventory wiring | `2fe8c37` / `8f42855` (against `e7ffdb6` then) |
| Prior phase4.b verification | `e91a2dc` / `16a5efb` |
| Backend process (these checks) | **`d4c2532`** on `http://127.0.0.1:4011` |
| Voice | **`52abd00`** |
| Runtime handoff docs | review-runtime / handoff on the same process |
| OpenAPI | `1.0.0-phase4.c` |
| Migration | `026_qualification.sql` on `kkl_phase4` |
| Phase 3 | left on `4010` / `kkl_review` |
| Geometry | `docs/phase-2/visual/geometry-1440.json` left unstaged |

## Configuration

| Name | Value |
|---|---|
| `KKL_AUTH` | `backend` |
| `KKL_QUALIFICATION` | `backend` |
| `KKL_BACKEND_BASE_URL` | `http://127.0.0.1:4011` |
| Live calls / messaging | unset / disabled (`providerVerified` false) |

Frontend on **3812**. Staff browser identity: **`+919800004030`** (Phase 4
browser staff). `+919800004010` remains daily OTP-limited; no OTP bypass.

## Mutation fixtures (already present — not reseeded)

| Key | UUID | Before → After |
|---|---|---|
| completed `QUAL-69c430f2` | `b876037e-758c-4db4-ba86-fa97017d0286` | completed/pending → completed/**recorded** (`facts_recorded`) |
| incomplete `QUAL-53e12f64` | `b4ee4402-e94a-4bf8-bafb-2fd6292a574d` | incomplete/pending/`partial_answers` → incomplete/**recorded** (`needs_follow_up`) |
| interrupted `QUAL-960ac12c` | `4498f44b-1a19-453c-924a-3fb0722d4f75` | incomplete/pending/`interrupted` → **collecting**/pending; resume `not_resumable`; **no** `providerDispatch.dispatched` |
| suppressed `QUAL-8f50bc26` | `ee7883aa-61bd-49f2-9aad-8c002bd1189d` | opted_out unchanged; recover resume → **409** `suppression_in_force` |

Evidence JSON: `docs/phase-4/mutation-browser-evidence.json`.

## Browser / API evidence (this pass on `d4c2532`)

| Check | Result |
|---|---|
| Staff inventory `inventory:true`, filters, past-end | **PASS** |
| Staff lead detail → run path | **PASS** |
| Completed-run review save + reload | **PASS** |
| Incomplete-run review (`needs_follow_up`) | **PASS** |
| Interrupted resume → collecting, no dispatch | **PASS** (API after-state; retry not clicked) |
| Suppressed recovery refusal (UI + 409) | **PASS** |
| Seller denied inventory | **PASS** |
| Missing session → auth | **PASS** |
| 4011 ≠ 4010; `liveTelephony`/`providerVerified` false | **PASS** |
| Retry on shared host | **Not clicked** (isolated backend coverage only) |

Scripts: `verify-phase4-mutations.mjs` (primary) +
`verify-phase4-mutations-finish.mjs` (suppressed/seller/after-state).

## Dispatch reporting fix

Post-response throws that described `dispatched:true` as a frontend refusal
were removed. Pre-flight capability gates remain. If the server returns
`dispatched:true`, the returned payload is reported; the frontend cannot undo
it. No `dispatched:true` was observed on this host. Keep `synthetic:true` /
`providerVerified:false` visible when present.

## Checks run (offline)

| Check | Result |
|---|---|
| `npm test` | **PASS** (117) |
| `npx tsc --noEmit` | **PASS** |
| `npx next build` | **PASS** |
| Mutation browser suite | **PASS** (primary + finish) |
| Live Exotel / WhatsApp / Sarvam | **Not exercised** |

## H4 matrix (per operation)

| Id | Operation | Classification |
|---|---|---|
| H4-1 | Staff lead inventory GET + filters/pagination | **browser-verified** on `d4c2532` |
| H4-2 | Staff lead detail + run links | **browser-verified** |
| H4-3 | Voice run list | **browser-verified** (prior + inventory honesty) |
| H4-4 | Run detail / transcript / level unset | **browser-verified** |
| H4-5 | WhatsApp run list honesty | **browser-verified** (prior; unchanged contract) |
| H4-6 | Question sets / window / opt-out provenance | **browser-verified** (prior save/reload; GET `staff_saved` on this host) |
| H4-7 | Review save | **browser-verified** (completed + incomplete fixtures) |
| H4-7 | Resume | **browser-verified** (interrupted → collecting, no dispatch) |
| H4-7 | Suppressed recover refusal | **browser-verified** |
| H4-7 | Start-run effect / dispatch fields | **browser-verified** earlier; still accurate on this host |
| H4-7 | Retry | **locally simulated integration** on backend only — **not** browser-clicked here |
| H4-8 | Voice-bridge Admin boundary | **browser-verified** (Admin does not call); bridge schema freeze **awaiting** |
| — | Client question set / Level 1–10 mapping | **awaiting client input** |
| — | Client calling hours (not fixture `staff_saved`) | **awaiting client input** |
| — | Live Exotel / Sarvam / WhatsApp | **awaiting live-provider verification** |
| — | Meta Instant Form intake | **awaiting client input** (`pending_scope_authorisation`) |

Synthetic fixtures and UI verification are not a completed live Phase 4
provider integration.
