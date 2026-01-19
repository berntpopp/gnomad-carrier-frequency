---
phase: 09-clingen-documentation
plan: 07
subsystem: ui
tags: [tooltips, contextual-help, coverage-warning, vuetify, accessibility]

# Dependency graph
requires:
  - phase: 09-02
    provides: GeneConstraintCard component with constraint metrics display
  - phase: 09-03
    provides: ClinGen warning UI integration
  - phase: 08-03
    provides: FilterPanel component with filter options
provides:
  - Low exome coverage warning in GeneConstraintCard
  - Contextual help tooltips on all filter options
  - Population selection tooltip in StepFrequency
  - Carrier frequency and recurrence risk tooltips in StepResults
  - Contributing variants tooltip in StepResults
affects: [10-export-templates, documentation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - tooltip-text CSS class for consistent tooltip width (280px)
    - v-tooltip with activator pattern for info icons
    - aria-label on info icons for screen reader support

key-files:
  created: []
  modified:
    - src/components/GeneConstraintCard.vue
    - src/components/FilterPanel.vue
    - src/components/wizard/StepFrequency.vue
    - src/components/wizard/StepResults.vue

key-decisions:
  - "Separate coverage warning from quality flags - distinct alert for clarity"
  - "Coverage detection via flag keywords (coverage, no_constraint, no_lof)"
  - "Filter nonCoverageFlags to avoid duplicate display"
  - "Consistent tooltip-text class across all components"

patterns-established:
  - "Info icon tooltips: v-tooltip with mdi-information-outline, x-small size"
  - "Tooltip text max-width 280px for readability"
  - "Aria-labels describe tooltip purpose for accessibility"

# Metrics
duration: 3min
completed: 2026-01-19
---

# Phase 9 Plan 07: Contextual Help and Coverage Warning Summary

**Contextual help tooltips on filters, frequencies, and results with separate low exome coverage warning for genes with coverage flags**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-19T18:11:16Z
- **Completed:** 2026-01-19T18:14:09Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Low exome coverage warning displayed separately from quality flags in GeneConstraintCard
- Filter panel has explanatory tooltips on LoF HC, Missense, ClinVar P/LP, and Star threshold options
- StepFrequency has population selection guidance tooltip
- StepResults has tooltips explaining carrier frequency (2pq), recurrence risk, and variant count

## Task Commits

Each task was committed atomically:

1. **Task 1: Add coverage warning to GeneConstraintCard** - `ded2372` (feat)
2. **Task 2: Add contextual tooltips to FilterPanel** - `cad6912` (feat)
3. **Task 3: Add tooltips to StepFrequency and StepResults** - `c8e5c92` (feat)

## Files Created/Modified
- `src/components/GeneConstraintCard.vue` - Added hasLowCoverage computed, nonCoverageFlags filter, separate coverage v-alert
- `src/components/FilterPanel.vue` - Added tooltips to all 4 filter options, tooltip-text style
- `src/components/wizard/StepFrequency.vue` - Added population selection tooltip, tooltip-text style
- `src/components/wizard/StepResults.vue` - Added tooltips for carrier frequency, recurrence risk, variant count, tooltip-text style

## Decisions Made
- Separate coverage warning from quality flags: Coverage issues are distinct from other quality flags and warrant their own prominent alert
- Coverage detection keywords: Check for 'coverage', 'no_constraint', 'no_lof' in flags array
- Filter nonCoverageFlags: Avoid displaying same flag in both coverage warning and quality flags section
- Consistent tooltip styling: 280px max-width tooltip-text class used across all components

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 9 complete - all 7 plans executed
- Ready for Phase 10: Export + Templates + Logging
- All DOC-07 (contextual help tooltips) and CLIN-06 (coverage warning) requirements satisfied

---
*Phase: 09-clingen-documentation*
*Completed: 2026-01-19*
