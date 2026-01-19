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
**Phase:** Phase 3 - German Text (3 of 4)
**Plan:** 03-01 complete (1/3)
**Status:** In progress

### Progress

```
Phase 1: Foundation     [##########] 5/5 plans COMPLETE
Phase 2: Wizard UI      [##########] 3/3 plans COMPLETE
Phase 3: German Text    [###.......] 1/3 plans
Phase 4: Deploy         [..........] Validation only
```

**Overall:** `[#########.] ~85%` (9/11 plans complete)

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Plans Completed | 9 |
| Phases Completed | 2 |
| Requirements Done | Phase 1-2 complete, Phase 3 in progress |
| Session Count | 10 |

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
- [ ] Execute 03-02 (Pinia store)
- [ ] Execute 03-03 (text generator composable and UI)
- [ ] Plan Phase 4 (Deploy)
- [ ] Execute Phase 4 plans

---

## Session Continuity

### Last Session

**Date:** 2026-01-19
**Completed:** Plan 03-01 (Template System Foundation)
**Next:** Execute 03-02 (Pinia store for template customization)

### Handoff Notes

Phase 3 template system foundation is complete. Plan 03-01 delivered:

**Template types (src/types/text.ts):**
- `Perspective`: 'affected' | 'carrier' | 'familyMember'
- `GenderStyle`: '*' | ':' | '/' | 'traditional'
- `TemplateContext`: All template variables for interpolation

**Template renderer (src/utils/template-renderer.ts):**
```typescript
renderTemplate(template: string, context: Partial<TemplateContext>): string
// Replaces {{variable}} with context values
// Missing variables: empty string + console.warn
```

**Template JSON files:**
```
src/config/templates/
├── de.json   # German clinical templates (Heterozygotenfrequenz, etc.)
└── en.json   # English templates with matching structure
```

**Template structure (3 perspectives x 8 sections):**
- Perspectives: affected, carrier, familyMember
- Sections: geneIntro, inheritance, carrierFrequency, recurrenceRisk, populationContext, founderEffect, sourceCitation, recommendation

**Variables used in templates:**
gene, carrierFrequencyRatio, recurrenceRiskPercent, recurrenceRiskRatio, source, genderSuffix, accessDate

Ready for 03-02: Install Pinia + persistence plugin, create template store.

---

*State initialized: 2026-01-18*
*Last updated: 2026-01-19 (Plan 03-01 complete)*
