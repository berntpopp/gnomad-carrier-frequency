---
phase: 08-filtering-variant-display
plan: 02
subsystem: api
tags: [graphql, hgvs, gnomad, typescript, types]

# Dependency graph
requires:
  - phase: 01-mvp
    provides: Base variant types and GraphQL query structure
provides:
  - Extended GraphQL query with HGVS fields (hgvsc, hgvsp)
  - TranscriptConsequence type with HGVS notation
  - DisplayVariant type for variant modal table
  - PopulationVariantFrequency type for drill-down
affects: [08-03-filter-ui, 08-04-variant-modal, variant-modal-component]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Display types flatten nested API data for table rendering"
    - "Nullable HGVS fields accommodate missing annotation data"

key-files:
  created:
    - src/types/display.ts
  modified:
    - src/api/queries/gene-variants.ts
    - src/api/queries/types.ts
    - src/types/variant.ts
    - src/types/index.ts

key-decisions:
  - "HGVS fields nullable strings - gnomAD may not have annotation for all variants"
  - "DisplayVariant includes boolean flags for quick filtering (isLoF, isClinvarPathogenic, isMissense)"

patterns-established:
  - "Display types: Flatten nested API responses for table components"

# Metrics
duration: 2min
completed: 2026-01-19
---

# Phase 8 Plan 02: HGVS + Display Types Summary

**Extended GraphQL query for HGVS fields and created display variant types for variant modal**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-19T16:29:43Z
- **Completed:** 2026-01-19T16:31:41Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- GraphQL query now fetches hgvsc (coding) and hgvsp (protein) HGVS notation
- TranscriptConsequence type updated with HGVS fields in both type definitions
- DisplayVariant type ready for variant modal table with all required columns
- PopulationVariantFrequency type ready for population drill-down display

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend GraphQL query for HGVS fields** - `b33f5af` (feat)
2. **Task 2: Update type definitions for HGVS fields** - `139da65` (feat)
3. **Task 3: Create display variant types for modal** - `858a308` (feat)

## Files Created/Modified
- `src/api/queries/gene-variants.ts` - Added hgvsc and hgvsp to transcript_consequence query
- `src/api/queries/types.ts` - Added HGVS fields to GeneVariantTranscript interface
- `src/types/variant.ts` - Added HGVS fields to TranscriptConsequence interface
- `src/types/display.ts` - New file with DisplayVariant and PopulationVariantFrequency types
- `src/types/index.ts` - Re-exports new display types

## Decisions Made
- HGVS fields are nullable strings since gnomAD may not have HGVS annotation for all variants
- DisplayVariant includes computed boolean flags (isLoF, isClinvarPathogenic, isMissense) for efficient table filtering

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- HGVS fields available in GraphQL response for variant modal display
- Display types ready for VariantModal component to consume
- Types support all columns specified in context (VAR-02): variant ID, consequence, AF, ClinVar status, stars, HGVS-c, HGVS-p

---
*Phase: 08-filtering-variant-display*
*Completed: 2026-01-19*
