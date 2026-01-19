# Project State: gnomAD Carrier Frequency Calculator

---

## Project Reference

**Core Value:** Accurate recurrence risk calculation from gnomAD population data with clinical documentation output

**Current Focus:** Phase 2 Complete - Wizard UI fully functional, ready for Phase 3 German Text

**Key Constraints:**
- Stack: npm, Vue 3, Vuetify 3, Vite, TypeScript
- No backend - direct gnomAD GraphQL from browser
- German clinical text only for v1
- Single page wizard UI

---

## Current Position

**Milestone:** v1 MVP
**Phase:** Phase 2 - Wizard UI (2 of 4)
**Plan:** 02-03 complete (3/3)
**Status:** Phase complete

### Progress

```
Phase 1: Foundation     [##########] 5/5 plans COMPLETE
Phase 2: Wizard UI      [##########] 3/3 plans COMPLETE
Phase 3: German Text    [..........] 0/? plans
Phase 4: Deploy         [..........] Validation only
```

**Overall:** `[########..] ~80%` (Phase 2 complete)

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Plans Completed | 8 |
| Phases Completed | 2 |
| Requirements Done | All Phase 1, All Phase 2 (28/32) |
| Session Count | 9 |

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
| Numeric sort columns | v-data-table uses numeric keys (ratioDenominator, recurrenceRiskValue) for proper sorting | 2026-01-19 |
| Founder effect in Notes | Founder effect shown as text in Notes column, not separate column | 2026-01-19 |
| Variants column removed | Same value for all populations; shown in summary card only | 2026-01-19 |

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
- v-data-table with custom item slots for row styling
- Source attribution: gnomAD v4 / Literature (PMID: xxx) / Default assumption

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
- [x] Execute 02-03 (results step and stepper integration)
- [ ] Plan Phase 3 (German Text)
- [ ] Execute Phase 3 plans
- [ ] Plan Phase 4 (Deploy)
- [ ] Execute Phase 4 plans

---

## Session Continuity

### Last Session

**Date:** 2026-01-19
**Completed:** Plan 02-03 (Results Step and Stepper Integration) - Phase 2 complete
**Next:** Plan Phase 3 (German Text)

### Handoff Notes

Phase 2 wizard UI is complete. All 10 Phase 2 requirements are implemented.

**Wizard components structure:**
```
src/components/wizard/
├── StepGene.vue        # Gene selection with GeneSearch + VersionSelector
├── StepStatus.vue      # Carrier/affected toggle with tooltip
├── StepFrequency.vue   # gnomAD/Literature/Default tabs with validation
├── StepResults.vue     # Sortable v-data-table with source attribution
└── WizardStepper.vue   # Main container coordinating all steps
```

**Key patterns established:**
```typescript
// Step components receive state via props
<StepResults
  :result="result"
  :global-frequency="globalFrequency"
  :index-status="state.indexStatus"
  :frequency-source="state.frequencySource"
  :literature-frequency="state.literatureFrequency"
  :literature-pmid="state.literaturePmid"
  :using-default="usingDefault"
  @back="prevStep"
  @restart="resetWizard"
/>

// WizardStepper coordinates two composables
const { state, nextStep, prevStep, resetWizard } = useWizard();
const { setGeneSymbol, result, globalFrequency, ... } = useCarrierFrequency();
```

**Phase 2 Requirements Coverage (10/10):**
- UI-01: 4-step wizard flow (Gene -> Status -> Frequency -> Results)
- UI-02: Vuetify stepper component
- UI-03: User can navigate back to previous steps
- UI-04: Results step shows all population frequencies in table format (sortable)
- IDX-01: User selects index patient status (carrier OR affected)
- IDX-02: Status selection captured (affects text in Phase 3)
- SRC-01: User can use gnomAD-calculated carrier frequency
- SRC-02: User can enter literature-based frequency with PMID citation
- SRC-03: User can select default assumption (from config)
- SRC-04: Source attribution shown in results

All composables (useWizard, useCarrierFrequency, etc.) available from `@/composables` barrel.

---

*State initialized: 2026-01-18*
*Last updated: 2026-01-19 (Phase 2 complete)*
