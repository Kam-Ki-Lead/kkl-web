# 1. Project scope and evolution

How Kaam Ki Lead got from a demo that won the work to the state in chapter 11.
Each stage is dated from evidence. Where a later requirement did not exist at an
earlier stage, this chapter says so rather than reading it backwards.

## 1.1 The stages, with their evidence

| Stage | Dates (evidenced) | Evidence |
|---|---|---|
| Client-acquisition demo | 26 Jul – 24 Aug 2026 | `bdrpl-application` commits `0aace40`…`8e144e9` |
| Three-repository plan and design briefing | 15 Sep 2026 | `kkl-web` `348ebb7`, `b5c3f9f`; `kkl-backend` `a15a508`; `kkl-voice` `349bd16` |
| Phase 1 visual work in Claude Design | between 15 and 21 Sep 2026 | `kkl-design` `5bc3512` (the export). The session itself is a gap |
| Phase 1 approval reported | 21 Sep 2026 | Prompt PRM-003; `kkl-design/README.md` |
| Phase 2 frontend implementation | 21 – 26 Sep 2026 | `kkl-web` `34079e9`…`e6ec30b` |
| Handover to Cursor/Kimi, then recovery | 23 – 27 Sep 2026 | PRM-014; see §1.7 |
| Client-review changes CR01–CR07 | 26 – 28 Sep 2026 | `kkl-web` `abf454a`…`36114f5`; `kkl-backend` `21903ba`…`bc8ab30` |

## 1.2 The demo (`bdrpl-application`)

Built before this record begins. Nine commits: a Next.js app scaffolded on
26 July, "Ship KamKiLead multi-audience platform for BDRPL" on 10 August, then a
conversational voice calling agent (Exotel + Sarvam + Anthropic) added on 23–24
August and made deployable on Render.

Its stack — Next.js, PostgreSQL via `pg` and `@electric-sql/pglite`, `jose` for
JWTs, `bcryptjs`, Tailwind — established the shape the proposal later assumed.

The opening brief was explicit about its status:

> "We won the project using this demo… The demo is a reference for workflows and
> existing ideas. It is not an approved production architecture or proof that
> any feature is complete, secure, or tested." — PRM-001

That framing mattered later. `kkl-backend/docs/demo-assessment.md` §6 recorded
that the demo enabled row-level security with no policies and connected as a
role that bypassed it — authorization was entirely hand-written application
code. That finding is what CR03's backend was built not to repeat (chapter 06).

## 1.3 The three-repository decision

PRM-001 asked for a public property portal as the primary experience and set out
the separation. The work produced four repositories on 15 September:

- **`kkl-web`** — frontend only, no database access, no authoritative logic.
- **`kkl-backend`** — REST API, schema, authorization; also the canonical
  documentation repository for the program.
- **`kkl-voice`** — a persistent voice/media service that never touches the
  database directly.
- **`kkl-design`** — added later, on 21 September, to hold the approved design
  baseline as a separate reference that implementation does not modify.

The separation is not decoration. It is asserted per-request by a deployment
guard (chapter 03 §3.5) and, for CR03, by database roles (chapter 11 §11.5).

## 1.4 Phase 1: rejected, then redone

The first prototype was built in `kkl-web` (`348ebb7`, 15 September): sitemap,
screen inventory, journeys and a clickable prototype. It was rejected the same
day:

> "Phase 1 is not approved. We are revising the design before Phase 2. The
> current prototype is useful as a workflow inventory, but its visual quality
> and interaction design are not suitable for client sign-off." — PRM-002

The instruction was to package the work for a separate design tool, not to
polish it — and specifically not to launder unresolved commercial terms into the
brief as facts:

> "Do not bake unconfirmed subscription prices, credit expiry rules, contact
> unlock rules, or verification promises into the design brief as facts."

`b5c3f9f` delivered that package and marked the prototype rejected. The
screenshots of it survive in `kkl-design/uploads/06-rejected-visual-direction.md`.

## 1.5 What is known, and not known, about the Claude Design work

**Gap.** The visual exploration happened in a Claude Design project. Its prompts
are not in the retrievable transcript.

What the artefacts show: `kkl-design` at `5bc3512` contains ten `.dc.html`
prototypes — a component and state library, a screen inventory, a visual
directions exploration, two homepage directions (one marked `(archived)`), the
approved `KKL Homepage - Portal Layout`, and Buyer, Seller, Builder and Admin
consoles. The export is named **"KKL - Screen 7 - Admin"**.

What cannot be established from the repository: how many directions were tried,
why one was chosen, or what the client saw. `kkl-design/README.md` is candid
that approval was *reported by the project owner in conversation on 21 September
2026* and that "the original written client approval is not included in this
repository".

## 1.6 Phase 2

PRM-003 (21 September) opened Phase 2 with the constraint that governs
everything after it:

> "Preserve the approved appearance and workflows. Do not redesign."

and

> "Carry forward outstanding accessibility and technical checks. Design approval
> does not mark them passed."

The order was fixed: shared foundation and homepage, then Buyer, Seller, Builder,
Admin. It was followed (chapter 05). Roughly one console per day, each followed
by a verification-and-correction prompt rather than moving straight on — a
rhythm visible in the commit history as implement → verify → record.

## 1.7 The handover, and what it actually contained

PRM-015 (27 September) reported that another agent had continued the work:

> "While you were unavailable, Kimi continued work in Cursor and pushed to:
> Repository: https://github.com/Kam-Ki-Lead/kkl-web Branch:
> claude/phase-2-frontend"

The instruction was to fetch and verify rather than assume. On inspection the
remote branch was at `537a265` — the same commit this session had last pushed.
**No commits were added by the other agent.** The audit therefore reviewed this
session's own work, and the handover changed nothing in the repository.

This is recorded because the prompt's framing ("Kimi continued work") and the
git evidence disagree, and the evidence is what this document follows. A
`stash@{0}` entry exists from that period (§1.9).

## 1.8 Scope changes, in the order they happened

Later requirements are not read backwards into earlier stages.

| When | What changed | Effect |
|---|---|---|
| 15 Sep | Public portal made the *primary* experience, not a front for the marketplace | Reordered the whole design inventory |
| 15 Sep | Phase 1 rejected on visual quality | Design moved to a separate tool and repository |
| 21 Sep | Phase 1 approved | The baseline became immutable for implementation |
| 26–27 Sep | CR01–CR07 arrive | Seven changes, four of them to already-approved scope |
| 27 Sep | CR03 requires *storage* | The only requirement that could not be met in the frontend at all; produced the backend slice |
| 28 Sep | Lead requests confirmed as needing no verification | Closed the last unconfirmed rule in the verification policy |
| 28 Sep | Type 1 identified | Closed CR06-a with no work |

**Phase 1 approval does not cover any of the CR changes.** PRM-015 stated it
directly — "Phase 1 was approved by the client… That approval does not
automatically approve later deviations or new workflows" — and
`change-register.md` carries it.

## 1.9 Uncommitted work, kept distinct from delivered work

`kkl-web` holds one stash: `stash@{0}` — *"On claude/phase-2-frontend:
audit-preserve: e-p1/e-p2 evidence + geometry at 969ae3d"*, with commits
`977d22e`, `e13d1c7` and `382e57c` as its internal objects.

It was created during the 27 September audit to preserve local evidence before
fetching, and deliberately never applied. **Nothing in it is delivered work.**
It has not been applied or dropped in producing this documentation; only its
metadata was read.
