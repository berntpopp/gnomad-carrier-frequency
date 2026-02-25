---
phase: 30-cli-integration-fixes
plan: 01
subsystem: cli
tags: [typescript, cli, vitest, filterconfig, typecheck, prevalence]

# Dependency graph
requires:
  - phase: 27-cli-package
    provides: CLI command structure (query.ts, batch.ts, gene-query.ts) with filter flags
  - phase: 26-calculation-improvements
    provides: calculateGeneticPrevalence, calculateBayesianPrevalence core functions
  - phase: 29-test-suite
    provides: test patterns (vi.mock, fixture-based integration tests)
provides:
  - Correct FilterConfig property names in CLI commands (lofHcEnabled, clinvarEnabled, clinvarStarThreshold)
  - Root typecheck script covering all 3 packages (core + cli + web)
  - Single-source-of-truth prevalence via core calculateGeneticPrevalence/calculateBayesianPrevalence
  - Filter-effect integration test proving filter flags change queryGene output
  - Pre-existing CLI type errors fixed (ZodError.issues, null→undefined normalization, clack validate types, tsconfig JSON include)
affects: [v1.5-milestone-complete, ci-pipeline]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "FilterConfig property names: lofHcEnabled, clinvarEnabled, clinvarStarThreshold (not includeLofHC etc.)"
    - "Root typecheck: tsc --build packages/core && tsc --build packages/cli && web typecheck"
    - "Prevalence delegation: calculateGeneticPrevalence([sumAF]) and calculateBayesianPrevalence(prevalence, penetrance) from core"
    - "null→undefined normalization when passing GeneVariant[] to GnomadVariant[] parameter"

key-files:
  created:
    - packages/cli/src/__tests__/filter-flags.test.ts
  modified:
    - packages/cli/src/commands/query.ts
    - packages/cli/src/commands/batch.ts
    - packages/cli/src/utils/gene-query.ts
    - packages/cli/src/commands/interactive.ts
    - packages/cli/src/config/user-config.ts
    - packages/cli/tsconfig.json
    - package.json

key-decisions:
  - "Root typecheck script now covers all 3 packages — type errors in CLI code are caught at CI time"
  - "null→undefined normalization is the correct fix for GeneVariant/GnomadVariant exome/genome mismatch"
  - "ZodError.errors is deprecated in Zod v3 — correct property is .issues"
  - "clack prompt validate callback receives string | undefined — must guard against undefined before string methods"

patterns-established:
  - "FilterConfig field name convention: lofHcEnabled, clinvarEnabled, clinvarStarThreshold"
  - "When adding CLI typecheck to root: core must build before CLI (references it), CLI before web"

# Metrics
duration: 4min
completed: 2026-02-24
---

# Phase 30 Plan 01: CLI Integration Fixes Summary

**Fixed 3 silent integration bugs + 1 missing test from v1.5 audit: correct FilterConfig property names in CLI commands, add CLI to root typecheck, delegate prevalence math to core functions, and add filter-effect integration test.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-24T15:44:35Z
- **Completed:** 2026-02-24T15:49:00Z
- **Tasks:** 2
- **Files modified:** 8 (7 modified, 1 created)

## Accomplishments

- Corrected FilterConfig property names in query.ts and batch.ts so `--no-lof`, `--no-clinvar`, `--star-threshold` flags actually take effect at runtime
- Added `tsc --build packages/cli` to root typecheck script — type errors in CLI code now caught at CI time, which immediately surfaced 5 pre-existing type errors
- Delegated genetic and Bayesian prevalence to `calculateGeneticPrevalence()` and `calculateBayesianPrevalence()` from `@gnomad-cf/core/calculations` — single source of truth
- Created `filter-flags.test.ts` with 7 integration test cases proving filter properties actually change variant counts and carrier frequencies on the CFTR fixture

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix FilterConfig field names, typecheck script, and prevalence delegation** - `0f93c7e` (fix)
2. **Task 2: Add filter-effect integration test** - `7672e3c` (test)

**Plan metadata:** (see final commit below)

## Files Created/Modified

