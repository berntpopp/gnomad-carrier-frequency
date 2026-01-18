# Research Summary: gnomAD Carrier Frequency Calculator

**Synthesized:** 2026-01-18
**Overall Confidence:** HIGH
**Research Files:** STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md

---

## Executive Summary

This project builds a Vue 3 single-page application for genetic counselors to calculate carrier frequencies and recurrence risks using gnomAD population data. The primary differentiator is German clinical text generation with Sie/Du perspective support. Expert consensus from gnomAD documentation, clinical genetics literature, and Vue ecosystem best practices indicates a straightforward path: use the constrained stack (Vue 3, Vuetify 3, TypeScript, Vite, Bun) with villus as the lightweight GraphQL client, implement a wizard UI with Vuetify's v-stepper, and follow a composable-based architecture with pure calculation functions.

The critical technical challenges are not in the UI or framework but in the domain: correctly summing allele frequencies across pathogenic variants, properly filtering by LOFTEE high-confidence LoF status and ClinVar pathogenic classifications, and accounting for population-specific founder effects. The carrier frequency formula `2 * sum(pathogenic_AF)` is well-established but requires careful variant filtering. The gnomAD API supports direct browser queries without CORS issues, though rate limiting necessitates per-gene batched queries.

The recommended approach is to build foundation services and pure calculation functions first (testable without Vue), then layer composables for reactive state management, and finally wire up UI components. This order minimizes rework and allows validation of calculation logic early. The German text generation is a Phase 3 concern that depends on calculations being correct first.

---

## Key Findings

### From STACK.md

| Technology | Rationale |
|------------|-----------|
| Vue 3.5+ | Constraint. Composition API with `<script setup>` for TypeScript-first development. |
| Vuetify 3.11+ | Constraint. Built-in v-stepper matches wizard UI. Material Design consistency. |
| Pinia 3.x | Official Vue state management. 40% less boilerplate than Vuex, full TS inference. |
| villus 3.5+ | Vue-native GraphQL client. 4KB vs Apollo's 31KB. Simple document cache sufficient. |
| VueUse 14.x | useClipboard for copy-to-clipboard with Safari fallback. useDebounceFn for gene search. |
| Vite 7.x | Sub-50ms HMR, native ESM, optimal for SPA development. |

**Critical Version Notes:**
- Vue 3.5+ required for VueUse 14.x compatibility
- Use `bun run dev` not `bunx` for Vite commands
- GitHub Pages requires `base: '/gnomad-carrier-frequency/'` in vite.config.ts

### From FEATURES.md

**Table Stakes (Must Have):**
1. Gene search/input with HGNC symbol validation
2. gnomAD data integration (v4 preferred, 807K+ samples)
3. Population/ancestry filtering (8 populations: afr, eas, nfe, amr, sas, fin, asj, mid)
4. LoF high-confidence + ClinVar P/LP filtering
5. Carrier frequency calculation: `carrier_freq = 2 * sum(AF)`
6. Recurrence risk calculation: `risk = carrier_freq / 4`
7. Numeric results as fraction (1/X) and percentage
8. Source attribution (gnomAD version, variant count)

**Differentiators (Should Have):**
1. German clinical text generation with Sie/Du toggle
2. Copy-ready clinical documentation
3. Variant-level transparency (which variants contributed)
4. Quality indicators (low allele number warnings)

**Anti-Features (Avoid):**
- No patient data storage (stateless tool)
- No automated variant curation (use gnomAD/ClinVar as truth)
- No confidence intervals (GeniE deliberately excluded these)
- No EMR/EHR integration (copy-paste workflow is acceptable)

### From ARCHITECTURE.md

**Component Hierarchy:**
```
App.vue (Vuetify shell)
  --> WizardView.vue (v-stepper orchestration)
        --> GeneInputStep.vue
        --> PatientStatusStep.vue
        --> FrequencySourceStep.vue
        --> ResultsStep.vue
```

