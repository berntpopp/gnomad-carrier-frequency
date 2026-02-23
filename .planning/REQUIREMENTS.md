# Requirements: gnomAD Carrier Frequency Calculator v1.4

**Defined:** 2026-02-23
**Core Value:** Accurate recurrence risk calculation from gnomAD population data with clinical documentation output

## v1.4 Requirements

Requirements for the Discoverability & Polish milestone. Addresses two critical problems: site not indexed by Google (empty body) and CTA buttons look disabled (muted primary color).

### SEO Indexing

- [x] **SEO-01**: Static HTML seed content (500+ words) inside `<div id="app">` with H1, feature list, and nav links to docs -- replaced by Vue on mount
- [x] **SEO-02**: `<link rel="canonical">` with absolute URL including trailing slash
- [x] **SEO-03**: `<meta name="robots" content="index, follow">` directive
- [x] **SEO-04**: `public/sitemap.xml` with app root URL
- [x] **SEO-05**: Updated `public/robots.txt` with sitemap references
- [x] **SEO-06**: PNG OG image (1200x630px) generated from SVG via sharp build script
- [x] **SEO-07**: Absolute HTTPS URLs for `og:image` and `twitter:image` meta tags
- [x] **SEO-08**: `<noscript>` fallback placed outside `<div id="app">`
- [x] **SEO-09**: VitePress sitemap generation via `sitemap` config option
- [x] **SEO-10**: App footer "Docs" icon linking to `/docs/`
- [x] **SEO-11**: Static HTML nav with links to key docs pages (discoverable by crawlers)
- [x] **SEO-12**: Docs pages include contextual "Open Calculator" CTAs in content

### SEO On-Page

- [x] **SOP-01**: Title tag optimized to lead with "Carrier Frequency Calculator"
- [x] **SOP-02**: Meta description with differentiators ("free", "real population data", "multiple ancestries")
- [x] **SOP-03**: Updated WebApplication structured data (version from package.json, `dateModified`, `screenshot`)
- [x] **SOP-04**: Expanded FAQPage structured data (8-10 questions)
- [x] **SOP-05**: `<link rel="preconnect">` for gnomAD API domain

### UX Color & Theme

- [ ] **UXC-01**: Primary color changed to Teal 700 (`#00796B`) in light theme
- [ ] **UXC-02**: Dark theme primary updated to complementary teal shade
- [ ] **UXC-03**: Warm gray `#a09588` moved to secondary color
- [ ] **UXC-04**: PWA manifest `theme_color` updated to match new primary
- [ ] **UXC-05**: Visual audit of all `color="primary"` bindings for consistency after color change

### UX Onboarding

- [ ] **UXO-01**: Welcome hero card displayed for first-time users after disclaimer
- [ ] **UXO-02**: "Try with CFTR" quick-start button that pre-fills gene search
- [ ] **UXO-03**: Onboarding state persisted in `useAppStore` via Pinia
- [ ] **UXO-04**: Onboarding card dismissed after first gene search or explicit dismiss

### UX Visual Polish

- [ ] **UXV-01**: Mobile title hidden on xs breakpoint (AppBar "gCFCalc" suffices)
- [ ] **UXV-02**: Persistent gene context chip on Steps 2-4 showing gene + gnomAD version
- [ ] **UXV-03**: Native `alert()`/`confirm()` replaced with `useConfirmDialog` composable + Vuetify dialog
- [ ] **UXV-04**: All 4 native dialog calls migrated (template import, template reset, log clear)

### Accessibility

- [ ] **A11-01**: Skip-to-content link as first focusable element in App.vue
- [ ] **A11-02**: `id="main-content"` on main container for skip link target
- [ ] **A11-03**: Footer icon text labels visible on desktop (sm+ breakpoint)
- [ ] **A11-04**: Step transition loading indicator (`v-progress-linear`) during async operations

### Documentation Content

- [ ] **DOC-01**: "What is Carrier Frequency?" educational page in VitePress docs (~1,500 words)
- [ ] **DOC-02**: "How to Calculate Carrier Frequency" tutorial page in VitePress docs (~1,200 words)
- [ ] **DOC-03**: Expanded FAQ page with FAQPage structured data per page

## Future Requirements

Deferred to later milestones.

### Testing Infrastructure

- **TEST-01**: Vitest setup with coverage reporting
- **TEST-02**: Unit tests for composables
- **TEST-03**: Component tests with Vue Test Utils
- **TEST-04**: Playwright E2E tests for critical flows

### Features

- **FEAT-01**: X-linked recessive inheritance calculation
- **FEAT-02**: X-linked dominant inheritance calculation
- **FEAT-03**: Bayesian residual risk for negative carrier test
- **FEAT-04**: Batch processing for multiple genes
- **FEAT-05**: Export results to PDF
- **FEAT-06**: At-risk couple calculation (both partners)

### Performance

- **PERF-01**: Tree-shakeable icons (@mdi/js migration)

## Out of Scope

| Feature | Reason |
|---------|--------|
| SSR / Nuxt migration | Single-page app with one route; static HTML seed achieves 90% of SSR's SEO benefit |
| Prerender service (Prerender.io) | One page, static HTML seed is sufficient |
| Full product tour library | Genetic counselors are domain experts; simple welcome card suffices |
| Cookie consent banner | App uses only localStorage, no tracking cookies |
| Google Analytics | Privacy concerns for medical tool; use Search Console instead |
| Social sharing buttons | Medical professionals share via institutional channels |
| Multiple color themes | Light/dark toggle already exists; scope creep |
| Keyword stuffing in app UI | SEO content goes in seed HTML and docs, not in running app |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEO-01 | Phase 21 | Complete |
| SEO-02 | Phase 21 | Complete |
| SEO-03 | Phase 21 | Complete |
| SEO-04 | Phase 21 | Complete |
| SEO-05 | Phase 21 | Complete |
| SEO-06 | Phase 21 | Complete |
| SEO-07 | Phase 21 | Complete |
| SEO-08 | Phase 21 | Complete |
| SEO-09 | Phase 21 | Complete |
| SEO-10 | Phase 21 | Complete |
| SEO-11 | Phase 21 | Complete |
| SEO-12 | Phase 21 | Complete |
| SOP-01 | Phase 21 | Complete |
| SOP-02 | Phase 21 | Complete |
| SOP-03 | Phase 21 | Complete |
| SOP-04 | Phase 21 | Complete |
| SOP-05 | Phase 21 | Complete |
| UXC-01 | Phase 22 | Complete |
| UXC-02 | Phase 22 | Complete |
| UXC-03 | Phase 22 | Complete |
| UXC-04 | Phase 22 | Complete |
| UXC-05 | Phase 22 | Complete |
| A11-01 | Phase 22 | Complete |
| A11-02 | Phase 22 | Complete |
| A11-03 | Phase 22 | Complete |
| A11-04 | Phase 22 | Complete |
| UXO-01 | Phase 23 | Pending |
| UXO-02 | Phase 23 | Pending |
| UXO-03 | Phase 23 | Pending |
| UXO-04 | Phase 23 | Pending |
| UXV-01 | Phase 23 | Pending |
| UXV-02 | Phase 23 | Pending |
| UXV-03 | Phase 23 | Pending |
| UXV-04 | Phase 23 | Pending |
| DOC-01 | Phase 24 | Pending |
| DOC-02 | Phase 24 | Pending |
| DOC-03 | Phase 24 | Pending |

**Coverage:**
- v1.4 requirements: 37 total
- Mapped to phases: 37
- Unmapped: 0

---
*Requirements defined: 2026-02-23*
*Last updated: 2026-02-23 (Phase 22 complete)*
