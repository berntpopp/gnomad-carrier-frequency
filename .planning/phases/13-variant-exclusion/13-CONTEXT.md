# Phase 13: Variant Exclusion - Context

**Gathered:** 2026-01-20
**Status:** Ready for planning

<domain>
## Phase Boundary

User can manually exclude specific variants from carrier frequency calculations. Excluded variants remain visible but marked, and the frequency recalculates in real-time. Exclusions persist within session until gene changes. Export includes exclusion status and optional reason.

</domain>

<decisions>
## Implementation Decisions

### Exclusion interaction
- Checkbox column at start of each variant row (familiar table selection pattern)
- Toolbar buttons for bulk actions: "Exclude All" / "Include All" above table
- "Clear Exclusions" button to reset all exclusions
- Optional reason field appears on exclusion — dropdown with common reasons plus free text "Other"
  - Predefined reasons: "Likely benign", "Low quality", "Population-specific", "Other"
  - Reason included in export if provided

### Visual feedback
- Excluded variants: row dimmed (reduced opacity) with strikethrough on key text
- Excluded variants stay in original sort position (maintain context)
- Badge/chip above table showing count: "3 excluded"
- Results page: subtle info text under frequency values noting exclusions (not prominent warning)

### Recalculation behavior
- Debounced recalculation (500ms delay after changes stop) — smoother for rapid toggles
- Subtle pulse/flash animation on frequency values when updated
- Only current frequency value shown (no comparison to pre-exclusion value)
- All population-specific frequencies update based on excluded variants' allele frequencies in each population

### Exclusion persistence
- Exclusions reset when user selects different gene
- Exclusions persist through wizard step navigation within same gene
- URL sharing: use lz-string compression for excluded variant IDs
  - If exclusion list too long for URL (~2000 char limit): warn user and omit exclusions from URL
  - Recipient sees warning that shared link didn't include exclusions

### Claude's Discretion
- Exact dropdown options for exclusion reasons (can refine based on clinical relevance)
- Pulse animation implementation details (CSS transition vs JavaScript)
- lz-string compression strategy (full variant IDs vs index-based encoding)
- Exact debounce timing (500ms suggested, can adjust based on UX testing)

</decisions>

<specifics>
## Specific Ideas

- Checkbox pattern familiar from data tables — users expect this for selection
- Badge count gives quick "at a glance" status without cluttering the table
- Debounced updates prevent jarring rapid recalculations when toggling multiple variants
- lz-string library for URL compression — works well for moderate data, graceful fallback

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 13-variant-exclusion*
*Context gathered: 2026-01-20*