**Key Patterns:**
1. **Service Layer Separation:** Pure functions in `services/` for API calls and calculations
2. **Composable Singleton:** `useWizardState()` for cross-step data persistence
3. **Computed Chains:** `useCarrierCalculation()` derives values from state + API data
4. **Pure Calculation Functions:** `carrierFrequency.ts` is framework-agnostic, testable

**Folder Structure:**
```
src/
  composables/   (useWizardState, useGnomadApi, useCarrierCalculation)
  services/      (gnomadService, carrierFrequency, germanText)
  types/         (gnomad.ts, wizard.ts, calculation.ts)
  components/wizard/  (step components)
```

### From PITFALLS.md

**Top 5 Critical Pitfalls:**

| # | Pitfall | Prevention | Phase |
|---|---------|------------|-------|
| 1 | Summing AF incorrectly | Use `2 * sum(pathogenic_AF)`, validate against known genes (CFTR) | Phase 1 |
| 2 | Wrong gnomAD dataset | Use v4 exomes with GRCh38, check AN >= 50K for coverage | Phase 1 |
| 3 | Trusting unfiltered ClinVar | Require >= 1 gold star, exclude conflicting interpretations | Phase 2 |
| 4 | Ignoring founder effects | Display all populations, flag when any pop > 5x global | Phase 2 |
| 5 | LOFTEE misinterpretation | Filter by `lof = "HC"` only, not all LoF variants | Phase 2 |

**API Integration Warnings:**
- Always use HTTPS (HTTP causes 302 redirect that breaks POST)
- Batch all variants for a gene in single request
- Implement exponential backoff for 429/503 responses
- Cache results in sessionStorage

---

## Implications for Roadmap

### Suggested Phase Structure

**Phase 1: Foundation (API + Core Calculation)**

| Aspect | Details |
|--------|---------|
| Rationale | Must establish correct calculation logic before building UI. API integration + filtering logic are the critical path. |
| Delivers | Working gnomAD queries, variant filtering, carrier frequency calculation, basic type definitions |
| Features | Gene search, gnomAD data fetch, LoF HC filtering, carrier frequency formula |
| Pitfalls to Avoid | P1 (AF summing), P2 (dataset version), P6 (rate limiting), P7 (missing data handling), P11 (gene symbol validation) |
| Research Needed | None - well-documented patterns in gnomAD API docs and reference repo |

**Phase 2: Wizard UI + Population Display**

| Aspect | Details |
|--------|---------|
| Rationale | Build the user-facing workflow on top of validated calculation logic. Population-specific frequencies are clinically critical. |
| Delivers | Complete 4-step wizard flow, population selection, ClinVar filtering, recurrence risk display |
| Features | v-stepper wizard, patient status selection, frequency source selection (gnomAD/literature/default), results display |
| Pitfalls to Avoid | P3 (ClinVar quality), P4 (founder effects), P5 (LOFTEE filtering), P8 (transcript selection) |
| Research Needed | Minimal - Vuetify stepper is well-documented. May want to validate ClinVar star rating filtering approach. |

**Phase 3: German Text + Polish**

| Aspect | Details |
|--------|---------|
| Rationale | Differentiator feature built on correct foundations. Clinical text requires calculations to be trustworthy first. |
| Delivers | German consultation text generation, Sie/Du toggle, copy-to-clipboard, variant-level transparency |
| Features | German text templates, perspective selection, useClipboard integration, quality indicators |
| Pitfalls to Avoid | P10 (floating point display), P12 (coverage warnings) |
| Research Needed | None - straightforward template rendering with string interpolation |

**Phase 4: Validation + Deployment**

| Aspect | Details |
|--------|---------|
| Rationale | Validate calculations against known reference values before clinical use. |
| Delivers | Test coverage, GitHub Pages deployment, documentation |
| Features | Unit tests for calculation functions, E2E tests for wizard flow, deployment pipeline |
| Pitfalls to Avoid | Ensure calculations match published carrier frequencies for CFTR, HEXA, etc. |
| Research Needed | None |

