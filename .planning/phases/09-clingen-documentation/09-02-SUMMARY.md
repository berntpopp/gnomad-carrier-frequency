---
phase: 09-clingen-documentation
plan: 02
subsystem: api
tags: [gnomad, graphql, constraint, pLI, LOEUF, gene-annotation]

# Dependency graph
requires:
  - phase: 08-filtering-variant-display
    provides: Variant filtering and display infrastructure
provides:
  - Gene constraint type definitions with interpretation functions
  - GENE_DETAILS_QUERY for fetching gnomad_constraint data
  - GeneConstraintCard component with color-coded metrics
  - Constraint data integration in gene selection workflow
affects: [09-03, 09-04, 09-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Singleton state pattern for shared composable data
    - Version-specific threshold interpretation for gnomAD metrics
    - GraphQL executeQuery for one-off queries outside reactive flow

key-files:
  created:
    - src/types/constraint.ts
    - src/components/GeneConstraintCard.vue
  modified:
    - src/api/queries/gene-search.ts
    - src/api/queries/types.ts
    - src/composables/useGeneSearch.ts
    - src/components/wizard/StepGene.vue
    - src/types/index.ts

key-decisions:
  - "Module-level singleton state for constraint data sharing between components"
  - "Version-specific LOEUF thresholds (v4: 0.6/1.5, v2/v3: 0.35/1.0)"
  - "Direct graphqlClient.executeQuery for one-off constraint fetch"

patterns-established:
  - "GeneConstraint interface for normalized constraint data"
  - "Interpretation functions (getLoeufInterpretation, getPliInterpretation) for color-coded display"
  - "Shared reactive state via module-level refs in composables"

# Metrics
duration: 5min
completed: 2026-01-19
---

# Phase 09 Plan 02: Gene Constraint Display Summary

**gnomAD gene constraint metrics (pLI, LOEUF) displayed with color-coded interpretation during gene selection via GeneConstraintCard component**

## Performance

- **Duration:** 5 min
- **Started:** 2026-01-19T17:57:58Z
- **Completed:** 2026-01-19T18:02:51Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Created comprehensive constraint type system with version-aware interpretation
- Built GeneConstraintCard showing pLI, LOEUF, O/E ratio with color coding
- Integrated constraint fetch into gene selection workflow
- Applied version-specific thresholds (v4 vs v2/v3 different LOEUF cutoffs)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create constraint types and extend query** - `69b041a` (feat)
2. **Task 2: Create GeneConstraintCard component** - `ec02183` (feat)
3. **Task 3: Integrate constraint card into StepGene** - `9280973` (feat)

## Files Created/Modified

- `src/types/constraint.ts` - GeneConstraint interface, pLI/LOEUF interpretation functions
- `src/types/index.ts` - Re-exports for constraint types and functions
- `src/api/queries/gene-search.ts` - GENE_DETAILS_QUERY with gnomad_constraint fields
- `src/api/queries/types.ts` - GnomadConstraint, GeneDetailsResponse types
- `src/components/GeneConstraintCard.vue` - Constraint display component with chips
- `src/composables/useGeneSearch.ts` - Extended with constraint fetch on gene selection
- `src/components/wizard/StepGene.vue` - Integrated GeneConstraintCard display

## Decisions Made

1. **Singleton state pattern for constraint data** - Used module-level refs (sharedGeneConstraint, sharedConstraintLoading) so both GeneSearch.vue and StepGene.vue share the same reactive state without prop drilling.

2. **Version-specific LOEUF thresholds** - gnomAD v4 has different sample characteristics requiring adjusted thresholds (0.6/1.5) compared to v2/v3 (0.35/1.0) per gnomAD documentation.

3. **Direct executeQuery for one-off fetch** - Instead of reactive useQuery, used graphqlClient.executeQuery for the constraint fetch since it's triggered once on selection, not continuously watched.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- **villus useClient signature** - Initial attempt used `useClient()` without arguments which caused TypeScript error. Resolved by importing and using `graphqlClient` directly from api module for executeQuery access.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Constraint display infrastructure complete and functional
- Ready for Plan 03 (ClinGen validity badge integration)
- Constraint card pattern can be extended for ClinGen status display

---
*Phase: 09-clingen-documentation*
*Completed: 2026-01-19*
