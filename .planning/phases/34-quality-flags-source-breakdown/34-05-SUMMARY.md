---
phase: 34-quality-flags-source-breakdown
plan: "05"
subsystem: ui-results
tags:
  - source-breakdown
  - expandable-rows
  - carrier-frequency
  - population-table
  - e2e-testing

dependency-graph:
  requires:
    - "34-01 (classifyVariantSource, sourceCategoryColor)"
    - "34-02 (useCarrierFrequency singleton, filteredByPathogenicity)"
    - "34-04 (quality flags map, qualifyingVariantCount)"
  provides:
    - "computeSourceBreakdown pure function in @gnomad-cf/core/calculations"
    - "Expandable population rows with per-source carrier frequency breakdown"
    - "Phase 34 e2e test suite (3 tests verifying quality flags + source breakdown)"
  affects:
    - "37 (subcontinental populations will extend population table expansion)"

key-files:
  created:
    - "packages/core/src/calculations/source-frequency.ts"
    - "apps/web/e2e/phase34-quality-source.spec.ts"
  modified:
    - "packages/core/src/calculations/index.ts"
    - "apps/web/src/components/wizard/StepResults.vue"

key-decisions:
  - "computeSourceBreakdown uses simplified HWE (2pq) or 2*sumAF based on CalcConfig, not VCR/GCR (per-source variant count too small for meaningful homozygote exclusion)"
  - "Lazy computation: source breakdown only computed for expanded populations (reactive Set tracks expanded codes)"
  - "Chevron icon inside first column cell preserves sticky column positioning without CSS changes"
  - "Source breakdown rows show colored left-border accent per category (CSS hex colors matching Vuetify theme tokens)"
  - "E2e tests use real gnomAD API data (route interceptor not applied for GeneVariants) — tests are robust to data changes via flexible assertions"

patterns-established:
  - "Split interaction pattern: chevron expand vs row click-to-modal coexist via event.stopPropagation()"
  - "Inline expansion rows rendered as sibling <tr> elements inside custom #item template slot"

duration: 15min
completed: 2026-02-26
---

# Plan 05: Per-Population Source Breakdown Summary

**computeSourceBreakdown pure function with expandable population rows and Phase 34 e2e verification suite**

## Performance

- **Duration:** 15 min
- **Started:** 2026-02-26T22:20:00Z
- **Completed:** 2026-02-26T22:50:00Z
- **Tasks:** 3 (2 auto + 1 checkpoint via Playwright)
- **Files modified:** 4

## Accomplishments
- Pure `computeSourceBreakdown` function splits carrier frequency by source category (ClinVar/pLoF/Both) per population
- Expandable population rows via chevron icon — inline source breakdown with colored chips, variant counts, and per-source frequency
- Comprehensive e2e test suite (3 tests) covering quality flags, source chips, expandable rows, settings quality tab, and filter panel exclusion toggles

## Task Commits

Each task was committed atomically:

1. **Task 1: Create source frequency breakdown calculation in core** - `106b496` (feat)
2. **Task 2: Add expandable population rows with source breakdown in StepResults** - `9f38b40` (feat)
3. **Task 3: Visual verification checkpoint** — replaced with Playwright e2e tests

## Files Created/Modified
- `packages/core/src/calculations/source-frequency.ts` - computeSourceBreakdown pure function
- `packages/core/src/calculations/index.ts` - Re-export source-frequency module
- `apps/web/src/components/wizard/StepResults.vue` - Expandable population rows with source breakdown UI
- `apps/web/e2e/phase34-quality-source.spec.ts` - Phase 34 e2e test suite (3 tests)

## Decisions Made
- Source breakdown uses simplified formula (not VCR/GCR) because per-source variant subsets are too small for meaningful homozygote exclusion
- Lazy computation pattern: source breakdown computed only for expanded populations via reactive Set
- E2e tests designed to work with real gnomAD API data for robustness against fixture/data changes

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug Fix] Checkpoint replaced with Playwright e2e tests**
- **Found during:** Task 3 (checkpoint)
- **Issue:** Manual visual verification requested; user asked for Playwright automation instead
- **Fix:** Created comprehensive e2e test suite covering all Phase 34 verification points
- **Files modified:** apps/web/e2e/phase34-quality-source.spec.ts
- **Verification:** All 7 e2e tests pass (4 existing + 3 new)
- **Committed in:** pending (will be committed with SUMMARY)

---

**Total deviations:** 1 (checkpoint automated via e2e tests)
**Impact on plan:** Improved — automated verification is more reliable and repeatable than manual testing

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 34 complete: all 5 plans executed, all quality flag and source breakdown features verified
- Ready for Phase 35 (Population Bar Chart) which depends on Phase 33 (already complete)

---
*Phase: 34-quality-flags-source-breakdown*
*Completed: 2026-02-26*
