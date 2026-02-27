---
phase: 34-quality-flags-source-breakdown
plan: "03"
subsystem: ui
tags: [vue3, vuetify, settings-dialog, filter-panel, quality-flags, pinia]

# Dependency graph
requires:
  - phase: 34-01
    provides: QualityFlagType, QualitySettings, QualityExclusionConfig, FACTORY_QUALITY_DEFAULTS
  - phase: 34-02
    provides: useQualityStore with persisted QualitySettings defaults and setDefaults action

provides:
  - SettingsDialog Quality tab with 4-card layout for flag threshold configuration
  - FilterPanel quality exclusion toggle section (backwards-compatible, shown when prop provided)

affects:
  - 34-05-settings-integration (no longer needed for Settings UI — already done here)
  - apps/web/src/App.vue or parent wizard component (must pass qualityExclusionConfig prop to FilterPanel)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "highAfPercent computed wraps 0-1 stored value in get/set for 0-100% display in slider"
    - "Backwards-compatible optional prop pattern: quality exclusion section hidden when prop not passed"
    - "Color-coded flag severity: error=high_af, orange=high_hom, amber=gnomad_filtered, blue-grey=genomes_only"

key-files:
  created: []
  modified:
    - apps/web/src/components/SettingsDialog.vue
    - apps/web/src/components/FilterPanel.vue

key-decisions:
  - "highAfPercent computed: 0-1 storage * 100 for display; setDefaults({highAfThreshold: v/100}) on write"
  - "FilterPanel quality section uses template v-if on qualityExclusionConfig prop — backwards-compatible"
  - "updateQualityExclusion typed helper emits full config object via update:qualityExclusionConfig"
  - "activeQualityExclusionCount drives alert visibility (only shown when >=1 exclusion active)"

patterns-established:
  - "Settings tab pattern: add v-tab + v-tabs-window-item pair, dialogMaxWidth 600 matches existing non-template tabs"
  - "Quality settings persistence: qualityStore.defaults mutated directly via v-model; Pinia persist handles localStorage"

# Metrics
duration: 6min
completed: 2026-02-26
---

# Phase 34 Plan 03: Quality Flags UI (SettingsDialog + FilterPanel) Summary

**SettingsDialog 4th Quality tab with card-style threshold controls + backwards-compatible FilterPanel quality exclusion toggle section wired to useQualityStore**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-02-26T16:02:13Z
- **Completed:** 2026-02-26T16:08:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added Quality tab (4th) to SettingsDialog with card sections for each flag type: High AF (BA1), High Homozygote Count, gnomAD Quality Filters, Genomes Only
- High AF card: enable toggle + AF threshold slider (1-20%, stored 0-1), highAfPercent computed for clean conversion
- High Hom card: enable toggle, HWE-relative/absolute method toggle, conditional slider (multiplier or absolute threshold)
- gnomAD Filtered and Genomes Only: enable toggle only with descriptive captions
- Reset to Factory Defaults button at bottom of Quality tab
- Added quality exclusion section to FilterPanel with 4 per-flag-type switches, backwards-compatible via optional prop
- Color-coded switches match flag severity scheme established in Plan 01
- Active exclusion count alert and summary line show excluded variant context

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Quality tab to SettingsDialog** - `359afeb` (feat)
2. **Task 2: Add quality exclusion toggles to FilterPanel** - `2aa64bb` (feat)

## Files Created/Modified

- `apps/web/src/components/SettingsDialog.vue` - Added Quality tab with useQualityStore import, 4 card sections (High AF, High Hom, gnomAD Filtered, Genomes Only), highAfPercent computed, Reset to Factory Defaults button
- `apps/web/src/components/FilterPanel.vue` - Added QualityExclusionConfig import, 3 new optional props, update:qualityExclusionConfig emit, quality flag exclusions section (conditionally rendered), updateQualityExclusion helper, summary line context display

## Decisions Made

- **highAfPercent computed**: The store persists `highAfThreshold` as a 0-1 decimal (matching ACMG convention). The slider needs 0-100% display. A writable computed converts between the two without touching the store structure.
- **FilterPanel quality section backwards-compatible**: The section wraps in `<template v-if="qualityExclusionConfig">` so no existing callers are broken. Parent components opt in by passing the prop when quality feature is ready.
- **v-model directly on qualityStore.defaults**: Matches the existing pattern used for logStore and filterStore in SettingsDialog — Pinia's reactive state with the persist plugin handles localStorage sync automatically.
- **updateQualityExclusion typed helper**: Mirror of the existing `updateFilter` and `updateCalcConfig` helpers — emits a full config object via spread to avoid mutation of the prop.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

The worktree (`worktree-agent-a3dc7e8b`) was branched from `main` and lacked the 34-01 and 34-02 changes. A `git merge v1.6-analysis-export` fast-forward was performed before task execution to bring in the required foundation code. This is a standard worktree setup step, not a plan deviation.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Quality tab in SettingsDialog is complete — users can configure flag thresholds and they persist across sessions
- FilterPanel quality exclusion toggles are ready for wiring — parent component (App.vue or StepResults) must pass `qualityExclusionConfig`, `qualityExcludedCount`, and `flaggedVariantCount` props to activate the section
- Plan 34-04 (Source Breakdown) can proceed independently — it uses filteredByPathogenicity from useCarrierFrequency (delivered in Plan 02)
- All 508 tests pass, build succeeds — no regressions

---
*Phase: 34-quality-flags-source-breakdown*
*Completed: 2026-02-26*
