---
phase: 27-cli-package
plan: 02
subsystem: cli
tags: [typescript, retry, exponential-backoff, population-aliases, gene-query, zod, user-config, graphql, gnomad]

# Dependency graph
requires:
  - phase: 27-01
    provides: packages/cli/src/types.ts with QueryResult, QueryOptions, VariantDetail; @gnomad-cf/cli workspace
  - phase: 25-monorepo-foundation
    provides: "@gnomad-cf/core with client, filters, calculations, queries, config subpath exports"
  - phase: 26-calculation-api
    provides: aggregatePopulationFrequenciesWithConfig, buildPopulationFrequencies, VCR/GCR, HWE formula
provides:
  - "withRetry<T>: exponential backoff (base*2^n + jitter) with 429/4xx/5xx classification"
  - "resolvePopulation(): full name -> gnomAD code alias mapping (european->nfe, etc.)"
  - "getPopulationOptions(): { value, label } array from core config for interactive use"
  - "queryGene(): complete fetch->filter->aggregate->result pipeline for any CLI command"
  - "searchGenes(): gene symbol search with retry wrapping"
  - "loadUserConfig(): Zod-validated ~/.gnomad-cf.json loader with graceful fallback"
  - "mergeConfig(): factory < user config < CLI flags priority merge"
affects:
  - 27-03 (formatters — receives QueryResult from queryGene())
  - 27-04 (batch command — calls queryGene() per gene, uses withRetry, loadUserConfig)
  - 27-05 (integration — exercises full queryGene() pipeline with real gnomAD calls)

# Tech tracking
tech-stack:
  added:
    - "zod@4.x (already in @gnomad-cf/core, hoisted to workspace — no new install)"
  patterns:
    - "Pipeline pattern: queryGene() delegates ALL calculation to @gnomad-cf/core subpaths"
    - "Error classification: parseStatusFromError extracts HTTP code from core client message format"
    - "Config merge priority: factory defaults < ~/.gnomad-cf.json < CLI flags"
    - "Alias resolution: lowercase + trim + Map lookup + passthrough for already-valid codes"

key-files:
  created:
    - packages/cli/src/utils/retry.ts
    - packages/cli/src/utils/population-aliases.ts
    - packages/cli/src/utils/gene-query.ts
    - packages/cli/src/config/user-config.ts
  modified: []

key-decisions:
  - "computeGlobalStats() applies same HWE/simplified/VCR branch logic as aggregatePopulationFrequenciesWithConfig — consistent global stats"
  - "Genetic prevalence always q^2 from raw globalSumAF — matches core convention, never derived from carrier frequency"
  - "429 rate limit errors not counted toward retry limit — dedicated always-retry path separate from transient 5xx retries"
  - "GeneClinvarVariant imported from @gnomad-cf/core/queries (not redefined) for findClinvarSignificance() parameter type"
  - "zod not added to CLI package.json — already a hoisted workspace dep from packages/core"

patterns-established:
  - "Delegation pattern: CLI utils import and compose @gnomad-cf/core functions; zero calculation logic in CLI"
  - "QueryResult flows from queryGene() -> formatters -> output commands; never constructed outside pipeline"
  - "withRetry wraps all executeGraphQLQuery calls — no bare API calls in CLI commands"

# Metrics
duration: 5min
completed: 2026-02-24
---

# Phase 27 Plan 02: CLI Pipeline Utilities Summary

**Gene query pipeline (fetch->filter->aggregate), withRetry exponential backoff with 429 detection, population aliases, and Zod-validated user config loader — shared utilities for all CLI commands**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-24T07:46:54Z
- **Completed:** 2026-02-24T07:51:30Z
- **Tasks:** 2
- **Files modified:** 4 (all new)

## Accomplishments

- `queryGene('CFTR', opts)` orchestrates the full pipeline: executeGraphQLQuery + filterPathogenicVariantsConfigurable + aggregatePopulationFrequenciesWithConfig + buildPopulationFrequencies, returning a complete QueryResult. All calculation logic delegated to @gnomad-cf/core.
- `withRetry<T>` implements exponential backoff with 500ms random jitter; 429 rate-limit errors always retry without consuming the retry budget; 4xx terminal errors thrown immediately; 5xx/network retried up to `retries` limit.
- `resolvePopulation('european')` returns `'nfe'`; unknown codes pass through unchanged. Covers all gnomAD population codes across v2/v3/v4.
- `loadUserConfig()` reads `~/.gnomad-cf.json`, validates with Zod strict schema, returns `{}` on any error without throwing. `mergeConfig()` applies factory < user config < CLI flags priority.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create retry utility and population alias mapping** - `e73bf54` (feat)
2. **Task 2: Create gene query pipeline and user config loader** - `37ec5b3` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `packages/cli/src/utils/retry.ts` - withRetry<T> with exponential backoff, 500ms jitter, 429/4xx/5xx classification from core client error message format
- `packages/cli/src/utils/population-aliases.ts` - POPULATION_ALIASES Map, resolvePopulation(), getPopulationOptions() from @gnomad-cf/core/config
- `packages/cli/src/utils/gene-query.ts` - queryGene() full pipeline + searchGenes(); imports QueryResult from ../types.js, all calc functions from @gnomad-cf/core subpaths
- `packages/cli/src/config/user-config.ts` - UserConfigSchema (Zod strict), loadUserConfig(), mergeConfig() with MergedConfig return type

## Decisions Made

- **computeGlobalStats() applies same formula branch as population aggregation**: HWE (`calculateHWECarrierFrequency`), simplified (`calculateSimplifiedCarrierFrequency`), or VCR/GCR (`calculateVCR` + `calculateGCR`) — consistent with per-population logic in aggregatePopulationFrequenciesWithConfig.
- **Genetic prevalence always from globalSumAF (not carrier frequency)**: Matches the core convention established in Phase 26. `q^2` where `q = sum of per-variant combined AF`.
- **429 has its own retry path (not counted toward `retries`)**: Rate-limit retries are unbounded by design — the user or orchestrator can cancel; auto-stop would silently drop data. Transient 5xx retries are bounded.
- **zod not added to CLI package.json**: Already a hoisted workspace dependency from packages/core. Using it directly is correct bun workspace behavior.
- **GeneClinvarVariant type imported from @gnomad-cf/core/queries**: Avoids redefining the type inline; keeps type alignment with the query response type.

## Deviations from Plan

None — plan executed exactly as written. All four files created with correct imports and verified functionality.

## Issues Encountered

None. Build succeeded on first attempt. All verification checks passed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All Wave 2 CLI command plans (27-03 formatters, 27-04 batch, interactive) can now import `queryGene()` directly — no pipeline logic needed in command implementations
- `loadUserConfig()` + `mergeConfig()` ready for command option parsing in 27-04
- `resolvePopulation()` ready for `--population` flag resolution in both query and batch commands
- `withRetry` wraps all API calls — rate-limit resilience built in from the start
- Concern (carried from STATE.md): gnomAD API rate limits undocumented — default `--concurrency 3` is empirical; user-configurable via mergeConfig's `defaultConcurrency` field

---
*Phase: 27-cli-package*
*Completed: 2026-02-24*
