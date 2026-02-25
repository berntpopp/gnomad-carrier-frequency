---
phase: 26-calculation-improvements
plan: 02
subsystem: api
tags: [graphql, typescript, pinia, zod, url-state, gnomad]

# Dependency graph
requires:
  - phase: 26-calculation-improvements/26-01
    provides: CalcConfig type and FACTORY_CALC_DEFAULTS in @gnomad-cf/core/types
  - phase: 25-monorepo-foundation
    provides: monorepo structure, @gnomad-cf/core packages, Pinia stores pattern

provides:
  - ac_hom field in GENE_VARIANTS_QUERY at exome/genome global and population levels
  - ac_hom: number in GeneVariantPopulation, GeneVariantExomeGenome, VariantPopulation, VariantFrequencyData
  - useCalcStore Pinia store with localStorage persistence (key: carrier-freq-calc)
  - UrlStateSchema extended with hweFormula, homExclusion, penetrance optional params
  - calcMatchesDefaults() helper function exported from @gnomad-cf/core/types
  - useUrlState bidirectional sync for calc settings (restore from URL + write to URL)

affects:
  - 26-03-PLAN.md (calculation composable - reads from useCalcStore and uses ac_hom data)
  - 26-04-PLAN.md (UI controls - writes to useCalcStore)
  - 26-05-PLAN.md (tests - will test calculations using ac_hom data)
  - 27-cli (CLI will need ac_hom from GraphQL data for homozygote exclusion)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - CalcConfig Pinia store follows exact same pattern as useFilterStore (defineStore options API with persist)
    - URL state params use '0'/'1' string encoding for booleans (same as conflicting param pattern)
    - calcMatchesDefaults() mirrors filtersMatchDefaults() pattern for URL param omission
    - ac_hom stored as required number (not optional) - gnomAD API always returns it (0 when absent)

key-files:
  created:
    - apps/web/src/stores/useCalcStore.ts
  modified:
    - packages/core/src/queries/gene-variants.ts
    - packages/core/src/queries/types.ts
    - packages/core/src/types/variant.ts
    - packages/core/src/types/url-state.ts
    - packages/core/src/types/index.ts
    - apps/web/src/composables/useUrlState.ts
    - packages/core/tests/variant-filters.test.ts

key-decisions:
  - "ac_hom is required (not optional) on all interfaces - gnomAD always returns 0 when no homozygotes, never null"
  - "URL state extensions live in packages/core/src/types/url-state.ts (not apps/web) - UrlStateSchema is a core type"
  - "CalcConfig store follows useFilterStore pattern exactly - same persist plugin, same action naming convention"
  - "URL bool params use '0'/'1' string encoding for consistency with existing conflicting param"

patterns-established:
  - "Store-per-config: each config domain (filter, calc) gets its own Pinia store with localStorage persist"
  - "URL omission optimization: params omitted from URL when matching factory defaults, added only when changed"

# Metrics
duration: 6min
completed: 2026-02-24
---

# Phase 26 Plan 02: Data Layer for Calculation Improvements Summary

**gnomAD ac_hom field wired through GraphQL query and TypeScript types; CalcConfig Pinia store with localStorage persistence and bidirectional URL sync for HWE formula, homozygote exclusion, and penetrance settings**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-02-24T02:58:43Z
- **Completed:** 2026-02-24T03:04:58Z
- **Tasks:** 2/2
- **Files modified:** 8

## Accomplishments
- Added ac_hom to GENE_VARIANTS_QUERY at all 4 required locations (exome global, exome populations, genome global, genome populations)
- Updated all TypeScript interfaces (GeneVariantPopulation, GeneVariantExomeGenome, VariantPopulation, VariantFrequencyData) with `ac_hom: number`
- Created useCalcStore Pinia store with localStorage persistence (key: `carrier-freq-calc`) and typed actions for each CalcConfig field
- Extended UrlStateSchema with 3 optional backward-compatible params and added calcMatchesDefaults() helper
- Extended useUrlState composable for full bidirectional sync: restores calc settings from URL on load, writes calc settings to URL on change

## Task Commits

Each task was committed atomically:

1. **Task 1: Add ac_hom to GraphQL query and all TypeScript types** - `969a5c5` (feat)
2. **Task 2: Create CalcConfig Pinia store and extend URL state** - `513de6d` (feat)

**Plan metadata:** (see final commit below)

## Files Created/Modified
- `packages/core/src/queries/gene-variants.ts` - Added ac_hom at 4 locations in GraphQL query string
- `packages/core/src/queries/types.ts` - Added ac_hom: number to GeneVariantPopulation and GeneVariantExomeGenome
- `packages/core/src/types/variant.ts` - Added ac_hom: number to VariantPopulation and VariantFrequencyData inline types
- `packages/core/src/types/url-state.ts` - Added hweFormula, homExclusion, penetrance optional params + calcMatchesDefaults()
- `packages/core/src/types/index.ts` - Exported calcMatchesDefaults
- `apps/web/src/stores/useCalcStore.ts` - New Pinia store for CalcConfig with localStorage persistence
- `apps/web/src/composables/useUrlState.ts` - Extended with calcStore import, restore, write, and watcher
- `packages/core/tests/variant-filters.test.ts` - Fixed test fixture to include required ac_hom: 0 field

## Decisions Made
- `ac_hom` is a required `number` field (not optional) on all interfaces - gnomAD API always returns 0 when no homozygotes observed, never null or missing
- URL state schema extensions live in `packages/core/src/types/url-state.ts` (not in a web-only file) - UrlStateSchema is a shared core type used by all consumers
- CalcConfig store follows useFilterStore pattern exactly for consistency
- URL boolean params use `'0'`/`'1'` string encoding, consistent with the existing `conflicting` param pattern

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed test fixture missing required ac_hom field**
- **Found during:** Task 1 (adding ac_hom to TypeScript interfaces)
- **Issue:** `packages/core/tests/variant-filters.test.ts` `makeGnomadVariant()` fixture constructed `exome: { ac: 10, an: 120000, populations: [] }` — after adding `ac_hom` as required, this would fail TypeScript type checking
- **Fix:** Added `ac_hom: 0` to the exome object in the test fixture
- **Files modified:** `packages/core/tests/variant-filters.test.ts`
- **Verification:** `bun run typecheck` passes after fix
- **Committed in:** `969a5c5` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug in test fixture)
**Impact on plan:** Necessary correctness fix. No scope creep.

## Issues Encountered
- None - plan executed cleanly. CalcConfig and FACTORY_CALC_DEFAULTS from Plan 01 were already available in `@gnomad-cf/core/types` when this plan executed.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- ac_hom data now flows from GraphQL API response through all TypeScript types to calculation layer
- useCalcStore provides the settings persistence that Plan 03 (calculation composable) and Plan 04 (UI controls) need
- URL state is backward-compatible: old shareable URLs without calc params will use FACTORY_CALC_DEFAULTS
- Plan 03 can immediately import useCalcStore and read .defaults.useHWEFormula, .useHomExclusion, .penetrance
- Plan 05 tests can use ac_hom field from variant data for homozygote exclusion test cases

---
*Phase: 26-calculation-improvements*
*Completed: 2026-02-24*
