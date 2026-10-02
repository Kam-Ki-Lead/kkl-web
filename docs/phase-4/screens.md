# Phase 4 — approved screens and contract handoffs

Authoritative inventory is `docs/phase-2/inventory.json`. Design baseline is
kkl-design `5bc3512`. Backend contracts below are OpenAPI `1.0.0-phase3.t`
(`a6d6d4d` on `claude/phase-3-backend`).

## Screens Phase 4 must connect

| Screen | Route | Role | Published staff contract today | Frontend stance |
|---|---|---|---|---|
| A-10 Lead intake | `/admin/leads/intake` | Staff | `GET /v1/leads/intake/batches` | Already on `KKL_INTAKE` — do not duplicate |
| A-11 Intake run | `/admin/leads/intake/:id` | Staff | `GET /v1/leads/intake/batches/{batchRef}` | Already on `KKL_INTAKE` |
| A-12 Leads | `/admin/leads` | Staff | **Missing** (H4-1) | `KKL_QUALIFICATION=backend` refuses; fixtures only when unset |
| A-13 Lead detail | `/admin/leads/:id` | Staff | **Missing** (H4-2) | Same; honesty copy for mapping / summary |
| A-15 Settings (questions) | `/admin/settings` | Staff | Pricing questions via `KKL_ADMIN_OPERATIONS` | Reads published prompts; **mapping not configured** |
| A-24 Voice overview | `/admin/voice` | Staff | **Missing** (H4-3). Voice-bridge stubs are not this screen | Refuse without sample fallback when switch on |
| A-25 Call detail | `/admin/voice/:id` | Staff | **Missing** (H4-4) | Same; no audio; summary ≠ verified facts |
| A-26 WhatsApp funnel | `/admin/whatsapp` | Staff | **Missing** (H4-5) | Same; queued ≠ delivered |
| A-27 Notifications | `/admin/notifications` | Staff | `GET /v1/notifications/deliveries` | Already on `KKL_NOTIFICATIONS` |
| A-28 Consent | `/admin/consent` | Staff | `GET /v1/notifications/suppressions` | Already on `KKL_ADMIN_OPERATIONS` |
| A-31 Jobs & integrations | `/admin/system` | Staff | **Missing** voice/WhatsApp recovery (H4-7) | Refuse recovery fixtures when switch on |

Marketplace `GET /v1/leads` (Seller/Builder) already returns leads without a
qualification call and with `qualification: null` on the frontend adapter.
That is not the Admin inventory.

## Voice-bridge (not Admin)

| Method | Path | Status |
|---|---|---|
| POST | `/v1/voice-bridge/calls` | `501 not_implemented` |
| GET | `/v1/voice-bridge/calls/{callId}` | `501 not_implemented` |
| POST | `/v1/voice-bridge/calls/{callId}/segments` | `501 not_implemented` |
| POST | `/v1/voice-bridge/calls/{callId}/outcome` | `501 not_implemented` |
| POST | `/v1/webhooks/exotel` | `501 not_implemented` |

kkl-web Admin **must not** call these. They are the kkl-voice → kkl-backend
boundary (H4-8 freezes schemas later).

## Exact handoff requests

### H4-1 — Staff lead inventory (A-12)

Publish a staff-paged lead list: lifecycle status (including incomplete
qualification and human-review), consent status, source, age, stable
references. Authorise staff sessions. Do not require Admin to reuse
Seller/Builder `GET /v1/leads`.

### H4-2 — Staff lead detail (A-13)

Publish staff lead detail with Q&A records and question **version**
references, consent evidence pointer, eligibility lines, incomplete /
human-review states, and call/conversation ids when present. Contact fields
absent. When `questionMapping` is not configured, say so — do not emit a
level.

### H4-3 — Staff call list (A-24)

Publish staff call volumes and a paged recent-call list (outcome, consent
label, language, duration, masked number, quiet-hour holds). Separate from
voice-bridge stubs. No dial/schedule from Admin.

### H4-4 — Staff call detail (A-25)

Publish transcript (when permitted), captured answers with timestamps,
summary labelled as generated when present, consent outcome with evidence
reference, empty-transcript state. No audio unless retention/access are
published.

### H4-5 — Staff WhatsApp journey (A-26)

Publish journey step counts and conversation list with delivery states that
distinguish queued, failed, delivered and completed. Template/provider status
included. No start-conversation control. Do not equate completion with sale
eligibility.

### H4-6 — Qualification question schema / mapping (A-15)

Pricing already publishes prompts with `questionMapping: not_configured`.
Confirm whether that schema is the qualification question catalogue, or
publish the qualification-specific schema and mapping state. Frontend will
not invent Levels 1–10.

### H4-7 — Provider failures and authorised recovery (A-31)

Publish failure records and role-gated recovery actions for voice/WhatsApp
that cannot bypass suppression or quiet hours and cannot place a live
call/message from the console. No credential fields.

### H4-8 — Voice-bridge schemas (kkl-voice)

Replace Phase 3 `501` stubs with frozen request/response schemas, auth,
idempotency and evidence validation. Admin remains a separate staff API.

## Switch

`KKL_QUALIFICATION=backend` — A-12, A-13, A-24, A-25, A-26 and voice/WhatsApp
recovery on A-31. No fixture fallback. Intake, suppressions and deliveries
keep `KKL_INTAKE`, `KKL_ADMIN_OPERATIONS`, `KKL_NOTIFICATIONS`.
