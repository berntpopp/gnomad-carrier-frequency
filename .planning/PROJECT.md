# gnomAD Carrier Frequency Calculator

## What This Is

A progressive web application for genetic counselors to calculate carrier frequencies and recurrence risks for autosomal recessive conditions. Users enter a gene, select the index patient's status, and get population-specific carrier frequencies from gnomAD with calculated recurrence risks and ready-to-paste German or English clinical documentation text. The app works offline, supports shareable URLs, maintains a history of previous calculations, includes a professional documentation site with automated screenshots, and is SEO-optimized with static seed content and structured data for Google indexing.

## Core Value

Accurate recurrence risk calculation from real gnomAD population data, with clinical documentation output that's ready to paste into patient letters.

## Current Milestone: v1.6 Analysis & Export

**Goal:** Improve data quality transparency with variant quality flags and source contribution breakdown, add new display formats (scientific notation, per-100k) and TSV export, integrate Orphanet prevalence reference data, enable subcontinental population breakdown for gnomAD v2.1.1, and add population frequency bar chart visualization.

**Target features:**
- Variant quality flags: High AF, High Hom Count, gnomAD Filtered, Genomes Only (#12)
- ClinVar vs pLoF variant source contribution breakdown (#11)
- Scientific notation and per-100,000 display formats (#10)
- TSV export format for bioinformatics pipelines (#9)
- Orphanet prevalence reference data integration (#6)
- Subcontinental population breakdown for gnomAD v2.1.1 (#5)
- Population frequency bar chart visualization (#2)

**GitHub issues:** #2, #5, #6, #9, #10, #11, #12

## Current State

**Version:** v1.5 Core Extraction & CLI (shipped 2026-02-25)
**Deployed:** https://gnomad-carrier-frequency.kidney-genetics.org/
**Docs:** https://gnomad-carrier-frequency.kidney-genetics.org/docs/
**Codebase:** ~76,044 lines TypeScript/Vue/Markdown

**Features delivered (v1.0-v1.5):**
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
- **v1.4:** Static HTML seed content (750 words) for Google indexing
- **v1.4:** Sitemaps, canonical URLs, OG image, bilingual structured data
- **v1.4:** WCAG AA teal primary color (#117A7F/#4DB6AC) with warm gray secondary
- **v1.4:** Skip-to-content link, footer desktop labels, step loading indicator
- **v1.4:** First-time onboarding (WelcomeCard + CFTR quick-start)
- **v1.4:** Gene context chip on Steps 2-4, mobile title hiding
- **v1.4:** useConfirmDialog composable replacing native dialogs
- **v1.4:** Educational docs (carrier frequency explainer, calculation tutorial, expanded FAQ)
- **v1.5:** Bun workspaces monorepo (packages/core, packages/cli, apps/web)
- **v1.5:** @gnomad-cf/core package with typed API (calculations, filters, templates, client)
- **v1.5:** Hardy-Weinberg 2pq carrier frequency + homozygote exclusion (VCR/GCR)
- **v1.5:** Genetic prevalence (q²) + Bayesian prevalence with configurable penetrance
- **v1.5:** Full CLI: single gene, batch mode, interactive wizard, JSON/TSV/text output
- **v1.5:** Community gene configs (CFTR, HEXA, GJB2) with CI validation + runtime GitHub loading
- **v1.5:** Comprehensive test suite (426 tests: core unit, CLI integration, web component, E2E)
- **v1.5:** gnomAD v4 joint field support for accurate AN/AC values

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
- ✓ Static HTML seed content for Google indexing (750 words) — v1.4
- ✓ Sitemaps, canonical URL, robots meta, preconnect hints — v1.4
- ✓ OG image PNG with absolute HTTPS URLs — v1.4
- ✓ Structured data (WebApplication + bilingual FAQPage) — v1.4
- ✓ Title tag + meta description optimization — v1.4
- ✓ VitePress sitemap generation + app ↔ docs cross-linking — v1.4
- ✓ Teal primary color WCAG AA (#117A7F/#4DB6AC) — v1.4
- ✓ Skip-to-content link + footer desktop labels — v1.4
- ✓ Step transition loading indicator — v1.4
- ✓ First-time onboarding (WelcomeCard + CFTR quick-start) — v1.4
- ✓ Gene context chip on Steps 2-4 — v1.4
- ✓ useConfirmDialog replacing native dialogs — v1.4
- ✓ Educational docs pages (carrier frequency, Hardy-Weinberg) — v1.4
- ✓ Expanded FAQ with FAQPage structured data — v1.4
- ✓ Bun workspaces monorepo (packages/core, packages/cli, apps/web) — v1.5
- ✓ @gnomad-cf/core package with typed barrel exports — v1.5
- ✓ Web app imports from @gnomad-cf/core instead of local utils — v1.5
- ✓ Hardy-Weinberg 2pq carrier frequency formula — v1.5
- ✓ Homozygote exclusion (VCR/GCR) with toggle — v1.5
- ✓ Genetic prevalence (q²) + Bayesian with penetrance — v1.5
- ✓ Full CLI pipeline (single gene, batch, interactive wizard) — v1.5
- ✓ Community gene configs (CFTR, HEXA, GJB2) with CI validation — v1.5
- ✓ Runtime GitHub gene config loading + submission modal — v1.5
- ✓ Comprehensive test suite (426 tests, coverage thresholds) — v1.5
- ✓ gnomAD v4 joint field for accurate AN/AC — v1.5

### Active

**Data Quality & Transparency**
- [ ] Variant quality flags: High AF, High Hom Count, gnomAD Filtered, Genomes Only (#12)
- [ ] ClinVar vs pLoF variant source contribution breakdown (#11)

**Display Formats & Export**
- [ ] Scientific notation and per-100,000 display formats (#10)
- [ ] TSV export format for bioinformatics pipelines (#9)

**Extended Data Sources**
- [ ] Orphanet prevalence reference data integration (#6)
- [ ] Subcontinental population breakdown for gnomAD v2.1.1 (#5)

**Visualization**
- [ ] Population frequency bar chart (#2)

### Future (v1.7+)

**Features**
- [ ] X-linked recessive inheritance calculation
- [ ] X-linked dominant inheritance calculation
- [ ] Bayesian residual risk for negative carrier test
- [ ] Structural variant (SV) support (#8)
- [ ] Export results to PDF
- [ ] At-risk couple calculation (both partners)

**Performance**
- [ ] Tree-shakeable icons (@mdi/js migration)

### Out of Scope

- Backend/database — direct gnomAD GraphQL from browser
- User accounts/authentication — stateless tool
- Diagnostic claims — clinical tool for documentation, not diagnosis
- SSR / Nuxt migration — static HTML seed achieves 90% of SSR's SEO benefit
- Full product tour library — genetic counselors are domain experts
- Google Analytics — privacy concerns for medical tool
- Structural variant support — deferred to v1.7+ (#8)
- npm registry publishing — not yet needed, GitHub Pages is primary distribution

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
| VitePress for docs | Same Vite/Vue ecosystem, shared node_modules — v1.3 | ✓ Good |
| Playwright for screenshots | Same Node/TS ecosystem, full control over wizard navigation — v1.3 | ✓ Good |
| Merged deployment artifact | App at root, docs at /docs/, single GitHub Pages deployment — v1.3 | ✓ Good |
| Fixture-based API mocking | Realistic CFTR data for reproducible screenshots — v1.3 | ✓ Good |
| Clinical-first voice in docs | Research tool supporting clinical work, "For Research Use Only" — v1.3 | ✓ Good |
| `<span v-pre>` for template vars | VitePress alpha processes {{}} in containers — v1.3 | ✓ Good |
| Title leads with "Carrier Frequency Calculator" | Primary search term users type; gnomAD is secondary qualifier — v1.4 | ✓ Good |
| seed-* CSS class prefix | Avoids Vuetify global style conflicts at runtime — v1.4 | ✓ Good |
| Teal primary #117A7F / #4DB6AC | WCAG AA contrast (5.10:1 / 6.83:1); warm gray → secondary — v1.4 | ✓ Good |
| useGeneSearch singleton | Module-level state enables prefillGene for onboarding — v1.4 | ✓ Good |
| Module-level useConfirmDialog | Singleton refs ensure all consumers share same dialog state — v1.4 | ✓ Good |
| German FAQ natural language | Different search terminology (Heterozygotenfrequenz vs carrier frequency) — v1.4 | ✓ Good |

| Monorepo with bun workspaces | Core logic reusable across CLI + web + tests; single repo simplicity — v1.5 | ✓ Good |

---
*Last updated: 2026-02-26 after v1.6 milestone start*
