# Project Milestones: gnomAD Carrier Frequency Calculator

## v1.6 Analysis & Export (Shipped: 2026-02-27)

**Delivered:** Data quality transparency with variant quality flags and source breakdown, display format system (scientific notation, per-100k), TSV export, Orphanet prevalence integration, subcontinental population breakdown for gnomAD v2.1.1, and population bar chart visualization.

**Phases completed:** 33-37 (17 plans total)

**Key accomplishments:**

- Display format system with 4 formats (percentage, ratio, scientific notation, per-100k) and persisted preferences
- TSV export for bioinformatics pipelines (populations + variants) with UTF-8 BOM Excel compatibility
- Variant quality flags (High AF, High Hom, gnomAD Filtered, Genomes Only) with configurable exclusions and real-time recalculation
- ClinVar vs pLoF source breakdown with per-population expandable rows and source badges
- Inline SVG population bar chart with Okabe-Ito palette, theme support, and publication-ready SVG/PNG export
- Orphanet disease prevalence integration (web + CLI, eager prefetch, PWA offline cache, clinical disclaimer)
- Subcontinental population breakdown for gnomAD v2.1.1 (9 subpopulations: 6 NFE + 3 EAS)

**Stats:**

- 126 files created/modified (+24,173 / -3,641 lines)
- 27,028 lines source TypeScript/Vue
- 5 phases, 17 plans, 35 tasks
- 2 days from start to ship (2026-02-25 → 2026-02-27)

**Git range:** `feat(33-01)` → `feat(37)`

**What's next:** v1.7 — export pipeline data completion, X-linked inheritance, or new feature milestone

---

## v1.5 Core Extraction & CLI (Shipped: 2026-02-25)

**Delivered:** Bun workspaces monorepo with @gnomad-cf/core package, Hardy-Weinberg 2pq carrier frequency, genetic prevalence calculations, full CLI pipeline, and community gene configs.

**Phases completed:** 25-32 (26 plans total)

**Key accomplishments:**

- Bun workspaces monorepo (packages/core, packages/cli, apps/web)
- @gnomad-cf/core package with typed barrel exports and 9 subpath entry points
- Hardy-Weinberg 2pq carrier frequency with homozygote exclusion (VCR/GCR)
- Genetic prevalence (q²) + Bayesian prevalence with configurable penetrance
- Full CLI: single gene, batch mode, interactive wizard, JSON/TSV/text/SVG output
- Community gene configs (CFTR, HEXA, GJB2) with CI validation + runtime GitHub loading
- Comprehensive test suite (426 tests with coverage thresholds)

**Stats:**

- 8 phases, 26 plans
- Shipped 2026-02-25

**Git range:** `feat(25)` → `feat(32)`

**What's next:** v1.6 Analysis & Export

---

## v1.4 Discoverability & Polish (Shipped: 2026-02-23)

**Delivered:** SEO-ready static HTML seed content with structured data, WCAG AA teal color system, first-time onboarding experience, and educational documentation pages.

**Phases completed:** 21-24 (12 plans total)

**Key accomplishments:**

