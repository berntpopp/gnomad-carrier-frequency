# Phase 33: Display Formats & TSV Export - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can view carrier frequencies in their preferred display format (percentage, ratio, scientific notation, per-100k) and export results as TSV files compatible with bioinformatics pipelines and Excel. This phase establishes the format infrastructure that Phases 34-37 consume.

</domain>

<decisions>
## Implementation Decisions

### Format selector UI
- Segmented buttons (v-btn-toggle) in a toolbar row above the population table
- Short symbol labels: "%" · "1:N" · "sci" · "/100k" — with tooltips for clarity
- Summary card, population table, and all on-screen values update to reflect the selected format
- Switching is instant, no transition animation needed

### Clinical text adaptation
- Clinical text always uses human-readable dual format: ratio + percentage — e.g., "ca. 1:23 (4,31%)"
- Does NOT follow the display format selector — always ratio+percentage regardless of screen format
- Recurrence risk also uses dual format: "ca. 1:2116 (0,047%)"
- No footnote or mention of the display format setting in clinical text — silent, clean

### TSV file structure
- Two separate file downloads: populations TSV and variants TSV
- Two explicit buttons: "Download Populations TSV" and "Download Variants TSV"
- Filename pattern: `{GENE}_populations_{YYYY-MM-DD}.tsv` and `{GENE}_variants_{YYYY-MM-DD}.tsv`
- TSV always exports raw decimal values (e.g., 0.0431) regardless of display format — machine-parseable
- UTF-8 BOM prefix for Excel compatibility on Windows with German characters

### Default format & persistence
- Default format for first-time users: Percentage
- Format resets to default when starting a new gene analysis (not persisted across analyses)
- Settings dialog (gear icon) includes option to set the preferred default format
- Claude to check existing settings UI and expand as needed to accommodate format default setting
- No indication in the results UI that format choice is temporary — users learn naturally

### Claude's Discretion
- Exact segmented button styling, sizing, and mobile responsiveness
- Where in the existing settings dialog the format default fits
- Tooltip content for format selector labels
- Error state handling for format switching edge cases

</decisions>

<specifics>
## Specific Ideas

- Format selector placement inspired by table toolbar pattern — sits between summary card and population table
- TSV should be bioinformatics-pipeline-friendly: raw decimals, no locale formatting in export
- Clinical text dual format matches German genetic counseling convention (ratio is primary, percentage is supplementary)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 33-display-formats-tsv-export*
*Context gathered: 2026-02-26*
