# gnomAD Carrier Frequency Calculator

## What This Is

A single-page application for genetic counselors to calculate carrier frequencies and recurrence risks for autosomal recessive conditions. Users enter a gene, select the index patient's status, and get population-specific carrier frequencies from gnomAD with calculated recurrence risks and ready-to-paste German clinical documentation text.

## Core Value

Accurate recurrence risk calculation from real gnomAD population data, with clinical documentation output that's ready to paste into patient letters.

## Current State

**Version:** v1.0 MVP (shipped 2026-01-19)
**Deployed:** https://berntpopp.github.io/gnomad-carrier-frequency/
**Codebase:** 3,285 lines TypeScript/Vue

**Features delivered:**
- gnomAD API integration (v4, v3, v2 support)
- 4-step wizard: Gene → Status → Frequency → Results
- Population-specific carrier frequencies with founder effect detection
- German clinical text with 3 perspectives, 4 statuses, patient sex grammar
- Copy-to-clipboard functionality
- CI/CD with ESLint, TypeScript, automated deployment

## Requirements

### Validated (v1.0)

- ✓ Gene search input with gnomAD lookup — v1.0
- ✓ Index patient status selection (4 options: heterozygous, homozygous, compound het confirmed/assumed) — v1.0
- ✓ Carrier frequency from three sources: gnomAD estimate, literature citation, default assumption — v1.0
- ✓ gnomAD query: fetch variants, filter for LoF HC or ClinVar pathogenic, calculate carrier frequency — v1.0
- ✓ Population-specific frequencies with founder effect detection — v1.0
- ✓ Recurrence risk calculation: carrier_freq / 4 (het) or / 2 (hom/compound) — v1.0
- ✓ German clinical text generation with perspective selection — v1.0
- ✓ Copy-to-clipboard for clinical text — v1.0

### Active (v1.1+)

- [ ] X-linked recessive inheritance calculation
- [ ] X-linked dominant inheritance calculation
- [ ] Bayesian residual risk for negative carrier test
- [ ] Batch processing for multiple genes
- [ ] Session history (recent calculations)
- [ ] Export results to PDF
- [ ] At-risk couple calculation (both partners)

### Out of Scope

- Backend/database — direct gnomAD GraphQL from browser
- User accounts/authentication — stateless tool
- Variant-level detail display — aggregated frequencies only
- Diagnostic claims — clinical tool for documentation, not diagnosis

## Context

**Domain:** Genetic counseling for autosomal recessive conditions. Carrier frequency is the proportion of a population carrying one copy of a pathogenic variant. Recurrence risk is calculated using Hardy-Weinberg equilibrium principles.

**gnomAD:** The Genome Aggregation Database provides population allele frequencies via GraphQL API. Relevant filters are LoF (loss of function) with "HC" (high confidence) annotation and ClinVar pathogenic classifications.

**Tech Stack:** npm, Vue 3 (Composition API), Vuetify 3, Vite, TypeScript, villus (GraphQL), Pinia (state), VueUse (utilities)

## Constraints

- **Stack**: npm, Vue 3 (Composition API + `<script setup>`), Vuetify 3, Vite, TypeScript
- **Deployment**: GitHub Pages via GitHub Actions
- **No backend**: All API calls direct to gnomAD GraphQL from browser
- **Single page**: Stepper-based wizard UI flow

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Vuetify 3 over Tailwind | Built-in stepper component, Material Design consistency | ✓ Good |
| Direct gnomAD GraphQL | No backend complexity, data always fresh | ✓ Good |
| npm over Bun | Environment compatibility (Bun not installed) | ✓ Good |
| German-only v1 | Primary use case, English added in templates | ✓ Good |
| villus over Apollo | 4KB vs 31KB bundle size | ✓ Good |
| Config-driven thresholds | Zero hardcoded values in src/ | ✓ Good |
| 4-option IndexPatientStatus | Clinical accuracy for documentation | ✓ Good |
| Patient sex for German grammar | Correct grammatical gender agreement | ✓ Good |

---
*Last updated: 2026-01-19 after v1.0 milestone*
