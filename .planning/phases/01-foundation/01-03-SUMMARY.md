---
phase: 01-foundation
plan: 03
subsystem: core-logic
tags: [typescript, graphql, villus, carrier-frequency, genetics]

dependency_graph:
  requires:
    - phase: 01-01
      provides: config-types, gnomad-versions, app-settings, config-loader
    - phase: 01-02
      provides: dev-environment, graphql-client-deps, vueuse-utils
  provides:
    - variant-types
    - frequency-types
    - calculation-functions
    - variant-filters
    - display-formatters
    - graphql-client
  affects: [01-04, 01-05]

tech_stack:
  added: []
  patterns: [pure-functions, config-driven-thresholds, version-aware-client]

key_files:
  created:
    - src/types/index.ts
    - src/types/variant.ts
    - src/types/frequency.ts
    - src/utils/frequency-calc.ts
    - src/utils/variant-filters.ts
    - src/utils/formatters.ts
    - src/api/client.ts
    - src/api/index.ts
  modified:
    - src/main.ts

key_decisions:
  - "All thresholds from config, zero hardcoded values in utils"
  - "Population codes are string type (dynamic from config)"
  - "AN=0 returns null (Not detected) for proper handling"

patterns_established:
  - "Config import for thresholds: import { config } from '@/config'"
  - "Carrier frequency formula: 2 x sum(pathogenic AFs)"
  - "Pure calculation functions with no side effects"
  - "Version-aware composable: useGnomadVersion()"

duration: ~4 min
completed: 2026-01-18
---

# Phase 01 Plan 03: Core Logic Summary

**TypeScript types, pure calculation functions, and version-aware GraphQL client with all thresholds from config (zero hardcoded values)**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-01-18T23:06:44Z
- **Completed:** 2026-01-18T23:11:05Z
- **Tasks:** 3
- **Files created:** 8
- **Files modified:** 1

## Accomplishments

- Complete TypeScript type system for gnomAD variants and frequency calculations
- Pure calculation functions implementing carrier frequency and recurrence risk formulas
- Variant filtering for LoF HC and ClinVar pathogenic variants
- Version-aware GraphQL client using villus with endpoint from config
- Zero hardcoded values - all thresholds come from config module

## Task Commits

Each task was committed atomically:

1. **Task 1: Create type definitions** - `5d7bdfa` (feat)
2. **Task 2: Create calculation and filter functions** - `055a31a` (feat)
3. **Task 3: Create version-aware GraphQL client** - `676e548` (feat)

## Files Created/Modified

### Types (src/types/)

- `variant.ts` - TranscriptConsequence, ClinVarVariant, GnomadVariant, VariantPopulation, VariantFrequencyData
- `frequency.ts` - IndexPatientStatus, PopulationFrequency, CarrierFrequencyResult, RecurrenceRiskResult
- `index.ts` - Re-exports all types

### Utilities (src/utils/)

- `frequency-calc.ts` - calculateAlleleFrequency, calculateCarrierFrequency, calculateRecurrenceRisk, aggregatePopulationFrequencies, buildPopulationFrequencies
- `variant-filters.ts` - isHighConfidenceLoF, isPathogenicClinVar, shouldIncludeVariant, filterPathogenicVariants
- `formatters.ts` - frequencyToPercent, frequencyToRatio, formatCarrierFrequency

### API (src/api/)

- `client.ts` - createGnomadClient, useGnomadVersion composable, graphqlClient singleton
- `index.ts` - Module exports

### Modified

- `src/main.ts` - Added graphqlClient integration via app.use()

## Decisions Made

1. **Population codes as string type** - Types accept any string population code; actual values come from config at runtime
2. **Null for AN=0** - When allele number is 0, return null (not 0) to distinguish "not detected" from "zero frequency"
3. **Pure calculation functions** - All frequency-calc functions are pure (no side effects) for testability

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all TypeScript compilation and verification passed without issues.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for:**
- 01-04: GraphQL queries and composables (depends on types + client)
- 01-05: Carrier frequency composable and test UI

**Exports available for 01-04:**
```typescript
// Types
import type { GnomadVariant, ClinVarVariant, PopulationFrequency, CarrierFrequencyResult } from '@/types';

// Calculations
import { calculateCarrierFrequency, calculateRecurrenceRisk, buildPopulationFrequencies } from '@/utils/frequency-calc';

// Filters
import { filterPathogenicVariants, isHighConfidenceLoF, isPathogenicClinVar } from '@/utils/variant-filters';

// Formatters
import { frequencyToPercent, frequencyToRatio, formatCarrierFrequency } from '@/utils/formatters';

// GraphQL
import { useGnomadVersion, createGnomadClient, graphqlClient } from '@/api';
```

**No blockers identified.**

---
*Phase: 01-foundation*
*Completed: 2026-01-18*
