---
phase: 01-foundation
plan: 04
subsystem: api-layer
tags: [graphql, vue, composables, villus, gene-search, variants]

dependency_graph:
  requires:
    - phase: 01-01
      provides: config-types, gnomad-versions, app-settings
    - phase: 01-03
      provides: graphql-client, useGnomadVersion
  provides:
    - gene-search-query
    - gene-variants-query
    - query-response-types
    - useGeneSearch-composable
    - useGeneVariants-composable
  affects: [01-05]

tech_stack:
  added: []
  patterns: [config-driven-composables, debounced-search, reactive-queries]

key_files:
  created:
    - src/api/queries/types.ts
    - src/api/queries/gene-search.ts
    - src/api/queries/gene-variants.ts
    - src/api/queries/index.ts
    - src/composables/useGeneSearch.ts
    - src/composables/useGeneVariants.ts
    - src/composables/index.ts
  modified: []

key_decisions:
  - "Query strings are static - config values passed as variables at runtime"
  - "Debounced search prevents excessive API calls"
  - "Cache-first policy for variant queries improves performance"

patterns_established:
  - "Config import for settings: import { config } from '@/config'"
  - "Version-aware queries: getDatasetId(version), getReferenceGenome(version)"
  - "Composable returns typed reactive refs"

duration: ~3 min
completed: 2026-01-18
---

# Phase 01 Plan 04: GraphQL Queries and Composables Summary

**GraphQL queries for gene search/variants and Vue composables with config-driven debounce, min chars, and version-aware dataset selection**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-01-18T23:13:22Z
- **Completed:** 2026-01-18T23:16:21Z
- **Tasks:** 3
- **Files created:** 7
- **Files modified:** 0

## Accomplishments

- GraphQL query definitions for gene search autocomplete and variant fetching
- Response types matching gnomAD GraphQL schema structure
- Reactive gene search composable with debounced autocomplete
- Gene variants composable with version-aware dataset and reference genome
- Zero hardcoded values - all settings come from config module

## Task Commits

Each task was committed atomically:

1. **Task 1: Create GraphQL query definitions** - `7173e5e` (feat)
2. **Task 2: Create gene search composable** - `e1f0962` (feat)
3. **Task 3: Create gene variants composable** - `938c9ec` (feat)

## Files Created/Modified

### Queries (src/api/queries/)

- `types.ts` - GeneSearchResult, GeneSearchResponse, GeneVariant, GeneClinvarVariant, GeneVariantsResponse
- `gene-search.ts` - GENE_SEARCH_QUERY with referenceGenome variable
- `gene-variants.ts` - GENE_VARIANTS_QUERY with dataset and referenceGenome variables
- `index.ts` - Re-exports all queries and types

### Composables (src/composables/)

- `useGeneSearch.ts` - Reactive gene search with debounced autocomplete
- `useGeneVariants.ts` - Reactive variant fetching with error handling
- `index.ts` - Module exports

## Success Criteria Verified

- GENE-01: Autocomplete uses minSearchChars from config (2)
- GENE-02: Gene validated against gnomAD API via search
- GENE-03: Invalid gene shows clear error message
- API-01: App queries gnomAD GraphQL via villus
- API-02: Errors handled with user feedback
- Debounce timing from config.settings.debounceMs (300)
- Dataset ID from config.gnomad.versions[version].datasetId
- Reference genome from config.gnomad.versions[version].referenceGenome
- ZERO hardcoded values in src/composables/

## Decisions Made

1. **Static query strings** - GraphQL queries are template strings; config values (dataset, referenceGenome) passed as variables at runtime
2. **Debounced search** - useDebounceFn from VueUse prevents excessive API calls during typing
3. **Cache-first for variants** - Variant queries use cache-first policy to avoid redundant fetches

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all TypeScript compilation and verification passed without issues.

## User Setup Required

None - composables use the existing GraphQL client from 01-03.

## Next Phase Readiness

**Ready for:**
- 01-05: Carrier frequency composable and test UI (depends on queries + composables)

**Exports available for 01-05:**
```typescript
// Queries
import { GENE_SEARCH_QUERY, GENE_VARIANTS_QUERY } from '@/api/queries';

// Query response types
import type {
  GeneSearchResult,
  GeneVariant,
  GeneClinvarVariant,
  GeneVariantsResponse,
} from '@/api/queries';

// Composables
import { useGeneSearch, useGeneVariants } from '@/composables';
import type { UseGeneSearchReturn, UseGeneVariantsReturn } from '@/composables';
```

**No blockers identified.**

---
*Phase: 01-foundation*
*Completed: 2026-01-18*
