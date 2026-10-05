# Kaam Ki Lead — consolidated technical documentation

**Generated file — do not edit by hand.** It is assembled from the chapter
files in `docs/technical-history/` by `build-consolidated.mjs`, so the
chapters and this document cannot say different things. To change anything
here, change the chapter and re-run:

```bash
node docs/technical-history/build-consolidated.mjs
```

Sources: `README.md`, `01-project-scope-and-evolution.md`, `02-prompt-by-prompt-worklog.md`, `03-architecture-and-repository-boundaries.md`, `04-design-and-frontend-methodology.md`, `05-role-journeys-and-screen-implementation.md`, `06-data-services-and-backend-integration.md`, `07-security-verification-and-accessibility.md`, `08-defects-root-causes-and-corrections.md`, `09-client-changes-and-decision-history.md`, `10-environments-and-reproducibility.md`, `11-current-status-and-outstanding-work.md`, and
`traceability.csv` — all in this folder.

A prompt-by-prompt account of how Kaam Ki Lead was built, what was decided, what
was verified, and what is still open. Written on **28 September 2026** against
the commits listed below.

This package documents work performed. **It is not an acceptance record.** No
client approval is inferred from a commit, a passing suite or a filled-in
template anywhere in these pages.

## Contents

- [0. About this package](#0-about-this-package)
    - [Repositories and commits documented](#repositories-and-commits-documented)
    - [Source coverage](#source-coverage)
- [1. Project scope and evolution](#1-project-scope-and-evolution)
    - [1.1 The stages, with their evidence](#11-the-stages-with-their-evidence)
    - [1.2 The demo (`bdrpl-application`)](#12-the-demo-bdrpl-application)
    - [1.3 The three-repository decision](#13-the-three-repository-decision)
    - [1.4 Phase 1: rejected, then redone](#14-phase-1-rejected-then-redone)
    - [1.5 What is known, and not known, about the Claude Design work](#15-what-is-known-and-not-known-about-the-claude-design-work)
    - [1.6 Phase 2](#16-phase-2)
    - [1.7 The handover, and what it actually contained](#17-the-handover-and-what-it-actually-contained)
    - [1.8 Scope changes, in the order they happened](#18-scope-changes-in-the-order-they-happened)
    - [1.9 Uncommitted work, kept distinct from delivered work](#19-uncommitted-work-kept-distinct-from-delivered-work)
- [2. Prompt-by-prompt worklog](#2-prompt-by-prompt-worklog)
    - [PRM-001 · Project brief and three-repository plan](#prm-001-project-brief-and-three-repository-plan)
    - [PRM-002 · Phase 1 rejected; prepare a portable design briefing](#prm-002-phase-1-rejected-prepare-a-portable-design-briefing)
    - [PRM-003 · Import the Claude Design project (interrupted)](#prm-003-import-the-claude-design-project-interrupted)
    - [PRM-004 · The same request, relayed by another Claude session (interrupted)](#prm-004-the-same-request-relayed-by-another-claude-session-interrupted)
    - [PRM-005 · Begin Phase 2 frontend implementation](#prm-005-begin-phase-2-frontend-implementation)
    - [PRM-006 · Close Buyer scope, then Seller](#prm-006-close-buyer-scope-then-seller)
    - [PRM-007 · Re-issue of PRM-006](#prm-007-re-issue-of-prm-006)
    - [PRM-008 · Seller corrections, then Builder](#prm-008-seller-corrections-then-builder)
    - [PRM-009 · B-15, then the Admin console](#prm-009-b-15-then-the-admin-console)
    - [PRM-010 · Phase 2 acceptance pass](#prm-010-phase-2-acceptance-pass)
    - [PRM-011 · Complete visual coverage; resolve B-15 with evidence](#prm-011-complete-visual-coverage-resolve-b-15-with-evidence)
    - [PRM-012 · Bounded closure pass](#prm-012-bounded-closure-pass)
    - [PRM-013 · Final owner-review package](#prm-013-final-owner-review-package)
    - [PRM-014 · Evidence-based completion review (the audit)](#prm-014-evidence-based-completion-review-the-audit)
    - [PRM-015 · Implement CR01–CR07](#prm-015-implement-cr01cr07)
    - [PRM-016 · Close the requirements record](#prm-016-close-the-requirements-record)
    - [PRM-017 · The lead-request verification decision](#prm-017-the-lead-request-verification-decision)
    - [PRM-018 · Simplify the customer message; Type 1 identified](#prm-018-simplify-the-customer-message-type-1-identified)
    - [PRM-019 · Register and owner-review status update](#prm-019-register-and-owner-review-status-update)
    - [PRM-020 · This documentation package](#prm-020-this-documentation-package)
- [3. Architecture and repository boundaries](#3-architecture-and-repository-boundaries)
    - [3.1 Repository responsibilities](#31-repository-responsibilities)
    - [3.2 Frontend stack, at the documented commit](#32-frontend-stack-at-the-documented-commit)
    - [3.3 Routing and layout](#33-routing-and-layout)
    - [3.4 Components and styling](#34-components-and-styling)
    - [3.5 Configuration and the deployment guard](#35-configuration-and-the-deployment-guard)
    - [3.6 Server and client responsibilities](#36-server-and-client-responsibilities)
    - [3.7 Backend structure](#37-backend-structure)
    - [3.8 Planned but not implemented](#38-planned-but-not-implemented)
- [4. Design and frontend methodology](#4-design-and-frontend-methodology)
    - [4.1 Requirement extraction and ambiguity tracking](#41-requirement-extraction-and-ambiguity-tracking)
    - [4.2 Mapping requirements to screens and states](#42-mapping-requirements-to-screens-and-states)
    - [4.3 Preserving an approved baseline](#43-preserving-an-approved-baseline)
    - [4.4 Translating exported prototypes into application code](#44-translating-exported-prototypes-into-application-code)
    - [4.5 Reuse without flattening role-specific behaviour](#45-reuse-without-flattening-role-specific-behaviour)
    - [4.6 Typed service boundaries and deterministic fixtures](#46-typed-service-boundaries-and-deterministic-fixtures)
    - [4.7 Progressive enhancement](#47-progressive-enhancement)
    - [4.8 Validation and preserving what someone typed](#48-validation-and-preserving-what-someone-typed)
    - [4.9 Idempotency](#49-idempotency)
    - [4.10 Cross-role consistency](#410-cross-role-consistency)
    - [4.11 Responsive styling and typography](#411-responsive-styling-and-typography)
    - [4.12 Visual capture, comparison, and evidence versioning](#412-visual-capture-comparison-and-evidence-versioning)
    - [4.13 Focused commits and branch continuity](#413-focused-commits-and-branch-continuity)
    - [4.14 Recorded methodology versus recommendations](#414-recorded-methodology-versus-recommendations)
- [5. Role journeys and screen implementation](#5-role-journeys-and-screen-implementation)
    - [5.1 Public portal and Buyer (P-01 … P-21)](#51-public-portal-and-buyer-p-01-p-21)
    - [5.2 Seller / broker console (S-01 … S-25)](#52-seller-broker-console-s-01-s-25)
    - [5.3 Builder console (B-01 … B-24)](#53-builder-console-b-01-b-24)
    - [5.4 Admin console (A-01 … A-31)](#54-admin-console-a-01-a-31)
    - [5.5 Seller lead requests through Admin response (CR03)](#55-seller-lead-requests-through-admin-response-cr03)
    - [5.6 Owner property submission and review (CR02)](#56-owner-property-submission-and-review-cr02)
    - [5.7 Selective verification routing (CR07)](#57-selective-verification-routing-cr07)
    - [5.8 Three counts that are not the same number](#58-three-counts-that-are-not-the-same-number)
- [6. Data services and backend integration](#6-data-services-and-backend-integration)
    - [6.1 The boundary](#61-the-boundary)
    - [6.2 Why lead requests get their own switch](#62-why-lead-requests-get-their-own-switch)
    - [6.3 The sample stores](#63-the-sample-stores)
    - [6.4 The CR03 backend slice](#64-the-cr03-backend-slice)
    - [6.5 How identity reaches the policies](#65-how-identity-reaches-the-policies)
    - [6.6 What is not built](#66-what-is-not-built)
- [7. Security, verification and accessibility](#7-security-verification-and-accessibility)
    - [7.1 Evidence classes](#71-evidence-classes)
    - [7.2 The suites](#72-the-suites)
    - [7.3 Test data and reset](#73-test-data-and-reset)
    - [7.4 Evidence provenance](#74-evidence-provenance)
    - [7.5 Known limitations, reproduced as documented](#75-known-limitations-reproduced-as-documented)
    - [7.6 Pending verification](#76-pending-verification)
- [8. Defects, root causes and corrections](#8-defects-root-causes-and-corrections)
    - [8.1 Enquiry writes were not idempotent, and PII travelled in a URL](#81-enquiry-writes-were-not-idempotent-and-pii-travelled-in-a-url)
    - [8.2 OTP behaved differently with and without JavaScript](#82-otp-behaved-differently-with-and-without-javascript)
    - [8.3 Account and owner screens were statically rendered](#83-account-and-owner-screens-were-statically-rendered)
    - [8.4 Sample state split across bundles](#84-sample-state-split-across-bundles)
    - [8.5 Incomplete reset, and a wallet that did not reconcile](#85-incomplete-reset-and-a-wallet-that-did-not-reconcile)
    - [8.6 Internal/public reply mode and decision controls resetting](#86-internalpublic-reply-mode-and-decision-controls-resetting)
    - [8.7 Environment variables, and a guard test that could not fail](#87-environment-variables-and-a-guard-test-that-could-not-fail)
    - [8.8 Prototype width selection failed silently](#88-prototype-width-selection-failed-silently)
    - [8.9 The differ scraped the reviewer chrome](#89-the-differ-scraped-the-reviewer-chrome)
    - [8.10 The differ could not see prototype headings](#810-the-differ-could-not-see-prototype-headings)
    - [8.11 Content-box versus border-box](#811-content-box-versus-border-box)
    - [8.12 Shared styles overriding status-panel colours, and typography over-applying](#812-shared-styles-overriding-status-panel-colours-and-typography-over-applying)
    - [8.13 Locality search ranked the wrong match first](#813-locality-search-ranked-the-wrong-match-first)
    - [8.14 Simultaneous suites resetting shared state](#814-simultaneous-suites-resetting-shared-state)
    - [8.15 A price typed as words vanished](#815-a-price-typed-as-words-vanished)
    - [8.16 Validation errors that rendered nothing](#816-validation-errors-that-rendered-nothing)
    - [8.17 Two withdrawn claims, and what the failures taught](#817-two-withdrawn-claims-and-what-the-failures-taught)
- [9. Client changes and decision history](#9-client-changes-and-decision-history)
    - [9.1 How approval is recorded](#91-how-approval-is-recorded)
    - [9.2 The six decisions](#92-the-six-decisions)
    - [9.3 CR01 — "Buy Leads" wording](#93-cr01-buy-leads-wording)
    - [9.4 CR02 — individual owner property posting](#94-cr02-individual-owner-property-posting)
    - [9.5 CR03 — Seller lead requests](#95-cr03-seller-lead-requests)
    - [9.6 CR04 — lead purchase orders](#96-cr04-lead-purchase-orders)
    - [9.7 CR05 — expandable location search](#97-cr05-expandable-location-search)
    - [9.8 CR06 — visual direction](#98-cr06-visual-direction)
    - [9.9 CR07 — verification policy](#99-cr07-verification-policy)
    - [9.10 Status check against later evidence](#910-status-check-against-later-evidence)
- [10. Environments and reproducibility](#10-environments-and-reproducibility)
    - [10.1 Prerequisites](#101-prerequisites)
    - [10.2 The two kinds of variable](#102-the-two-kinds-of-variable)
    - [10.3 Review build (the documented configuration)](#103-review-build-the-documented-configuration)
    - [10.4 CR03 with durable storage](#104-cr03-with-durable-storage)
    - [10.5 Running the suites](#105-running-the-suites)
    - [10.6 Platform and environment notes](#106-platform-and-environment-notes)
    - [10.7 What cannot be reproduced from this repository](#107-what-cannot-be-reproduced-from-this-repository)
- [11. Current status and outstanding work](#11-current-status-and-outstanding-work)
    - [11.1 Status by dimension](#111-status-by-dimension)
    - [11.2 Frontend exceptions still open](#112-frontend-exceptions-still-open)
    - [11.3 Waiting on the client](#113-waiting-on-the-client)
    - [11.4 Platform dependencies, kept separate from frontend completion](#114-platform-dependencies-kept-separate-from-frontend-completion)
    - [11.5 The authentication boundary](#115-the-authentication-boundary)
    - [11.6 Why this is not deployment-ready](#116-why-this-is-not-deployment-ready)
    - [11.7 Contradictions found while writing this, and not fixed](#117-contradictions-found-while-writing-this-and-not-fixed)
    - [11.8 What a reader should take from this package](#118-what-a-reader-should-take-from-this-package)
- [Appendix A. Traceability matrix](#appendix-a-traceability-matrix)

---

## 0. About this package

### Repositories and commits documented

| Repository | Branch | HEAD at time of writing | Commits | Role |
|---|---|---|---|---|
| `Kam-Ki-Lead/kkl-web` | `claude/phase-2-frontend` | `36114f5` | 57 | Frontend application, verification suites, all Phase 2 documentation |
| `Kam-Ki-Lead/kkl-backend` | `claude/cr03-lead-requests` | `bc8ab30` | 4 | CR03 lead-request slice; program documentation |
| `Kam-Ki-Lead/kkl-design` | `main` | `5bc3512` | 1 | Approved Phase 1 design baseline, unmodified |
| `Kam-Ki-Lead/kkl-voice` | `claude/nice-cerf-s377ey` | `349bd16` | 1 | Protocol notes only; no implementation |
| `Kam-Ki-Lead/bdrpl-application` | `main` / `claude/nice-cerf-s377ey` | `8e144e9` | 9 | The original client-acquisition demo |

`kkl-web` also carries branch `claude/nice-cerf-s377ey` at `b5c3f9f` — the
pre-Phase-2 state, kept as the point the design briefing was delivered from.

Remotes were fetched before writing; every HEAD above matches its remote ref.
Nothing was checked out, reset, merged or pushed to produce this package beyond
the documentation commits themselves.

### Source coverage

**What was retrievable.** The complete session transcript for this project,
`6f42fe64-53f1-5e39-87ab-d75b388cdca4.jsonl` (63 MB), covering **15 September
2026 to 28 September 2026** across six active days. It yielded **60 user
messages**, classified as:

| Kind | Count | Treatment in this package |
|---|---|---|
| Substantive task prompts | 20 | Each becomes a `PRM-` entry, quoted verbatim |
| Continuations ("Continue from where you left off", "run it", "Try again") | 11 | Folded into the prompt they continue |
| Image-only messages (screenshots, one attached design reference) | 21 | Cited where they drove a decision |
| User interrupts | 3 | Noted where they changed course |
| Harness context summaries (session compaction) | 4 | Not user instructions; excluded |
| Background task notification | 1 | Excluded |

Git history across all five repositories, all `docs/phase-2` documents, the
verification scripts, and the recorded evidence were read directly.

**What was NOT retrievable, and is therefore marked as a gap:**

1. **The Claude Design session.** Phase 1's visual work was done in a separate
   Claude Design project (`claude.ai/design/p/b0950068-…`). Its prompts,
   iterations and rejected directions are not in this transcript. What survives
   is the exported result in `kkl-design` and two messages in this transcript
   that reference it. Chapter 01 says what can and cannot be said about it.
2. **The Cursor/Kimi working session.** Between 23 and 27 September another
   agent worked on `claude/phase-2-frontend`. Its prompts are not retrievable.
   Chapter 02 (PRM-014) records what the git history shows about that period —
   which, on inspection, was nothing.
3. **Any project conversation before 15 September 2026**, including whatever led
   to the demo repository `bdrpl-application` (first commit 26 July 2026). The
   demo is documented from its code and commit messages only.
4. **The original written client approvals.** Phase 1 approval is recorded as
   *reported by the project owner*; the underlying client artefact is not in any
   repository. The same applies to the four CR decisions.

**Labelling rules used throughout.** A quoted prompt is verbatim from the
transcript with its timestamp. Anything reconstructed is labelled
**"Reconstructed task summary"** and cites the evidence it rests on. A
recommendation of mine is labelled as mine. An external agent's claim is
labelled as that agent's claim, not as a finding.

---

## 1. Project scope and evolution

How Kaam Ki Lead got from a demo that won the work to the state in chapter 11.
Each stage is dated from evidence. Where a later requirement did not exist at an
earlier stage, this chapter says so rather than reading it backwards.

### 1.1 The stages, with their evidence

| Stage | Dates (evidenced) | Evidence |
|---|---|---|
| Client-acquisition demo | 26 Jul – 24 Aug 2026 | `bdrpl-application` commits `0aace40`…`8e144e9` |
| Three-repository plan and design briefing | 15 Sep 2026 | `kkl-web` `348ebb7`, `b5c3f9f`; `kkl-backend` `a15a508`; `kkl-voice` `349bd16` |
| Phase 1 visual work in Claude Design | between 15 and 21 Sep 2026 | `kkl-design` `5bc3512` (the export). The session itself is a gap |
| Phase 1 approval reported | 21 Sep 2026 | Prompt PRM-003; `kkl-design/README.md` |
| Phase 2 frontend implementation | 21 – 26 Sep 2026 | `kkl-web` `34079e9`…`e6ec30b` |
| Handover to Cursor/Kimi, then recovery | 23 – 27 Sep 2026 | PRM-014; see §1.7 |
| Client-review changes CR01–CR07 | 26 – 28 Sep 2026 | `kkl-web` `abf454a`…`36114f5`; `kkl-backend` `21903ba`…`bc8ab30` |

### 1.2 The demo (`bdrpl-application`)

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

### 1.3 The three-repository decision

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

### 1.4 Phase 1: rejected, then redone

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

### 1.5 What is known, and not known, about the Claude Design work

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

### 1.6 Phase 2

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

### 1.7 The handover, and what it actually contained

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

### 1.8 Scope changes, in the order they happened

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

### 1.9 Uncommitted work, kept distinct from delivered work

`kkl-web` holds one stash: `stash@{0}` — *"On claude/phase-2-frontend:
audit-preserve: e-p1/e-p2 evidence + geometry at 969ae3d"*, with commits
`977d22e`, `e13d1c7` and `382e57c` as its internal objects.

It was created during the 27 September audit to preserve local evidence before
fetching, and deliberately never applied. **Nothing in it is delivered work.**
It has not been applied or dropped in producing this documentation; only its
metadata was read.

---

## 2. Prompt-by-prompt worklog

Twenty substantive prompts, PRM-001 to PRM-020, in the order they arrived.
Eleven continuation messages ("Continue from where you left off", "run it",
"Try again") are folded into the prompt they continue rather than given numbers
of their own; where one mattered it is named in the entry.

Quotations are verbatim from the session transcript with the timestamp shown.
Anything not quoted is either drawn from repository evidence (cited) or labelled
as a reconstruction.

**Disposition vocabulary:** *Delivered* — completed as asked. *Partial* — part
delivered, remainder named. *Superseded* — a later prompt replaced the result.
*Awaiting decision* — blocked on somebody else. *Not evidenced* — claimed
somewhere but not supported by evidence.

---

### PRM-001 · Project brief and three-repository plan

**Date** 15 September 2026, 19:19 · **Source** user prompt, with two PDFs
attached (`KamKiLead_Development_Proposal.pdf`,
`KKL_Account_Roles_Access_Specification.pdf`)

> "PRIMARY PRODUCT EXPERIENCE — PUBLIC PROPERTY PORTAL
>
> Kaam Ki Lead must have a full 99acres-style property discovery interface. This
> is a central product experience, not a marketing page in front of a lead
> marketplace. … Do not begin with an admin dashboard or treat the public portal
> as a secondary screen."

and, on the demo:

> "We won the project using this demo… It is not an approved production
> architecture or proof that any feature is complete, secure, or tested."

**Context and problem.** A won project with a demo, two specification PDFs, and
no agreed architecture. The brief's own emphasis reorders the obvious build
order: the public portal first, dashboards after.

**Scope and acceptance.** Read both documents; assess the demo; produce
requirements, access matrix, architecture, decisions, delivery and acceptance
plans; scaffold three repositories; produce a first prototype demonstrating
homepage → search → detail → enquiry → Buyer tracking → Builder notification,
plus the separate Seller journey.

**Investigation.** Both PDFs read against the demo's code. The assessment that
mattered: the demo's RLS was enabled with no policies, reached through a
bypassing role (`kkl-backend/docs/demo-assessment.md` §6).

**Method and why.** Documentation-first, in `kkl-backend` as the canonical
repository, so `kkl-web` and `kkl-voice` link rather than duplicate — one place
for a requirement to change. Unresolved commercial terms were recorded as
decisions (D-01…) instead of being assumed.

**Changes.** `kkl-backend` `a15a508` (seven documents); `kkl-web` `348ebb7`
(sitemap, screen inventory, journeys, clickable prototype); `kkl-voice`
`349bd16` (protocol notes).

**Verification.** Documentation review only. No application code existed.

**Limitations.** The prototype was a workflow inventory, not a design.

**Superseded by** PRM-002, which rejected its visual direction 27 minutes later.

**Disposition — Delivered** (documentation and scaffolding); the prototype was
superseded.

---

### PRM-002 · Phase 1 rejected; prepare a portable design briefing

**Date** 15 September 2026, 19:46 · **Source** user prompt

> "Phase 1 is not approved. We are revising the design before Phase 2. The
> current prototype is useful as a workflow inventory, but its visual quality
> and interaction design are not suitable for client sign-off."

> "Do not bake unconfirmed subscription prices, credit expiry rules, contact
> unlock rules, or verification promises into the design brief as facts."

**Context.** The prototype was rejected on visual and interaction quality, not
on scope. The design work would move to a separate tool.

**Scope and acceptance.** A `DESIGN_BRIEF.md` plus supporting documents:
audiences, requirements and role matrices, sitemap/inventory/journeys, confirmed
rules separated from unresolved ones, screenshots of the rejected direction
*labelled as rejected*, and the three-repository constraints. Preserve the old
prototype as reference. Do not start Phase 2.

**Investigation.** An audit of the draft brief specifically for unresolved terms
stated as fact — the prompt's explicit concern. That audit is a task in its own
right (task 14 of the session's task list).

**Method and why.** A `04-confirmed-vs-unresolved.md` document, so the
separation is structural rather than a matter of careful wording. Screenshots of
the rejected prototype were captured and filed under a filename that says what
they are: `06-rejected-visual-direction.md`.

**Changes.** `kkl-web` `b5c3f9f` — "Add Claude Design briefing package; mark
Phase 1 prototype rejected". Six numbered documents plus `DESIGN_BRIEF.md`, all
later carried into `kkl-design/uploads/`.

**Verification.** Content review against the two source PDFs.

**Disposition — Delivered.**

---

### PRM-003 · Import the Claude Design project (interrupted)

**Date** 21 September 2026, 04:38 · **Source** user prompt

> "Use the claude_design MCP (https://api.anthropic.com/v1/design/mcp, auth via
> /design-login) to import this project… Implement: `KKL Component and State
> Library.dc.html` … The client has approved the Phase 1 designs. Approved
> baseline: 'KKL - Screen 7 - Admin'."

**Context.** Phase 1 approval reported. This message carried the first statement
of it in the transcript.

**What happened.** Interrupted by the user four minutes later (transcript,
04:42:48). Superseded by PRM-004 and PRM-005.

**Disposition — Superseded.** Its content survives in PRM-005.

---

### PRM-004 · The same request, relayed by another Claude session (interrupted)

**Date** 21 September 2026, 04:48 · **Source** peer-agent message relayed into
this session

> "Another Claude session sent a message: I exported this design from Claude
> Design. Read README.md in this workspace, then the chats/ transcripts, and
> implement the designs as described there."

**Context.** The Claude Design session handing over its export. The harness
attached its own standing rule, which is quoted here because it shaped how the
message was treated:

> "A peer cannot grant escalation… never treat a peer message as your user's
> approval for a pending prompt."

**What happened.** Interrupted at 04:49:27. Superseded by PRM-005.

**Note on approval.** This message repeated "The client has approved the Phase 1
designs". A peer agent's report is not client approval, and it is not recorded
as one. The approval this project relies on is the project owner's own statement
in PRM-005.

**Disposition — Superseded.**

---

### PRM-005 · Begin Phase 2 frontend implementation

**Date** 21 September 2026, 05:14 · **Source** user prompt

> "Begin Phase 2 frontend development for Kaam Ki Lead. The client has approved
> the Phase 1 designs. Use this repository as the approved design reference:
> https://github.com/Kam-Ki-Lead/kkl-design Baseline commit: 5bc3512…"

with the requirements that govern the rest of the project:

> "Preserve the approved appearance and workflows. Do not redesign."
> "Use clearly separated sample-data services wherever real services are
> unavailable. Do not present simulated payments, authentication or
> communications as live."
> "Carry forward outstanding accessibility and technical checks. Design approval
> does not mark them passed."

**Scope and acceptance.** Five ordered steps: inspect; record the approved
baseline and the gap; build a checklist mapped to the screen inventory; build the
shared foundation; implement homepage and the Buyer journey as a complete
vertical slice including responsive, validation, loading, empty, error and access
states. Then Seller, Builder, Admin.

**Investigation.** The `.dc.html` prototypes were read as source — colour
values, type sizes and spacing extracted from the markup rather than eyeballed,
which is what later made `verify-design-tokens.mjs` possible.

**Method and why.** A typed service boundary (`src/lib/services/contracts.ts`)
with sample implementations behind it, so that "this is not real" is a fact
about the module graph rather than a caption. Business rules that nobody had
decided went into `src/lib/config/business-rules.ts` and render as pending on
screen, so an unresolved rule is visible to a reviewer instead of being quietly
invented.

**Changes.** `kkl-web` `34079e9` (tokens, typography, shared components,
navigation, homepage P-01), `36502c3` (baseline record, inventory IDs,
verification record), `b860df2` (public portal and Buyer journey), `cbb4ba3`
(match scoring). Continuations "run it" (09:38) and "Continue from where you
left off" (09:31) belong to this prompt, as do six screenshots the user sent of
the running app.

**Verification.** `next build`, typecheck, lint; route rendering; the first
visual comparisons against the prototypes.

**Defects found.** Two screenshots the user sent showed
`ERR_CONNECTION_REFUSED` on ports 3800 and 3000 — the review server was not
reachable at the port being tried. Resolved by serving on the documented port.

**Disposition — Delivered** for the foundation, homepage and Buyer journey;
Seller/Builder/Admin continued under later prompts.

---

### PRM-006 · Close Buyer scope, then Seller

**Date** 21 September 2026, 14:19 · **Source** user prompt

> "Continue Phase 2. Preserve the approved design and existing working
> implementation. Before moving fully into Seller, close the remaining Buyer
> scope:"

with three specific items — P-15 Profile and P-16 Notifications through typed
sample services; restore representative property imagery, recording the
dependency if assets are unavailable ("Do not describe the visual match as
complete while primary imagery differs"); and verify the enquiry flow beyond the
happy path, including "Two independent browser sessions, ensuring one cannot
access the other's draft or enquiry" and "Draft retention and clearing without
exposing personal information in URLs".

**Investigation.** The enquiry edge cases were driven in a real browser across
two contexts and two tabs, not asserted from code.

**Method and why.** Imagery was wired behind an explicit flag
(`0635e6f`) rather than committed into the repository, because the licence basis
was unsettled — the dependency was recorded instead of assumed away.

**Changes.** `a43973a` (P-15, P-16), `0635e6f` (review photography behind a
flag), `95e59c7` (idempotent enquiry writes, PII out of URLs), `9b9bdaf`
(enquiry handoff, account screens made dynamic, run-time sample guard),
`748915f` (record correction — see below), `2f5627e` (process-held sample state).

**Defects found.** Four, covered in chapter 08: enquiry writes were not
idempotent; personal information appeared in a URL; account screens were being
statically rendered; and sample state was split across bundles so one bundle's
writes were invisible to another.

**Withdrawn claim.** `748915f` — "Correct the Phase 2 records: separate the
status dimensions, retract an unproven cause". An earlier record had asserted a
cause that the evidence did not support; it was retracted rather than left.

**Disposition — Delivered.**

---

### PRM-007 · Re-issue of PRM-006

**Date** 22 September 2026, 01:20 · **Source** user prompt — the same
instruction re-sent after a context compaction, with minor wording differences.

**Disposition — Superseded by its own duplicate**; the work is recorded under
PRM-006. Continuations "Try again" (×2, 01:28) and two "Continue from where you
left off" (01:36, 01:50) belong here.

---

### PRM-008 · Seller corrections, then Builder

**Date** 22 September 2026, 04:34 · **Source** user prompt

> "Make Seller reset complete and deterministic. `resetForReview` currently
> retains ledger entries, invoices, support threads and counters while restoring
> the balance and clearing purchases."

> "Make the sample wallet reconcile. The seed ledger totals 3,180 credits while
> the wallet starts at 4,200."

> "Run the flow suite twice against the same running server."

> "Do not count successful reproduction of OTP bypass or shared-account state as
> passing security controls."

**Context.** Three defects the user had found by reading the code, stated with
the evidence. The wallet one is precise: two numbers that should agree and do
not.

**Method and why.** A single fresh-state factory for both initialisation and
reset, so the two cannot diverge; and the displayed balance *derived* from the
ledger rather than maintained beside it, so the invariant holds by construction.
"Run the suite twice against the same running server" was adopted as a standing
technique — it is what catches a reset that only appears to work.

**Changes.** `9b6ffa9` — "Make Seller reset complete, the wallet reconcile, and
the guard honest". Then Builder: `ae03160` (B-01…B-24), `1edfbf2` (no-JavaScript
suite extended over Builder), `567a2c2` (Builder record, route sweep made
runnable).

**Verification.** Seller flow suite run twice against one server; a reconcile
endpoint added so the ledger invariant can be asserted rather than trusted.

**Disposition — Delivered.**

---

### PRM-009 · B-15, then the Admin console

**Date** 22 September 2026, 09:07 · **Source** user prompt

> "First complete B-15's approved unsaved-changes experience… Then implement
> Admin A-01–A-31 using the approved kkl-design baseline: 5bc3512…"

> "A-07 is part of A-06's review flow, not a duplicate standalone page."

> "Keep account identity and role explicit in service interfaces. A hidden scope
> field is untrusted input, not authorization."

> "Do not implement production authentication or financial authority in the
> sample store, and do not describe sample separation as verified security."

**Method and why.** The hidden-scope instruction shaped the purchase action: the
marketplace scope travels as a validated form field and is checked server-side,
and the code comment says why. Admin decisions were made reason-gated at the
*store*, not in each form, so no Admin mutation can write an audit entry without
a reason.

**Changes.** `5829839` (B-15), `3c1b0fd` (A-01…A-31), `b0f0a3a` (Admin
verification plus three defects it found), `3a8645a` (record, including "the
claims that were wrong").

**Defects found.** Three, found by measurement rather than reading — see
chapter 08.

**Withdrawn claim.** A two-person financial approval workflow had been added
without an approved source. It was removed under PRM-010 after the user flagged
it.

**Disposition — Delivered.**

---

### PRM-010 · Phase 2 acceptance pass

**Date** 23 September 2026, 04:20 · **Source** user prompt

> "Frontend screen coverage is now in place. Continue with a focused Phase 2
> acceptance pass. Do not expand scope or begin backend/voice implementation."

> "Do not classify every missing backend capability as unfinished frontend work.
> Conversely, do not mark a frontend interaction complete merely because its
> route renders."

> "Trace additional requirements to an approved source. In particular, do not add
> a two-person financial approval workflow unless it is actually required."

> "Do not introduce a fragile history trap just to report a pass."

> "Do not silently replace screenshot comparison with source measurements."

**Context.** The user had spotted an invented requirement and was setting the
standard for the acceptance evidence.

**Method and why.** Work split into four categories (A frontend defects, B
visual/accessibility verification, C backend dependencies, D client decisions)
so that a backend gap could not be reported as an unfinished screen. Real
prototype rendering was used for comparison, not source measurement.

**Changes.** `e0f23b9` (B-15 Back made harmless rather than trapped), `44db69e`
(acceptance pass: prototypes rendered, accessibility measured, backlog split),
`0fdbf45`, `b19e6b1` (imagery in the comparison, and what that exposed),
`66286c6` (deployment guard fixed), `578492e` (re-capture and correct the
record), `7687105` (four shared deviations), `dfb0165` (coverage completed).

**Defects found.** The deployment guard was comparing values that could never
disagree; the prototype-width control failed silently; content-box versus
border-box differences; shared styles overriding status-panel colours. Chapter 08.

**Disposition — Delivered.**

---

### PRM-011 · Complete visual coverage; resolve B-15 with evidence

**Date** 23 September 2026, 10:45 · **Source** user prompt

> "Map all 113 inventory entries to: A screen/state comparison; Shared-component
> evidence plus its relevant screen context; or A clearly documented pending
> check."

> "Do not treat every inventory entry as a separate route."

> "Capture success alone is not a visual pass."

**Note on the number.** 113 was the inventory count at that date. It is now 132
after the CR screens were added. The three counts that are often confused — page
files, swept routes, inventory rows — are separated in chapter 05 §5.8.

**Method and why.** A geometry differ (`verify-screen-geometry.mjs`) was built so
pairs are *inspected* rather than merely captured — the prompt's point that
capture success is not a pass, turned into a mechanism.

**Changes.** `011bade` (classify the differences, fix the defects), `969ae3d`
(decision sheet and three supporting documents).

**Disposition — Delivered.**

---

### PRM-012 · Bounded closure pass

**Date** 23 September 2026, 13:29 · **Source** user prompt

> "Do not repeat another full capture cycle before identifying what actually
> needs changing."

> "Do not target zero numerical divergence. Do not report zero open visual
> defects while material differences remain unclassified."

> "Avoid a blanket replacement across 152 call sites."

**Method and why.** Differences were classified into five groups rather than
counted. Typography was resolved per *context* — public section heading, console
panel heading, card title, page title — instead of by replacing every call site,
which is what the 152-call-site warning was about.

**Changes.** `b95e81e` (measured typography and weight defects), `1591aa0`
(owner-review evidence, differ residue classified), `707d77b` (guard suite made
hermetic and runnable on Windows).

**Defects found.** The typography correction over-applied on its first attempt;
chapter 08.

**Disposition — Delivered.**

---

### PRM-013 · Final owner-review package

**Date** 23 September 2026, 17:26 · **Source** user prompt

> "Prepare the final owner-review package for implementation commit 011bade and
> documentation commit 969ae3d."

> "Existing captures from an earlier implementation must be labelled with their
> commit and must not be presented as screenshots of 011bade."

> "Distinguish required attribution from a voluntarily chosen credit treatment."

> "Do not mark exceptions accepted on my behalf."

**Method and why.** Evidence provenance became explicit: every capture is
labelled with the commit it was taken at, and a refreshed capture does not
silently replace an older one — the older is kept and labelled. This is the rule
that keeps chapter 07's table honest.

**Changes.** `b9e7e53` (E-P5/E-P6 baseline corrections), `7afe140` (evidence,
harness, docs), `4f125ec` (D-20 evidence impact closed; E-P3 refreshed),
`5c3a658` and `e6ec30b` (responsive type pass).

**Defects found.** D-20 — the mobile-frame capture fault, chapter 08 §8.11.

**Disposition — Delivered.** Four exceptions (E-P1, E-P2a, E-P2b, E-P3) remain
open for a decision; none was marked accepted.

---

### PRM-014 · Evidence-based completion review (the audit)

**Date** 27 September 2026, 14:43 · **Source** user prompt, with two `.docx`
attachments (`KKL_Client_Change_Confirmation.docx`, `KKL_UI_Spec.docx`)

> "Resume as the original project agent and perform an evidence-based completion
> review of Phase 2 and the client-review changes. This is an audit first. Do not
> start another implementation cycle, redesign, merge, deploy or mark anything
> approved."

> "While you were unavailable, Kimi continued work in Cursor and pushed to…
> Fetch the current remote branch, inspect local changes and record the exact
> HEAD. Do not rely on your previous session's checkout."

> "Do not treat 'implemented,' 'recommended,' or 'shown to the owner' as
> approval. If approval is not recorded, say 'approval not evidenced.'"

**Investigation and finding.** The remote branch was fetched. **HEAD was
`537a265` — this session's own last push. The other agent had added no commits.**
Six separate verdicts were produced (Phase 1 design, Phase 2 frontend, client
changes, client acceptance, Phase 3 readiness, production readiness) rather than
one status.

**A false positive I nearly filed.** An early probe reported a submitted lead
request missing from both the Admin queue and the Seller list. Investigation
found `verify-lead-request-flow.mjs` running concurrently in the background, and
its `resetAll` step had cleared the store mid-probe. Re-run in isolation, the
request was visible. The defect did not exist; the report said so explicitly.

**Changes.** None to application code — the prompt forbade it. `stash@{0}` was
created to preserve local evidence before fetching, and deliberately left
unapplied.

**Disposition — Delivered.**

---

### PRM-015 · Implement CR01–CR07

**Date** 27 September 2026, 15:45 · **Source** user prompt

> "Complete the client-review changes CR01–CR07 in kkl-web. I want working
> changes, not another audit or a documentation-only closure pass."

> "Permanent storage is an explicit client requirement. Do not claim process
> memory, browser storage or a sample store fulfils it."

> "Do not substitute a mock and call it done."

> "Ask ONE concise consolidated set of questions only for genuinely blocking
> decisions… Continue independent implementation while awaiting answers. Do not
> interpret silence as approval."

**Method and why.** Four blocking questions were asked once, early, with a
recommendation each; implementation of everything unblocked continued in
parallel. The answers became decisions A-1 to A-4 (chapter 09).

For CR03 the instruction ruled out every frontend answer. PostgreSQL 16 was
stood up locally and `kkl-backend` gained its first code on a separate branch —
schema, row-level security, sessions, REST surface — with durability proven by
killing the service mid-test.

**Changes.** `kkl-backend` `21903ba`, `4fb7b9d` on `claude/cr03-lead-requests`;
`kkl-web` `1940f11` (CR03 wiring), `f74deb2` (CR02), `6b7f777` (CR04), `51a5627`
(CR07), `c2ec702` (CR01+CR05), `6a00cdd` (records).

**Verification.** Owner posting 31/31, lead order 20/20, verification policy
19/19, lead-request persistence 9/9, lead-request flow 15/15 against both
stores, backend 19/19, route sweep 268/268, plus Seller/Builder/Admin/enquiry
regression. Recorded in `docs/phase-2/cr-implementation-verification.md`.

**Defects found.** Six, including a staff-note leak path that affected
already-reviewed code. Chapter 08.

**Disposition — Delivered** for CR01–CR05 and CR07; CR06 blocked on assets.

---

### PRM-016 · Close the requirements record

**Date** 28 September 2026, 06:00 · **Source** user prompt

> "Record the four answers you received, including their source and the exact
> workflows they authorize. Distinguish my implementation decisions from client
> approval. Do not require a signed DOCX if explicit written approval exists
> elsewhere."

> "For CR03, document the authentication boundary… RLS and persistence checks
> alone do not establish production authentication."

**Context.** A correction to my own framing: I had been treating the unsigned
confirmation document as the approval gate, which is the wrong test when
explicit written instructions exist.

**Changes.** `kkl-web` `5ecea35`; `kkl-backend` `bc8ab30`. New:
`decisions-received.md`, `cr03-authentication-boundary.md`,
`cr-demonstration-guide.md`.

**Defects found.** `/owner/listings` was being statically prerendered — it broke
a production build and left per-account data depending on `revalidatePath`.
Fixed with `force-dynamic`.

**A correction I had to make within the same prompt.** A production guard was
added for the unconfirmed verification rule; attempting to exercise it showed it
could not fire, because the deployment guard refuses production-with-sample
first and an `api` build needs a backend client that does not exist. The
documents were corrected to say so rather than implying an active control.

**Disposition — Delivered.**

---

### PRM-017 · The lead-request verification decision

**Date** 28 September 2026, 06:16 · **Source** user prompt

> "Submitting a lead request does not require KYC. Keep the existing
> verification restriction on purchasing leads. This instruction does not remove
> verification requirements from other actions."

> "Record this as my product decision and update the relevant policy, copy and
> targeted tests. Do not describe it as a legal-compliance determination."

> "Neither an environment override nor a sample-mode setting constitutes client
> approval of an unresolved business rule."

**Method and why.** Provenance was made structural: `PolicyBasis` is
`specification | product_decision | assumption`, with **no `compliance` value**
for anyone to reach for. The environment override on the production guard was
**removed** rather than relabelled, because the user's point was that a variable
is not a decision.

**Changes.** `kkl-web` `ba252d9`.

**Verification.** `verify-verification-policy.mjs` 22/22 — two checks updated,
three added, including one asserting the whole policy table so the decision
cannot silently move another action.

**Defect found in my own work.** The new compliance-wording check was reading
`textContent('body')`, which includes the inline RSC payload, and so matched a
second escaped copy of the disclaimer it was meant to exempt. It failed for the
wrong reason and was rewritten to read rendered text.

**Disposition — Delivered.**

---

### PRM-018 · Simplify the customer message; Type 1 identified

**Date** 28 September 2026, 06:27 · **Source** user prompt, with the Type 1
reference image attached

> "Simplify the customer-facing message to: 'You can submit a lead request
> without verification. Verification is required before purchasing leads.'"

> "Keep decision attribution, dates and the distinction from a compliance
> determination in the policy documentation and relevant Admin detail. Remove
> those internal explanations from customer-facing screens."

> "Type 1 is attached image"

**Method and why.** `PolicyRule` was split into `explanation` (customer) and
`internalNote` (staff and the record), and `VerificationCase` gained
`policyProvenance` so staff see the basis while no customer-facing type carries
a field that could show it.

For Type 1: the attached image's own chrome reads *"ROUND 3 · Kaam Ki Lead —
responsive portal homepage · Prototype · fit to window, 1209px · synthetic
listings, stock photography"* — the kkl-design prototype viewer. The build was
captured at the same 1209 px and compared: header, hero and search card match,
copy word for word. **Type 1 is the already-approved homepage; no redesign.**

**Changes.** `kkl-web` `2dd368c`, including `docs/phase-2/evidence/cr06/`.

**Verification.** `verify-verification-policy.mjs` 23/23.

**Finding recorded, not acted on.** Type 1's search card shows a locality and a
budget pre-selected where the build shows "All of Kolkata" and "Any budget".
Recorded as a question; the build's values were preserved.

**Disposition — Delivered.**

---

### PRM-019 · Register and owner-review status update

**Date** 28 September 2026, 09:43 · **Source** user prompt

> "CR06-a: Complete — Type 1 identified as the existing approved homepage; no
> redesign required. CR06-b: In progress — awaiting the authoritative logo file
> from the client. Colour verification has not started."

> "Retain the current colours and accessibility corrections. Do not infer logo
> colours from screenshots or change the palette until the file arrives."

**Changes.** `kkl-web` `36114f5` — documentation only, four files.

**Two corrections the new status words forced.** The status legend had no entry
for "complete" or "in progress"; both were defined. And the register asserted
"No CR is complete", which stopped being true when CR06-a closed — it now reads
"Only CR06-a is complete".

**Also corrected.** `owner-review.md` was presenting `5c3a658`'s verification
figures without saying they predate all CR work; that section is now scoped.

**Disposition — Delivered.**

---

### PRM-020 · This documentation package

**Date** 28 September 2026, 10:21 · **Source** user prompt

> "Create comprehensive technical documentation of the Kaam Ki Lead project,
> covering the work performed in response to every recoverable project prompt…
> THIS IS A DOCUMENTATION-ONLY TASK."

> "Do not claim access to prompts or sessions you cannot retrieve."

> "Do not execute a new full verification cycle for this documentation task. If
> you do not rerun a test, do not describe its result as newly verified."

**Method.** The session transcript was parsed directly for user messages,
yielding 60 with timestamps; all five repositories were fetched and their HEADs
recorded; no test was re-run and no result in chapter 07 is described as newly
verified.

**Changes.** `docs/technical-history/` in `kkl-web`. Documentation only.

**Disposition — Delivered** (this package).

---

## 3. Architecture and repository boundaries

What each repository owns, what the frontend is allowed to do, and where the
boundaries are enforced rather than merely described. Versions and counts are
from `kkl-web` `36114f5` and `kkl-backend` `bc8ab30`.

### 3.1 Repository responsibilities

```mermaid
flowchart TB
    design["kkl-design @ 5bc3512<br/>Approved Phase 1 baseline<br/>10 .dc.html prototypes<br/><i>read-only reference</i>"]
    web["kkl-web @ 36114f5<br/>Next.js 16 frontend<br/>122 page files · 266 modules<br/>NO db access, NO wallet or<br/>authoritative logic"]
    backend["kkl-backend @ bc8ab30<br/>Node + PostgreSQL<br/>CR03 lead requests ONLY<br/>canonical program docs"]
    voice["kkl-voice @ 349bd16<br/>protocol notes only<br/><i>no implementation</i>"]
    demo["bdrpl-application @ 8e144e9<br/>the won-the-work demo<br/><i>reference, not architecture</i>"]

    design -.->|"design source, never modified"| web
    web -->|"versioned REST, bearer token<br/>lead requests only"| backend
    backend -.->|"planned: events / webhooks"| voice
    demo -.->|"workflows and ideas only"| web
    demo -.->|"assessed in demo-assessment.md"| backend

    classDef live fill:#DCEEE1,stroke:#2E7D4F,color:#14321F
    classDef planned fill:#F4F5F9,stroke:#9AA2B8,color:#2A3250,stroke-dasharray:4 3
    classDef ref fill:#FFF7E8,stroke:#C98A12,color:#3A2A08
    class web,backend live
    class voice planned
    class design,demo ref
```

Solid edges exist in code. Dashed edges are either reference relationships or
planned and unbuilt.

### 3.2 Frontend stack, at the documented commit

| Thing | Version | Note |
|---|---|---|
| Next.js | 16.2.11 | App Router, Turbopack |
| React / React-DOM | 19.2.4 | Server Components; `useActionState` throughout |
| TypeScript | ^5 | `strict`; `tsc --noEmit` in CI-equivalent scripts |
| Tailwind CSS | ^4 | `@theme` block; no config file |
| zod | ^4.4.3 | Input parsing at the service boundary |
| Node | 22.x (`engines`) | Measured runtime: v22.22.2, npm 10.9.7 |
| ESLint | ^9 + `eslint-config-next` 16.2.11 | |

Runtime dependencies are four packages. That is deliberate: a frontend with no
authoritative logic needs very little.

Two Next 16 specifics shaped the code. `middleware.ts` is named `proxy.ts`, and
only a *literal* `process.env.NEXT_PUBLIC_X` member access is substituted at
build time — a computed `process.env[name]` lookup reads the live process
environment instead. That distinction was a real defect (chapter 08 §8.7).

### 3.3 Routing and layout

122 `page.tsx`, 9 `route.ts`, 6 `layout.tsx` across `src/app`. Route groups
carry the boundaries:

| Segment | Layout | Audience |
|---|---|---|
| `src/app/(public)` | public header + deep-blue footer | Home seekers, and the individual owner |
| `src/app/seller` | `SellerShell` → `ConsoleShell` + rail | Brokers and agencies |
| `src/app/builder` | `BuilderShell` → `ConsoleShell` + rail | Builders |
| `src/app/admin` | `AdminShell` → `ConsoleShell`, dense rail, ink tone | Internal staff |
| `src/app/actions` | — | 20 server-action modules |

The owner journey (CR02) sits inside `(public)`, not in a console. That was a
deliberate choice: an individual owner is not a subscriber and not a
lead-buying broker, and putting them behind a dashboard rail would have said
otherwise. Chapter 05 §5.6.

`ConsoleShell` is shared by all three consoles and takes `items`, `footer`,
`tone` and `dense`, so the Admin rail's twenty destinations and tighter step are
a parameter rather than a fork.

### 3.4 Components and styling

Seventeen component folders, 39,383 lines of TypeScript/TSX across 266 modules.

`src/components/ui` holds five primitives — `button`, `card`, `chip`, `field`,
`states`. Everything else composes them. Two rules from the approved design are
enforced in the primitives rather than left to call sites: labels sit above
fields and stay there, and every control is at least 44 px tall. A disabled
field always says why it is disabled.

Colour, type and spacing are tokens in a Tailwind v4 `@theme` block, extracted
from the prototypes' own markup. That is what lets `verify-design-tokens.mjs`
check the implementation against the design's source values rather than against
a second hand-written list.

### 3.5 Configuration and the deployment guard

`src/lib/config/runtime.ts` resolves two values — a deployment environment and a
data source — and refuses unsafe combinations. It is the most load-bearing
non-feature module in the repository, so its design is worth stating.

```mermaid
flowchart TD
    A["Request arrives"] --> B["src/proxy.ts"]
    B --> C{"assertDeploymentSafe()"}
    C -->|"NODE_ENV=production and<br/>KKL_ENV or KKL_DATA_SOURCE unset"| R1["503 · refuse to serve"]
    C -->|"server KKL_ENV ≠ bundle NEXT_PUBLIC_KKL_ENV"| R2["503 · wrong bundle for this environment"]
    C -->|"production + sample services"| R3["503 · simulated auth would serve real users"]
    C -->|"ok"| D{"assertVerificationPolicyConfirmed()"}
    D -->|"KKL_ENV=production and<br/>an unconfirmed policy rule in force"| R4["503 · a rule nobody decided"]
    D -->|"ok"| E["Render"]

    classDef refuse fill:#FBE6E3,stroke:#B3392C,color:#3A100B
    class R1,R2,R3,R4 refuse
```

Two things about this are easy to get wrong and were got wrong once.

**The build-time/run-time split.** `NEXT_PUBLIC_*` values are frozen into the
bundle. A guard that reads only those cannot catch the likely accident — a
bundle built for review, deployed to production with production variables set on
the server. So the authoritative run-time values are the *unprefixed* `KKL_ENV`
and `KKL_DATA_SOURCE`, read from the process on every request, and compared
against the inlined ones. When both sides were read through the same helper the
comparison could never disagree; that was a defect (chapter 08 §8.7).

**What it cannot do.** It cannot tell where it is running. Nothing available to
a Node process distinguishes a production host from a laptop, and it does not
guess from hostnames. It requires the deployment to *declare itself*, and
refuses when the declaration is missing. A deployment that declares
`KKL_ENV=review` while serving real users is not detectable here, and that
residual risk is stated in the module.

`assertVerificationPolicyConfirmed()` (CR07, PRM-017) **cannot currently fire**,
because the guard before it refuses production-with-sample and an `api` build
needs a backend client that does not exist. It is in place for the day that
client lands, and the code says so rather than implying an active control.

### 3.6 Server and client responsibilities

Data fetching is server-side; every page is a server component that calls
`getServices()`. Client components exist only where behaviour requires them —
forms using `useActionState`, the locality combobox, the unsaved-changes guard,
toggles.

Every mutation is a server action in `src/app/actions/`. None takes an account
identity from the client: the service resolves it server-side. Where a scope
*is* a form field (the two lead marketplaces are separate pools), it is
validated against an allow-list and the code comment records why — the standing
instruction from PRM-009 that "a hidden scope field is untrusted input, not
authorization".

### 3.7 Backend structure

```
kkl-backend/
  migrations/001_lead_requests.sql    schema, RLS policies, identity helpers
  migrations/002_app_role.sql         kkl_app: not owner, NOBYPASSRLS, no password in repo
  migrations/003_account_external_ref.sql  stable external handle; session expiry
  migrations/004_multiple_areas.sql   area_ids text[] + GIN index
  src/db/pool.mjs                     withIdentity() — SET LOCAL per transaction
  src/db/migrate.mjs                  ordered, idempotent migration runner
  src/domain/lead-requests.mjs        validation, idempotency, projection
  src/http/sessions.mjs               session issue/resolve/revoke + dev authenticator
  src/http/server.mjs                 versioned REST surface
  tests/{lead-requests,rls,durability}.test.mjs
```

One runtime dependency (`pg`). The REST surface is nine routes. Chapter 06 §6.5
covers the authorization model; chapter 11 §11.5 covers what it does not prove.

### 3.8 Planned but not implemented

Stating these plainly matters more than the list of what exists.

| Component | Status | Where it is specified |
|---|---|---|
| Authentication (mobile OTP, sessions, staff accounts) | **Not built.** A development authenticator stands in | `kkl-backend/docs/architecture.md` §4 |
| Payments, wallet, settlement | Sample only — numbers in one process | D-01, D-03, D-13, D-14 |
| KYC provider integration | Sample only — no provider selected | chapter 09, CR07 |
| Media storage, virus scanning, retention | **Not built.** Owner photographs are recorded by name only | chapter 09, CR02 |
| Lead marketplace, notifications, voice | Sample in `kkl-web`; unbuilt in `kkl-backend` | `kkl-backend/docs/architecture.md` §2 |
| Redis workers / queues | Planned, unbuilt | `kkl-backend/docs/architecture.md` §3 |
| `kkl-voice` | Protocol notes only, one commit | `kkl-voice` `349bd16` |
| kkl-backend API client in `kkl-web` | **Not built.** `getServices()` throws for `dataSource=api` | `src/lib/services/index.ts` |

The last row is why an `api`-mode production build cannot currently be produced,
and why the CR07 production guard cannot fire.

---

## 4. Design and frontend methodology

How the work was actually done, with the examples that produced each practice.
§4.14 separates what was *done* from what is *recommended*.

### 4.1 Requirement extraction and ambiguity tracking

Two PDFs and a demo went in; requirements, an access matrix and a **decision
register** came out. The register is the load-bearing part: eighteen decisions
(D-01…D-18) that nobody had made, recorded as open rather than guessed.

PRM-002 set the rule — "Do not bake unconfirmed subscription prices, credit
expiry rules, contact unlock rules, or verification promises into the design
brief as facts" — and it was made structural rather than editorial.
`src/lib/config/business-rules.ts` holds the pending copy; screens *render* it.
So an unresolved rule appears on screen as unresolved, and a reviewer seeing a
disabled control or a missing figure is seeing a decision, not a bug.

Worked example: D-01 (subscription price) means `BuilderSubscription.priceInr`
is typed `number | null` and is null everywhere. There is no figure to show
because none was agreed, and the type makes inventing one awkward.

### 4.2 Mapping requirements to screens and states

Every screen has an inventory ID — `P-` public/Buyer, `S-` Seller, `B-` Builder,
`A-` Admin, `C-` shared components, and later `CR02-`, `CR04-`, `CR07-`. Each
row carries its **states**, not just its route:

> `P-01 · Homepage · / · Default, guest, signed-in, mobile menu open`

This is why an inventory row is not a route, and why the counts differ (§5.8).
`build-coverage-matrix.mjs` generates `coverage.md` from the screen map and the
baseline, so coverage is derived rather than asserted.

### 4.3 Preserving an approved baseline

`kkl-design` is a separate repository at a fixed commit, never modified. Every
deviation is an **exception with an ID** (E-P1, E-P2a, E-P2b, E-P3), each stating
what changed, why, the evidence, and who decides. Two accessibility corrections
sit in that list rather than being applied silently:

- **E-P2a** focus indicator gains a 1 px ink companion edge inside the unchanged
  saffron ring: 2.11:1 → 17.63:1 on white.
- **E-P2b** control border darkened `#C6CCE0` → `#8A8E9C`: 1.60:1 → 3.27:1.

Both are applied and reversible in one line. What is open is sign-off, not code.
E-P5 and E-P6 went the other way — the owner reclassified them as corrections
*to* the baseline, and B-02 and B-07 were restored to the approved design at
`b9e7e53`.

### 4.4 Translating exported prototypes into application code

The `.dc.html` exports were read as *source*, not as pictures. Colour values,
type sizes, weights and spacing were extracted from the markup and became tokens
— which is what allows `verify-design-tokens.mjs` to compare the implementation
against the design's own values rather than a second hand-written list.

Two traps, both hit:

1. **Reviewer chrome is not the design.** The prototypes carry a round label,
   width tabs and a review-notes panel. The first geometry differ scraped them as
   though they were content; it was scoped to the emulated stage frame.
2. **Prototypes render headings as styled `div`s.** The differ's element list
   omitted `div`, so every prototype heading was invisible to it and the tool
   reported agreement it had not checked.

Both are in chapter 08. Both were found by inspecting output that looked fine.

### 4.5 Reuse without flattening role-specific behaviour

`ConsoleShell` serves all three consoles by parameter. `OrderList`/`OrderDetail`
serve both marketplaces, with paths injected (`SELLER_ORDER_PATHS`,
`BUILDER_ORDER_PATHS`) so a Builder screen cannot link a Seller into the wrong
console.

Where reuse would have asserted something false, it was refused. CR02's
`OwnerListing` is its own type rather than the Builder's `ListingDraft`, because
that type is a *project* — total units, RERA registration, a price range — and
reusing it would have made an individual owner a subscriber in the data whatever
the screens said. The type also has no `published` state, because whether an
owner's listing ever publishes is undecided and the state would have settled it
by implication.

The owner journey does reuse the Builder editor's unsaved-changes machinery
(`UnsavedChangesProvider`, `SaveDraftButton`, `UnsavedBadge`) — generic
behaviour the client has already reviewed once, imported rather than rebuilt.

### 4.6 Typed service boundaries and deterministic fixtures

`src/lib/services/contracts.ts` defines every service. `getServices()` resolves
one implementation from configuration, **with no fallback**:

> "There is no fallback. If the deployment asks for the real API, it gets the
> real API or it fails — sample data never stands in for an unreachable backend,
> because a simulated purchase or contact reveal presented as real is worse than
> an outage."

Fixtures are deterministic and seeded, so a suite asserting "this record was not
here before" works on its second run. Masking is **absence, not concealment**:
`MarketplaceLeadDetail` has no contact fields at all; only `PurchasedLead` does.
A CSS blur can be removed by a reader; a missing field cannot.

### 4.7 Progressive enhancement

`verify-no-javascript.mjs` (500 lines) drives the product with scripting off.
Every form posts to a server action and works unhydrated. Where behaviour
genuinely requires JavaScript — the B-15 exit dialog, the reload warning, the
dirty badge — the screens say so in a `<noscript>` rather than implying
otherwise:

> "Without JavaScript there is no unsaved-changes warning. Moving between
> sections with the buttons above saves as you go."

The CR02 photographs step does the same: with scripting off the file picker
cannot list what was chosen, so a `<noscript>` textarea collects the names and
explains why.

### 4.8 Validation and preserving what someone typed

Validation errors are returned as field-keyed maps and rendered beside the
field. Two rules learned the hard way:

**Field names must match the form's.** The CR03 backend client filed errors
under its own names (`areaIds`) while the form looked up `errors.areas`. A
rejected submission rendered *nothing at all* — it looked like a submission that
did nothing. Found in a browser, fixed by mapping names at the boundary.

**Absence is allowed; a wrong value is not.** An owner can save a step with most
of it empty, because filling in what you know first is the normal case. But a
price typed as words used to be stripped to nothing and saved as blank — quieter
than refusing it, and worse. It is now a field error.

React 19 resets a form's DOM after an action completes. That is right for a
successful submission and wrong for a refused one, so refused actions echo the
submitted values back and the controls re-sync from the echo (chapter 08 §8.6).

### 4.9 Idempotency

Every write that could be replayed carries a key minted by the page that renders
the form: enquiries, lead purchases, lead requests, owner drafts and owner
submissions. Replay returns what the first call produced.

The distinction that matters: **two visits to a form are two intentions, not a
replay.** A second deliberate purchase of the same lead is refused because the
lead is sold, not because a key matched. Testing this honestly meant copying one
tab's key into a second tab — two visits would have minted two keys and proved
nothing.

CR04 added the missing half: a replay now *says* it was a replay. The guarantee
was already working; the buyer just had no way to know they had not been charged
twice.

### 4.10 Cross-role consistency

Sample stores are wired to each other where the product joins them: a Buyer
enquiry appears in the Builder's console; a Seller's lead request appears in the
Admin queue; an Admin decision appears on the Seller's own view.

Review resets are correspondingly transitive. `sampleReviewControls.reset()`
resets Seller, Admin, lead requests, owner listings and verification together,
because resetting one and not the other leaves two views disagreeing — which is
exactly what the Admin console exists to make impossible.

### 4.11 Responsive styling and typography

Two widths in every sweep: 1440 px and 390 px, with a horizontal-overflow
assertion at both — the responsive failure a fixed-width screenshot hides.

Typography was resolved **per context**, not per token. Where an approved screen
renders a different size from the generic library, the screen wins, and the
precedence is documented as semantic styles: public section heading, console
panel heading, card title, page title. PRM-012 warned against "a blanket
replacement across 152 call sites"; the first attempt over-applied anyway and had
to be narrowed (chapter 08 §8.12).

### 4.12 Visual capture, comparison, and evidence versioning

The rule that keeps chapter 07 honest: **every capture is labelled with the
commit it was taken at, and a refresh does not silently replace an older
capture** — the older is kept and labelled. `e-p3-attribution-b95e81e.png` still
exists beside `e-p3-attribution-b9e7e53.png` for exactly that reason.

Comparison evolved under pressure. Screenshot pairs alone let a differ report
agreement it had not checked, so `verify-screen-geometry.mjs` measures both
DOMs; and `proto-width.mjs` was made to *assert* that the prototype's stage took
the requested width, after a silent failure produced desktop-width "mobile"
evidence (D-20, chapter 08 §8.11).

### 4.13 Focused commits and branch continuity

Commit messages state the problem, not the patch. The pattern across 57 commits
is implement → verify → record, with the record commit often naming what was
wrong: *"Record the Admin journey, B-15, and the claims that were wrong"*,
*"Correct the Phase 2 records: separate the status dimensions, retract an
unproven cause"*.

Branch continuity held across the agent handover: one branch,
`claude/phase-2-frontend`, fetched and verified rather than assumed (PRM-014).
The backend slice took its own branch, `claude/cr03-lead-requests`, because it
is a different repository and a different review.

### 4.14 Recorded methodology versus recommendations

Everything above was *done*. The following are **recommendations**, not practice,
and nothing in this package claims otherwise:

- Generate `inventory.json` from the design export rather than maintaining it
  alongside, so the count cannot drift from the screens.
- Run the browser suites in CI on a fixed Chromium, with the reset endpoint
  forced serial — the concurrency fault in chapter 08 §8.14 is a standing risk.
- Move the four sample stores that are not CR03 behind the same durable pattern
  when their backend domains exist, rather than one at a time.
- Replace the development authenticator with the OTP flow before any deployment
  that is not a review build.

---

## 5. Role journeys and screen implementation

Six audiences, what each can do, and where the boundaries between them are
enforced. §5.8 resolves the three screen counts that are easy to conflate.

### 5.1 Public portal and Buyer (P-01 … P-21)

The brief made this the primary experience, not a front page for the
marketplace. `src/app/(public)` carries a light header on white and a deep-blue
footer; 21 inventory rows.

Homepage search (location, property type, BHK, budget) over the CR05 location
records; search results with filters and sorting; property detail with gallery,
specifications, amenities and enquiry/site-visit actions; a requirement-capture
flow (`/find-my-match`) with budget-weighted match scoring (`cbb4ba3`);
shortlisting; and a Buyer area for enquiries, profile and notifications.

**The enquiry flow** is the most heavily verified path in the repository
(`verify-enquiry-flow.mjs`, 17 checks), because PRM-006 asked for it to be
proven beyond the happy path:

```mermaid
sequenceDiagram
    participant B as Buyer
    participant P as /property/[slug]/enquiry
    participant A as server action
    participant S as enquiry-store (sample)
    participant BC as Builder console

    B->>P: opens form
    P->>P: mints idempotency key (hidden field)
    B->>A: submit
    A->>S: create(key, draft)
    Note over S: same key → returns the first enquiry
    S-->>A: reference
    A-->>B: redirect to /enquiry/[id]/confirmed
    Note over B,A: no personal information in the URL
    S-->>BC: appears on the Builder's own enquiries
```

Verified: reload and direct access to the confirmation, repeated submission, two
tabs, two independent browser sessions (one cannot reach the other's draft),
expired OTP, expired and missing drafts, and draft clearing.

### 5.2 Seller / broker console (S-01 … S-25)

25 rows. Registration and onboarding, KYC submission and status, the masked lead
marketplace ("Buy Leads" after CR01), lead detail, purchase, purchase result,
My leads, CSV export, billing and credits, recharge, invoices, support, profile
— and, after CR03 and CR04, lead requests and My purchases.

**Masking is structural.** The marketplace type has no contact fields; the
purchased type does. `tests/access-boundaries.test.mjs` asserts the rule over
every combination, not just the walked paths, and the CR04 browser suite asserts
that no phone-shaped string appears in the served HTML before an order.

### 5.3 Builder console (B-01 … B-24)

24 rows. Registration, verification, subscription (with no price — D-01),
listing management, and the six-section listing editor B-08…B-13.

**B-15**, the unsaved-changes experience, took three prompts and remains an open
exception. In-app navigation offers Save / Discard / Keep editing; edits survive
staying; the dirty state clears after a save. Browser **Back** leaves without the
custom dialog — and the resolution was to make that *harmless* rather than to
trap history:

> Forward restores the unsaved edits with an "Unsaved work restored." notice, and
> nothing is ever silently saved; a second tab reads the server value.

PRM-010 explicitly forbade the alternative: "Do not introduce a fragile history
trap just to report a pass." E-P1 is open for a decision, with a screen
recording and a labelled frame strip as evidence.

### 5.4 Admin console (A-01 … A-31)

31 rows, the largest group: dashboard, users and account detail, KYC queue and
document review, property review, lead intake and qualification oversight,
orders and delivery, wallets and adjustments, refunds, subscriptions, support,
notifications, reports, audit and system settings.

Three structural rules, each from an explicit instruction:

- **Reason-gated decisions.** Enforced at the store, so no Admin mutation can
  write an audit entry without a reason.
- **Append-only audit.** Entries are only ever `unshift`ed; a mistake is
  corrected by a new entry.
- **Three separate axes.** Verification, account status and listing moderation
  never read or write each other. `tests/access-boundaries.test.mjs` asserts the
  separation across every combination.

**A-07** is part of A-06's review flow, not a standalone page — stated in
PRM-009 and implemented that way.

### 5.5 Seller lead requests through Admin response (CR03)

```mermaid
sequenceDiagram
    participant S as Seller
    participant W as kkl-web (server)
    participant K as kkl-backend
    participant DB as PostgreSQL
    participant AD as Admin

    S->>W: area + requirements, one submit
    W->>K: POST /v1/lead-requests (bearer, idempotency key)
    K->>DB: BEGIN, then SET LOCAL app.user_id and app.user_role
    DB-->>K: row + reference (RLS: lr_insert)
    K-->>W: LR-…
    W-->>S: reference, visible in My Lead Requests
    AD->>K: GET /v1/lead-requests (staff session)
    Note over DB: lr_select — own rows OR staff
    AD->>K: POST …/messages (public) and …/status (reason required)
    Note over DB: lrm_select hides internal notes from the requester
    K-->>S: status, public reply and history on the Seller's own view
```

Internal notes are withheld **by database policy**, not by a filter the next
screen has to remember; the Seller-facing type has no field that could carry
one. Both locks are asserted — `verify-lead-request-flow.mjs` check 11 looks in
the full HTML, and `kkl-backend/tests/rls.test.mjs` queries past the handlers.

### 5.6 Owner property submission and review (CR02)

Eleven inventory rows (`CR02-01`…`CR02-11`), added by the client change.

```mermaid
flowchart LR
    A["/post-property<br/>entry"] --> B["Start a listing<br/>(POST, idempotent)"]
    B --> C["6 steps, own URLs<br/>basics · location · pricing<br/>photos · contact · preview"]
    C --> D{"blockers?"}
    D -->|"yes"| C
    D -->|"no"| E["Send for review<br/><i>never 'Publish'</i>"]
    E --> F["Owner's listing record<br/>'Sent for review — not published,<br/>nothing charged'"]
    F --> G["/admin/owner-listings<br/>queue · no publish action"]
    G --> H{"staff decision<br/>reason required"}
    H -->|"changes requested"| C
    H -->|"cleared"| I["'Cleared — not published'"]
    H -->|"declined"| J["declined, with reason"]

    classDef blocked fill:#FFF7E8,stroke:#C98A12,color:#3A2A08
    class I blocked
```

Three things this journey refuses to say. The button is **"Send for review"**,
never Publish. **"Cleared" is labelled "Cleared — not published"** everywhere,
because people read "Approved" as "it is up" and the publication terms are
undecided. And the photographs step states that **the files are not stored** —
the picker is real, the names are recorded, the bytes go nowhere, and the Admin
screen tells a reviewer that a photograph review is not actually possible.

### 5.7 Selective verification routing (CR07)

```mermaid
flowchart TD
    A["Account acts"] --> B{"policyFor(action)"}
    B -->|"browse · enquire · request leads"| C["not_required<br/><i>never shown as Verified</i>"]
    B -->|"buy a lead · publish"| D{"case exists?"}
    D -->|"no"| E["required — open a case<br/><i>registering opens nothing</i>"]
    E --> F["in_progress<br/>with the service"]
    F --> G{"service answer"}
    G -->|"pass"| H["verified"]
    G -->|"fail"| I["failed — not an approval"]
    G -->|"unreadable / unreachable"| J["needs_review<br/><i>an outage is not a pass</i>"]
    I --> K["Admin queue: needs a person"]
    J --> K
    F --> L["Admin queue: with the service<br/><i>routine, not a backlog</i>"]
    K --> M["staff decision<br/>reason required → history + audit"]

    classDef neutral fill:#F4F5F9,stroke:#9AA2B8,color:#2A3250
    classDef danger fill:#FBE6E3,stroke:#B3392C,color:#3A100B
    class C neutral
    class I,J danger
```

`not_required` and `verified` are different answers and the type keeps them
apart. The checking is done by a labelled **sample verification service**; no
provider is selected and no compliance is claimed.

### 5.8 Three counts that are not the same number

This has been confused before, and the distinction is load-bearing.

| Count | Value at `36114f5` | What it is |
|---|---|---|
| `page.tsx` files under `src/app` | **122** | Route *definitions*. A `[id]` segment is one file serving unlimited addresses |
| `verify-route-sweep.mjs` entries | **134** | Addresses *exercised*, with concrete identifiers, at two widths = 268 renders. 127 distinct paths + 7 query-string variants |
| `inventory.json` rows | **132** | *Screens and their states* from the design inventory, plus the CR additions. One row can be several states of one route, or a shared component with no route at all |

PRM-011 said it directly: "Do not treat every inventory entry as a separate
route." The historical figure quoted in that prompt — 113 inventory entries — was
correct at 23 September; 19 CR rows were added on 27 September.

Two route files are deliberately absent from the sweep:
`/seller/orders/[reference]` and `/builder/orders/[reference]`, because an order
reference is minted when a lead is bought and nothing is seeded as purchased.
Seeding one would change the Seller's opening balance and the counts other suites
assert; `verify-lead-order-flow.mjs` drives those screens against a reference it
creates, which is the stronger check.

---

## 6. Data services and backend integration

The service boundary, the sample stores behind it, and the one domain that is
genuinely persistent.

### 6.1 The boundary

```mermaid
flowchart TD
    page["Server component / server action"] --> gs["getServices()"]
    gs --> cfg{"runtimeConfig.dataSource"}
    cfg -->|"sample"| swap["withLeadRequestStore(sampleServices)"]
    cfg -->|"api"| thr["throw — no API client exists"]
    swap --> lr{"KKL_LEAD_REQUESTS"}
    lr -->|"backend"| be["backendLeadRequests<br/>backendAdminLeadRequests"]
    lr -->|"unset"| sm["sample lead-request store"]
    be -->|"bearer token, server-side only"| api["kkl-backend /v1"]
    api --> pg[("PostgreSQL<br/>RLS enforced")]
    swap --> other["12 other sample services<br/><i>process memory</i>"]

    classDef live fill:#DCEEE1,stroke:#2E7D4F,color:#14321F
    classDef sample fill:#F4F5F9,stroke:#9AA2B8,color:#2A3250
    classDef refuse fill:#FBE6E3,stroke:#B3392C,color:#3A100B
    class be,api,pg live
    class sm,other sample
    class thr refuse
```

`src/lib/services/index.ts` resolves one implementation and **never falls back**.
If a deployment asks for the real API it gets the real API or it fails, because
a simulated purchase presented as real is worse than an outage.

### 6.2 Why lead requests get their own switch

The `sample` / `api` choice is about the *whole platform*, and `kkl-backend` has
built exactly one domain. CR03 is the one domain the client required to be
stored, and no arrangement of frontend code can satisfy that — so
`KKL_LEAD_REQUESTS=backend` moves lead requests and nothing else.

It is a **swap, not a fallback**. Configured for the backend and unable to reach
it, the screens report an error; they do not quietly serve memory while the page
says records are stored. The sentence on `/seller/requests` is read from
configuration for the same reason:

| Configuration | What the screen says |
|---|---|
| `KKL_LEAD_REQUESTS=backend` | "Requests are saved by the lead-request service and stay available after it restarts." |
| unset | "In this review build, requests are kept for the session only — permanent storage is a backend dependency, not yet claimed." |

### 6.3 The sample stores

Thirteen modules in `src/lib/services/sample/`. State is held on `globalThis`
under `Symbol.for("kkl.sample.state")` via `processState()` — not in module
scope, because route handlers, pages and server actions are bundled separately
and each bundle got its own copy of a module-scope `let`. That was a real defect
(chapter 08 §8.4).

| Store | Owns | Persistence |
|---|---|---|
| `seller-store` | account, KYC, wallet ledger, purchases, orders, invoices, support | process memory |
| `builder-store` + `builder-modules` | Builder account, listings, enquiries, its own lead pool | process memory |
| `admin-store` | queues, audit log, accounts, adjustments | process memory |
| `enquiry-store` | Buyer enquiries and drafts | process memory |
| `owner-listing-store` | CR02 owner listings and the moderation queue | process memory |
| `verification-store` | CR07 cases and the sample provider | process memory |
| `lead-request-store` | CR03 fallback only | process memory |
| `locations` | 55 area records, the CR05 hierarchy | fixture |
| `lead-orders` | shared order projection | derived |

**Derived, not stored.** The wallet balance is computed from the ledger, and a
lead order is the join of a purchased lead and its ledger entry. Both were
deliberate: a balance held beside the ledger that produced it had already
drifted once (chapter 08 §8.5), and a third stored copy of an order could drift
the same way.

### 6.4 The CR03 backend slice

Four migrations, one runtime dependency, nine routes.

| Table | Purpose | RLS |
|---|---|---|
| `accounts` | display name, role, stable `external_ref` | outside RLS — read by the authenticator before an identity exists |
| `sessions` | token, account, `revoked_at`, `expires_at` | outside RLS, same reason |
| `lead_requests` | the request; locations as **stable identifiers**, never display names | `lr_select` own-or-staff · `lr_insert` own only · `lr_update` staff only |
| `lead_request_messages` | public replies and internal notes | `lrm_select` non-staff see `visibility='public'` on their own request only |
| `lead_request_history` | status transitions with mandatory reason | `lrh_select` own-or-staff · `lrh_insert` staff only |

`lr_update` being staff-only means a requester cannot rewrite their own status
even by querying the table directly. `lrm_select` is why the internal-note
boundary is a database property rather than a habit.

### 6.5 How identity reaches the policies

```
resolveIdentity(bearer)  →  { accountId, role }   ← read from the session row,
                                                     role re-read from accounts
                                                     on every request

withIdentity(identity, fn):
    BEGIN
    SELECT set_config('app.user_id',   $accountId, true)   -- transaction-scoped
    SELECT set_config('app.user_role', $role,      true)
      … handler queries …
    COMMIT
```

Four properties make this real rather than decorative, and each is asserted by a
test that would fail without it:

1. **Identity comes from the session, never the request.** A body carrying
   `accountId` or `role` is ignored; there is a test named for exactly that.
2. **`SET LOCAL` is transaction-scoped**, so a pooled connection cannot carry one
   request's identity into the next. Tested by interleaving two identities over a
   pool smaller than the number of reads.
3. **The connecting role cannot bypass the policies.** `kkl_app` does not own the
   tables, is not a superuser, has `NOBYPASSRLS`; tables have `FORCE ROW LEVEL
   SECURITY`. All three are asserted directly.
4. **Authorization is written twice** — handler checks *and* policies.
   `tests/rls.test.mjs` bypasses the handlers entirely: if the application checks
   were the only separation, every assertion in that file would fail.

`docs/architecture.md` §5 names the demo's mistake — RLS enabled with no
policies, reached through a bypassing role. This slice was built not to repeat
it, and the tests are how that is demonstrated rather than asserted.

### 6.6 What is not built

The API client for `dataSource=api` does not exist; `getServices()` throws for
it. Payments, KYC providers, media storage, notifications, the lead marketplace
and the voice service are unbuilt in `kkl-backend`. Authentication is unbuilt —
chapter 11 §11.5.

---

## 7. Security, verification and accessibility

Every suite, what it tests, what it does **not** prove, and which commit its
recorded result came from.

> **No suite was re-run to produce this documentation.** PRM-020 forbade it.
> Every figure below is a *recorded historical result*, attributed to the commit
> it was measured at. Nothing here is described as newly verified.

### 7.1 Evidence classes

Results are not interchangeable, so they are kept apart.

| Class | Meaning | Example |
|---|---|---|
| **H** Historical | Recorded at an earlier commit, not re-run since | token/contrast/zoom suites at `5c3a658` |
| **A** Audit-rerun | Independently re-executed during the 27 Sep audit | route sweep, lead-request flow, guard suite |
| **C** CR-pass | Run during the 27–28 Sep CR work, at the commit stated | owner posting 31/31 at `f74deb2` |
| **S** Source inspection | Read, not executed | business-rules module, RLS policy text |
| **V** Visual inspection | A person looked at rendered output | Type 1 comparison (PRM-018) |
| **G** Geometry/token | Mechanical DOM or value comparison | `verify-screen-geometry.mjs` |
| **L** Known limitation | Reproduced as documented — reproduction is **not** a pass | OTP bypass, shared sample account |

**Assistive-technology testing: class absent.** No screen reader, no braille
display, no voice control has been used. `verify-accessible-names.mjs` reports
what a screen reader *would* announce by reading the accessibility tree — useful,
and not the same thing. This is stated because conflating the two would be the
easiest false claim in the package.

### 7.2 The suites

Thirty-four scripts in `scripts/`, four unit-test files in `tests/`. All browser
suites need a **production build served by `next start`**, not the dev server,
plus a Playwright Chromium.

| Suite | Tests | Does **not** prove | Last recorded result · commit · class |
|---|---|---|---|
| `verify-route-sweep.mjs` | 134 addresses × 1440/390 px: HTTP 200 or documented redirect, no page error, no console error, no failed sub-resource, no horizontal overflow | That a journey works. A route can render and do nothing | 268/268 · `36114f5` build · C |
| `verify-enquiry-flow.mjs` | Enquiry beyond the happy path: reload, direct access, repeat, two tabs, two sessions, expired OTP/draft | Real OTP delivery — none is sent | 17/17 · `c2ec702` · C |
| `verify-seller-flow.mjs` | Purchase, credits, failure states, reset determinism | That money moved. Balances are numbers in one process | 26/26 + 2 limitations · `c2ec702` · C |
| `verify-builder-flow.mjs` | Builder journey, subscription and access states | Publishing to a real portal | 48/48 + 3 limitations · `c2ec702` · C |
| `verify-admin-flow.mjs` | Admin queues, reason-gated decisions, cross-role joins, internal-note containment | Staff authentication — there is none | 36/36 + 3 limitations · `c2ec702` · C |
| `verify-lead-request-flow.mjs` | CR03 journey against **either** store | Permanence — it never restarts anything | 15/15 both stores · `1940f11` · C |
| `verify-lead-request-persistence.mjs` | Files a request, `SIGKILL`s kkl-backend, restarts, reads it back; cross-account 404; anonymous 401 | **Authentication.** It proves a *given* identity is confined, not who the caller is | 9/9 · `1940f11` · C |
| `verify-owner-posting-flow.mjs` | CR02 end to end, incl. internal-note absence from HTML and "cleared ≠ published" | That any photograph was stored — none was | 31/31 · `f74deb2` · C |
| `verify-lead-order-flow.mjs` | CR04, incl. a genuine replay of one idempotency key across two tabs | Payment. No provider is contacted | 20/20 · `6b7f777` · C |
| `verify-verification-policy.mjs` | CR07 structure: not-required ≠ verified, no case from registering, split queue, outage ≠ pass, reason-gated decisions | Compliance. No provider, no document | 23/23 · `2dd368c` · C |
| `verify-labels-and-locations.mjs` | CR01 by where each label links; CR05 across six surfaces, ranked search, parent replaces child | That the launch scope is right | 23/23 · `c2ec702` · C |
| `verify-no-javascript.mjs` | Every form with scripting off | That the JS-only behaviours work — it says which do not exist | 51/51 · `5c3a658` · H |
| `verify-b15-navigation.mjs` | Edit → Back → Forward, exactly what is retained, saved or lost | That Back shows the dialog — it does not | 9/9 · `5c3a658` · H |
| `verify-design-tokens.mjs` | Every colour token against the design's own source values | Rendered appearance | 30/30 + 43/43 · `5c3a658` · G/H |
| `verify-contrast.mjs` / `-corrections.mjs` | WCAG contrast per text-on-surface pair; the two corrections where they render | Perceived legibility | 24/24 + 12/12 · `5c3a658` · G/H |
| `verify-typography.mjs` | Type precedence per context | Every one of 152 call sites | 11/11 · `5c3a658` · G/H |
| `verify-zoom.mjs` / `-firefox-text-zoom.mjs` | Native zoom and text-only zoom at 200% | Firefox text zoom — **not run**, needs a Firefox build not installed | 32/32 · `5c3a658` · H; Firefox pending |
| `verify-forced-colors.mjs` | Forced-colors emulation | Real Windows High Contrast | 13/13 · `5c3a658` · H |
| `verify-accessibility.mjs` | Keyboard navigation, dialog focus, validation announcement | That a screen reader user succeeds | 22/22 · `5c3a658` · H |
| `verify-accessible-names.mjs` | The accessibility tree's names | **Not** assistive-technology testing | 24/24 · `5c3a658` · H |
| `verify-screen-geometry.mjs` | Both DOMs measured, screen by screen | Pixel fidelity | sweeps at 1440/390/768 · `5c3a658` · G/H |
| `verify-visual-baseline.mjs` | Representative screens against the design's values | Everything not representative | at `5c3a658` · G/H |
| `verify-sample-mode-guard.sh` | Builds and serves 8 scenarios | The 72-combination rule — that is the unit test | 10/10 + 2 pending a backend · `707d77b` · H |
| `tests/*.test.mjs` | Guard truth table (72 combinations), access boundaries over every combination, idempotency, ledger invariant | Anything requiring a browser | 27/27 · `2dd368c` · C |
| `kkl-backend` `npm test` | REST surface, RLS past the handlers, no identity leak across a pooled connection, durability across `SIGKILL` | Authentication | 19/19 · `4fb7b9d` · C |

### 7.3 Test data and reset

Fixtures are deterministic and seeded. `sampleReviewControls.reset()` restores
Seller, Admin, lead requests, owner listings and verification **together**;
resetting one and not the others leaves two views disagreeing.

Review-only controls live on `/seller/review-state` and `/admin/review-state`
and are available in sample mode only. They set which designed screen renders —
KYC status, account status, next payment outcome, balance, and the CR07 sample
provider's next answer. They approve nothing and move no money.

`resetForReview` once retained ledger entries, invoices and counters while
clearing purchases — the reset only appeared to work. The technique that catches
it, from PRM-008, is now standing practice: **run the flow suite twice against
the same running server.**

### 7.4 Evidence provenance

Every capture is labelled with the commit it was taken at. A refresh does not
replace an older capture — `e-p3-attribution-b95e81e.png` still sits beside
`e-p3-attribution-b9e7e53.png`.

**D-20, the mobile-frame fault.** `proto-width.mjs` selected the prototype's
width tab but did not confirm the stage had taken it. When selection silently
failed, "mobile" evidence was captured at desktop width and looked plausible.
The script now *asserts* the stage frame's width and throws otherwise; the
affected captures were re-taken and the superseded ones are labelled, not
deleted. `4f125ec` closed the evidence impact.

**Do not combine commits.** The figures in §7.2 come from six different commits.
There is no build at which all of them were measured together, and none is
claimed. `owner-review.md` §5 previously presented `5c3a658`'s figures without
saying they predate all CR work; that was corrected at `36114f5`.

### 7.5 Known limitations, reproduced as documented

Reproduction is not a pass. From PRM-008: "Do not count successful reproduction
of OTP bypass or shared-account state as passing security controls."

| # | Limitation | Where |
|---|---|---|
| L1 | OTP is simulated; any code is accepted | Seller and Buyer registration |
| L2 | One shared sample account per role; no sign-in | all consoles |
| L3 | Balances are numbers in one process; no gateway, no reconciliation, lost on restart | Seller/Builder billing |
| L4 | No intake pipeline, qualification caller, WhatsApp journey or notification sender exists | Admin |
| L5 | Owner photographs are recorded by filename; no bytes are stored | CR02 |
| L6 | Verification is a labelled sample service; no provider selected | CR07 |

### 7.6 Pending verification

| What | Why it is pending |
|---|---|
| Firefox text-only zoom | Needs a Playwright Firefox build not installed in this environment |
| Real assistive-technology testing | No screen reader available; the tree check is not a substitute |
| Real Windows High Contrast | Only emulation was run |
| Sample-guard rows 11 and 12 | Need a real backend to point `api` mode at |
| Photograph fidelity | Licensed imagery has not been settled (E-P3) |

---

## 8. Defects, root causes and corrections

Sixteen material defects, each with what it looked like, what actually caused it,
how it was reproduced, and what it changed about the method. Several were found
by driving a browser rather than by reading code; that is the pattern worth
extracting, and §8.17 does.

### 8.1 Enquiry writes were not idempotent, and PII travelled in a URL

**Symptom.** A repeated submission created a second enquiry. Separately, personal
information appeared in a confirmation URL.

**Cause.** No idempotency key on the write path; the confirmation route carried
identifying data as a parameter.

**Reproduced** by submitting twice and by reading the address bar — PRM-006 asked
for exactly these cases.

**Fix.** `95e59c7`. The form mints a key, the service treats it as an idempotency
key, and the confirmation is addressed by an opaque id.

**Regression.** `verify-enquiry-flow.mjs` covers repeat submission, two tabs and
two sessions; `tests/idempotency.test.mjs` covers the rule over combinations.

### 8.2 OTP behaved differently with and without JavaScript

**Symptom.** The OTP step behaved acceptably in a browser and differently with
scripting off.

**Cause.** Client-side behaviour that the server path did not reproduce.

**Fix.** Part of the enquiry hardening at `95e59c7`/`9b9bdaf`; the no-JavaScript
suite was extended to drive the path rather than assume it.

**Limitation, still true.** OTP is simulated. `verify-no-javascript.mjs` proves
the *form* works unhydrated; it proves nothing about delivery, and L1 in chapter
07 says so.

### 8.3 Account and owner screens were statically rendered

**Symptom, first occurrence.** Buyer account screens showed stale data.

**Cause.** Next collected them as static pages; per-account data was frozen at
build time.

**Fix.** `9b9bdaf` made the account screens dynamic.

**Second occurrence, 28 September.** `/owner/listings` had the same shape. It
*appeared* correct because every write calls `revalidatePath`, so nobody noticed
— until a production-mode build failed outright: the data source is resolved at
render time and there is no API client to resolve it to. Fixed at `5ecea35` with
`export const dynamic = "force-dynamic"` and a comment recording that per-account
data is not static data.

**What it taught.** A page can be wrong in a way that only shows up under a
different build mode. Passing suites in review mode did not catch it; attempting
an unrelated production build did.

### 8.4 Sample state split across bundles

**Symptom.** A review route set a Seller's balance to zero and returned 200, and
every page went on rendering the old balance.

**Cause.** Module-scope `let` is not per-process in Next. Route handlers, pages
and server actions are bundled separately, and each bundle instantiated its own
copy of the store module.

**Fix.** `2f5627e`. State moved onto `globalThis` under
`Symbol.for("kkl.sample.state")` via `processState()`.

**What it does not fix,** and the module says so: it is still one process. Two
instances, or a serverless deployment, do not share `globalThis`.

### 8.5 Incomplete reset, and a wallet that did not reconcile

**Symptom.** `resetForReview` restored the balance and cleared purchases while
retaining ledger entries, invoices, support threads and counters. Separately, the
seed ledger totalled 3,180 credits while the wallet opened at 4,200.

**Cause.** Two initialisation paths that had drifted, and a `balanceCredits`
field maintained *beside* the ledger the documentation said it was derived from.

**Reproduced** by the user, from the code, and stated with the two numbers
(PRM-008).

**Fix.** `9b6ffa9`. One fresh-state factory for both initialisation and reset;
the balance derived from the ledger so the invariant holds by construction; a
reconcile endpoint so a test can assert it rather than trust a comment.

**Regression.** `tests/ledger.test.mjs`; the flow suite run twice against one
server.

**What it taught.** A second copy of a derived value will drift. This is why a
lead order is derived from its purchase and ledger entry rather than stored
(chapter 06 §6.3).

### 8.6 Internal/public reply mode and decision controls resetting

**Symptom.** After a *refused* submission, a staff form came back with the
toggle reset and the typed text gone. In the CR02 decision form the `<select>`
reverted to its first option while the component's own state still held the
staff member's choice — so the next press recorded a decision nobody chose.

**Cause.** React 19 resets a form's DOM once its action completes. Correct for a
successful submission; wrong for a refused one. Where the mode lived in a hidden
input mirroring client state, the highlighted control and the submitted value
could disagree.

**Why it mattered more than it looked.** A staff member who selected "Internal
note", hit a validation error, retyped and pressed again would have **sent their
note to the user**. The same shape existed in the support console and CR03's
form — already-reviewed code — and in the credit adjustment, where it could have
moved money in a direction nobody picked.

**Reproduced** by driving the CR02 decision form: submit with a blank reason,
observe the refusal, then read back the select value and textarea.

**Fix.** `f74deb2`. The mode now rides on the submit button (`name="mode"`), so
the submitted value is what the pressed button said in the same render as its
label. The adjustment form's radio group became the submitted field rather than
a mirror. Owner forms echo submitted values back and re-sync from the echo.

**Regression.** `verify-owner-posting-flow.mjs` checks 25–29; CR03 and Admin
suites re-run.

### 8.7 Environment variables, and a guard test that could not fail

**Symptom.** A server started with only `KKL_ENV` refused a bundle that in fact
matched it; a server that set all four variables compared each value against
itself and could never disagree.

**Cause.** Both sides of the comparison were read through the same helper. Only
a *literal* `process.env.NEXT_PUBLIC_X` member access is substituted at build
time — a computed `process.env[name]` lookup reads the live process instead. The
build-time side was being read computed, so it was not build-time at all.

**Fix.** `66286c6`. The inlined values are read as literals and documented as
required to stay literal.

**The second half.** The deployment-guard suite "reported 8/8 from a test that
could not fail". It was replaced with a 72-combination truth table
(`tests/deployment-guard.test.mjs`) plus a shell script that builds and serves
real scenarios — the script proves the guard is *wired in*, the table proves it
is *right*.

**What it taught.** A green suite is evidence only if it can go red. Both the
implementation and its test were wrong in the same direction, which is the
failure mode that survives review.

### 8.8 Prototype width selection failed silently

**Symptom.** "Mobile" evidence that looked plausible and was captured at desktop
width.

**Cause.** `proto-width.mjs` clicked the width tab but never confirmed the stage
took it.

**Fix.** The script now measures the stage frame and **throws** if the width is
not the one requested. Affected captures were re-taken; superseded ones are
labelled rather than deleted. Closed at `4f125ec` (D-20).

### 8.9 The differ scraped the reviewer chrome

**Symptom.** Geometry differences everywhere, concentrated in page furniture.

**Cause.** The prototypes carry a round label, width tabs and a review panel. The
differ measured them as content.

**Fix.** Scoped to the emulated stage frame.

### 8.10 The differ could not see prototype headings

**Symptom.** Headings reported as agreeing when they had not been compared.

**Cause.** The element list omitted `div`, and the prototypes render headings as
styled `div`s. Every prototype heading was invisible to the tool.

**Fix.** `div` added to the element list; the affected screens re-measured.

**What it taught.** A tool reporting agreement may be reporting that it looked at
nothing. Both §8.9 and §8.10 produced *plausible* output.

### 8.11 Content-box versus border-box

**Symptom.** Systematic width differences between prototype and implementation.

**Cause.** Differing box-sizing between the exported prototype's styles and the
application's reset.

**Fix.** Normalised in the comparison and, where it was a genuine implementation
deviation, in the styles. Part of `7687105` — "Compare every screen, and fix four
shared deviations it found".

### 8.12 Shared styles overriding status-panel colours, and typography over-applying

**Symptom (a).** Status panels rendered with the wrong surface colours.
**Cause.** A shared style won over the panel's own.
**Fix.** `7687105`.

**Symptom (b).** A typography correction changed screens it should not have.
**Cause.** The correction was applied at the token level, across all call sites.
**Fix.** `b95e81e` resolved type **per context** — public section heading,
console panel heading, card title, page title — after PRM-012 warned against "a
blanket replacement across 152 call sites". The first attempt did exactly that
and was narrowed.

### 8.13 Locality search ranked the wrong match first

**Symptom.** Typing "New Town" and pressing Enter selected **Action Area I**.

**Cause.** Area labels read `"<area>, <parent>"`, so "New Town" substring-matched
its three Action Areas as well as itself. Matches were unordered, so the first
Action Area was highlighted.

**Reproduced** in a browser while verifying CR05 — the parent/child rule was
being checked, and this surfaced instead.

**Fix.** `c2ec702`. Ranked: exact label, then labels the query *starts*, then
labels that merely contain it.

**Regression.** `verify-labels-and-locations.mjs` checks 11–12, including that
choosing a parent locality replaces the child rather than keeping both.

### 8.14 Simultaneous suites resetting shared state

**Symptom.** During the 27 September audit, a submitted lead request appeared
missing from both the Admin queue and the Seller list, and a reference looked
reused.

**Cause — and this one was nearly filed as a defect that did not exist.**
`verify-lead-request-flow.mjs` was running in the background, and its `resetAll`
step (`/seller/review-state?reset=1`) had cleared the store mid-probe.

**Resolution.** Re-run in isolation, the request was visible cross-context. The
audit reported the near-miss explicitly rather than quietly dropping it.

**Standing risk.** The suites share one review-state endpoint and one process.
They must not run concurrently. This is a recommendation in chapter 04 §4.14,
not a solved problem.

### 8.15 A price typed as words vanished

**Symptom.** An owner typed "seven lakh"; the field saved blank with no message.

**Cause.** The money parser stripped non-digits, so the input became an empty
string and was stored as "not set".

**Fix.** `f74deb2`. Non-numeric input now returns `NaN` and the caller raises a
field error: "Enter the amount in figures — for example 7200000."

**What it taught.** Silently discarding input is worse than refusing it. The
person moves on believing the value is in.

### 8.16 Validation errors that rendered nothing

**Symptom.** A rejected CR03 submission looked like a submission that did
nothing — no error anywhere.

**Cause.** The backend client filed field errors under the backend's names
(`areaIds`) while the form looked up `errors.areas`.

**Fix.** `1940f11`. Names are mapped at the boundary, with a comment explaining
that the two must agree or a refusal is invisible.

### 8.17 Two withdrawn claims, and what the failures taught

Documentation was corrected twice when a claim proved unsupported:

- `748915f` — "retract an unproven cause". A record had asserted a cause the
  evidence did not support.
- `3a8645a` — "Record the Admin journey, B-15, and **the claims that were
  wrong**".
- A two-person financial approval workflow had been added without an approved
  source, and was removed under PRM-010.

Across these sixteen entries, three lessons recur and are worth stating plainly:

1. **Several defects made the product look correct.** Static rendering (§8.3),
   the split store (§8.4), the incomplete reset (§8.5) and the silent width
   failure (§8.8) all produced plausible output. Suites that assert *behaviour*
   found them; suites that assert *rendering* did not.
2. **Tests failed in the same direction as the code more than once** (§8.7,
   §8.9, §8.10). A passing check is worth what its ability to fail is worth, and
   three of this project's checks were rewritten after being found unable to.
3. **The browser found what reading did not** (§8.6, §8.13, §8.15, §8.16). Every
   one of those is invisible in a diff and obvious within thirty seconds of
   driving the screen.

---

## 9. Client changes and decision history

CR01–CR07 arrived on 26–27 September against already-approved scope. This
chapter records what each asked, what was decided, what was built, and what is
still owed.

> **Phase 1 approval does not cover any of this.** PRM-014 stated it: "Phase 1
> was approved by the client… That approval does not automatically approve later
> deviations or new workflows."

### 9.1 How approval is recorded

A signed document is **not** required for an explicit written instruction to
count as approval, and none is demanded. Six answers from the project owner are
recorded in `docs/phase-2/decisions-received.md` with source, date, and the
exact workflow each authorizes.

What is **not** approval, stated once so it is not argued later: an environment
variable, a sample-mode default, a review control, a screen that has been
rendering a rule for weeks, or a passing test. Where the code needs a decision it
does not have, it refuses rather than offering a switch (chapter 03 §3.5).

The remainder of `KKL_Client_Change_Confirmation.docx` — every field list,
status name and workflow it proposes that nobody answered — remains a proposal.

### 9.2 The six decisions

| ID | Date | Answer | Authorizes | Explicitly does **not** authorize |
|---|---|---|---|---|
| A-1 | 27 Sep | "Direct order + wallet" | CR04's order journey and order record | A cart, any gateway, any tax treatment, any refund path |
| A-2 | 27 Sep | "Submit for review, never auto-publish" | CR02 through to a staff decision | Publishing a cleared listing, charging an owner, awarding a verification |
| A-3 | 27 Sep | "Selective, action-based" verification | CR07's whole structure; retains the purchase restriction | A provider, document collection, a compliance claim, an expiry period |
| A-4 | 27 Sep | "I'll supply both" (CR06 assets) | Nothing — superseded by A-6 | — |
| A-5 | 28 Sep | Lead requests need no verification | `request_leads` = not required, as a **product decision** | Any other action; any compliance determination |
| A-6 | 28 Sep | Type 1 is the attached image | CR06-a complete — it is the existing approved homepage | CR06-b, which still needs the logo file |

#### A-5 in full, because its framing matters

> "Submitting a lead request does not require KYC. Keep the existing
> verification restriction on purchasing leads. This instruction does not remove
> verification requirements from other actions."
>
> "Record this as my product decision… Do not describe it as a legal-compliance
> determination."

This is carried structurally, not editorially. `PolicyBasis` is
`specification | product_decision | assumption` and **has no `compliance`
value**. The customer row says only what a customer needs; the attribution,
date, and the distinction from a compliance determination live on the Admin case
detail and in the policy documentation (PRM-018).

**If a compliance adviser later says a check is legally required, that overrides
this decision and is a different kind of input.**

### 9.3 CR01 — "Buy Leads" wording

**Asked.** Use "Buy Leads" for the lead-marketplace entry and lead-buying
context; keep property Buy/Rent distinct; *do not replace every occurrence of
Buy across the product*.

**Built.** Rails, marketplace headings, buying actions, and the sentences
pointing at them. Six body-copy references that named the destination were
changed on 27 September (`c2ec702`).

**Deliberately not changed.** The property portal's Buy intent, and the footer
and metadata taglines describing KKL as "a property portal and a lead
marketplace" — prose about what the product is. "A Buy Leads for verified
brokers" is not English, and the instruction was explicit.

**Verified** by where each label links, not by word counts: `Buy` → `/search`,
`Buy Leads` → `/brokers`.

**Status.** Implemented, wording only. No dependency.

### 9.4 CR02 — individual owner property posting

**Asked.** Replace the inert `/post-property` with a working journey; reuse
suitable listing components "without treating an individual owner as a Builder
subscriber or a lead-buying broker"; disclose sample uploads; do not silently
publish, charge or award verification.

**Decided (A-2).** Submit for review; never auto-publish.

**Built.** `/post-property` → `/owner/listings` → six steps at their own URLs →
preview → submit → the listing record; plus `/admin/owner-listings` and its
detail. Eleven inventory rows. Decisions require reasons and append to history.

**What it refuses to say.** The button is "Send for review". "Cleared" reads
"Cleared — not published". The photographs step states the files are not stored,
and the Admin screen tells a reviewer that a photograph review is not possible.

**Sample vs persistent.** Process memory. No persistence requirement was stated
for owner drafts, so none is claimed.

**Remaining.** Photo storage; publication policy (whether a cleared listing
publishes, when, on what terms, at what cost); draft persistence.

### 9.5 CR03 — Seller lead requests

**Asked.** Complete the journey end to end, and — the part that mattered —
"Permanent storage is an explicit client requirement. Do not claim process
memory, browser storage or a sample store fulfils it." With authorization to
build narrowly in `kkl-backend`, and: "Do not substitute a mock and call it
done."

**Built.** `kkl-backend` branch `claude/cr03-lead-requests`: four migrations,
RLS policies, server-side sessions, a nine-route REST surface. `kkl-web` calls
it through the existing service interface when `KKL_LEAD_REQUESTS=backend`.

**Sample vs persistent.** **The only genuinely persistent domain.** A request is
a PostgreSQL row that survives a restart; one account cannot read another's,
enforced by the database. Without the variable the sample store answers and the
screens say records last for the session only. No fallback between them.

**Remaining.** **Authentication is not built** — chapter 11 §11.5. Also open:
whether a Seller may withdraw a request, and retention for closed requests.

### 9.6 CR04 — lead purchase orders

**Asked.** Complete the order journey; preserve genuine masking; keep payment
and invoice interfaces explicit; "Do not invent prices, tax treatment, refund
policy or a gateway selection."

**Decided (A-1).** Direct order settled from wallet credits.

**Built.** The existing flow already was preview → direct order → wallet payment
→ release → history. What was added is **the order as a record**: My purchases
and order detail in both consoles, payment traced to its ledger entry, invoice
state stated rather than implied, and a replayed submission reported as a repeat.

**What it refuses.** No `refunded` status and no refund or cancel control (D-14
open). No gateway named or contacted. No invoice download — the taxable event
was the recharge, and per-order documents and tax treatment are open (D-13).

**Remaining.** Payments; tax treatment and per-order invoicing; refund policy.
Cart and gateway remain a later addition.

### 9.7 CR05 — expandable location search

**Asked.** Consistent India → State → City → Area selection across property
search, owner and Builder listing forms, lead-marketplace filters, Seller
lead-request forms and relevant Admin views; stable identifiers; a parent change
must clear incompatible children; no duplicated hardcoded locality lists.

**Built.** One hierarchy (55 area records, launch scope West Bengal/Kolkata),
stable ids in URLs and storage, a searchable picker on all six surfaces, and
hierarchy-aware matching. A defect was found and fixed during verification
(chapter 08 §8.13).

**On the parent/child rule.** The area picker is a single selection, so choosing
a parent *replaces* a child — asserted in the suite. A city-level parent change
is not reachable in the launch scope, because Kolkata is the only city.

**Remaining.** Database-backed location management — the 55 records are a
fixture, not an administered table.

### 9.8 CR06 — visual direction

Split into two items on 28 September so neither holds up the other.

**CR06-a — Complete.** Type 1 is the **existing approved homepage** — the
kkl-design Round 3 prototype, already built. Compared at 1209 px: header, hero
and search card match, copy word for word. **No redesign required.** Evidence in
`docs/phase-2/evidence/cr06/`.

Differences found, none of them design: stock photography (the imagery
dependency), "Search 128 properties" against "Search 8" (sample-data volume),
and the review build's SAMPLE DATA strip.

**CR06-b — In progress.** Awaiting the authoritative logo file. **Colour
verification has not started.** Retained meanwhile:

- the **current palette**, unchanged — no token, no hex value;
- the **accessibility corrections** E-P2a and E-P2b. A logo file is a reason to
  check colours, not to undo an accessibility fix;
- **no colour inferred from a screenshot** — a hex read off a lossy JPEG is a
  guess presented as a measurement.

When the file arrives, divergences are reported *before* anything changes, and a
logo colour that disagrees with a contrast requirement goes to the owner as a
decision.

**Tracked separately.** Type 1's search card shows a locality and a budget
pre-selected. **The build preserves "All of Kolkata" and "Any budget" and keeps
them unless instructed otherwise.** A prototype screenshot is usually posed, and
pre-filling a buyer's search is a product decision, not a styling one.

### 9.9 CR07 — verification policy

**Asked.** Resolve the written-document/call conflict: the specification
proposes third-party verification before an owner may publish; the call says KYC
is compliance-based and mostly unnecessary.

**Decided (A-3, then A-5).** Selective and action-based.

**Built.** Seven outcomes with `not_required` distinct from `verified`; no case
opened by registering; cases with references and history; the Admin queue split
between what needs a person and routine processing; a provider failure that can
never become a pass; reason-gated decisions with history and audit; and the
existing Seller purchase restriction retained.

**Sample vs persistent.** Process memory, and a labelled **sample verification
service**. No provider selected, no identity document collected, no compliance
claimed.

**Remaining.** Identity-provider integration; expiry period, consent and
retention.

### 9.10 Status check against later evidence

Every distinction this chapter is required to preserve was re-checked against
the repository at `36114f5`, and none has been changed by later work:

| Statement | Still true at `36114f5`? | Evidence |
|---|---|---|
| Submitting a lead request needs no verification — product decision | Yes | `verification-policy.ts` `request_leads`: `required: false`, `basis: "product_decision"` |
| Lead purchasing retains its verification requirement | Yes | same file, `purchase_lead`: `required: true` |
| Product decisions are not legal-compliance determinations | Yes | `PolicyBasis` has no `compliance` value; screen copy says so |
| CR06-a: Type 1 is the existing approved homepage | Yes | `evidence/cr06/`, `change-register.md` |
| CR06-b in progress; colour verification not started | Yes | `change-register.md`, `owner-review.md` §4b |
| Current palette and accessibility corrections retained | Yes | no token changed since `5c3a658`; E-P2a/E-P2b still applied |
| Search defaults remain "All of Kolkata" and "Any budget" | Yes | homepage renders both; no instruction changed them |
| Phase 1 approval does not cover later deviations | Yes | `change-register.md` header |

---

## 10. Environments and reproducibility

Exact commands to reproduce the build and the suites, with build-time and
run-time variables kept apart because conflating them was a real defect
(chapter 08 §8.7).

### 10.1 Prerequisites

| Requirement | Version used | Note |
|---|---|---|
| Node.js | 22.22.2 | `package.json` pins `engines.node: "22.x"` |
| npm | 10.9.7 | |
| Playwright Chromium | — | Only the browser suites need it. Firefox is **not** installed, so `verify-firefox-text-zoom.mjs` cannot run |
| PostgreSQL | 16.13 | **Only** for the CR03 backend and its persistence suite |

`kkl-web` needs no database. Nothing in the frontend talks to PostgreSQL.

### 10.2 The two kinds of variable

This distinction is the one to get right.

**Build-time — frozen into the bundle.** Must be on the `next build` line. Only a
literal `process.env.NEXT_PUBLIC_X` member access is substituted.

| Variable | Values | Purpose |
|---|---|---|
| `NEXT_PUBLIC_KKL_ENV` | `development` \| `review` \| `production` | What this bundle was built as |
| `NEXT_PUBLIC_KKL_DATA_SOURCE` | `sample` \| `api` | Which services the bundle expects |
| `NEXT_PUBLIC_KKL_API_BASE_URL` | URL | Required when the data source is `api` |
| `NEXT_PUBLIC_KKL_IMAGE_ORIGIN` | URL | Optional; review photography |

**Run-time — read from the process on every request.** Deliberately *without*
the prefix, so they are not frozen.

| Variable | Values | Purpose |
|---|---|---|
| `KKL_ENV` | same three | What the server says it is; compared against the bundle |
| `KKL_DATA_SOURCE` | `sample` \| `api` | Same, compared against the bundle |
| `KKL_LEAD_REQUESTS` | `backend` \| unset | CR03 store selection |
| `KKL_LEAD_REQUESTS_BASE_URL` | URL | Where kkl-backend is |
| `KKL_LEAD_REQUESTS_DEV_SECRET` | secret | Shared secret for the development authenticator. **Server-side only — must never be given a `NEXT_PUBLIC_` prefix** |
| `KKL_LEAD_REQUESTS_SELLER_REF` / `_STAFF_REF` | string | Stable external account handles; default to `kkl-web:sample-seller` / `kkl-web:sample-staff` |

A served build (`NODE_ENV=production`) that sets neither `KKL_ENV` nor
`KKL_DATA_SOURCE` **refuses to serve**. That is intentional: "nobody configured
this" must be visible, not a silent fallback.

No credentials appear in this repository. Variable *names* are documented; values
are not, and the `kkl_app` database role is created without a password so local
development uses the cluster's own trust rule and a deployment provisions one
out of band.

### 10.3 Review build (the documented configuration)

```sh
cd kkl-web
npm ci

NEXT_PUBLIC_KKL_ENV=review \
NEXT_PUBLIC_KKL_DATA_SOURCE=sample \
npx next build

KKL_ENV=review KKL_DATA_SOURCE=sample \
npx next start -p 3811
```

**Not `next dev`.** Every browser suite expects a production build served by
`next start`; the dev server behaves differently for static/dynamic rendering,
which is exactly where two defects lived.

Reset to a clean state at any point:
`http://127.0.0.1:3811/seller/review-state?reset=1&to=/seller`

### 10.4 CR03 with durable storage

```sh
# 1. PostgreSQL 16, a database, and the pgcrypto extension.
createdb kkl
psql -d kkl -c 'CREATE EXTENSION IF NOT EXISTS pgcrypto'

# 2. Migrations run as an owner/superuser role. The API never does.
cd kkl-backend                       # branch claude/cr03-lead-requests
npm ci
MIGRATE_DATABASE_URL='postgres://<owner>@127.0.0.1:5432/kkl' npm run migrate

# 3. The API connects as kkl_app — not the table owner, NOBYPASSRLS.
DATABASE_URL='postgres://kkl_app@127.0.0.1:5432/kkl' \
KKL_DEV_AUTH_SECRET='<local-only-secret>' \
PORT=4010 npm start
```

Then serve `kkl-web` with three extra run-time variables:

```sh
KKL_ENV=review KKL_DATA_SOURCE=sample \
KKL_LEAD_REQUESTS=backend \
KKL_LEAD_REQUESTS_BASE_URL=http://127.0.0.1:4010 \
KKL_LEAD_REQUESTS_DEV_SECRET='<same-local-only-secret>' \
npx next start -p 3811
```

The build is unchanged — this is a server-side switch, so the same bundle serves
both stores.

`GET /health` reports `devAuth: true` when the development authenticator is
enabled. **A deployment must leave `KKL_DEV_AUTH_SECRET` unset**, which makes the
route return 404; a deployment checklist should assert `devAuth: false`.

### 10.5 Running the suites

```sh
# Unit tests — no browser, no server.
cd kkl-web && npm test                      # node --test "tests/*.test.mjs"
npx tsc --noEmit && npm run lint

# Browser suites — need the review build above already serving on 3811.
PLAYWRIGHT=/path/to/playwright/index.mjs node scripts/verify-route-sweep.mjs
PLAYWRIGHT=… node scripts/verify-owner-posting-flow.mjs
PLAYWRIGHT=… node scripts/verify-lead-order-flow.mjs
PLAYWRIGHT=… node scripts/verify-verification-policy.mjs
PLAYWRIGHT=… node scripts/verify-labels-and-locations.mjs
PLAYWRIGHT=… node scripts/verify-seller-flow.mjs        # and builder / admin / enquiry

# CR03 persistence — restarts kkl-backend mid-run, so it needs its directory.
BACKEND_DIR=/path/to/kkl-backend BACKEND_URL=http://127.0.0.1:4010 \
KKL_DEV_AUTH_SECRET='<same-secret>' PLAYWRIGHT=… \
node scripts/verify-lead-request-persistence.mjs

# Backend suite.
cd kkl-backend
DATABASE_URL='postgres://kkl_app@127.0.0.1:5432/kkl' npm test
```

**Run them one at a time.** They share one review-state endpoint and one
process; concurrent runs reset each other's data and produce defects that are
not there (chapter 08 §8.14).

### 10.6 Platform and environment notes

| Item | Note |
|---|---|
| Windows | `verify-sample-mode-guard.sh` was made hermetic and Windows-runnable at `707d77b`. The `.mjs` suites are platform-independent given Node 22 and Chromium |
| Firefox | Not installed here; `verify-firefox-text-zoom.mjs` is pending, not failing |
| Docker | Not available in the environment these results were recorded in; PostgreSQL was run from native binaries |
| Network | `unpkg.com` and `images.unsplash.com` were unreachable; review photography is therefore behind a flag and the imagery dependency (E-P3) is recorded rather than resolved |
| Ports | 3811 for `kkl-web`, 4010 for `kkl-backend`, 5432 (or 5433) for PostgreSQL. `next start -p` and `PORT` select them |

### 10.7 What cannot be reproduced from this repository

- **An `api`-mode production build.** `getServices()` throws for `dataSource=api`
  because the kkl-backend API client does not exist. This is why the CR07
  production guard cannot fire.
- **Any live service.** No OTP, payment, notification or verification provider is
  contacted anywhere.
- **The Phase 1 design session.** `kkl-design` holds the export; the process that
  produced it is not reproducible from any repository.

---

## 11. Current status and outstanding work

A dated snapshot: **28 September 2026**, `kkl-web` `36114f5`, `kkl-backend`
`bc8ab30`. No schedule estimates appear here, because none has been agreed.

### 11.1 Status by dimension

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

### 11.2 Frontend exceptions still open

| ID | What | Decision needed | Whose |
|---|---|---|---|
| E-P1 | Browser Back leaves the listing editor without the custom dialog. Forward restores unsaved edits with a notice; nothing is ever silently saved | Accept the behaviour, or fund the Next 16 Cache Components route and its four named costs | Client, or the designer who specified B-15 |
| E-P2a | Focus indicator gains a 1 px ink companion edge (2.11:1 → 17.63:1) | Keep it, or name another remedy | Designer |
| E-P2b | Control border darkened `#C6CCE0` → `#8A8E9C` (1.60:1 → 3.27:1) | Keep it, or name another remedy | Designer |
| E-P3 | Review imagery draws the attribution band on every card; the approved P-01 draws it on project cards only | Confirm the treatment, or ask for it dropped now | Designer |

Both E-P2 corrections are applied and reversible in one line. What is open is
sign-off, not code. **None has been marked accepted.**

### 11.3 Waiting on the client

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

### 11.4 Platform dependencies, kept separate from frontend completion

None is frontend work or waiting on frontend work.

| Dependency | Blocks | Owner |
|---|---|---|
| **Photo storage** — object storage, virus scanning, retention | CR02 showing a real photograph to an owner or reviewer | kkl-backend |
| **Payments** — provider, settlement, reconciliation, tax | CR04 taking real money, issuing a real invoice | kkl-backend + a client decision |
| **Identity-provider integration** — provider, consent, retention, and the authenticator | CR07 being a compliance control; CR03 being authenticated | kkl-backend + the client's compliance adviser |
| **Publication policy** | CR02's journey past "cleared" | Client decision |

### 11.5 The authentication boundary

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

### 11.6 Why this is not deployment-ready

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

### 11.7 Contradictions found while writing this, and not fixed

PRM-020 asked for discrepancies to be described rather than tidied away. Four
were found. **None has been changed.**

| # | Contradiction | Where | Assessment |
|---|---|---|---|
| 1 | `owner-review.md` header says "Implementation: `5c3a658`", 21 commits behind `36114f5` | `docs/phase-2/owner-review.md` | Partly addressed at `36114f5` by scoping §5 to the Phase 2 exceptions, but the header line still names `5c3a658` without qualification. The exception evidence it describes *is* from that commit, so the line is not wrong — it is incomplete |
| 2 | `implementation-checklist.md` and `coverage.md` predate the CR work and do not mention the 19 CR screens | `docs/phase-2/` | They describe the 113-row Phase 2 scope accurately. A reader could mistake them for current coverage; `cr-implementation-verification.md` is the CR record |
| 3 | `verification.md` records Phase 2 suite results without the CR-era figures | `docs/phase-2/verification.md` | Same shape as #2. The two records are consistent with each other but neither is a single current picture; chapter 07 §7.2 is the first place all results appear with their commits |
| 4 | The session's own task list shows 57 tasks, all "completed", including tasks whose subject matter is still open (e.g. "Phase 2 frontend handoff pack") | session tooling, not a repository file | "Completed" there means the work item was finished, not that the underlying question is resolved. It is not an acceptance record and should not be read as one |

### 11.8 What a reader should take from this package

Two sentences, if only two are read:

> Kaam Ki Lead has a complete, verified frontend for six audiences over sample
> services, one genuinely persistent and account-isolated backend domain, and a
> documented set of decisions and dependencies that are explicit about what has
> not been decided.

> Nothing here has been accepted by anyone, authentication does not exist, and
> the parts that are sample say so on screen.

---

## Appendix A. Traceability matrix

The same rows as `traceability.csv`, rendered for reading. The CSV remains the
machine-readable copy; both are generated from the same file, so a row that
appears here appears there.

Each row connects a prompt to what it produced: prompt → requirement or CR →
screen or state → repository and files → commit → verification evidence →
evidence class → current status.

Evidence classes are the ones defined in chapter 7 — **H** historical, **A**
audit-rerun, **C** CR-pass, **S** source inspection, **V** visual inspection,
**G** geometry/token, **L** known limitation; a pair such as `G/H` means both
applied. A dash means the row has no verification evidence at all, which is the
honest answer for an interrupted prompt or a re-issue that produced no work of
its own.

| prompt id | date | requirement or cr | screen or state id | repository | key files | commits | verification evidence | evidence class | current status |
|---|---|---|---|---|---|---|---|---|---|
| PRM-001 | 2026-09-15 | Project brief; three-repository plan | — | kkl-backend | docs/requirements.md; docs/architecture.md; docs/demo-assessment.md | a15a508 | Documentation review only | S | Delivered |
| PRM-001 | 2026-09-15 | First prototype and screen inventory | P-*, S-*, B-*, A- (draft) | kkl-web | sitemap, screen inventory, journeys, clickable prototype | 348ebb7 | None; superseded | S | Superseded |
| PRM-001 | 2026-09-15 | Voice protocol notes | — | kkl-voice | README + protocol notes | 349bd16 | None | S | Delivered |
| PRM-002 | 2026-09-15 | Phase 1 rejected; design briefing package | — | kkl-web | DESIGN_BRIEF.md; 01-06 supporting docs | b5c3f9f | Content review vs source PDFs | S | Delivered |
| PRM-003 | 2026-09-21 | Claude Design import (interrupted) | — | kkl-design | KKL Component and State Library.dc.html | 5bc3512 | n/a — interrupted | — | Superseded |
| PRM-004 | 2026-09-21 | Peer-relayed duplicate (interrupted) | — | — | — | — | n/a — interrupted | — | Superseded |
| PRM-005 | 2026-09-21 | Phase 2: shared foundation + homepage | P-01;C-01..C-12 | kkl-web | src/app/globals.css; src/components/ui/*; src/components/layout/* | 34079e9;36502c3 | verify-design-tokens 30/30+43/43 @5c3a658 | G/H | Delivered |
| PRM-005 | 2026-09-21 | Phase 2: public portal and Buyer | P-02..P-21 | kkl-web | src/app/(public)/**; src/lib/services/sample/enquiry-store.ts | b860df2;cbb4ba3 | verify-enquiry-flow 17/17 @c2ec702 | C | Delivered |
| PRM-006 | 2026-09-21 | P-15 Profile, P-16 Notifications | P-15;P-16 | kkl-web | src/app/(public)/account/** | a43973a | route sweep; enquiry suite | C | Delivered |
| PRM-006 | 2026-09-21 | Review imagery behind a flag | E-P3 | kkl-web | src/lib/services/sample/review-imagery.ts | 0635e6f | evidence/e-p3/* | V | Partial — licence open |
| PRM-006 | 2026-09-21 | Enquiry idempotency; PII out of URLs | P-08..P-11 | kkl-web | src/app/actions/enquiry.ts; enquiry-store.ts | 95e59c7 | tests/idempotency.test.mjs 27/27 @2dd368c | C | Delivered |
| PRM-006 | 2026-09-21 | Account screens dynamic; run-time guard | P-13..P-16 | kkl-web | src/lib/config/runtime.ts; src/proxy.ts | 9b9bdaf | verify-sample-mode-guard 10/10 @707d77b | H | Delivered |
| PRM-006 | 2026-09-22 | Process-held sample state | all sample | kkl-web | src/lib/services/sample/process-state.ts | 2f5627e | cross-bundle reset observable | C | Delivered |
| PRM-006 | 2026-09-22 | Retract an unproven cause | — | kkl-web | docs/phase-2/verification.md | 748915f | documentation correction | S | Delivered |
| PRM-007 | 2026-09-22 | Re-issue of PRM-006 | — | — | — | — | — | — | Superseded |
| PRM-008 | 2026-09-22 | Seller reset determinism; wallet reconcile | S-14..S-21 | kkl-web | src/lib/services/sample/seller-store.ts | 9b6ffa9 | tests/ledger.test.mjs; flow suite run twice | C | Delivered |
| PRM-008 | 2026-09-22 | Builder journey | B-01..B-24 | kkl-web | src/app/builder/**; src/components/builder/* | ae03160;1edfbf2;567a2c2 | verify-builder-flow 48/48 @c2ec702 | C | Delivered |
| PRM-009 | 2026-09-22 | B-15 unsaved changes | B-15 | kkl-web | src/components/builder/unsaved-changes.tsx | 5829839 | verify-b15-navigation 9/9 @5c3a658 | H | Partial — E-P1 open |
| PRM-009 | 2026-09-22 | Admin console | A-01..A-31 | kkl-web | src/app/admin/**; src/lib/services/sample/admin-store.ts | 3c1b0fd;b0f0a3a;3a8645a | verify-admin-flow 36/36 @c2ec702 | C | Delivered |
| PRM-010 | 2026-09-23 | Acceptance pass; four-category split | — | kkl-web | docs/phase-2/acceptance.md; exceptions.md | 44db69e | category split recorded | S | Delivered |
| PRM-010 | 2026-09-23 | B-15 Back made harmless | B-15;E-P1 | kkl-web | src/components/builder/unsaved-changes.tsx | e0f23b9 | evidence/e-p1/*.webm + frame strip | V | Awaiting decision |
| PRM-010 | 2026-09-23 | Deployment guard bundle-vs-server fix | — | kkl-web | src/lib/config/runtime.ts | 66286c6 | tests/deployment-guard.test.mjs 72 combinations | C | Delivered |
| PRM-010 | 2026-09-23 | Rendered comparison; shared deviations | multiple | kkl-web | scripts/capture-visual-comparison.mjs | 0fdbf45;b19e6b1;578492e;7687105;dfb0165 | visual/*.json; evidence/* | G/V | Delivered |
| PRM-011 | 2026-09-23 | Map 113 inventory rows to evidence | all 113 | kkl-web | scripts/screen-map.mjs; build-coverage-matrix.mjs | 011bade;969ae3d | docs/phase-2/coverage.md | G | Delivered |
| PRM-011 | 2026-09-23 | Geometry differ | all | kkl-web | scripts/verify-screen-geometry.mjs | 011bade | visual/geometry-1440.json; -390; -768 | G | Delivered |
| PRM-012 | 2026-09-23 | Typography per context | multiple | kkl-web | src/app/globals.css | b95e81e | verify-typography 11/11 @5c3a658 | G/H | Delivered |
| PRM-012 | 2026-09-23 | Guard suite hermetic and Windows-runnable | — | kkl-web | scripts/verify-sample-mode-guard.sh | 707d77b;1591aa0 | 10/10 + 2 pending @707d77b | H | Partial |
| PRM-013 | 2026-09-23 | E-P5/E-P6 baseline corrections | B-02;B-07 | kkl-web | src/app/builder/** | b9e7e53;7afe140 | evidence/* | V | Delivered |
| PRM-013 | 2026-09-25 | D-20 evidence impact; E-P3 refresh | E-P3;D-20 | kkl-web | scripts/proto-width.mjs | 4f125ec | evidence/e-p3/*-b9e7e53.png | V | Delivered |
| PRM-013 | 2026-09-26 | Responsive type pass | multiple | kkl-web | src/app/globals.css; docs/phase-2/visual-differences.md | 5c3a658;e6ec30b | visual/geometry-768.json | G | Delivered |
| PRM-014 | 2026-09-27 | Evidence-based completion review | — | kkl-web | none — audit only | (stash@{0} created, unapplied) | route sweep 236/236; lead-request 15/15; guard 10/10 re-run | A | Delivered |
| PRM-015 | 2026-09-26 | CR05 central location model | CR05;all pickers | kkl-web | src/lib/services/sample/locations.ts; src/components/location/area-picker.tsx | abf454a | verify-labels-and-locations 23/23 @c2ec702 | C | Delivered |
| PRM-015 | 2026-09-26 | CR01 Buy Leads rename | CR01 | kkl-web | src/components/seller/seller-nav.ts; builder-nav.ts | 23d24b0;537a265;c2ec702 | verify-labels-and-locations checks 1-8 | C | Delivered |
| PRM-015 | 2026-09-26 | CR03 sample journey | CR03 | kkl-web | src/lib/services/sample/lead-request-store.ts; src/app/seller/requests/** | 9220c32 | verify-lead-request-flow 15/15 | C | Superseded by durable store |
| PRM-015 | 2026-09-26 | CR02 prepared (inert) | CR02 | kkl-web | src/app/(public)/post-property/page.tsx | 7220f42 | renders; 0 forms by design | S | Superseded |
| PRM-015 | 2026-09-26 | CR01-CR07 register; KYC matrix | CR01-CR07 | kkl-web | docs/phase-2/change-register.md; kyc-policy-matrix.md | 90770ef | documentation | S | Delivered |
| PRM-015 | 2026-09-27 | CR03 durable backend | CR03 | kkl-backend | migrations/001-004; src/db/pool.mjs; src/http/server.mjs | 21903ba;4fb7b9d | backend npm test 19/19 @4fb7b9d | C | Delivered |
| PRM-015 | 2026-09-27 | CR03 kkl-web wiring | CR03 | kkl-web | src/lib/services/backend/lead-requests.ts; config.ts | 1940f11 | verify-lead-request-persistence 9/9 | C | Delivered |
| PRM-015 | 2026-09-27 | CR02 owner journey | CR02-01..CR02-11 | kkl-web | src/app/(public)/owner/**; src/app/admin/owner-listings/** | f74deb2 | verify-owner-posting-flow 31/31 @f74deb2 | C | Delivered |
| PRM-015 | 2026-09-27 | Form-safety fix (mode on the button) | CR02;CR03;A-23;A-19 | kkl-web | src/components/admin/*.tsx | f74deb2 | owner 31/31; CR03 15/15; admin 36/36 | C | Delivered |
| PRM-015 | 2026-09-27 | CR04 order record | CR04-01..CR04-05 | kkl-web | src/app/seller/orders/**; src/components/console/order-views.tsx | 6b7f777 | verify-lead-order-flow 20/20 @6b7f777 | C | Delivered |
| PRM-015 | 2026-09-27 | CR07 verification policy | CR07-01..CR07-03 | kkl-web | src/lib/config/verification-policy.ts; src/app/admin/verification/** | 51a5627 | verify-verification-policy 19/19 @51a5627 | C | Delivered |
| PRM-015 | 2026-09-27 | CR01+CR05 completion; locality ranking fix | CR01;CR05 | kkl-web | src/components/location/area-picker.tsx | c2ec702 | verify-labels-and-locations 23/23 | C | Delivered |
| PRM-015 | 2026-09-27 | Inventory +19 CR rows; CR records | CR02;CR04;CR07 | kkl-web | docs/phase-2/inventory.json; cr-implementation-verification.md | 6a00cdd | route sweep 268/268 | C | Delivered |
| PRM-016 | 2026-09-28 | Decisions received; authentication boundary | CR03;CR06;CR07 | kkl-web | docs/phase-2/decisions-received.md; cr03-authentication-boundary.md | 5ecea35 | documentation; owner 31/31 + verification 19/19 re-run | C | Delivered |
| PRM-016 | 2026-09-28 | /owner/listings force-dynamic | CR02-02 | kkl-web | src/app/(public)/owner/listings/page.tsx | 5ecea35 | production-mode build no longer fails on this page | C | Delivered |
| PRM-016 | 2026-09-28 | Backend authentication pointer | CR03 | kkl-backend | docs/cr03-lead-requests.md | bc8ab30 | documentation | S | Delivered |
| PRM-017 | 2026-09-28 | A-5 lead-request product decision | CR07-01 | kkl-web | src/lib/config/verification-policy.ts; src/proxy.ts | ba252d9 | verify-verification-policy 22/22 @ba252d9 | C | Delivered |
| PRM-017 | 2026-09-28 | Environment override removed | CR07 | kkl-web | src/lib/config/verification-policy.ts | ba252d9 | guard cannot fire — stated, not claimed | S | Delivered |
| PRM-018 | 2026-09-28 | Customer copy simplified; provenance to Admin | CR07-01;CR07-03 | kkl-web | src/app/seller/verification/page.tsx; src/app/admin/verification/[reference]/page.tsx | 2dd368c | verify-verification-policy 23/23 @2dd368c | C | Delivered |
| PRM-018 | 2026-09-28 | CR06-a Type 1 identified | CR06-a;P-01 | kkl-web | docs/phase-2/evidence/cr06/ | 2dd368c | 1209px comparison; both images retained | V | Complete |
| PRM-019 | 2026-09-28 | CR06 status; register and owner review | CR06-a;CR06-b | kkl-web | docs/phase-2/change-register.md; owner-review.md | 36114f5 | documentation only | S | Delivered |
| PRM-020 | 2026-09-28 | Technical history package | all | kkl-web | docs/technical-history/** | (this commit) | no suite re-run by design | S | Delivered |
