---
phase: 37-subcontinental-populations
plan: 01
subsystem: config
tags: [gnomad, graphql, typescript, config, subcontinental-populations, nfe, eas]

# Dependency graph
requires:
  - phase: 34-quality-flags-source-breakdown
    provides: variant filtering architecture that subcontinental per-variant queries extend
provides:
  - SubpopulationConfig type and PopulationConfig.subpopulations optional field
  - 9 subcontinental population definitions in gnomad.json v2 (6 NFE + 3 EAS)
  - getSubpopulations, hasSubcontinentalData, getSubpopulationParent, getSubpopulationLabel helpers
  - VARIANT_SUBCONTINENTAL_QUERY GraphQL query string with response types
affects:
  - 37-02: composable uses getSubpopulations, hasSubcontinentalData, VARIANT_SUBCONTINENTAL_QUERY
  - 37-03: UI uses SubpopulationConfig, getSubpopulationLabel for display

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Config-driven subpopulations: adding new subcontinental groups requires only JSON edit in gnomad.json"
    - "Flat helper pattern: getSubpopulations returns all subpops across all parent populations via flatMap"
    - "V2-only flag via hasSubcontinentalData: enables conditional UI rendering without hardcoded version checks"

key-files:
  created:
    - packages/core/src/queries/subcontinental-variant.ts
  modified:
    - packages/core/src/config/types.ts
    - packages/core/src/config/gnomad.json
    - packages/core/src/config/index.ts
    - packages/core/src/queries/index.ts

key-decisions:
  - "SubpopulationConfig is a separate interface (not extending PopulationConfig) — subpopulations have no description field and no nesting"
  - "VariantSubcontinentalPopulation extracted as named interface for re-use by composable in Plan 02"
  - "No top-level ac/an/ac_hom on exome/genome in VARIANT_SUBCONTINENTAL_QUERY — composable only needs populations array, reduces payload"
  - "$referenceGenome: ReferenceGenomeId! included in query — gnomAD schema requires it (v2=GRCh37), consistent with GENE_VARIANTS_QUERY"
  - "No joint field in VARIANT_SUBCONTINENTAL_QUERY — gnomAD v2.1.1 has no joint coverage"

patterns-established:
  - "Subcontinental queries use variant_id (string, not positional ID) matching gnomAD v2 API convention"
  - "getSubpopulationParent(code) returns parent pop code enabling NFE/EAS grouping in UI"

# Metrics
duration: 3min
completed: 2026-02-27
---

# Phase 37 Plan 01: Subcontinental Populations Foundation Summary

**Config-driven subcontinental population definitions for gnomAD v2 (9 subpops: 6 NFE + 3 EAS) with typed helpers and VARIANT_SUBCONTINENTAL_QUERY for per-variant subcontinental frequency lookup.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-27T10:15:11Z
- **Completed:** 2026-02-27T10:17:54Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Added `SubpopulationConfig` interface and optional `subpopulations` field to `PopulationConfig` — v3/v4 populations unaffected (field is optional)
- Added 9 subcontinental population entries to gnomad.json v2: NFE (nfe_bgr, nfe_est, nfe_nwe, nfe_seu, nfe_swe, nfe_onf) and EAS (eas_jpn, eas_kor, eas_oea)
- Exported four new config helpers: `getSubpopulations`, `hasSubcontinentalData`, `getSubpopulationParent`, `getSubpopulationLabel`
- Created `VARIANT_SUBCONTINENTAL_QUERY` with full TypeScript response types; re-exported from `@gnomad-cf/core/queries`

## Task Commits

Each task was committed atomically:

1. **Task 1: Config types, JSON subpopulations, and helper functions** - `24951f0` (feat)
2. **Task 2: GraphQL query for individual variant subcontinental data** - `269242e` (feat)

**Plan metadata:** `[see final commit]` (docs: complete plan)

## Files Created/Modified

- `packages/core/src/config/types.ts` - Added SubpopulationConfig interface and subpopulations field on PopulationConfig
- `packages/core/src/config/gnomad.json` - Added v2 NFE (6) and EAS (3) subpopulations arrays
- `packages/core/src/config/index.ts` - Added getSubpopulations, hasSubcontinentalData, getSubpopulationParent, getSubpopulationLabel; re-exported SubpopulationConfig
- `packages/core/src/queries/subcontinental-variant.ts` - New: VARIANT_SUBCONTINENTAL_QUERY + VariantSubcontinentalVariables/Population/Response types
- `packages/core/src/queries/index.ts` - Re-export of subcontinental query and response types

## Decisions Made

- **SubpopulationConfig is a standalone interface** (not extending PopulationConfig): subpopulations never have a `description` field or nested subpopulations — keeping it minimal avoids over-engineering
- **VariantSubcontinentalPopulation extracted as named type**: Plan 02 composable will import it directly for typed accumulators; avoids inline type duplication
- **No top-level ac/an on exome/genome in VARIANT_SUBCONTINENTAL_QUERY**: composable aggregates from `populations[]` only; omitting top-level fields keeps query payload smaller
- **$referenceGenome included in query**: gnomAD schema requires it for the `variant` field resolver; consistent with existing GENE_VARIANTS_QUERY pattern
- **No joint field**: gnomAD v2.1.1 does not expose a joint exome+genome field for individual variants

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 02 (composable) can import `getSubpopulations`, `hasSubcontinentalData`, `VARIANT_SUBCONTINENTAL_QUERY`, and `VariantSubcontinentalResponse` from `@gnomad-cf/core`
- Plan 03 (UI) can import `SubpopulationConfig` and `getSubpopulationLabel` for display
- All 519 unit tests pass; build and typecheck clean
- gnomad.json v2 NFE has 6 entries, v2 EAS has 3 entries — verified by inspection; v3/v4 populations have no subpopulations field

---
*Phase: 37-subcontinental-populations*
*Completed: 2026-02-27*
