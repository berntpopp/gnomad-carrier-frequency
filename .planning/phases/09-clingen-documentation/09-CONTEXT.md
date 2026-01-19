# Phase 9: ClinGen + Documentation - Context

**Gathered:** 2026-01-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Warn users about gene-disease validity using ClinGen data and provide comprehensive help content. Includes ClinGen integration with caching, gene constraint score display, methodology/FAQ documentation, and clinical disclaimer with data source attribution. Export, templates, and logging are Phase 10.

</domain>

<decisions>
## Implementation Decisions

### Warning Presentation
- Warnings appear in BOTH locations: below gene selection AND in results step
- Amber/warning color for visual treatment — noticeable but not alarming
- Show specific ClinGen classification and inheritance pattern found (not just "gene not in list")
- For genes WITH valid ClinGen AR association: show positive confirmation (green checkmark or similar)

### Gene Constraint Display
- Show pLI and LOEUF constraint scores in the gene info card during gene selection
- Include color-coded interpretation with thresholds (e.g., LOEUF < 0.35 = constrained)
- Display both pLI and LOEUF — some clinicians still reference pLI
- Show separate distinct warning for low exome coverage (not combined with constraints)

### Help Content Structure
- Methodology as dedicated page/dialog with sections: formula, Hardy-Weinberg, assumptions
- Clinical/technical tone — written for genetic counselors, assumes genetics knowledge
- FAQ organized in categorized sections: gnomAD data, calculations, usage, limitations
- Contextual tooltips are self-contained — explain concepts in-place, no navigation away

### Clinical Attribution
- Disclaimer banner shown once at first visit (Phentrieve pattern)
- User acknowledgment saved to store — don't show again after acknowledged
- Can be reopened by clicking icon in footer bar
- Disclaimer content: short legal ("For research use only. Not for clinical decisions.")
- Data sources: footer icon → click shows current versions (gnomAD version, ClinGen version)
- Note: ClinVar data comes from gnomAD, so no separate ClinVar version needed
- Separate About dialog for project info (authors, links) — distinct from data sources dialog

### Claude's Discretion
- Exact wording of positive/negative ClinGen status messages
- Threshold values for constraint score color coding
- Number and content of FAQ items
- About dialog content and layout
- Disclaimer banner styling and animation

</decisions>

<specifics>
## Specific Ideas

- "Compare the solution in Phentrieve" — banner shown once, acknowledgment saved, icon in footer to reopen
- ClinGen warning should show actual classification found, not generic "not in list" message
- Two dialogs in footer area: data sources (versions) and About (project info)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-clingen-documentation*
*Context gathered: 2026-01-19*
