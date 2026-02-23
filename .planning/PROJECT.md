# gnomAD Carrier Frequency Calculator

## What This Is

A progressive web application for genetic counselors to calculate carrier frequencies and recurrence risks for autosomal recessive conditions. Users enter a gene, select the index patient's status, and get population-specific carrier frequencies from gnomAD with calculated recurrence risks and ready-to-paste German or English clinical documentation text. The app works offline, supports shareable URLs, maintains a history of previous calculations, and includes a professional documentation site with automated screenshots.

## Core Value

Accurate recurrence risk calculation from real gnomAD population data, with clinical documentation output that's ready to paste into patient letters.

## Current Milestone: v1.4 Discoverability & Polish

**Goal:** Fix Google indexing, improve search visibility with structured data and educational content, and polish the UI with better CTA colors, first-time onboarding, and mobile optimizations.

**Target features:**
- Static HTML seed content for Google indexing
- Sitemap, canonical URLs, robots meta, preconnect hints
- OG image PNG with absolute URLs
- Expanded structured data (WebApplication + FAQPage schema)
- Title tag + meta description optimization
- VitePress sitemap generation + cross-linking (app ↔ docs)
- 2-3 educational docs pages (carrier frequency, Hardy-Weinberg, FAQ)
- CTA/primary color fix with clear disabled/enabled contrast
- First-time onboarding (welcome card / "Try with CFTR")
- Mobile title reduction + persistent gene context chip
- Replace native alert()/confirm() with Vuetify dialogs
- Skip-to-content link, footer icon labels, step transition loading

## Current State

**Version:** v1.3 Documentation Site (shipped 2026-02-23)
**Deployed:** https://gnomad-carrier-frequency.kidney-genetics.org/
**Docs:** https://gnomad-carrier-frequency.kidney-genetics.org/docs/
**Codebase:** ~30,624 lines TypeScript/Vue/Markdown

**Features delivered (v1.0-v1.3):**
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
- **v1.3:** VitePress documentation site with 17 pages (Guide, Use Cases, Reference, About)
- **v1.3:** Playwright screenshot automation (14 WebP screenshots with CI auto-refresh)
- **v1.3:** Unified deployment pipeline (app + docs at custom domain)
- **v1.3:** CITATION.cff with CFF 1.2.0 and BibTeX support
- **v1.3:** Research-use-only disclaimers on docs and landing page

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
- ✓ VitePress documentation site with navigation and sidebar — v1.3
- ✓ Landing page with hero, features, and call-to-action — v1.3
- ✓ PWA service worker denylist for /docs/ path — v1.3
- ✓ Playwright screenshot automation (14 screenshots) — v1.3
- ✓ data-testid attributes on key UI elements — v1.3
- ✓ Screenshot CI workflow with auto-commit — v1.3
- ✓ Getting Started guide with step-by-step walkthrough — v1.3
- ✓ Use cases: carrier screening, family planning, clinical letter — v1.3
- ✓ Reference: methodology, data sources, filters, templates — v1.3
- ✓ Citation page with CFF and BibTeX — v1.3
- ✓ Unified deploy workflow (app + docs merged artifact) — v1.3
- ✓ Slim README with docs site link — v1.3

### Active

**SEO & Discoverability**
- [ ] Static HTML seed content in index.html for crawler indexing
- [ ] Sitemap.xml, canonical URL, robots meta
- [ ] OG image PNG with absolute URLs
- [ ] Expanded structured data (WebApplication + FAQPage)
- [ ] Title tag + meta description optimization
- [ ] VitePress sitemap generation
- [ ] App ↔ docs cross-linking
- [ ] Educational docs pages (carrier frequency, Hardy-Weinberg, FAQ)
- [ ] Preconnect hints for gnomAD API

**UI/UX Polish**
- [ ] CTA/primary color fix with disabled/enabled contrast
- [ ] First-time onboarding experience
- [ ] Mobile title reduction
- [ ] Persistent gene context chip (Steps 2-4)
- [ ] Replace native alert()/confirm() with Vuetify dialogs
- [ ] Skip-to-content link
- [ ] Footer icon labels on desktop
- [ ] Step transition loading indicator

### Future (v1.4+)

**Testing Infrastructure**
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

**Tech Stack:** bun, Vue 3 (Composition API), Vuetify 3, Vite 7, TypeScript 5.9, villus (GraphQL), Pinia (state + persistence), VueUse (utilities), Zod (validation), vite-plugin-pwa (PWA), VitePress (docs), Playwright (screenshots)

## Constraints

- **Stack**: bun, Vue 3 (Composition API + `<script setup>`), Vuetify 3, Vite, TypeScript
- **Deployment**: GitHub Pages via GitHub Actions (custom domain)
- **No backend**: All API calls direct to gnomAD GraphQL from browser
- **Single page**: Stepper-based wizard UI flow
- **PWA**: Installable, offline-capable with service worker
- **Docs**: VitePress at /docs/ path, coexisting with app at root

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
| VitePress for docs | Same Vite/Vue ecosystem, shared node_modules, used by Vue/Pinia/Vitest — v1.3 | ✓ Good |
| Playwright for screenshots | Same Node/TS ecosystem, full control over wizard navigation — v1.3 | ✓ Good |
| Merged deployment artifact | App at root, docs at /docs/, single GitHub Pages deployment — v1.3 | ✓ Good |
| Fixture-based API mocking | Realistic CFTR data for reproducible screenshots — v1.3 | ✓ Good |
| Clinical-first voice in docs | Research tool supporting clinical work, "For Research Use Only" — v1.3 | ✓ Good |
| `<span v-pre>` for template vars | VitePress alpha processes {{}} in containers — v1.3 | ✓ Good |

---
*Last updated: 2026-02-23 after v1.4 milestone started*
