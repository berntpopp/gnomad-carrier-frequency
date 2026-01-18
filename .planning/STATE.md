# Project State: gnomAD Carrier Frequency Calculator

---

## Project Reference

**Core Value:** Accurate recurrence risk calculation from gnomAD population data with clinical documentation output

**Current Focus:** Phase 1 execution - API layer complete, final plan (carrier frequency composable) remaining

**Key Constraints:**
- Stack: npm, Vue 3, Vuetify 3, Vite, TypeScript
- No backend - direct gnomAD GraphQL from browser
- German clinical text only for v1
- Single page wizard UI

---

## Current Position

**Milestone:** v1 MVP
**Phase:** Phase 1 - Foundation (4/5 plans complete)
**Plan:** 01-04 complete
**Status:** In progress

### Progress

```
Phase 1: Foundation     [####......] 4/5 plans (01-01, 01-02, 01-03, 01-04 done)
Phase 2: Wizard UI      [..........] 0/? plans
Phase 3: German Text    [..........] 0/? plans
Phase 4: Deploy         [..........] Validation only
```

**Overall:** `[####......] ~40%`

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Plans Completed | 4 |
| Phases Completed | 0 |
| Requirements Done | 0/32 (infrastructure plans) |
| Session Count | 5 |

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
- [ ] Execute 01-05 (carrier frequency composable, test UI)

---

## Session Continuity

### Last Session

**Date:** 2026-01-18
**Completed:** Plan 01-04 (GraphQL Queries and Composables) - Query definitions, useGeneSearch, useGeneVariants
**Next:** Execute 01-05 (carrier frequency composable, test UI) to complete Phase 1

### Handoff Notes

API layer complete. Composables provide reactive gene search and variant fetching with config-driven settings.

**Query imports:**
```typescript
import { GENE_SEARCH_QUERY, GENE_VARIANTS_QUERY } from '@/api/queries';
import type { GeneSearchResult, GeneVariant, GeneClinvarVariant } from '@/api/queries';
```

**Composable imports:**
```typescript
import { useGeneSearch, useGeneVariants } from '@/composables';
import type { UseGeneSearchReturn, UseGeneVariantsReturn } from '@/composables';
```

**Usage pattern:**
```typescript
const { searchTerm, setSearchTerm, results, selectedGene, selectGene } = useGeneSearch();
const geneSymbol = computed(() => selectedGene.value?.symbol ?? null);
const { variants, clinvarVariants, isLoading, errorMessage } = useGeneVariants(geneSymbol);
```

All config values (debounceMs, minSearchChars, datasetId, referenceGenome) come from config module. Zero hardcoded values in composables.

---

*State initialized: 2026-01-18*
*Last updated: 2026-01-18 (01-04 complete)*
