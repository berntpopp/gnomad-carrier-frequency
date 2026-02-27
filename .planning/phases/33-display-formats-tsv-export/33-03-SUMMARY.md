---
phase: 33-display-formats-tsv-export
plan: "03"
subsystem: ui
tags: [vue3, vuetify, pinia, format-selector, tsv-export, settings]

# Dependency graph
requires:
  - phase: 33-01
    provides: useDisplayFormat composable, useFormatStore, DisplayFormat type, frequencyToPercent/frequencyToRatio/frequencyToScientific/frequencyToPerHundredK formatters
  - phase: 33-02
    provides: exportPopulationsTsv, exportVariantsTsv composable functions, buildPopulationsTsv, buildVariantsTsv builders
provides:
  - v-btn-toggle format selector (%, 1:N, sci, /100k) in StepResults population table toolbar
  - Format-aware hero stat in summary card (summaryPrimary/summaryDetail computeds)
  - Format-aware carrier frequency column and range text in population table
  - Populations TSV and Variants TSV export options in export dropdown
  - Default Frequency Format card in SettingsDialog General tab with localStorage persistence
affects: [34-quality-source, 35-visualization, 36-orphanet, 37-subpopulations]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useDisplayFormat composable wired into StepResults — single source of truth for format switching"
    - "v-btn-toggle bound via :model-value + @update:model-value pattern (avoids direct v-model on computed)"
    - "summaryPrimary/summaryDetail computed pattern for format-aware hero stat with complementary detail line"
    - "Pinia store reactive binding: v-model directly on formatStore.defaultFormat in settings"
    - "handleExport extended with switch statement for json/xlsx/tsv-populations/tsv-variants"

key-files:
  created: []
  modified:
    - apps/web/src/components/wizard/StepResults.vue
    - apps/web/src/components/SettingsDialog.vue

key-decisions:
  - "Removed local formatPercent/formatRatio helpers from StepResults entirely — useDisplayFormat composable is the single source"
  - "summaryDetail shows complementary format: ratio shows percent as detail, all other formats show ratio as detail"
  - "effectiveFrequency used in summaryPrimary/summaryDetail (not globalFrequency prop) — consistent with rest of component logic"
  - "Default Frequency Format card placed before Data Cache in General tab (after Clear History confirmation dialog)"
  - "v-model directly on formatStore.defaultFormat — Pinia stores are reactive, write triggers auto-persistence"
  - "Clinical text (TextOutput component) not modified — always uses dual format per locked CONTEXT.md decision"

patterns-established:
  - "Format selector: v-btn-toggle with v-tooltip per option for accessibility"
  - "TSV export: extend handleExport switch rather than adding new handlers"

# Metrics
duration: 4min
completed: 2026-02-26
---

# Phase 33 Plan 03: UI Wiring — Format Selector, TSV Export Buttons, Settings Summary

**v-btn-toggle format selector (%, 1:N, sci, /100k) wired into StepResults with format-aware table/summary-card display, four-item export dropdown including TSV options, and Default Frequency Format persisted preference in SettingsDialog**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-26T12:29:29Z
- **Completed:** 2026-02-26T12:33:20Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Format selector (v-btn-toggle with %, 1:N, sci, /100k tooltips) in population table toolbar — switches all frequency displays instantly
- Summary card hero stat updated to use format-aware summaryPrimary/summaryDetail computeds; detail line shows complementary format
- Population table carrier frequency column and range text use formatFrequency() from useDisplayFormat composable
- Export dropdown extended to 4 items: JSON, Excel, Populations TSV, Variants TSV
- SettingsDialog General tab has new Default Frequency Format card with v-btn-toggle bound to formatStore.defaultFormat (auto-persisted to localStorage)
- Removed redundant local formatPercent/formatRatio helpers from StepResults
- All 444 tests pass; typecheck and lint clean

## Task Commits

Each task was committed atomically:

1. **Task 1: Add format selector and format-aware display to StepResults** - `527279c` (feat)
2. **Task 2: Add TSV export buttons and settings dialog default format** - `8f865a4` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `apps/web/src/components/wizard/StepResults.vue` - Format selector v-btn-toggle, format-aware summary card and table cells, four-item export dropdown, removed local formatPercent/formatRatio
- `apps/web/src/components/SettingsDialog.vue` - Default Frequency Format card in General tab, useFormatStore import/instantiation

## Decisions Made
- Removed local `formatPercent` and `formatRatio` helpers from StepResults — the `useDisplayFormat` composable is the single source of truth; eliminates duplication
- `summaryDetail` shows a complementary format: when ratio is active, detail shows percent; all other formats show ratio as detail (provides always-visible reference point)
- Used `effectiveFrequency` (not `globalFrequency` prop) in summaryPrimary/summaryDetail — consistent with how recurrenceRisk and other computeds work in the component
- Default Frequency Format card placed before Data Cache section (after Search History + Clear History dialog) in General tab
- `v-model` bound directly to `formatStore.defaultFormat` — Pinia stores are reactive objects, writes automatically trigger the persisted store's localStorage sync

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. The pre-existing component test failures mentioned in the plan summary context (from Plan 33-01's Pinia store additions) were not present — all 444 tests passed cleanly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 33 (Display Formats & TSV Export) is fully complete across all 3 plans
- Format infrastructure (DisplayFormat type, formatters, store, composable, UI) ready for Phases 34-37 to consume
- TSV export for populations and variants is available and functional
- Phase 34 (Quality & Source) can begin immediately

---
*Phase: 33-display-formats-tsv-export*
*Completed: 2026-02-26*
