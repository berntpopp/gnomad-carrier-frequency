---
phase: 33-display-formats-tsv-export
plan: "02"
subsystem: ui
tags: [tsv, export, blob-download, utf8-bom, excel-compatibility, cli]

# Dependency graph
requires:
  - phase: 33-display-formats-tsv-export plan 01
    provides: Core formatters and DisplayFormat type (not directly used in TSV export)
provides:
  - buildPopulationsTsv() pure function in export-utils.ts (7-column TSV, raw decimals)
  - buildVariantsTsv() pure function in export-utils.ts (10-column TSV with Phase 34 placeholders)
  - escapeTsv() helper in export-utils.ts
  - exportPopulationsTsv() and exportVariantsTsv() in useExport composable
  - Expanded CLI VARIANT_HEADER with carrier_frequency, hgvs_c, hgvs_p, source_category, quality_flags
  - Updated VariantDetail interface with optional hgvsC, hgvsP, sourceCategory, qualityFlags fields
affects:
  - phase 33 plan 03 (StepResults UI wires up the TSV download buttons)
  - phase 34 (QUAL+SRC — will populate sourceCategory and qualityFlags in ExportVariant)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TSV BOM pattern: UTF-8 BOM string prefix (\"\\uFEFF\") prepended in composable, not in pure builder"
    - "Separation of concerns: pure builder functions in export-utils.ts, BOM + blob + download in composable"
    - "Phase N+1 column stability: Phase 34 placeholder columns exported as empty strings from Phase 33"

key-files:
  created: []
  modified:
    - apps/web/src/utils/export-utils.ts
    - apps/web/src/composables/useExport.ts
    - packages/cli/src/output/tsv-formatter.ts
    - packages/cli/src/types.ts

key-decisions:
  - "BOM added in composable, not in pure builder functions (composable owns download concerns)"
  - "Recurrence risk in populations TSV = carrierFrequency / 4 (assumes carrier index status)"
  - "Carrier frequency in variants TSV = alleleFrequency * 2 (approximate for single variant)"
  - "Phase 34 columns (Source Category, Quality Flags, Stars) exported as empty strings for schema stability"
  - "VariantDetail fields use camelCase hgvsC/hgvsP (capital C/P) matching ExportVariant convention"

patterns-established:
  - "TSV builder pure functions return string without BOM; composable adds BOM before Blob creation"
  - "Phase placeholder columns: include column headers but empty values when feature is in future phase"

# Metrics
duration: 4min
completed: 2026-02-26
---

# Phase 33 Plan 02: TSV Export Functions Summary

**TSV download functions for web layer (populations + variants, UTF-8 BOM, Excel-compatible) and expanded CLI variant columns matching EXP-03 spec with Phase 34 placeholder columns**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-26T12:21:14Z
- **Completed:** 2026-02-26T12:25:57Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Two TSV builder functions in `export-utils.ts`: 7-column populations TSV and 10-column variants TSV with raw decimal values
- Two download functions in `useExport` composable with UTF-8 BOM prefix and `{GENE}_{type}_{date}.tsv` filename pattern
- CLI `tsv-formatter.ts` VARIANT_HEADER expanded to 11 columns (added carrier_frequency, hgvs_c, hgvs_p, source_category, quality_flags)
- `VariantDetail` interface extended with optional `hgvsC`, `hgvsP`, `sourceCategory`, `qualityFlags` fields for forward compatibility

## Task Commits

Each task was committed atomically:

1. **Task 1: Add TSV export functions to web layer** - `c4a6d93` (feat)
2. **Task 2: Extend CLI TSV formatter with new columns** - `6c20119` (feat)

**Plan metadata:** (see docs commit below)

## Files Created/Modified

- `apps/web/src/utils/export-utils.ts` - Added `escapeTsv()`, `buildPopulationsTsv()`, `buildVariantsTsv()` pure functions
- `apps/web/src/composables/useExport.ts` - Added `exportPopulationsTsv()`, `exportVariantsTsv()`, updated `UseExportReturn` interface
- `packages/cli/src/output/tsv-formatter.ts` - Updated VARIANT_HEADER to EXP-03 spec, expanded variant row generation
- `packages/cli/src/types.ts` - Extended `VariantDetail` with optional Phase 33/34 fields

## Decisions Made

- BOM is added in the composable (download layer), not in the pure builder functions. Builder functions return clean TSV strings; the composable owns download concerns including BOM and Blob creation.
- Recurrence risk in populations TSV uses `carrierFrequency / 4` (assumes carrier index status, the common use case for this export).
- Carrier frequency per variant uses `alleleFrequency * 2` (approximate for single variant; exact calculation requires summing all qualifying variants, which is computed separately in the populations section).
- Phase 34 columns (Source Category, Quality Flags, Stars) are exported as empty strings from Phase 33 onward, establishing a stable column schema that pipeline consumers can rely on.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing uncommitted work from Phase 33-01 (useFormatStore.ts, useDisplayFormat.ts, useWizard.ts modification) caused 33 component test failures in the test suite due to Pinia initialization issues. These failures pre-date Plan 33-02 and were not introduced by my changes. The failures are confined to component tests in `StepStatus.test.ts`, `StepFrequency.test.ts`, `TextOutput.test.ts`, and `WizardStepper.test.ts` where `useWizard.ts` calls `useFormatStore` but tests do not initialize Pinia for the new store. This will be resolved when those tests are updated in Plan 33-03 or whenever the 33-01 work is fully integrated.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `exportPopulationsTsv` and `exportVariantsTsv` are ready to be wired into `StepResults.vue` UI buttons (Plan 03)
- CLI formatter now matches the web TSV column spec for variant output
- Phase 34 can extend `ExportVariant` with `sourceCategory`, `qualityFlags`, and `goldStars` fields to fill in the placeholder columns

---
*Phase: 33-display-formats-tsv-export*
*Completed: 2026-02-26*
