---
phase: 26-calculation-improvements
plan: 04
subsystem: ui
tags: [vue3, vuetify, carrier-frequency, prevalence, calc-config, filter-panel]

# Dependency graph
requires:
  - phase: 26-01
    provides: CalcConfig type, FACTORY_CALC_DEFAULTS, formatPrevalence, calculation functions
  - phase: 26-02
    provides: useCalcStore Pinia store with persist, CalcConfig in URL state
  - phase: 26-03
    provides: useCarrierFrequency exposes geneticPrevalenceFormatted, bayesianPrevalenceFormatted; PopulationFrequency has geneticPrevalence field
provides:
  - FilterPanel with 3 new calc controls (HWE toggle, hom exclusion toggle, penetrance slider)
  - StepResults summary card shows genetic prevalence and Bayesian prevalence (when penetrance < 100%)
  - Warning chip "Simplified formula" when HWE formula disabled
  - Population table Prevalence column showing per-population disease frequency
  - calcConfig wired bidirectionally between FilterPanel and useCalcStore
  - Reset button resets both filter config and calc config to factory defaults
affects:
  - 26-05 (tests for Phase 26 UI - filter panel controls, prevalence display)
  - 27-xx (CLI - will show similar info in text output, not UI)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - CalcConfig prop + update:calcConfig emit pattern for component-store bidirectional sync
    - penetrancePercent computed (0-100 int) for v-slider, converts back to fraction on emit
    - Table column with null-safe formatPrevalenceRatio helper

key-files:
  created: []
  modified:
    - apps/web/src/components/FilterPanel.vue
    - apps/web/src/components/wizard/StepResults.vue

key-decisions:
  - "FilterPanel receives calcConfig as prop + emits update:calcConfig (same pattern as modelValue for FilterConfig)"
  - "Penetrance slider operates in 0-100% integer space; converts to 0-1 fraction on emit"
  - "geneticPrevalenceFormatted and bayesianPrevalenceFormatted computed from props.result in StepResults (not from useCarrierFrequency composable) because StepResults receives result as a prop"
  - "formatPrevalenceRatio imported directly from @gnomad-cf/core/calculations for table cells"
  - "Bayesian prevalence row is conditionally rendered only when calcStore.defaults.penetrance < 1"

patterns-established:
  - "CalcConfig controls pattern: prop + emit, no direct store access in FilterPanel component"
  - "Prevalence display: ratio + percent format matching carrier frequency display style"

# Metrics
duration: 6min
completed: 2026-02-24
---

# Phase 26 Plan 04: UI Controls and Results Display Summary

**Vuetify filter panel extended with HWE toggle, homozygote exclusion toggle, and penetrance slider; StepResults shows genetic/Bayesian prevalence in summary card and population table with Simplified formula warning chip**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-24T03:18:51Z
- **Completed:** 2026-02-24T03:25:04Z
- **Tasks:** 2/2
- **Files modified:** 2

## Accomplishments
- FilterPanel has 3 new calculation controls wired to useCalcStore via prop/emit
- StepResults summary card shows genetic prevalence (always) and Bayesian prevalence (when penetrance < 100%)
- Warning chip "Simplified formula" appears in card title when HWE formula is disabled
- Population table has Prevalence column (4th position, between Ratio and Recurrence Risk)
- Reset button now resets both filter config and calc config to factory defaults

## Task Commits

Each task was committed atomically:

1. **Task 1: Add calculation controls to FilterPanel** - `8382845` (feat)
2. **Task 2: Display prevalence and formula indicator in StepResults** - `1ab61cb` (feat)

**Plan metadata:** see final commit below

## Files Created/Modified
- `apps/web/src/components/FilterPanel.vue` - Added CalcConfig prop, update:calcConfig emit, HWE toggle, hom exclusion toggle, penetrance slider with tooltips
- `apps/web/src/components/wizard/StepResults.vue` - Added warning chip, prevalence display, Bayesian prevalence, Prevalence table column, calcConfig wiring

## Decisions Made
- FilterPanel receives `calcConfig` prop and emits `update:calcConfig` — same v-model-like pattern used for FilterConfig; store access stays in StepResults
- Penetrance slider operates in 0–100% integer for UX; `updatePenetrance()` converts back to 0–1 fraction on emit
- `geneticPrevalenceFormatted` computed in StepResults from `props.result` (not injected from composable) because StepResults receives result as a prop already
- `formatPrevalenceRatio` helper wraps `formatPrevalence` from core for clean null-safe table cell rendering
- Bayesian prevalence row rendered conditionally: `v-if="bayesianPrevalenceFormatted && calcStore.defaults.penetrance < 1"`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 26 plan 05 (tests) can now test all UI controls and result display
- All Phase 26 features are now complete and visible: HWE formula, hom exclusion, penetrance, genetic prevalence, Bayesian prevalence, warning chip, prevalence table column
- Clinical text (TextOutput) was not modified as specified

---
*Phase: 26-calculation-improvements*
*Completed: 2026-02-24*
