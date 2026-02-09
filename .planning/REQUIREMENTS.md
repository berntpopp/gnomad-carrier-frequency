# Requirements: gnomAD Carrier Frequency Calculator v1.3

**Defined:** 2026-02-09
**Core Value:** Accurate recurrence risk calculation from gnomAD population data with clinical documentation output

## v1.3 Requirements

### VitePress Infrastructure

- [ ] **VITE-01**: VitePress installed and configured with `base: '/gnomad-carrier-frequency/docs/'`
- [ ] **VITE-02**: Navigation bar with Guide, Use Cases, Reference, About sections
- [ ] **VITE-03**: Sidebar with hierarchical page structure per section
- [ ] **VITE-04**: Theme colors matching app branding (#a09588)
- [ ] **VITE-05**: Landing page with hero image, tagline, feature cards, and call-to-action buttons
- [ ] **VITE-06**: Package.json scripts for `docs:dev`, `docs:build`, `docs:preview`
- [ ] **VITE-07**: `.vitepress/cache` and `.vitepress/dist` added to `.gitignore`
- [ ] **VITE-08**: PWA service worker denylist for `/docs/` path to prevent SW interception

### Screenshot Automation

- [ ] **SHOT-01**: Playwright installed as dev dependency with screenshot generation script
- [ ] **SHOT-02**: Screenshot: hero preview (Step 1 with gene selected, light, 1200x800)
- [ ] **SHOT-03**: Screenshot: gene search autocomplete (typing "CFTR", dropdown visible)
- [ ] **SHOT-04**: Screenshot: gene selected with ClinGen notice and gene constraint card
- [ ] **SHOT-05**: Screenshot: patient status selection (Step 2 with heterozygous carrier selected)
- [ ] **SHOT-06**: Screenshot: frequency source (Step 3 with gnomAD tab showing 1:17)
- [ ] **SHOT-07**: Screenshot: results page (Step 4 with population table, filters, clinical text)
- [ ] **SHOT-08**: Screenshot: clinical text output (German text with section chips visible)
- [ ] **SHOT-09**: Screenshot: variant table modal (sortable columns, ClinVar links, star ratings)
- [ ] **SHOT-10**: Screenshot: filter section expanded with chip toggles
- [ ] **SHOT-11**: Screenshot: settings dialog (General tab with all sections visible)
- [ ] **SHOT-12**: Screenshot: dark mode (results page in dark theme)
- [ ] **SHOT-13**: Screenshot: mobile view (Step 4 results at 375x812)
- [ ] **SHOT-14**: Screenshot: population drill-down (Ashkenazi Jewish variant table)
- [ ] **SHOT-15**: Screenshot: search history panel open with entry
- [ ] **SHOT-16**: `data-testid` attributes added to key UI elements for reliable screenshot targeting
- [ ] **SHOT-17**: Clinical disclaimer auto-dismissed in screenshot script

### Documentation Content — Guide

- [ ] **GUID-01**: Getting Started page with < 1 minute quick walkthrough
- [ ] **GUID-02**: Getting Started includes 4-step screenshots with annotations
- [ ] **GUID-03**: Gene Search detailed guide (gnomAD version selection, autocomplete, ClinGen notice, gene constraint)
- [ ] **GUID-04**: Patient Status detailed guide (4 status options explained clinically)
- [ ] **GUID-05**: Frequency Source detailed guide (gnomAD/Literature/Default tabs explained)
- [ ] **GUID-06**: Results and Text detailed guide (population table, clinical text, export, sharing)

### Documentation Content — Use Cases

- [ ] **CASE-01**: Carrier screening counseling scenario (known carrier partner, CFTR example)
- [ ] **CASE-02**: Recurrence risk / family planning scenario (affected child, future pregnancy)
- [ ] **CASE-03**: Clinical letter generation scenario (template customization, DE/EN, gender-inclusive, copy-paste workflow)

### Documentation Content — Reference

- [ ] **REF-01**: Methodology page (Hardy-Weinberg calculation, allele frequency aggregation, population-specific calculations)
- [ ] **REF-02**: Data sources page (gnomAD v4.1 vs v2.1.1, ClinVar classifications, ClinGen validity)
- [ ] **REF-03**: Filters page (LoF HC, missense, ClinVar P/LP, star threshold, per-calculation override)
- [ ] **REF-04**: Templates page ({{variable}} syntax, available variables, perspectives, sections, gender-inclusive styles)

### Documentation Content — About

- [ ] **ABOU-01**: Citation page with CITATION.cff file and BibTeX entry
- [ ] **ABOU-02**: Changelog page (version history from v1.0 through v1.2)
- [ ] **ABOU-03**: Contributing guide (development setup, PR process, code style)

### CI/CD Integration

- [ ] **CICD-01**: Deploy workflow modified to build both app and docs
- [ ] **CICD-02**: Merged artifact strategy (app at root, docs at /docs/)
- [ ] **CICD-03**: Screenshot update workflow triggered on UI component changes
- [ ] **CICD-04**: Screenshot workflow auto-commits updated screenshots if changed
- [ ] **CICD-05**: Both app and docs verified working at their respective URLs

### README Streamlining

- [ ] **READ-01**: README slimmed to essentials (title, badges, one-line description, hero screenshot, 3-step quick start)
- [ ] **READ-02**: Documentation badge linking to docs site
- [ ] **READ-03**: License and citation section with link to docs citation page

## Future Requirements

### Testing Infrastructure (v1.4)

- **TEST-01**: Vitest setup with coverage reporting
- **TEST-02**: Unit tests for composables
- **TEST-03**: Unit tests for utilities
- **TEST-04**: Component tests with Vue Test Utils
- **TEST-05**: Playwright E2E tests for critical flows
- **TEST-06**: CI integration for test coverage reporting

### Features (v1.4+)

- **FEAT-01**: X-linked recessive inheritance calculation
- **FEAT-02**: X-linked dominant inheritance calculation
- **FEAT-03**: Bayesian residual risk for negative carrier test
- **FEAT-04**: Batch processing for multiple genes
- **FEAT-05**: Export results to PDF
- **FEAT-06**: At-risk couple calculation (both partners)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Interactive Vue components in docs | Adds complexity; static screenshots sufficient for v1.3 |
| Multi-language docs (i18n) | English docs first; German translation deferred |
| API documentation / JSDoc | Internal code docs deferred to testing milestone |
| Video tutorials | Screenshot walkthroughs sufficient for v1.3 |
| Algolia search integration | VitePress built-in search sufficient |
| Storybook setup | Not needed; Playwright screenshots cover UI states |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| VITE-01 | TBD | Pending |
| VITE-02 | TBD | Pending |
| VITE-03 | TBD | Pending |
| VITE-04 | TBD | Pending |
| VITE-05 | TBD | Pending |
| VITE-06 | TBD | Pending |
| VITE-07 | TBD | Pending |
| VITE-08 | TBD | Pending |
| SHOT-01 | TBD | Pending |
| SHOT-02 | TBD | Pending |
| SHOT-03 | TBD | Pending |
| SHOT-04 | TBD | Pending |
| SHOT-05 | TBD | Pending |
| SHOT-06 | TBD | Pending |
| SHOT-07 | TBD | Pending |
| SHOT-08 | TBD | Pending |
| SHOT-09 | TBD | Pending |
| SHOT-10 | TBD | Pending |
| SHOT-11 | TBD | Pending |
| SHOT-12 | TBD | Pending |
| SHOT-13 | TBD | Pending |
| SHOT-14 | TBD | Pending |
| SHOT-15 | TBD | Pending |
| SHOT-16 | TBD | Pending |
| SHOT-17 | TBD | Pending |
| GUID-01 | TBD | Pending |
| GUID-02 | TBD | Pending |
| GUID-03 | TBD | Pending |
| GUID-04 | TBD | Pending |
| GUID-05 | TBD | Pending |
| GUID-06 | TBD | Pending |
| CASE-01 | TBD | Pending |
| CASE-02 | TBD | Pending |
| CASE-03 | TBD | Pending |
| REF-01 | TBD | Pending |
| REF-02 | TBD | Pending |
| REF-03 | TBD | Pending |
| REF-04 | TBD | Pending |
| ABOU-01 | TBD | Pending |
| ABOU-02 | TBD | Pending |
| ABOU-03 | TBD | Pending |
| CICD-01 | TBD | Pending |
| CICD-02 | TBD | Pending |
| CICD-03 | TBD | Pending |
| CICD-04 | TBD | Pending |
| CICD-05 | TBD | Pending |
| READ-01 | TBD | Pending |
| READ-02 | TBD | Pending |
| READ-03 | TBD | Pending |

**Coverage:**
- v1.3 requirements: 48 total
- Mapped to phases: 0 (pending roadmap)
- Unmapped: 48

---
*Requirements defined: 2026-02-09*
*Last updated: 2026-02-09 after initial definition*
