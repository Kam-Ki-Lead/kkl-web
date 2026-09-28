# Kam Ki Lead — technical history

A prompt-by-prompt account of how Kam Ki Lead was built, what was decided, what
was verified, and what is still open. Written on **28 September 2026** against
the commits listed below.

This package documents work performed. **It is not an acceptance record.** No
client approval is inferred from a commit, a passing suite or a filled-in
template anywhere in these pages.

## Chapters

| # | File | What it covers |
|---|---|---|
| — | [Source coverage](#source-coverage) | What history was retrievable, and what was not |
| 01 | [Project scope and evolution](01-project-scope-and-evolution.md) | Demo → three repositories → Phase 1 → Phase 2 → client changes |
| 02 | [Prompt-by-prompt worklog](02-prompt-by-prompt-worklog.md) | PRM-001…PRM-020, with disposition for each |
| 03 | [Architecture and repository boundaries](03-architecture-and-repository-boundaries.md) | What each repository owns, and the service boundary |
| 04 | [Design and frontend methodology](04-design-and-frontend-methodology.md) | Baseline preservation, prototype translation, evidence |
| 05 | [Role journeys and screen implementation](05-role-journeys-and-screen-implementation.md) | Public, Buyer, Seller, Builder, Owner, Admin |
| 06 | [Data services and backend integration](06-data-services-and-backend-integration.md) | Typed contracts, sample stores, the CR03 backend |
| 07 | [Security, verification and accessibility](07-security-verification-and-accessibility.md) | Every suite, what it proves and what it does not |
| 08 | [Defects, root causes and corrections](08-defects-root-causes-and-corrections.md) | Sixteen material defects and what they taught |
| 09 | [Client changes and decision history](09-client-changes-and-decision-history.md) | CR01–CR07, decisions received and outstanding |
| 10 | [Environments and reproducibility](10-environments-and-reproducibility.md) | Exact commands, variables, platform notes |
| 11 | [Current status and outstanding work](11-current-status-and-outstanding-work.md) | Dated snapshot, by dimension |
| — | [traceability.csv](traceability.csv) | Prompt → requirement → screen → file → commit → evidence → status |

**[KKL_Technical_Documentation.md](KKL_Technical_Documentation.md)** is the same
material as one document. It is generated from these chapter files by
`build-consolidated.mjs`, so the two cannot drift apart.

## Repositories and commits documented

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

## Source coverage

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
