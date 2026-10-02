# Phase 4 — screens and H4 map (OpenAPI 1.0.0-phase4.c)

Backend process: `claude/phase-4-qualification` @ **`d4c2532`** on
`http://127.0.0.1:4011`. Voice **`52abd00`**. Live calls/messages off.

## H4-1 … H4-8

| Id | Status | Classification | Evidence |
|---|---|---|---|
| H4-1 Staff lead inventory | **verified** | browser-verified | Filters, pagination, past-end, seller denial on `d4c2532` |
| H4-2 Staff lead detail | **verified** | browser-verified | Level unset; run path → Admin UI |
| H4-3 Call / run list | **verified** | browser-verified | `inventory: false`, SYNTHETIC, not_configured |
| H4-4 Run detail | **verified** | browser-verified | Level unset; capabilities; review/resume UI |
| H4-5 WhatsApp runs | **verified** | browser-verified | No delivery claim from fixtures |
| H4-6 Question sets / window / opt-out | **verified** | browser-verified | Provenance; saved vs form |
| H4-7 Review + resume | **verified** | browser-verified | Completed + incomplete review; interrupted resume; suppressed 409 |
| H4-7 Retry | — | locally simulated (backend) | **Not** clicked on shared review host |
| H4-8 Voice-bridge | **partial** | Admin boundary browser-verified; schema freeze awaiting | Admin never calls `/v1/voice-bridge` |

Awaiting client input: real question set, Level 1–10 mapping, client calling hours, Meta intake scope.
Awaiting live-provider verification: Exotel / Sarvam / WhatsApp.

## Staff phones

| Phone | Use |
|---|---|
| `+919800004010` | Primary staff fixture (may be OTP daily-limited) |
| `+919800004030` | Phase 4 browser staff (used for this verification) |
| `+919800004011` | Seller denial |

## Honesty

- Level unset / mapping not configured
- `marketplaceConsent` unchanged
- Resume never dispatches under this contract
- `dispatched:true` is reported, not “refused” by the frontend after the fact
- Retry not pressed on this host
