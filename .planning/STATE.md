# Project State: gnomAD Carrier Frequency Calculator

---

## Project Reference

**Core Value:** Accurate recurrence risk calculation from gnomAD population data with clinical documentation output

**Current Focus:** Phase 2 Wizard UI - Plan 02 complete, step input components ready

**Key Constraints:**
- Stack: npm, Vue 3, Vuetify 3, Vite, TypeScript
- No backend - direct gnomAD GraphQL from browser
- German clinical text only for v1
- Single page wizard UI

---

## Current Position

**Milestone:** v1 MVP
**Phase:** Phase 2 - Wizard UI (2 of 4)
**Plan:** 02-02 complete (2/3)
**Status:** In progress

### Progress

```
Phase 1: Foundation     [##########] 5/5 plans COMPLETE
Phase 2: Wizard UI      [######....] 2/3 plans
Phase 3: German Text    [..........] 0/? plans
Phase 4: Deploy         [..........] Validation only
```

**Overall:** `[#######...] ~70%` (Phase 2 in progress)

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Plans Completed | 7 |
| Phases Completed | 1 |
| Requirements Done | All Phase 1, 02-01 wizard state, 02-02 step components |
| Session Count | 8 |

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
| Default to heterozygous | Wizard defaults indexStatus to 'heterozygous' (carrier) per user decision | 2026-01-19 |
| Downstream reset on gene change | Changing gene resets steps 2-3 state but only after leaving step 1 | 2026-01-19 |
| Literature validation | Requires frequency in (0, 1] AND non-empty PMID string | 2026-01-19 |
| Step components via props | Step components receive state via props, emit events for updates | 2026-01-19 |

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
- Wizard state in reactive() composable with computed validation per step
- Step components in src/components/wizard/

### Blockers

(None currently)

### TODOs

- [x] Plan Phase 1
- [x] Execute 01-01 (config system)
- [x] Execute 01-02 (project setup)
- [x] Execute 01-03 (types, calc functions, GraphQL client)
- [x] Execute 01-04 (GraphQL queries, composables)
- [x] Execute 01-05 (carrier frequency composable, test UI)
- [x] Plan Phase 2 (Wizard UI)
- [x] Execute 02-01 (wizard types and state composable)
- [x] Execute 02-02 (step input components)
- [ ] Execute 02-03 (results step and stepper integration)

---

## Session Continuity

### Last Session

**Date:** 2026-01-19
**Completed:** Plan 02-02 (Step Input Components)
**Next:** Plan 02-03 (Results Step and Stepper Integration)

### Handoff Notes

Phase 2 wizard UI in progress. Plan 02-02 delivered step input components.

**Step components created:**
```
src/components/wizard/
├── StepGene.vue       # Gene selection with GeneSearch + VersionSelector
├── StepStatus.vue     # Carrier/affected toggle with tooltip
└── StepFrequency.vue  # gnomAD/Literature/Default tabs with validation
```

**Step component patterns:**
```typescript
// Props-based state
<StepGene
  :model-value="state.gene"
  @update:model-value="state.gene = $event"
  @complete="nextStep"
/>

<StepStatus
  :model-value="state.indexStatus"
  @update:model-value="state.indexStatus = $event"
  @complete="nextStep"
  @back="prevStep"
/>

<StepFrequency
  :source="state.frequencySource"
  :literature-frequency="state.literatureFrequency"
  :literature-pmid="state.literaturePmid"
  :gnomad-frequency="globalFrequency"
  :gnomad-loading="isLoading"
  :using-default="usingDefault"
  @update:source="state.frequencySource = $event"
  @update:literature-frequency="state.literatureFrequency = $event"
  @update:literature-pmid="state.literaturePmid = $event"
  @complete="nextStep"
  @back="prevStep"
/>
```

All composables (useWizard, useCarrierFrequency, etc.) available from `@/composables` barrel.

---

*State initialized: 2026-01-18*
*Last updated: 2026-01-19 (Plan 02-02 complete)*
