# 11. Current status and outstanding work

A dated snapshot: **28 September 2026**, `kkl-web` `36114f5`, `kkl-backend`
`bc8ab30`. No schedule estimates appear here, because none has been agreed.

## 11.1 Status by dimension

These are separate questions and are not collapsed into one.

| Dimension | Status | Basis |
|---|---|---|
| **Original Phase 2 frontend scope** | Implemented; four exceptions open | 113 inventory rows implemented; E-P1, E-P2a, E-P2b, E-P3 await a decision |
| **Client-change implementation (CR01–CR07)** | CR01–CR05, CR07 implemented; CR06-a complete; CR06-b in progress | chapter 09 |
| **Owner / client acceptance** | **Not given, and not requested** | No acceptance is recorded anywhere. Six instructions authorize specific workflows; none is acceptance of the build |
| **Manual verification** | Partial | Chapter 07 §7.6: real assistive technology, Firefox text zoom, real High Contrast, photograph fidelity |
| **Asset dependencies** | Two open | Licensed photography (E-P3); the authoritative logo file (CR06-b) |
| **Backend / API dependencies** | One domain built, the rest not | CR03 persists; authentication, payments, KYC providers, media, notifications, voice unbuilt |
| **Deployment readiness** | **Not ready** | §11.6 |

## 11.2 Frontend exceptions still open

| ID | What | Decision needed | Whose |
|---|---|---|---|
| E-P1 | Browser Back leaves the listing editor without the custom dialog. Forward restores unsaved edits with a notice; nothing is ever silently saved | Accept the behaviour, or fund the Next 16 Cache Components route and its four named costs | Client, or the designer who specified B-15 |
| E-P2a | Focus indicator gains a 1 px ink companion edge (2.11:1 → 17.63:1) | Keep it, or name another remedy | Designer |
| E-P2b | Control border darkened `#C6CCE0` → `#8A8E9C` (1.60:1 → 3.27:1) | Keep it, or name another remedy | Designer |
| E-P3 | Review imagery draws the attribution band on every card; the approved P-01 draws it on project cards only | Confirm the treatment, or ask for it dropped now | Designer |

Both E-P2 corrections are applied and reversible in one line. What is open is
sign-off, not code. **None has been marked accepted.**

## 11.3 Waiting on the client

| Item | Blocks | Note |
|---|---|---|
| **The authoritative logo file** | CR06-b | Colour verification has not started. No colour is inferred from a screenshot |
| Owner publication terms and owner charges | CR02 past "cleared" | D-10, D-18 |
| Verification provider, expiry, consent, retention | CR07 being a compliance control | — |
| Refund eligibility and destination | Any refund control on an order | D-14 |
| Tax treatment and per-order invoicing | An issued invoice on a lead order | D-13 |
| Seller withdrawal, retention for closed lead requests | CR03's lifecycle | `kkl-backend/docs/cr03-lead-requests.md` |
| Licensed photography | E-P3, and photograph fidelity | — |
| The four exceptions in §11.2 | Phase 2 exception closure | — |

Each is a statement the screens currently decline to make, not missing frontend.

## 11.4 Platform dependencies, kept separate from frontend completion

None is frontend work or waiting on frontend work.

| Dependency | Blocks | Owner |
|---|---|---|
| **Photo storage** — object storage, virus scanning, retention | CR02 showing a real photograph to an owner or reviewer | kkl-backend |
| **Payments** — provider, settlement, reconciliation, tax | CR04 taking real money, issuing a real invoice | kkl-backend + a client decision |
| **Identity-provider integration** — provider, consent, retention, and the authenticator | CR07 being a compliance control; CR03 being authenticated | kkl-backend + the client's compliance adviser |
| **Publication policy** | CR02's journey past "cleared" | Client decision |

## 11.5 The authentication boundary

The single most important thing not to overstate.

**Real:** *authorization*. Given an identity, PostgreSQL confines it. `kkl_app`
does not own the tables, is not a superuser and has `NOBYPASSRLS`; tables have
`FORCE ROW LEVEL SECURITY`; identity reaches the policies through transaction-
scoped `SET LOCAL`, read from the session row and never from the request. A test
that bypasses the handlers entirely asserts it.

**Not built:** *authentication*. Today `POST /v1/dev/sessions` issues a session
to whoever holds a shared secret — an identity **issuer**, not a **verifier**.
There is no password, no OTP, no possession check. It is not weak
authentication that a longer secret would harden; there is no authentication
step to harden.

The persistence and RLS suites establish that a *given* identity is confined
correctly and durably. They say nothing about how that identity was obtained.
The sentence to use is in `docs/phase-2/cr03-authentication-boundary.md` §5, and
anything shorter overstates it.

Six things production needs first: a real authenticator (mobile OTP with rate
limiting); retirement of the development authenticator; httpOnly/secure session
cookies with refresh; per-request identity from the signed-in user rather than a
process-level cache; real staff accounts (D-16); and secrets in a secret store.

## 11.6 Why this is not deployment-ready

Independent of anything else:

1. **No authentication** (§11.5).
2. **No API client.** `getServices()` throws for `dataSource=api`, so an
   `api`-mode production build cannot be produced.
3. **A production+sample deployment is refused by design** — correctly, because
   sample mode simulates authentication, payment and contact reveal.
4. **Twelve of thirteen sample stores are process memory.** Balances, orders,
   owner drafts and verification cases are lost on restart and shared by every
   browser that touches the process.
5. **No live service exists.** No OTP, payment, notification or verification
   provider is contacted anywhere.

## 11.7 Contradictions found while writing this, and not fixed

PRM-020 asked for discrepancies to be described rather than tidied away. Four
were found. **None has been changed.**

| # | Contradiction | Where | Assessment |
|---|---|---|---|
| 1 | `owner-review.md` header says "Implementation: `5c3a658`", 21 commits behind `36114f5` | `docs/phase-2/owner-review.md` | Partly addressed at `36114f5` by scoping §5 to the Phase 2 exceptions, but the header line still names `5c3a658` without qualification. The exception evidence it describes *is* from that commit, so the line is not wrong — it is incomplete |
| 2 | `implementation-checklist.md` and `coverage.md` predate the CR work and do not mention the 19 CR screens | `docs/phase-2/` | They describe the 113-row Phase 2 scope accurately. A reader could mistake them for current coverage; `cr-implementation-verification.md` is the CR record |
| 3 | `verification.md` records Phase 2 suite results without the CR-era figures | `docs/phase-2/verification.md` | Same shape as #2. The two records are consistent with each other but neither is a single current picture; chapter 07 §7.2 is the first place all results appear with their commits |
| 4 | The session's own task list shows 57 tasks, all "completed", including tasks whose subject matter is still open (e.g. "Phase 2 frontend handoff pack") | session tooling, not a repository file | "Completed" there means the work item was finished, not that the underlying question is resolved. It is not an acceptance record and should not be read as one |

## 11.8 What a reader should take from this package

Two sentences, if only two are read:

> Kaam Ki Lead has a complete, verified frontend for six audiences over sample
> services, one genuinely persistent and account-isolated backend domain, and a
> documented set of decisions and dependencies that are explicit about what has
> not been decided.

> Nothing here has been accepted by anyone, authentication does not exist, and
> the parts that are sample say so on screen.
