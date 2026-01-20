# gnomAD Carrier Frequency Calculator

## What This Is

A progressive web application for genetic counselors to calculate carrier frequencies and recurrence risks for autosomal recessive conditions. Users enter a gene, select the index patient's status, and get population-specific carrier frequencies from gnomAD with calculated recurrence risks and ready-to-paste German or English clinical documentation text. The app works offline, supports shareable URLs, and maintains a history of previous calculations.

## Core Value

Accurate recurrence risk calculation from real gnomAD population data, with clinical documentation output that's ready to paste into patient letters.

## Current State

**Version:** v1.2 Sharing & Collaboration (shipped 2026-01-20)
**Deployed:** https://berntpopp.github.io/gnomad-carrier-frequency/
**Codebase:** 12,956 lines TypeScript/Vue

**Features delivered (v1.0-v1.2):**
- gnomAD API integration (v4, v3, v2 support)
- 4-step wizard: Gene → Status → Frequency → Results
- Population-specific carrier frequencies with founder effect detection
- German/English clinical text with 3 perspectives, 4 statuses, patient sex grammar
- Professional app shell with dark/light theme, settings, branding
- Configurable variant filtering (LoF, missense, ClinVar, star threshold)
- ClinGen gene-disease validity warnings (cached)
- Data export (JSON/Excel), template editor, browser logging
- WCAG 2.1 AA accessibility, Lighthouse 95+ scores
- **v1.2:** Shareable URLs with full state encoding
- **v1.2:** Progressive Web App (installable, offline support)
- **v1.2:** Manual variant exclusion with real-time recalculation
- **v1.2:** Mobile-optimized UI (responsive dialogs, touch targets)
- **v1.2:** Search history with auto-save and restore

## Requirements

### Validated

- ✓ Gene search input with gnomAD lookup — v1.0
- ✓ Index patient status selection (4 options) — v1.0
- ✓ Carrier frequency from three sources — v1.0
- ✓ gnomAD variant filtering (LoF HC, ClinVar pathogenic) — v1.0
- ✓ Population-specific frequencies with founder effect detection — v1.0
- ✓ Recurrence risk calculation — v1.0
- ✓ Clinical text generation (German/English) — v1.0
- ✓ Copy-to-clipboard functionality — v1.0
- ✓ App shell with navigation, settings, theme toggle — v1.1
- ✓ Variant table modal with drill-down — v1.1
- ✓ ClinGen gene-disease validity integration — v1.1
- ✓ Configurable variant filtering — v1.1
- ✓ Data export (JSON/Excel) — v1.1
- ✓ Template editor — v1.1
- ✓ Browser-based logging — v1.1
- ✓ Help/FAQ/Documentation — v1.1
- ✓ Lighthouse 90+ scores — v1.1
- ✓ URL state sharing — v1.2
- ✓ PWA with offline support — v1.2
- ✓ Manual variant exclusion — v1.2
- ✓ Mobile optimization — v1.2
- ✓ Search history — v1.2

### Active (v1.3+)

**Testing Infrastructure (Priority)**
- [ ] Vitest setup with coverage reporting
- [ ] Unit tests for composables (useCarrierFrequency, useExclusionState, useHistoryStore)
- [ ] Unit tests for utilities (variant-filters, frequency calculations, template renderer)
- [ ] Component tests with Vue Test Utils
- [ ] Playwright E2E tests for critical flows (wizard completion, URL sharing, history)
- [ ] CI integration for test coverage reporting

**Features**
- [ ] X-linked recessive inheritance calculation
- [ ] X-linked dominant inheritance calculation
- [ ] Bayesian residual risk for negative carrier test
- [ ] Batch processing for multiple genes
- [ ] Export results to PDF
- [ ] At-risk couple calculation (both partners)

### Out of Scope

- Backend/database — direct gnomAD GraphQL from browser
- User accounts/authentication — stateless tool
- Diagnostic claims — clinical tool for documentation, not diagnosis

## Context

**Domain:** Genetic counseling for autosomal recessive conditions. Carrier frequency is the proportion of a population carrying one copy of a pathogenic variant. Recurrence risk is calculated using Hardy-Weinberg equilibrium principles.

**gnomAD:** The Genome Aggregation Database provides population allele frequencies via GraphQL API. Relevant filters are LoF (loss of function) with "HC" (high confidence) annotation and ClinVar pathogenic classifications.

**Tech Stack:** npm, Vue 3 (Composition API), Vuetify 3, Vite 7, TypeScript 5.9, villus (GraphQL), Pinia (state + persistence), VueUse (utilities), Zod (validation), vite-plugin-pwa (PWA)

## Constraints

- **Stack**: npm, Vue 3 (Composition API + `<script setup>`), Vuetify 3, Vite, TypeScript
- **Deployment**: GitHub Pages via GitHub Actions
- **No backend**: All API calls direct to gnomAD GraphQL from browser
- **Single page**: Stepper-based wizard UI flow
- **PWA**: Installable, offline-capable with service worker

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
| Zod for URL validation | Type-safe runtime validation with graceful fallbacks — v1.2 | ✓ Good |
| NetworkFirst for API caching | Fresh data when online, cached offline — v1.2 | ✓ Good |
| Singleton composables | Shared state across components (exclusions, history) — v1.2 | ✓ Good |
| lz-string for URL compression | Compact exclusion encoding in shareable URLs — v1.2 | ✓ Good |
| 50-entry history default | Balance of utility vs storage — v1.2 | ✓ Good |

---
*Last updated: 2026-01-20 after v1.2 milestone*
