# Requirements: gnomAD Carrier Frequency Calculator v1.4

**Defined:** 2026-02-23
**Core Value:** Accurate recurrence risk calculation from gnomAD population data with clinical documentation output

## v1.4 Requirements

Requirements for the Discoverability & Polish milestone. Addresses two critical problems: site not indexed by Google (empty body) and CTA buttons look disabled (muted primary color).

### SEO Indexing

- [ ] **SEO-01**: Static HTML seed content (500+ words) inside `<div id="app">` with H1, feature list, and nav links to docs — replaced by Vue on mount
- [ ] **SEO-02**: `<link rel="canonical">` with absolute URL including trailing slash
- [ ] **SEO-03**: `<meta name="robots" content="index, follow">` directive
- [ ] **SEO-04**: `public/sitemap.xml` with app root URL
- [ ] **SEO-05**: Updated `public/robots.txt` with sitemap references
- [ ] **SEO-06**: PNG OG image (1200x630px) generated from SVG via sharp build script
- [ ] **SEO-07**: Absolute HTTPS URLs for `og:image` and `twitter:image` meta tags
- [ ] **SEO-08**: `<noscript>` fallback placed outside `<div id="app">`
- [ ] **SEO-09**: VitePress sitemap generation via `sitemap` config option
- [ ] **SEO-10**: App footer "Docs" icon linking to `/docs/`
- [ ] **SEO-11**: Static HTML nav with links to key docs pages (discoverable by crawlers)
- [ ] **SEO-12**: Docs pages include contextual "Open Calculator" CTAs in content

### SEO On-Page

- [ ] **SOP-01**: Title tag optimized to lead with "Carrier Frequency Calculator"
- [ ] **SOP-02**: Meta description with differentiators ("free", "real population data", "multiple ancestries")
- [ ] **SOP-03**: Updated WebApplication structured data (version from package.json, `dateModified`, `screenshot`)
- [ ] **SOP-04**: Expanded FAQPage structured data (8-10 questions)
- [ ] **SOP-05**: `<link rel="preconnect">` for gnomAD API domain

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
| SEO-01 | TBD | Pending |
| SEO-02 | TBD | Pending |
| SEO-03 | TBD | Pending |
| SEO-04 | TBD | Pending |
| SEO-05 | TBD | Pending |
| SEO-06 | TBD | Pending |
| SEO-07 | TBD | Pending |
| SEO-08 | TBD | Pending |
| SEO-09 | TBD | Pending |
| SEO-10 | TBD | Pending |
| SEO-11 | TBD | Pending |
| SEO-12 | TBD | Pending |
| SOP-01 | TBD | Pending |
| SOP-02 | TBD | Pending |
| SOP-03 | TBD | Pending |
| SOP-04 | TBD | Pending |
| SOP-05 | TBD | Pending |
| UXC-01 | TBD | Pending |
| UXC-02 | TBD | Pending |
| UXC-03 | TBD | Pending |
| UXC-04 | TBD | Pending |
| UXC-05 | TBD | Pending |
| UXO-01 | TBD | Pending |
| UXO-02 | TBD | Pending |
| UXO-03 | TBD | Pending |
| UXO-04 | TBD | Pending |
| UXV-01 | TBD | Pending |
| UXV-02 | TBD | Pending |
| UXV-03 | TBD | Pending |
| UXV-04 | TBD | Pending |
| A11-01 | TBD | Pending |
| A11-02 | TBD | Pending |
| A11-03 | TBD | Pending |
| A11-04 | TBD | Pending |
| DOC-01 | TBD | Pending |
| DOC-02 | TBD | Pending |
| DOC-03 | TBD | Pending |

**Coverage:**
- v1.4 requirements: 35 total
- Mapped to phases: 0
- Unmapped: 35 (pending roadmap creation)

---
*Requirements defined: 2026-02-23*
*Last updated: 2026-02-23 after initial definition*