### Research Flags

| Phase | Research Status |
|-------|-----------------|
| Phase 1 | **Standard patterns.** gnomAD API structure documented in reference repo. Carrier frequency formula well-established. |
| Phase 2 | **Possibly needs research.** ClinVar star rating filtering and variant-level consequence mapping may need deeper investigation during implementation. |
| Phase 3 | **Standard patterns.** German text is domain-specific but technically straightforward template rendering. |
| Phase 4 | **Standard patterns.** GitHub Pages deployment is routine. |

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies are current, well-documented, mutually compatible. villus is the clear choice over Apollo. |
| Features | HIGH | Based on gnomAD GeniE tool, NSGC guidelines, clinical genetics literature. Clear MVP scope. |
| Architecture | HIGH | Standard Vue 3 patterns. Composable-based architecture is officially recommended. |
| Pitfalls | HIGH | Based on gnomAD official docs, peer-reviewed publications, and community discussions. |

### Gaps to Address

1. **ClinVar Integration Details:** The research confirms we should filter by review status, but the exact API field names for ClinVar data within gnomAD responses should be validated during implementation.

2. **X-linked Inheritance:** Deferred to Phase 3+ but calculation differs significantly from AR. When implemented, will need separate research on hemizygous frequency calculation.

3. **MANE Select Transcripts:** gnomAD uses canonical transcripts; ClinVar uses RefSeq. Mapping between them is a known challenge but may not be critical for MVP if we use gnomAD's canonical consistently.

4. **Validation Data:** Need published carrier frequencies for 3-5 genes (CFTR, HEXA, SMN1) to validate calculations. Should compile before Phase 4.

---

## Aggregated Sources

### Official Documentation
- [Vue.js](https://vuejs.org/) - Composition API, Composables
- [Vuetify 3](https://vuetifyjs.com/) - v-stepper, Material Design components
- [Pinia](https://pinia.vuejs.org/) - State management
- [villus](https://villus.dev/) - Vue GraphQL client
- [VueUse](https://vueuse.org/) - Vue composables collection
- [Vite](https://vite.dev/) - Build tool

### gnomAD Resources
- [gnomAD Browser & API](https://gnomad.broadinstitute.org/)
- [gnomAD GraphQL API (GitHub)](https://github.com/broadinstitute/gnomad-browser/tree/main/graphql-api)
- [Loss-of-Function Curations](https://gnomad.broadinstitute.org/news/2020-10-loss-of-function-curations-in-gnomad/)
- [GeniE Prevalence Estimator](https://gnomad.broadinstitute.org/news/2024-06-genie/)
- [Filtering Allele Frequency](https://gnomad.broadinstitute.org/help/faf)

### Clinical Genetics
- [NSGC Clinical Documentation Practice Resource](https://pubmed.ncbi.nlm.nih.gov/34390070/)
- [gnomAD v4.0 carrier frequency estimation](https://pubmed.ncbi.nlm.nih.gov/39492094/)
- [Variant interpretation using population databases](https://pmc.ncbi.nlm.nih.gov/articles/PMC9160216/)
- [ClinGen Guidance on gnomAD v4](https://clinicalgenome.org/site/assets/files/9445/clingen_guidance_to_vceps_regarding_the_use_of_gnomad_v4_march_2024.pdf)
- [Estimation of carrier frequencies utilizing gnomAD](https://pubmed.ncbi.nlm.nih.gov/38459613/)

---

## Ready for Roadmap

This research synthesis provides:
- Clear technology stack with rationale
- Prioritized feature list with MVP scope
- Architectural patterns with code examples
- Ranked pitfalls with prevention strategies
- Suggested phase structure with dependencies

The roadmapper can proceed with confidence. The domain is well-documented, the stack is mature, and the critical pitfalls are identified with clear mitigations.
