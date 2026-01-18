# Project State: gnomAD Carrier Frequency Calculator

---

## Project Reference

**Core Value:** Accurate recurrence risk calculation from gnomAD population data with clinical documentation output

**Current Focus:** Phase 1 complete - ready for Phase 2 (Wizard UI)

**Key Constraints:**
- Stack: npm, Vue 3, Vuetify 3, Vite, TypeScript
- No backend - direct gnomAD GraphQL from browser
- German clinical text only for v1
- Single page wizard UI

---

## Current Position

**Milestone:** v1 MVP
**Phase:** Phase 1 - Foundation COMPLETE
**Plan:** 01-05 complete (5/5)
**Status:** Phase complete

### Progress

```
Phase 1: Foundation     [##########] 5/5 plans COMPLETE
Phase 2: Wizard UI      [..........] 0/? plans
Phase 3: German Text    [..........] 0/? plans
Phase 4: Deploy         [..........] Validation only
```

**Overall:** `[#####.....] ~50%` (Phase 1 complete)

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Plans Completed | 5 |
| Phases Completed | 1 |
| Requirements Done | All Phase 1 requirements |
| Session Count | 6 |

---

## Accumulated Context

### Key Decisions

| Decision | Rationale | Date |
|----------|-----------|------|
| 4-phase structure | Foundation -> UI -> Text -> Deploy matches delivery boundaries | 2026-01-18 |
| Heavy Phase 1 | API + filtering + calculation in Phase 1 to validate core logic early | 2026-01-18 |
| No deploy requirements | Phase 4 validates existing work, no new feature requirements | 2026-01-18 |
| Config-driven thresholds | All calculation thresholds from config, zero hardcoded values | 2026-01-18 |
| Pure calculation functions | frequency-calc functions are pure for testability | 2026-01-18 |
| AN=0 returns null | Distinguish "not detected" from "zero frequency" | 2026-01-18 |
| Multi-version gnomAD | v4 default, v3/v2 available - population codes differ by version | 2026-01-18 |
| JSON config files | All thresholds/endpoints in JSON, TS loader provides type safety | 2026-01-18 |
| npm over Bun | Bun not installed in environment; npm functionally equivalent | 2026-01-18 |
| MD3 light theme | Clinical tool should be clean and readable | 2026-01-18 |
| Static query strings | GraphQL queries are templates; config values passed as variables at runtime | 2026-01-18 |
| Debounced search | useDebounceFn prevents excessive API calls during typing | 2026-01-18 |
| Cache-first variants | Variant queries use cache-first to avoid redundant fetches | 2026-01-18 |
| Type normalization layer | API types converted to internal types for filter compatibility | 2026-01-18 |
| Global AF calculation | Combined exome+genome AC summed, divided by max AN | 2026-01-18 |

### Technical Notes

- gnomAD GraphQL endpoint: https://gnomad.broadinstitute.org/api
- Use villus (4KB) over Apollo (31KB) for GraphQL
- Carrier frequency formula: 2 x sum(pathogenic_AF)
- Population codes vary by version:
  - v4: afr, amr, asj, eas, fin, mid, nfe, sas
  - v3: afr, ami, amr, asj, eas, fin, nfe, sas (has Amish)
  - v2: afr, amr, asj, eas, fin, nfe, oth, sas (GRCh37)
- Reference values: CFTR ~1:25 NFE, HEXA elevated in ASJ
- Config settings: founderEffectMultiplier=5, debounceMs=300, defaultCarrierFrequency=0.01
- Dev environment: npm run dev (Vite), npm run build (vue-tsc + Vite)

### Blockers

(None currently)

### TODOs

- [x] Plan Phase 1
- [x] Execute 01-01 (config system)
- [x] Execute 01-02 (project setup)
- [x] Execute 01-03 (types, calc functions, GraphQL client)
- [x] Execute 01-04 (GraphQL queries, composables)
- [x] Execute 01-05 (carrier frequency composable, test UI)
- [ ] Plan Phase 2 (Wizard UI)
- [ ] Execute Phase 2

---

## Session Continuity

### Last Session

**Date:** 2026-01-18
**Completed:** Plan 01-05 (Carrier Frequency Composable and Test UI) - Phase 1 COMPLETE
**Next:** Plan Phase 2 (Wizard UI)

### Handoff Notes

Phase 1 Foundation is complete. The application is now functional for testing carrier frequency calculations.

**Composable imports:**
```typescript
import { useGeneSearch, useGeneVariants, useCarrierFrequency } from '@/composables';
```

**Primary usage pattern:**
```typescript
const {
  setGeneSymbol,
  result,
  globalFrequency,
  usingDefault,
  isLoading,
  errorMessage,
  currentVersion,
  refetch,
  calculateRisk,
} = useCarrierFrequency();

// Set gene to trigger calculation
setGeneSymbol('CFTR');

// Access results
console.log(result.value?.globalCarrierFrequency); // ~0.04 for CFTR
console.log(globalFrequency.value?.ratio); // "1:25"
```

**Component imports:**
```typescript
import VersionSelector from '@/components/VersionSelector.vue';
import GeneSearch from '@/components/GeneSearch.vue';
import FrequencyResults from '@/components/FrequencyResults.vue';
```

All config values come from config module. Zero hardcoded values in src/composables/ or src/components/.

---

*State initialized: 2026-01-18*
*Last updated: 2026-01-18 (Phase 1 complete)*
