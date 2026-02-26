---
phase: 33-display-formats-tsv-export
plan: 01
subsystem: ui
tags: [pinia, vue3, intl, formatters, typescript, composables]

# Dependency graph
requires: []
provides:
  - frequencyToScientific() and frequencyToPerHundredK() formatters in @gnomad-cf/core/calculations
  - DisplayFormat type union (percent | ratio | scientific | per100k) in @gnomad-cf/core/calculations
  - useFormatStore Pinia store with persisted defaultFormat and session-only currentFormat
  - useDisplayFormat composable with reactive formatFrequency dispatcher
  - Format reset wired into useWizard.resetWizard() and gene-change watcher
affects:
  - 33-display-formats-tsv-export (plans 02, 03)
  - 34-quality-source-flags
  - 35-charts-visualization
  - 36-orphanet-integration
  - 37-subpopulation-analysis

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pinia options-style store with pick-based partial persistence (defaultFormat only)"
    - "Safe Pinia guard: getActivePinia() check before useStore() in non-component contexts"
    - "Intl.NumberFormat formatToParts() for scientific notation with Unicode superscript map"
    - "Locale derivation from templateStore.language: de->de-DE, en->en-US"

key-files:
  created:
    - packages/core/src/calculations/formatters.ts (extended)
    - packages/core/tests/formatters.test.ts
    - apps/web/src/stores/useFormatStore.ts
    - apps/web/src/composables/useDisplayFormat.ts
  modified:
    - apps/web/src/composables/useWizard.ts
    - apps/web/src/composables/index.ts

key-decisions:
  - "DisplayFormat type defined in @gnomad-cf/core/calculations/formatters.ts (co-located with formatters, re-exported via barrel)"
  - "safeResetFormat() wrapper with getActivePinia() guard prevents test regressions when useWizard() is called in beforeEach before Pinia is active"
  - "Per-100k denominator locale-formatted with (100_000).toLocaleString(locale) to avoid mixed-separator display in German locale"
  - "SUPERSCRIPT_MAP uses explicit entries because Unicode superscript code points are not contiguous"

patterns-established:
  - "Format composable pattern: thin wrapper over store that derives locale from templateStore and dispatches to core formatters"
  - "Pinia guard pattern: import getActivePinia, check before calling useStore() in module-level or non-component callbacks"

# Metrics
duration: 5min
completed: 2026-02-26
---

# Phase 33 Plan 01: Format Infrastructure Foundation Summary

**frequencyToScientific/frequencyToPerHundredK core formatters plus useFormatStore (persisted default) and useDisplayFormat composable wired into wizard reset**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-02-26T12:20:11Z
- **Completed:** 2026-02-26T12:24:59Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Added `frequencyToScientific()` with Unicode superscript exponents via `Intl.NumberFormat.formatToParts()` and an explicit `SUPERSCRIPT_MAP`
- Added `frequencyToPerHundredK()` with locale-aware numerator and denominator (both use `toLocaleString(locale)`)
- Added `DisplayFormat` type union exported from `@gnomad-cf/core/calculations`
- Created `useFormatStore` (options Pinia) persisting only `defaultFormat` to localStorage; `currentFormat` is session-transient
- Created `useDisplayFormat` composable with `formatFrequency()` dispatcher and `formatRatio()` for recurrence risk
- Wired `formatStore.resetToDefault()` into both `useWizard.resetWizard()` and the gene-change watcher

## Task Commits

Each task was committed atomically:

1. **Task 1: Add scientific notation and per-100k formatters to core** - `563023d` (feat)
2. **Task 2: Create format store and wire reset into wizard** - `4cb8f76` (feat)

## Files Created/Modified

- `packages/core/src/calculations/formatters.ts` - Extended with `frequencyToScientific`, `frequencyToPerHundredK`, `SUPERSCRIPT_MAP`, `DisplayFormat` type
- `packages/core/tests/formatters.test.ts` - 18 tests covering both formatters, null/zero edge cases, locale variants
- `apps/web/src/stores/useFormatStore.ts` - Pinia store with persisted `defaultFormat`, session `currentFormat`, `resetToDefault()` action
- `apps/web/src/composables/useDisplayFormat.ts` - Composable with reactive `formatFrequency()` and `formatRatio()`
- `apps/web/src/composables/useWizard.ts` - Added `safeResetFormat()` calls in `resetWizard()` and gene-change watcher
- `apps/web/src/composables/index.ts` - Added `useDisplayFormat` barrel export

## Decisions Made

- **DisplayFormat type location:** Co-located in `formatters.ts` alongside the formatter functions. Re-exported via the `export *` barrel in `calculations/index.ts` so it's importable from `@gnomad-cf/core/calculations`.

- **`safeResetFormat()` guard:** `useWizard.ts` uses module-level singleton state and its `resetWizard()` is called from test `beforeEach` hooks before Pinia is mounted. Adding `getActivePinia()` check prevents the Pinia error without changing production behavior.

- **Per-100k denominator:** Used `(100_000).toLocaleString(locale)` for both numerator and denominator to ensure consistent thousands separator in German locale (dot) vs English (comma). Research pitfall #1 explicitly called this out.

- **Regular ASCII spaces around `/`:** Research open question #3 resolved in favor of regular spaces for clipboard-friendliness.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Pinia test regression caused by importing useFormatStore in useWizard**

- **Found during:** Task 2 (format store and wizard wiring)
- **Issue:** Adding `import { useFormatStore }` to `useWizard.ts` and calling `useFormatStore().resetToDefault()` inside `resetWizard()` caused `StepStatus.test.ts` to fail with "getActivePinia() was called but there was no active Pinia". The test calls `useWizard()` in `beforeEach` before Pinia is mounted via `mountWithPlugins`.
- **Fix:** Added `safeResetFormat()` helper that checks `getActivePinia()` before calling `useFormatStore().resetToDefault()`. No-ops when Pinia is not active (test context), works correctly in production (Pinia always active when app is mounted).
- **Files modified:** `apps/web/src/composables/useWizard.ts`
- **Verification:** `StepStatus.test.ts` 6/6 pass; full test suite 444/444 pass
- **Committed in:** `4cb8f76` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Necessary correctness fix to prevent test regression. No scope creep. Production behavior unchanged.

## Issues Encountered

None beyond the deviation documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Format infrastructure complete. Plans 33-02 and 33-03 can consume `useDisplayFormat` and `useFormatStore` immediately.
- `formatFrequency()` is ready for use in StepResults.vue population table cells (Plan 33-02 scope).
- `useFormatStore.defaultFormat` is ready for settings dialog wiring (Plan 33-03 scope).

---
*Phase: 33-display-formats-tsv-export*
*Completed: 2026-02-26*