- `packages/cli/src/commands/query.ts` - Fixed: lofHcEnabled, clinvarEnabled, clinvarStarThreshold (was includeLofHC, includeClinvarPathogenic, clinvarMinStars)
- `packages/cli/src/commands/batch.ts` - Fixed: same FilterConfig property name corrections
- `packages/cli/src/utils/gene-query.ts` - Added calculateGeneticPrevalence/calculateBayesianPrevalence imports; null→undefined normalization for GeneVariant exome/genome
- `packages/cli/src/commands/interactive.ts` - Fixed: clack validate callback `v` can be undefined — add null guard
- `packages/cli/src/config/user-config.ts` - Fixed: ZodError.errors → ZodError.issues (Zod v3 API)
- `packages/cli/tsconfig.json` - Added `src/**/*.json` to include so fixture JSON files accessible
- `package.json` - Added `tsc --build packages/cli` between core and web in typecheck script
- `packages/cli/src/__tests__/filter-flags.test.ts` - New: 7 integration tests for filter flag effects

## Decisions Made

- Root typecheck now covers all 3 packages — revealing 5 pre-existing CLI type errors that were silently ignored before. All fixed in Task 1 as they blocked typecheck passing.
- null→undefined normalization inline in gene-query.ts (not in core types) — keeps the fix local to where the type boundary is crossed without changing core interfaces.
- ZodError.issues is the correct Zod v3 property; .errors existed in Zod v2 and was deprecated.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed ZodError.errors → ZodError.issues in user-config.ts**
- **Found during:** Task 1 (after adding CLI to typecheck, pre-existing error surfaced)
- **Issue:** `result.error.errors` property does not exist in Zod v3; correct property is `result.error.issues`
- **Fix:** Changed `.errors` to `.issues` in the validation failure message builder
- **Files modified:** `packages/cli/src/config/user-config.ts`
- **Verification:** `bun run typecheck` passes
- **Committed in:** `0f93c7e` (Task 1 commit)

**2. [Rule 1 - Bug] Fixed clack prompt validate callback v undefined in interactive.ts**
- **Found during:** Task 1 (after adding CLI to typecheck, pre-existing errors surfaced)
- **Issue:** Lines 80 and 220: `v` in `@clack/prompts` validate callback is typed `string | undefined` but code called `v.trim()` and `parseFloat(v)` without null guard
- **Fix:** Added `!v ||` guard on gene symbol validate; changed `parseFloat(v)` to `parseFloat(v ?? '')` on penetrance validate
- **Files modified:** `packages/cli/src/commands/interactive.ts`
- **Verification:** `bun run typecheck` passes
- **Committed in:** `0f93c7e` (Task 1 commit)

**3. [Rule 1 - Bug] Fixed GeneVariant null→undefined type mismatch in gene-query.ts**
- **Found during:** Task 1 (after adding CLI to typecheck, pre-existing error surfaced)
- **Issue:** `GeneVariant.exome` is `GeneVariantExomeGenome | null` (API returns null) but `filterPathogenicVariantsConfigurable` expects `GnomadVariant[]` where `exome` is `| undefined`. TypeScript rejected the call.
- **Fix:** Added normalization step before filter call: `variants.map(v => ({ ...v, exome: v.exome ?? undefined, genome: v.genome ?? undefined }))`
- **Files modified:** `packages/cli/src/utils/gene-query.ts`
- **Verification:** `bun run typecheck` passes; all 387 tests pass
- **Committed in:** `0f93c7e` (Task 1 commit)

**4. [Rule 3 - Blocking] Added src/**/*.json to CLI tsconfig include**
- **Found during:** Task 1 (typecheck error: cftr-response.json not listed in project)
- **Issue:** `packages/cli/tsconfig.json` include was `["src/**/*.ts"]` — JSON fixture files not listed, causing TS6307 error for test file importing the fixture
- **Fix:** Changed to `["src/**/*.ts", "src/**/*.json"]` matching the same pattern as `packages/core/tsconfig.json`
- **Files modified:** `packages/cli/tsconfig.json`
- **Verification:** `bun run typecheck` passes
- **Committed in:** `0f93c7e` (Task 1 commit)

---

**Total deviations:** 4 auto-fixed (3 Rule 1 - Bug, 1 Rule 3 - Blocking)
**Impact on plan:** All fixes were necessary to make `bun run typecheck` pass — they unblocked the primary goal of adding CLI to root typecheck. No scope creep. All pre-existing bugs that were hidden before the typecheck addition.

## Issues Encountered

None beyond the pre-existing type errors documented as deviations above.

## Next Phase Readiness

- All v1.5 milestone audit gaps are now closed
- `gnomad-cf query CFTR --no-lof`, `--no-clinvar`, `--star-threshold` flags now correctly affect output
- `bun run typecheck` now type-checks packages/core, packages/cli, AND apps/web
- 387 tests passing across all packages
- v1.5 milestone is fully verified and complete

---
*Phase: 30-cli-integration-fixes*
*Completed: 2026-02-24*
