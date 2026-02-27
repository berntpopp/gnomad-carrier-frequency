---
phase: 37-subcontinental-populations
plan: "02"
subsystem: ui
tags: [pinia, vue3, composables, gnomad, graphql, subcontinental-populations, carrier-frequency]

# Dependency graph
requires:
  - phase: 37-01
    provides: "VARIANT_SUBCONTINENTAL_QUERY, getSubpopulations/getSubpopulationParent/getSubpopulationLabel helpers, config.settings.lowSampleSizeThreshold + founderEffectMultiplier"
provides:
  - "useSubcontinentalStore: Pinia session store caching per-variant subcontinental population arrays keyed by gene"
  - "useSubcontinentalData: composable orchestrating N+1 fetch with BATCH_SIZE=10 parallelism, cache-first lookup, aggregation"
  - "SubcontinentalPopulationFrequency interface: code, parentCode, label, carrierFrequency, AC, AN, isLowSampleSize, isFounderEffect"
affects: ["37-03", "UI SubcontinentalPanel component"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "N+1 fetch pattern: one gnomAD v2 GraphQL query per qualifying variant, batched 10 at a time in parallel"
    - "Cache-first via Pinia: store.clearForGene() invalidates cache on gene change; store.hasVariant() skips cached variants"
    - "Aggregation-at-call-site: only requested variantIds (post-filter) contribute to aggregation, not all store contents"
    - "Simplified 2*sumAF formula for subcontinental: VCR/GCR not used (per-subpopulation homozygote counts unreliable at small AN)"
    - "isFounderEffect defaults false when parentFrequencies not provided; becomes functional when Plan 03 wires in parent population frequencies"

key-files:
  created:
    - apps/web/src/stores/useSubcontinentalStore.ts
    - apps/web/src/composables/useSubcontinentalData.ts
  modified:
    - apps/web/src/composables/index.ts

key-decisions:
  - "Aggregation uses only variantIds passed to fetchForVariants, not all store.variantData — prevents stale variants from old filter configs contaminating aggregation"
  - "Variants not found in gnomAD v2 stored as empty array [] (not omitted) — prevents re-fetch on subsequent calls"
  - "Individual variant fetch failures logged as console.warn and continue; error.value set only if failures accumulate"
  - "BATCH_SIZE=10 parallel requests per batch (matches gnomAD empirical rate limit from useClinvarSubmissions experience)"
  - "getApiEndpoint/getDatasetId/getReferenceGenome called at module level (not inside composable) — v2 is fixed for subcontinental"
  - "Optional chaining json.errors[0]?.message with fallback — TypeScript strict mode requires this for array index access"
  - "Store variantData typed as Record (not Map) for Pinia reactivity + JSON serialization compat (same as useOrphanetStore)"

patterns-established:
  - "Session cache pattern: Pinia store keyed by gene symbol with clearForGene() for invalidation"
  - "Exome+genome combination: iterate both arrays, sum AC/AN/ac_hom for matching population IDs using Map"

# Metrics
duration: 6min
completed: 2026-02-27
---

# Phase 37 Plan 02: Subcontinental Populations Data Layer Summary

**Pinia session store + useSubcontinentalData composable with N+1 batch fetch, cache-first lookup, and 2*sumAF aggregation per gnomAD v2 subpopulation**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-02-27T10:21:04Z
- **Completed:** 2026-02-27T10:26:47Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Pinia session store with gene-scoped cache (setVariantData, hasVariant, clearForGene, reset) — no persistence
- useSubcontinentalData composable: BATCH_SIZE=10 parallel fetch, progress 0-100%, error aggregation, cache invalidation
- Aggregation: sums AC and takes max AN per subpopulation across all qualifying variants, produces SubcontinentalPopulationFrequency[] sorted by carrierFrequency descending
- Founder effect detection wired (defaults false until Plan 03 passes parentFrequencies from main population result)

## Task Commits

Each task was committed atomically:

1. **Task 1: Pinia session store for subcontinental cache** - `a727d7e` (feat)
2. **Task 2: useSubcontinentalData composable with N+1 fetch and aggregation** - `b895915` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `apps/web/src/stores/useSubcontinentalStore.ts` — Pinia store with gene + variantData state; clearForGene invalidates on gene change
- `apps/web/src/composables/useSubcontinentalData.ts` — N+1 fetch orchestration, exome+genome combination, subpop-code filtering, 2*sumAF aggregation
- `apps/web/src/composables/index.ts` — Added useSubcontinentalData and SubcontinentalPopulationFrequency re-exports

## Decisions Made

- **Aggregation scope**: Only `variantIds` passed to `fetchForVariants` contribute to aggregation (not all store contents). This prevents stale variants from a previous filter configuration contaminating the current result.
- **Not-found in v2**: Variants absent from gnomAD v2 are stored as empty array `[]` (not omitted). `hasVariant()` returns true, preventing redundant refetches on subsequent calls.
- **Module-level API constants**: `GNOMAD_API_URL`, `DATASET_ID`, `REFERENCE_GENOME` resolved at module load time — subcontinental populations are v2-only, so the version is fixed.
- **Error strategy**: Individual variant failures log `console.warn` and continue (partial results are better than no results). `error.value` accumulates a human-readable summary count.
- **TypeScript strict mode**: `json.errors[0]?.message ?? "fallback"` required for index access; `store.variantData[id]` guarded with `undefined` check.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed two TypeScript strict-mode type errors in build**

- **Found during:** Task 2 verification (`bun run build`)
- **Issue 1:** `json.errors[0].message` — array index access typed as `T | undefined` in strict mode, not `T`
- **Issue 2:** `store.variantData[id]` inside `hasVariant()` guard not narrowed to non-undefined by TypeScript
- **Fix:** Optional chaining `json.errors[0]?.message ?? fallback` and explicit `const cached = store.variantData[id]; if (cached !== undefined)` guard
- **Files modified:** `apps/web/src/composables/useSubcontinentalData.ts`
- **Verification:** `bun run build` succeeded with exit code 0 after fix
- **Committed in:** b895915 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** TypeScript strict-mode guards are necessary for correctness. No scope creep.

## Issues Encountered

None beyond the TypeScript strict-mode fixes documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- useSubcontinentalStore and useSubcontinentalData are ready for Plan 03 (SubcontinentalPanel UI component)
- Plan 03 should pass `parentFrequencies` as `new Map(populations.map(p => [p.code, p.carrierFrequency]))` from the main carrier frequency result to enable founder effect detection
- 519 unit tests pass; no regressions

---

*Phase: 37-subcontinental-populations*
*Completed: 2026-02-27*
