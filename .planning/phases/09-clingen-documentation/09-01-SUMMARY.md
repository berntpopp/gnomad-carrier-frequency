---
phase: 09-clingen-documentation
plan: 01
subsystem: data-integration
tags: [clingen, csv-parsing, caching, pinia]

dependency-graph:
  requires: [08-filtering-variants]
  provides: [clingen-infrastructure, clingen-types, clingen-store, clingen-composable]
  affects: [09-02, 09-03]

tech-stack:
  added: []
  patterns:
    - csv-parsing-in-browser
    - 30-day-cache-expiry
    - pinia-persist-pattern

file-tracking:
  key-files:
    created:
      - src/types/clingen.ts
      - src/stores/useClingenStore.ts
      - src/composables/useClingenValidity.ts
    modified:
      - src/types/index.ts
      - src/composables/index.ts

decisions:
  - id: csv-field-mapping
    choice: Skip SOP column (index 6) in mapping
    reason: SOP column not needed for gene validity lookup

metrics:
  duration: ~5 minutes
  completed: 2026-01-19
---

# Phase 09 Plan 01: ClinGen Infrastructure Summary

**One-liner:** ClinGen gene-disease validity types, persistent cache store, and fetch/lookup composable for AR association checking.

## What Was Built

### ClinGen Type Definitions (`src/types/clingen.ts`)

- `ClingenEntry`: Interface mapping CSV columns (gene symbol, HGNC ID, disease label, MONDO ID, MOI, classification, report URL, date, GCEP)
- `ClingenCacheState`: Store state with data array, lastFetched timestamp, and error
- `ClingenValidityResult`: Lookup result with found flag, hasAutosomalRecessive flag, all entries, and AR-filtered entries
- `CLINGEN_CACHE_EXPIRY_MS`: 30-day constant (2,592,000,000 ms)

### ClinGen Cache Store (`src/stores/useClingenStore.ts`)

- Pinia store with `clingen-cache` localStorage persistence
- Getters: `isExpired` (30-day check), `hasData`, `cacheAge` (human-readable), `entryCount`
- Actions: `setData`, `setError`, `clearCache`, `getGeneValidity`
- Gene lookup normalizes symbols to uppercase and filters for AR inheritance patterns

### ClinGen Validity Composable (`src/composables/useClingenValidity.ts`)

- Fetches CSV from `https://search.clinicalgenome.org/kb/gene-validity/download`
- Parses CSV with proper quoted field handling
- Returns reactive state: `isLoading`, `error`, cache info computeds
- Methods: `fetchData` (with cache check), `refreshCache` (force), `checkGene`

## Technical Details

### CSV Parsing

The ClinGen CSV has this structure (header row, then data):
```
GENE SYMBOL, GENE ID (HGNC), DISEASE LABEL, DISEASE ID (MONDO), MOI, SOP, CLASSIFICATION, ONLINE REPORT, CLASSIFICATION DATE, GCEP, ...
```

The parser:
1. Splits on newlines
2. Skips header row
3. Handles quoted fields (e.g., disease names with commas)
4. Maps columns by index (skipping SOP at index 6)
5. Normalizes gene symbols to uppercase
6. Filters out empty entries

### AR Detection

Gene validity lookup checks MOI field for:
- Contains "recessive" (case-insensitive)
- Equals "ar" (case-insensitive)

This captures various ClinGen MOI formats like "Autosomal recessive", "AR", etc.

### Cache Strategy

- Data persists to localStorage via pinia-plugin-persistedstate
- 30-day expiry - long enough to avoid frequent fetches, short enough for currency
- `fetchData()` skips fetch if cache valid
- `refreshCache()` clears then fetches for manual refresh

## Decisions Made

1. **Skip SOP column**: Not needed for validity lookup, simplifies mapping
2. **Uppercase normalization**: Ensures case-insensitive gene matching
3. **AR pattern matching**: Broad match on "recessive" catches all AR variants

## Commits

| Commit | Type | Description |
|--------|------|-------------|
| `067666a` | feat | Add ClinGen type definitions |
| `b65125a` | feat | Add ClinGen cache store with persistence |
| `17d7be4` | feat | Add ClinGen validity composable |

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Ready for 09-02:** ClinGen infrastructure complete for UI integration.

Required for next plan:
- `useClingenValidity` composable for fetching data
- `ClingenValidityResult` type for displaying gene validity
- Store getters for cache status display

No blockers identified.
