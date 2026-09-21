# Approved Baseline — Phase 2

Record of the design approval that authorises Phase 2 frontend implementation, and the gap
analysis between what exists in this repository and what was approved.

## 1. Approval of record

| Field | Value |
|---|---|
| Approval | Phase 1 designs approved by the client |
| Approved baseline named | **"KKL - Screen 7 - Admin"** |
| Implementation target named | `KKL Component and State Library.dc.html` |
| Declared dependencies of that file | `image-slot.js`, `support.js` |
| Source | Claude Design project `b0950068-96de-4bdd-aff2-8e66216ef895` |
| Recorded on | 21 Sep 2026 |
| Recorded by | Phase 2 implementation session |

This supersedes the Phase 1 status recorded in `delivery-plan.md`, which gated Phase 2 on written
design approval. Phase 2 is now authorised.

## 2. Access status of the approved artifacts — **BLOCKED**

**The approved design files could not be retrieved in this session.** Four routes were attempted:

| Route | Result |
|---|---|
| `DesignSync` MCP (`get_project`) | Rejected — design-system authorization not granted; `/design-login` cannot run in a non-interactive session |
| Workspace seeding ("Send to Claude Code Web") | No `.dc.html`, `image-slot.js` or `support.js` anywhere on the filesystem |
| Session uploads | Contains only the two original Phase 0 PDFs |
| Direct fetch of the project URL | HTTP 403 (authenticated URL) |

**Consequence:** the approved appearance cannot be read, and therefore cannot be preserved. Any
visual foundation, component styling, layout or screen markup written before these files are
available would be invention, not implementation — which is precisely what the Phase 1 rejection
was about. No visual work has been done for that reason. See §5.

### How to unblock

Any one of these is sufficient:

1. Run `/design-login` once from an interactive Claude Code session on this machine — headless and
   subsequent runs reuse that authorization.
2. Use Claude Design's **"Send to Claude Code Web"**, which seeds the project into the workspace.
3. Attach the three files directly to the session: `KKL Component and State Library.dc.html`,
   `image-slot.js`, `support.js`.

Option 2 or 3 is likely fastest given this is a cloud session.

## 3. What exists in this repository today

| Artifact | Location | Status |
|---|---|---|
| Rejected Phase 1 prototype | `docs/design/prototype/` | Preserved, unchanged. Workflow reference only — its **visual direction was rejected** and must not be used as a styling basis (`design-brief/06-rejected-visual-direction.md`). |
| Design brief package | `design-brief/` | Current. Written to commission the approved designs. |
| Sitemap / screen inventory / journeys | `docs/design/`, `design-brief/03-…` | Current. |
| **Application code** | — | **None existed before this session.** kkl-web was documentation-only. |

## 4. Differences between existing code and the approved designs

**There was no application code to differ.** The gap is total by construction: Phase 2 starts from
an empty application. The meaningful comparison is between the *rejected prototype* and the
*approved designs*, and that comparison cannot be made until §2 is unblocked.

What can be stated now:

- The rejected prototype's visual language (placeholder green, flat cards, blur-masking, reflow-only
  mobile) is **known not to be the approved design**, so nothing in it is a valid starting point for
  appearance.
- The prototype's **workflows and screen content** were accepted as a functional inventory and are
  expected to survive into the approved designs, but this is an expectation, not a verified fact.

### Open discrepancy to reconcile once the designs are readable

The approved baseline is named **"Screen 7 - Admin"**. The screen inventory in
`design-brief/03-sitemap-screens-journeys.md` numbers screens 1–16 in priority order, where **#7 is
"Buyer — my enquiries"** and the Admin KYC queue is **#16**. The design project therefore uses its
own screen numbering, which does not map onto the brief's numbering.

**Action required on unblock:** build an explicit mapping between the design project's screen
numbers/names and the brief's screen inventory, and record it here. Do not assume the numbering
matches. Until that mapping exists, a reference to "Screen N" is ambiguous between the two
documents.

### Note on baseline choice

The approved baseline is an **Admin** screen, while the requested implementation order starts with
the homepage and Buyer journey. This is workable — the baseline's role is to fix the visual system,
and the implementation target is the component and state library rather than the Admin screen
itself — but it means the public-portal appearance is defined by the library and by the public
screens in the design project, not by the named baseline. Confirm on unblock that the public
portal screens exist in the design project at the same approval status.

## 5. Work done in this session under the blocker

Implemented — design-independent, unaffected by the approved appearance:

- Next.js / React / TypeScript / Tailwind application configuration.
- Domain types derived from the approved requirements.
- Business-rules configuration module (confirmed rules configurable; unresolved rules explicitly
  unresolved and non-defaulting).
- Sample-data service layer behind an interface, clearly separated from the real API boundary.
- API client boundary that holds no secrets, no payment authority, and no permissions enforcement.

Deliberately **not** implemented pending §2:

- Design tokens (colour, type, spacing, radii, elevation).
- Any component styling or reusable visual control.
- Page layouts, navigation chrome, or screen markup.
- The homepage and Buyer journey UI.

## 6. Carried-forward checks — not passed by design approval

Design approval does not discharge these. They remain open and are tracked in
`implementation-checklist.md`:

- Accessibility: contrast, focus visibility, form labelling, touch target sizing, keyboard paths,
  screen-reader semantics.
- Responsive behaviour verified on real breakpoints, not assumed from the design files.
- Loading, empty, error and access-denied states present on every data-backed screen.
- No simulated payment, authentication or messaging presented as live.
- Server-side authorization treated as authoritative; UI state is never the access control.
