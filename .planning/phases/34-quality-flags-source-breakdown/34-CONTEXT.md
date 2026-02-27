# Phase 34: Quality Flags & Source Breakdown - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can see at a glance which variants have quality concerns (High AF, High Hom, gnomAD Filtered, Genomes Only) and understand whether each variant was identified via ClinVar, pLoF classification, or both — with the option to exclude flagged variants from calculations. This phase adds quality transparency and source attribution; it does NOT add new variant filtering logic or new data sources.

</domain>

<decisions>
## Implementation Decisions

### Flag Presentation
- Single warning icon with count badge per variant row (e.g., ⚠ 2) — NOT inline chips
- Hover/click reveals tooltip listing all flags with explanations
- Severity-based color scheme: red for High AF, orange for High Hom, yellow for gnomAD Filtered, blue/grey for Genomes Only
- Unflagged variants stay clean — no green check or "pass" indicator
- Summary count integrated into existing UI text: enhance "Based on X qualifying variant(s)" line and the "All Contributing Variants" heading to show total + flagged count — no new summary card or banner

### Exclusion UX
- Exclusion controls live in Settings (new Quality tab) AND in FilterPanel for per-analysis overrides
- New 4th tab "Quality" in SettingsDialog for global defaults
- FilterPanel gets per-analysis quality flag exclusion toggles (alongside existing Homozygote Exclusion)
- Default state: all flags included (no exclusions) — user explicitly opts in to excluding flagged variants
- When exclusions are active: live frequency recalculation + count shown (e.g., "Excluding N variants (High AF)")

### Source Breakdown
- Source badge (ClinVar-only, pLoF-only, Both) uses same icon+tooltip pattern as quality flags for consistency
- Colored chips: blue for ClinVar, purple for pLoF, green for Both (in tooltip on hover/click)
- Per-population source frequency split shown via expandable population rows — click to expand and see ClinVar/pLoF/Both carrier frequency + variant count per source
- Source classification is a separate function from existing filter pipeline (per REQUIREMENTS SRC-05)

### Threshold Configuration
- Quality tab layout: grouped card-style sections, one per flag type
- Each flag type has: enable/disable toggle + configurable threshold (where applicable)
- High AF: slider with default 5% (ACMG BA1)
- High Hom: default to HWE-relative method (flag if hom count exceeds AF² × AN expectation), with option to switch to absolute cutoff in settings
- gnomAD Filtered: toggle only (no threshold — binary from gnomAD data)
- Genomes Only: toggle only (no threshold — binary from gnomAD data)
- "Reset to Defaults" button at bottom of Quality tab
- All quality settings persisted to localStorage via Pinia store

### Claude's Discretion
- Exact tooltip content/wording for each flag explanation
- Specific severity colors within the red/orange/yellow/blue palette
- HWE-relative algorithm details (multiplier for flagging threshold)
- FilterPanel layout for quality flag overrides
- How expandable population rows animate/transition
- Icon choices for warning badge and source badges

</decisions>

<specifics>
## Specific Ideas

- Refactor and expand existing settings infrastructure — there's already a Homozygote Exclusion toggle in FilterPanel's Calculation Settings section; quality flag controls should feel like a natural extension
- The existing exclusion infrastructure (ExclusionState, per-variant checkboxes in VariantTable) should be leveraged or complemented, not replaced
- Quality tab in SettingsDialog should include a brief explanation: "Flag variants that may need review. Flagged variants can be excluded per-analysis in the filter panel."

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 34-quality-flags-source-breakdown*
*Context gathered: 2026-02-26*
