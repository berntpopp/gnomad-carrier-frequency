# Phase 23: Onboarding & Visual Polish - Context

**Gathered:** 2026-02-23
**Status:** Ready for planning

<domain>
## Phase Boundary

First-time user guidance with a welcome hero card and CFTR quick-start, mobile space optimization with title hiding and gene context chip, and migration of all native browser dialogs to Vuetify dialogs via a reusable composable.

</domain>

<decisions>
## Implementation Decisions

### Welcome card design
- Inline card above Step 1 gene search content — no modal, no overlay, nothing blocked
- Card appears after disclaimer acceptance for first-time visitors (no localStorage state)
- Brief intro (1-2 sentences explaining what the tool does) + "Try with CFTR" CTA button
- Text only — no illustrations, icons, or emoji. Clean, professional tone
- Elevated card with subtle primary color tint background and shadow — visually distinct from wizard content
- Auto-dismisses when user takes any action (searches a gene or clicks quick-start) — no explicit close button needed

### Quick-start behavior
- "Try with CFTR" pre-fills the gene search with CFTR and selects it, but stays on Step 1 — user sees what happened and manually advances
- Uses whatever gnomAD version is currently set (default or user-configured) — does not force a specific version
- Welcome card disappears immediately on action — no animation, no delay
- Clearing localStorage or using a new browser = treated as new user, welcome card reappears

### Mobile context chip
- Appears inside the AppBar on mobile (xs breakpoint) — uses space reclaimed from hidden title
- Displays "CFTR · v4.1.0" format — gene name + gnomAD version at a glance
- Visible on Steps 2-4 only (Step 1 is where gene selection happens)
- Tapping the chip navigates back to Step 1 — quick shortcut to change gene
- Mobile only (xs breakpoint) — desktop does not show the chip

### Dialog migration style
- Friendly but clear tone: "This will reset your template to defaults. Continue?" with "Yes, reset" / "Keep current"
- Destructive actions (reset template, clear log) use red/error color for the confirm button
- Non-destructive actions use primary color for confirm
- Dialogs dismissable by backdrop click (click outside = cancel)
- Template import dialog shows brief summary of imported data (language, enabled sections) before confirming
- All dialogs implemented via a `useConfirmDialog` composable for consistency

### Claude's Discretion
- Exact welcome card wording and intro text
- Card spacing and elevation values
- Context chip exact styling within AppBar
- Dialog width, padding, transition animation
- How to detect "first action" for welcome card auto-dismiss

</decisions>

<specifics>
## Specific Ideas

- Welcome card placement follows progressive disclosure pattern (Linear, Figma, Notion-style) — embedded in flow, not interrupting it
- Context chip format: "GENE · vX.X.X" with interpunct separator
- Dialog button labels should use descriptive verbs ("Yes, reset" / "Keep current") rather than generic ("OK" / "Cancel")

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 23-onboarding-visual-polish*
*Context gathered: 2026-02-23*
