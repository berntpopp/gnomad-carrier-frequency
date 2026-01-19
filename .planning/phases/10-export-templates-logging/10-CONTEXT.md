# Phase 10: Export + Templates + Logging - Context

**Gathered:** 2026-01-19
**Status:** Ready for planning

<domain>
## Phase Boundary

User can export calculation results to JSON/Excel files, customize clinical text templates with variable highlighting and picker, and access debug logs via a side panel. Includes settings integration for logging configuration and template management.

</domain>

<decisions>
## Implementation Decisions

### Export formats & content
- File naming: `gene-date` for overview table (e.g., BRCA1_2026-01-19.json), `gene-population-date` for variant exports (e.g., BRCA1_nfe_2026-01-19.xlsx)
- Excel structure: Multiple sheets — Summary, Populations, Variants, Metadata
- Content: Data only, no generated clinical text in exports
- Export locations: Results step AND variant modal — context-appropriate exports from each

### Template editor UX
- Location: Templates tab within existing settings dialog
- Variable highlighting: Chip/tag style — {{variable}} rendered as colored chips
- Variable insertion: Both picker panel (click to insert) AND autocomplete (type {{ for dropdown)
- Organization: Section-based editing — individual sections (intro, result, recommendation) edited separately

### Log viewer behavior
- Panel location: Side panel — slides in from right
- Entry display: Expandable rows — compact one-line by default, click to expand for details
- Level filtering: Checkbox multi-select — toggle individual levels (DEBUG, INFO, WARN, ERROR)
- Access point: Footer link near version number — accessible but not prominent

### Settings integration
- Tab organization: Add Templates and Logging tabs to existing settings tabs
- Log settings: Full control — max entries, auto-clear on session start, default filter level, categories to log
- Template import/export: Buttons within editor area — contextual to template being edited
- Template reset: Per-language reset buttons — restore German or English defaults independently

### Claude's Discretion
- Exact chip colors for variable highlighting
- Log entry timestamp format
- Export button icons and placement within results/modal
- Autocomplete dropdown styling
- Side panel width and animation

</decisions>

<specifics>
## Specific Ideas

- Excel multiple sheets feels like professional clinical output — Summary for quick reference, Variants for detailed review
- Footer link for logs keeps it discoverable for troubleshooting without cluttering main UI
- Chip-style variables should feel like Vuetify chips — consistent with existing design language

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 10-export-templates-logging*
*Context gathered: 2026-01-19*
