# Phase 2: Wizard UI - Context

**Gathered:** 2026-01-19
**Status:** Ready for planning

<domain>
## Phase Boundary

4-step wizard flow (Gene → Status → Frequency → Results) allowing users to calculate carrier frequencies with source selection and status-based risk calculation. Users can navigate a complete wizard flow using Vuetify stepper, select index patient status, choose frequency source (gnomAD/literature/default), and view all population frequencies in a results table.

</domain>

<decisions>
## Implementation Decisions

### Step Transitions & Validation
- Linear navigation only — must complete each step before proceeding
- Clicking ahead is disabled until current step is valid
- Changing a value resets all downstream steps (fresh slate)
- Inline validation — errors appear below invalid fields immediately
- Next button disabled until step is valid (grayed out when incomplete)

### Frequency Source Workflow
- Three sources presented as tabs: gnomAD / Literature / Default
- gnomAD tab: Claude's discretion on whether auto-populated or confirm-to-use
- Literature tab: Requires frequency value + PMID only (minimal fields)
- Default tab: Shows default value from config with brief explanation of when to use it

### Results Table Presentation
- User-sortable columns — clickable headers to change sort order
- Founder effect highlighting: both row color (light background) AND icon/badge
- Detailed columns: Population, Carrier Frequency (%), Carrier Frequency (ratio), Recurrence Risk, Variant Count, Allele Count, Sample Size
- Global frequency shown both as summary card above table AND as first row in table

### Status Selection UX
- Simple toggle switch between carrier (heterozygous) and affected (compound het/homozygous)
- Default selection: Carrier (heterozygous)
- Expandable help icon ('?') with explanation available if needed
- No preview of impact — user sees results in final step

### Claude's Discretion
- Exact gnomAD tab interaction flow (auto-populated vs confirm)
- Specific Vuetify component choices for tabs and toggle
- Loading states and transitions between steps
- Table styling and responsive behavior
- Exact column widths and spacing

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard Vuetify patterns and clinical tool conventions.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-wizard-ui*
*Context gathered: 2026-01-19*
