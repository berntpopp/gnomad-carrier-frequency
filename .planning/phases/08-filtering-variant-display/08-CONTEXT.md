# Phase 8: Filtering + Variant Display - Context

**Gathered:** 2026-01-19
**Status:** Ready for planning

<domain>
## Phase Boundary

User can configure variant filters and inspect contributing variants. Includes filter configuration UI with real-time feedback, variant detail modal with sortable columns, and population-specific drill-down. Filter defaults are configurable in settings.

</domain>

<decisions>
## Implementation Decisions

### Filter UI layout
- Collapsible panel inside the results card header
- Collapsed by default — user expands when needed
- When collapsed, show chip summary of active filters (e.g., "LoF HC: ON", "Missense: OFF")
- Filter defaults configurable in settings dialog (separate tab)

### Filter interaction
- Real-time updates — results update immediately as each filter changes
- ClinVar star threshold (0-4) uses a horizontal slider
- Reset button resets to user's saved defaults (from settings)
- No separate "Apply" button needed — changes are immediate
- No preview count — results table updates in real-time, user sees final count there

### Variant modal design
- Large centered dialog (80-90% viewport width)
- Default columns: Variant ID, consequence, allele frequency, ClinVar status, review stars, HGVS-c, HGVS-p
- User can toggle which columns are visible (show/hide column selector)
- Rows are expandable — click to expand and see additional details inline
- Columns are sortable

### Population drill-down
- Click population row to open variant modal filtered to that population
- Modal title includes population name (e.g., "Variants for European (Non-Finnish)")
- To view another population: close modal, click different row
- Separate "View all variants" button (outside population rows) shows all variants unfiltered by population

### Claude's Discretion
- Exact chip styling and colors for filter summary
- Column order in variant table
- What additional details appear in expanded row
- Placement of "View all variants" button
- Animation/transition for collapsible panel

</decisions>

<specifics>
## Specific Ideas

- Filter panel should feel integrated with the results card, not separate
- Variant table should show clinical-relevant columns by default (ClinVar status, HGVS nomenclature)
- Keep drill-down simple — close and click pattern rather than complex in-modal navigation

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-filtering-variant-display*
*Context gathered: 2026-01-19*
