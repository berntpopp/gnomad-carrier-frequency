---
phase: 26-calculation-improvements
plan: 03
subsystem: calculations
tags: [vue, pinia, carrier-frequency, hwe, vcr, gcr, prevalence, export, typescript]

# Dependency graph
requires:
  - phase: 26-01
    provides: calculateHWECarrierFrequency, calculateSimplifiedCarrierFrequency, calculateVCR, calculateGCR, calculateGeneticPrevalence, calculateBayesianPrevalence, formatPrevalence, CalcConfig, FACTORY_CALC_DEFAULTS
  - phase: 26-02
    provides: ac_hom in GraphQL types and VariantFrequencyData, useCalcStore Pinia store with persist
provides:
  - aggregatePopulationFrequenciesWithConfig in packages/core supporting all 4 CalcConfig combos
  - Updated PopulationFrequency with per-population geneticPrevalence field
  - Updated CarrierFrequencyResult with geneticPrevalence, bayesianPrevalence, formula, homExclusionActive
  - useCarrierFrequency composable reactively driven by CalcStore with formatted prevalence refs
  - ExportMetadata with calcConfig field capturing calculation settings
  - buildExportData and buildExportMetadata accepting CalcConfig parameter
affects:
  - 26-04 (UI controls for calc settings — reads geneticPrevalenceFormatted, bayesianPrevalenceFormatted from composable)
  - 26-05 (tests will test aggregatePopulationFrequenciesWithConfig and all 4 CalcConfig combos)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CalcConfig reactive pattern: Pinia store read via calcStore.defaults inside Vue computed — no manual watch needed"
    - "aggregatePopulationFrequenciesWithConfig: single function handles all 4 formula/exclusion combinations"
    - "Prevalence always from raw q=SumAF: geneticPrevalence never derived from carrier frequency"
    - "Explicit null checks on variant.exome/genome wrappers (not ?. ?? 0) to avoid masking missing data"

key-files:
  created: []
  modified:
    - packages/core/src/types/frequency.ts
    - packages/core/src/calculations/frequency-calc.ts
    - packages/core/src/types/export.ts
    - apps/web/src/composables/useCarrierFrequency.ts
    - apps/web/src/utils/export-utils.ts
    - apps/web/src/composables/useExport.ts
    - apps/web/src/components/wizard/StepResults.vue

key-decisions:
  - "Old aggregatePopulationFrequencies removed from core (no CalcConfig param) — sole caller useCarrierFrequency updated to aggregatePopulationFrequenciesWithConfig"
  - "buildPopulationFrequencies signature changed: now accepts extended map with pre-computed carrierFrequency and geneticPrevalence instead of raw sumAF map — CalcConfig formula applied once in aggregation, not again in build"
  - "When homExclusion is ON, formula label in result still reflects useHWEFormula setting — VCR/GCR is reported as the mechanism, formula shows user-intent for documentation clarity"
  - "VCR computed with combined exome+genome counts (not separate) — same approach as sumAF calculation for consistency"
  - "geneticPrevalenceFormatted and bayesianPrevalenceFormatted exposed as Ref<{ratio,percent}|null> from useCarrierFrequency — UI plans consume directly without re-formatting"

patterns-established:
  - "Reactive CalcConfig pattern: read calcStore.defaults inside computed, no watchers needed"
  - "Prevalence derivation: always calculateGeneticPrevalence([sumAF]) from raw q, never from 2pq result"
  - "Explicit null check pattern: variant.exome !== null && variant.exome !== undefined ? variant.exome.field : 0"

# Metrics
duration: 7min
completed: 2026-02-24
---

# Phase 26 Plan 03: Calculation Wiring Summary

**CalcConfig store wired reactively into useCarrierFrequency composable: HWE/simplified/VCR-GCR formula selection, genetic and Bayesian prevalence, and calcConfig captured in export metadata**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-02-24T03:08:32Z
- **Completed:** 2026-02-24T03:15:32Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Extended `CarrierFrequencyResult` and `PopulationFrequency` types with prevalence fields, formula indicator, and homExclusionActive flag
- Replaced `aggregatePopulationFrequencies` with `aggregatePopulationFrequenciesWithConfig` supporting all 4 CalcConfig combinations (VCR/GCR, HWE, simplified, per-population)
- Updated `useCarrierFrequency` to read `calcStore.defaults` reactively — changing a toggle in the store instantly recomputes carrier frequency, prevalence, and all population data
- Extended export metadata to capture CalcConfig settings; Excel exports now include HWE formula, homozygote exclusion, and penetrance rows

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend frequency types and add aggregatePopulationFrequenciesWithConfig** - `36d4a97` (feat)
2. **Task 2: Wire CalcConfig into useCarrierFrequency and exports** - `e1e65be` (feat)

