# Project State: gnomAD Carrier Frequency Calculator

---

## Project Reference

**Core Value:** Accurate recurrence risk calculation from gnomAD population data with clinical documentation output

**Current Focus:** Phase 3 Complete and Verified - Ready for Phase 4 Deploy

**Key Constraints:**
- Stack: npm, Vue 3, Vuetify 3, Vite, TypeScript
- No backend - direct gnomAD GraphQL from browser
- German clinical text only for v1
- Single page wizard UI

---

## Current Position

**Milestone:** v1 MVP
**Phase:** Phase 3 - German Text (3 of 4) - VERIFIED COMPLETE
**Plan:** 03-04 complete (gap closure) - Phase verified
**Status:** All 4 plans complete, 11/11 must-haves verified, ready for Phase 4

### Progress

```
Phase 1: Foundation     [##########] 5/5 plans COMPLETE
Phase 2: Wizard UI      [##########] 3/3 plans COMPLETE
Phase 3: German Text    [##########] 4/4 plans COMPLETE (3 + 1 gap closure)
Phase 4: Deploy         [..........] Validation only
```

**Overall:** `[###########] 100%` (12/12 plans complete)

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Plans Completed | 12 |
| Phases Completed | 3 |
| Requirements Done | Phase 1-3 complete |
| Session Count | 12 |

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
| 4-option IndexPatientStatus | heterozygous, homozygous, compound_het_confirmed, compound_het_assumed | 2026-01-19 |
| Patient sex German-only | PatientSex selector visible only in German mode; English uses neutral | 2026-01-19 |
| Status intro in generator | buildStatusIntro builds status-specific text programmatically | 2026-01-19 |

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
- Text types: Perspective, GenderStyle, PatientSex, TemplateContext in src/types/text.ts
- Pinia store: useTemplateStore in src/stores/useTemplateStore.ts
- Text composable: useTextGenerator in src/composables/useTextGenerator.ts
- localStorage key: carrier-freq-templates (for persistence)
- IndexPatientStatus: 4 options (heterozygous, homozygous, compound_het_confirmed, compound_het_assumed)
- PatientSex: 3 options (male, female, neutral) for German grammatical gender

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
- [x] Execute 03-04 (gap closure: status granularity and patient sex)
- [ ] Plan Phase 4 (Deploy)
- [ ] Execute Phase 4 plans

---

## Session Continuity

### Last Session

**Date:** 2026-01-19
**Completed:** Phase 3 verified complete (11/11 must-haves)
**Next:** Phase 4 - Deploy (validation and GitHub Pages deployment)

### Handoff Notes

Plan 03-04 closed two gaps from Phase 3 verification:

**GAP-03-01: IndexPatientStatus Expansion**
```typescript
// Before
export type IndexPatientStatus = 'heterozygous' | 'compound_het_homozygous';

// After
export type IndexPatientStatus =
  | 'heterozygous'           // Carrier - one pathogenic allele
  | 'homozygous'             // Affected - two copies same allele
  | 'compound_het_confirmed' // Affected - two different alleles, confirmed
  | 'compound_het_assumed';  // Affected - two different alleles, assumed
```

StepStatus.vue now shows 4 radio options instead of a toggle switch.

**GAP-03-02: PatientSex for German Grammar**
```typescript
export type PatientSex = 'male' | 'female' | 'neutral';

// useTemplateStore patientForms getter returns:
// male: der Patient / des Patienten / dem Patienten
// female: die Patientin / der Patientin / der Patientin
// neutral: der/die Patient*in / des/der Patient*in / dem/der Patient*in
```

TextOutput.vue shows patient sex selector (German mode only).

**buildStatusIntro Function:**
Generates status-specific opening text using patient dative form.

All TEXT requirements now satisfied:
- TEXT-01: German clinical text generation
- TEXT-02: Config-driven templates
- TEXT-03: Gender-inclusive language
- TEXT-04: Status-specific and patient-sex-aware text

Ready for Phase 4: Deploy (validation and deployment).

---

*State initialized: 2026-01-18*
*Last updated: 2026-01-19 (Phase 3 verified complete, ready for Phase 4)*
