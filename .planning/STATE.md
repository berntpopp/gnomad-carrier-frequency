# Project State: gnomAD Carrier Frequency Calculator

---

## Project Reference

**Core Value:** Accurate recurrence risk calculation from gnomAD population data with clinical documentation output

**Current Focus:** Phase 3 In Progress - Template system foundation complete, building text generation

**Key Constraints:**
- Stack: npm, Vue 3, Vuetify 3, Vite, TypeScript
- No backend - direct gnomAD GraphQL from browser
- German clinical text only for v1
- Single page wizard UI

---

## Current Position

**Milestone:** v1 MVP
**Phase:** Phase 3 - German Text (3 of 4) - COMPLETE
**Plan:** 03-03 complete (3/3)
**Status:** Phase 3 complete

### Progress

```
Phase 1: Foundation     [##########] 5/5 plans COMPLETE
Phase 2: Wizard UI      [##########] 3/3 plans COMPLETE
Phase 3: German Text    [##########] 3/3 plans COMPLETE
Phase 4: Deploy         [..........] Validation only
```

**Overall:** `[###########] 100%` (11/11 plans complete)

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Plans Completed | 11 |
| Phases Completed | 3 |
| Requirements Done | Phase 1-3 complete |
| Session Count | 11 |

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
| Simple template renderer | No micromustache/handlebars; 10-line regex function sufficient | 2026-01-19 |
| Config-driven templates | JSON templates with {{variable}} syntax, Perspective-based variants | 2026-01-19 |
| genderSuffix variable | German inclusive language via template variable, not hardcoded | 2026-01-19 |
| Pinia options API | Options API over setup API for persistence plugin compatibility | 2026-01-19 |
| Browser language detection | Defaults to English unless browser language is German | 2026-01-19 |
| Locale-aware formatting | German comma (0,25%), English period (0.25%) for percentages | 2026-01-19 |

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
- Template files: src/config/templates/de.json, en.json
- Template renderer: renderTemplate(template, context) in src/utils/template-renderer.ts
- Text types: Perspective, GenderStyle, TemplateContext in src/types/text.ts
- Pinia store: useTemplateStore in src/stores/useTemplateStore.ts
- Text composable: useTextGenerator in src/composables/useTextGenerator.ts
- localStorage key: carrier-freq-templates (for persistence)

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
- [x] Plan Phase 3 (German Text)
- [x] Execute 03-01 (template system foundation)
- [x] Execute 03-02 (Pinia store and text generator composable)
- [x] Execute 03-03 (text generator UI integration)
- [ ] Plan Phase 4 (Deploy)
- [ ] Execute Phase 4 plans

---

## Session Continuity

### Last Session

**Date:** 2026-01-19
**Completed:** Plan 03-03 (Text Output UI Integration) - Phase 3 Complete
**Next:** Plan Phase 4 (Deploy)

### Handoff Notes

Plan 03-03 delivered the TextOutput component completing Phase 3:

**TextOutput Component (src/components/wizard/TextOutput.vue):**
```typescript
// Props: result, frequencySource, indexStatus, literatureFrequency, literaturePmid, usingDefault
// Features:
// - Perspective selector (affected/carrier/familyMember)
// - Section toggles via v-chip components
// - Language switch (DE/EN)
// - Gender style selector (German only)
// - Live text preview with pre-wrap
// - Copy button with 2-second "Kopiert!" feedback
```

**Integration in StepResults:**
```vue
<TextOutput
  v-if="result"
  :result="result"
  :frequency-source="frequencySource"
  ...
/>
```

**Phase 3 Complete:**
- 03-01: Template system foundation (types, renderer, JSON templates)
- 03-02: Pinia store and text generator composable
- 03-03: TextOutput UI component integration

All TEXT-01 through TEXT-04 requirements satisfied.

Ready for Phase 4: Deploy (validation and final deployment).

---

*State initialized: 2026-01-18*
*Last updated: 2026-01-19 (Plan 03-03 complete, Phase 3 complete)*