**Plan metadata:** (to be added in final commit)

## Files Created/Modified

- `packages/core/src/types/frequency.ts` - Added `geneticPrevalence`, `bayesianPrevalence`, `formula`, `homExclusionActive` to `CarrierFrequencyResult`; added `geneticPrevalence` to `PopulationFrequency`
- `packages/core/src/calculations/frequency-calc.ts` - Added `aggregatePopulationFrequenciesWithConfig` (replaces old function); updated `buildPopulationFrequencies` for extended map; removed old `aggregatePopulationFrequencies`
- `packages/core/src/types/export.ts` - Added `calcConfig: CalcConfig` to `ExportMetadata`
- `apps/web/src/composables/useCarrierFrequency.ts` - Major update: reads calcStore, computes prevalence, exposes `geneticPrevalenceFormatted` and `bayesianPrevalenceFormatted`, result includes new fields
- `apps/web/src/utils/export-utils.ts` - `buildExportMetadata` and `buildExportData` accept `CalcConfig` param
- `apps/web/src/composables/useExport.ts` - Excel metadata sheet includes calc settings rows
- `apps/web/src/components/wizard/StepResults.vue` - Passes `calcStore.defaults` to `buildExportData`

## Decisions Made

- **Old `aggregatePopulationFrequencies` removed:** Only one caller (`useCarrierFrequency`), updated to new function with CalcConfig. No backward-compat shim needed.
- **`buildPopulationFrequencies` signature changed:** Now accepts extended map with pre-computed `carrierFrequency` and `geneticPrevalence` — CalcConfig formula applied once in aggregation function, not duplicated in build function.
- **VCR uses combined exome+genome counts:** For global calculation, exome AC/AN/ac_hom and genome AC/AN/ac_hom are combined per variant before computing VCR. Consistent with the sumAF combination approach.
- **formula field when homExclusion ON:** Reports the useHWEFormula toggle setting (not "vcr-gcr") — keeps formula enum simple ('hwe' | 'simplified') while homExclusionActive documents that VCR/GCR was the actual mechanism.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Plan references files that live in core, not apps/web**

- **Found during:** Task 1 setup
- **Issue:** Plan specified `apps/web/src/utils/frequency-calc.ts` and `apps/web/src/types/frequency.ts` as target files, but these were extracted to `packages/core/` in Plans 25-01 through 25-04.
- **Fix:** Applied all changes to the actual file locations in `packages/core/src/`. No functional deviation — same logic, correct location.
- **Files modified:** `packages/core/src/types/frequency.ts`, `packages/core/src/calculations/frequency-calc.ts`
- **Verification:** `bun run typecheck` passes, `bun run build` succeeds
- **Committed in:** `36d4a97` (Task 1 commit)

**2. [Rule 2 - Missing Critical] StepResults.vue call to buildExportData needed calcConfig**

- **Found during:** Task 2 (export-utils update)
- **Issue:** Adding `calcConfig` param to `buildExportData` broke the existing call site in `StepResults.vue`
- **Fix:** Updated `StepResults.vue` to import `useCalcStore` and pass `calcStore.defaults` to `buildExportData`; also updated Excel metadata sheet in `useExport.ts` to include calc settings rows
- **Files modified:** `apps/web/src/components/wizard/StepResults.vue`, `apps/web/src/composables/useExport.ts`
- **Verification:** `bun run build` succeeds with zero TypeScript errors
- **Committed in:** `e1e65be` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 file-location adaptation, 1 missing call-site update)
**Impact on plan:** Both fixes necessary for correctness. The file location fix is due to monorepo extraction in earlier plans (documented in STATE.md). No scope creep.

## Issues Encountered

None beyond the file-location deviation above.

## Next Phase Readiness

- Plan 26-04 (UI controls) can now consume `geneticPrevalenceFormatted`, `bayesianPrevalenceFormatted`, `result.formula`, and `result.homExclusionActive` from `useCarrierFrequency`
- Plan 26-05 (tests) can write tests for `aggregatePopulationFrequenciesWithConfig` covering all 4 CalcConfig combinations
- Changing `useHWEFormula`, `useHomExclusion`, or `penetrance` in the store automatically triggers reactive recomputation of all carrier frequency results — no additional wiring needed

---
*Phase: 26-calculation-improvements*
*Completed: 2026-02-24*