- Static HTML seed content (750 words) for Google indexing with sitemaps, canonical URLs, OG image PNG, and bilingual structured data (WebApplication + FAQPage)
- WCAG AA teal primary color system (#117A7F/#4DB6AC) with skip-to-content link, footer desktop labels, and step transition loading indicator
- First-time onboarding with WelcomeCard and CFTR quick-start, persistent gene context chip on Steps 2-4
- useConfirmDialog composable replacing all 4 native alert/confirm calls with Vuetify dialogs
- Educational docs pages (carrier frequency explainer + calculation tutorial) with Article JSON-LD
- Expanded FAQ with 7 net-new questions and FAQPage structured data

**Stats:**

- 72 files created/modified (+6,753 / -199 lines)
- ~76,044 lines total project code
- 4 phases, 12 plans, 37 requirements
- Same day ship (2026-02-23, ~2.5 hours)

**Git range:** `feat(21-02)` → `fix(23)`

**What's next:** v1.5 Testing Infrastructure or new feature milestone

---

## v1.3 Documentation Site (Shipped: 2026-02-23)

**Delivered:** Professional documentation site with auto-generated screenshots, deployed alongside the app on GitHub Pages at a custom domain.

**Phases completed:** 16-20 (14 plans total)

**Key accomplishments:**

- VitePress documentation site with 17 content pages across 4 sections (Guide, Use Cases, Reference, About)
- Playwright screenshot automation generating 14 WebP screenshots with API fixture mocking and CI auto-refresh
- Clinical documentation coverage: Getting Started walkthrough, 3 use cases, and full reference material
- Unified deployment pipeline merging app + docs into single GitHub Pages artifact at custom domain
- CITATION.cff with CFF 1.2.0 standard, BibTeX entry, and "For Research Use Only" disclaimers
- README streamlined to 57-line landing page directing to docs site

**Stats:**

- 125 files created/modified (+13,969 / -452 lines)
- ~30,624 lines total project code
- 5 phases, 14 plans, 52 requirements
- 14 days from start to ship (2026-02-09 → 2026-02-23)

**Git range:** `docs(16)` → `docs(20)`

**What's next:** v1.4 Testing Infrastructure (Vitest, component tests, E2E tests)

---

## v1.2 Sharing & Collaboration (Shipped: 2026-01-20)

**Delivered:** Shareable calculation URLs, offline-capable PWA, manual variant exclusion, mobile-optimized UI, and search history with auto-save.

**Phases completed:** 11-15 (15 plans total)

**Key accomplishments:**

- Shareable URLs with Zod-validated state encoding (gene, step, filters, exclusions)
- Progressive Web App with offline support (Workbox caching, installable, service worker)
- Manual variant exclusion with real-time frequency recalculation
- Mobile-optimized UI (fullscreen dialogs, responsive tables, touch-friendly 44px targets)
- Search history with auto-save, restore, and configurable settings
- Cross-phase integration (exclusions sync to URLs and history entries)

**Stats:**

- 53 files created/modified (code only, +11k/-3k lines)
- 12,956 lines total TypeScript/Vue
- 5 phases, 15 plans
- 2 days from v1.1 to ship

**Git range:** `feat(11-01)` → `feat(15-03)`

**What's next:** v1.3 features (X-linked inheritance, batch processing, PDF export)

---

## v1.1 Release-Ready (Shipped: 2026-01-19)

**Delivered:** Professional app shell, configurable filtering, ClinGen validation, data export, template editing, browser logging, and full accessibility compliance.

**Phases completed:** 5-10 (27 plans total)

**Key accomplishments:**

- Settings store with dark/light/system theme toggle and persistence
- App shell with branded logo, favicon, navigation, and version display
- WCAG 2.1 AA accessibility with Lighthouse 95+ scores
- Configurable variant filters (LoF, missense, ClinVar, star threshold)
- ClinGen gene-disease validity integration with cached lookups
- Data export (JSON/Excel), template editor, and browser logging panel

**Stats:**

- 85+ files created/modified
- 9,500+ lines TypeScript/Vue (from 3,285)
- 6 phases, 27 plans
- Same day (rapid development from v1.0)

**Git range:** `feat(05-01)` → `feat(10-08)`

**What's next:** v1.2 Sharing & Collaboration (URL state, PWA, variant exclusion)

---

## v1.0 MVP (Shipped: 2026-01-19)

**Delivered:** Carrier frequency calculator with gnomAD API integration, 4-step wizard UI, German clinical text generation, and GitHub Pages deployment.

**Phases completed:** 1-4 (15 plans total)

**Key accomplishments:**

- gnomAD API integration with multi-version support (v4, v3, v2)
- Carrier frequency calculation using Hardy-Weinberg formula (2 × sum AF)
- 4-step wizard UI with Vuetify stepper and sortable data tables
- German clinical text generation with 3 perspectives, 4 statuses, patient sex grammar
- CI/CD pipeline with ESLint, TypeScript, and automated GitHub Pages deployment
- Validated calculations for CFTR (NFE ~1:15) and HEXA (ASJ ~1:26 with founder effect)

**Stats:**

- 3,285 lines of TypeScript/Vue code
- 4 phases, 15 plans
- ~12 hours from start to ship
- Deployed at https://berntpopp.github.io/gnomad-carrier-frequency/

**Git range:** `58fbdec` → `00cb3e3`

**What's next:** v1.1 features (X-linked inheritance, batch processing, PDF export)

---
