# Roadmap: gnomAD Carrier Frequency Calculator

## Milestones

- **v1.0 MVP** - Phases 1-4 (shipped 2026-01-19)
- **v1.1 Release-Ready** - Phases 5-10 (shipped 2026-01-19)
- **v1.2 Sharing** - Phases 11-15 (shipped 2026-01-20)
- **v1.3 Documentation Site** - Phases 16-20 (in progress)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-4) - SHIPPED 2026-01-19</summary>

4 phases, 15 plans, 32 requirements. See milestone archive.

</details>

<details>
<summary>v1.1 Release-Ready (Phases 5-10) - SHIPPED 2026-01-19</summary>

6 phases, 27 plans, 69 requirements. See milestone archive.

</details>

<details>
<summary>v1.2 Sharing (Phases 11-15) - SHIPPED 2026-01-20</summary>

5 phases, 15 plans, 38 requirements. See milestone archive.

</details>

### v1.3 Documentation Site (In Progress)

**Milestone Goal:** Professional documentation site with auto-generated screenshots, deployed alongside the app on GitHub Pages.

**Phase Numbering:**
- Integer phases (16, 17, 18, 19, 20): Planned milestone work
- Decimal phases (e.g., 17.1): Urgent insertions (marked with INSERTED)

- [ ] **Phase 16: VitePress Setup** - Documentation infrastructure with navigation, theming, and landing page
- [ ] **Phase 17: Screenshot Automation** - Playwright-based screenshot generation covering all app states
- [ ] **Phase 18: Documentation Content** - Guide, use cases, reference, and about pages with embedded screenshots
- [ ] **Phase 19: CI/CD Integration** - Unified deployment pipeline and screenshot update automation
- [ ] **Phase 20: README Streamlining** - Slim README to essentials with docs site link

## Phase Details

### Phase 16: VitePress Setup
**Goal**: Documentation site infrastructure is running locally with professional navigation, theming, and a landing page
**Depends on**: Nothing (first phase of v1.3)
**Requirements**: MAKE-01, MAKE-03, VITE-01, VITE-02, VITE-03, VITE-04, VITE-05, VITE-06, VITE-07, VITE-08
**Success Criteria** (what must be TRUE):
  1. Running `make docs-dev` (or `npm run docs:dev`) serves a VitePress site at localhost with working navigation between Guide, Use Cases, Reference, and About sections
  2. The landing page displays a hero section with tagline, feature cards, and call-to-action buttons linking to the calculator and getting started guide
  3. Sidebar navigation shows hierarchical page structure within each section (placeholder pages acceptable)
  4. Theme colors match the app branding (#a09588) and the site renders correctly in both light and dark modes
  5. The PWA service worker does not intercept requests to the /docs/ path
  6. Makefile exists with `make docs`, `make docs-dev`, `make docs-preview` targets
**Plans:** 2 plans
Plans:
- [ ] 16-01-PLAN.md — VitePress infrastructure: install, config, theme, PWA denylist, build tooling
- [ ] 16-02-PLAN.md — Landing page and placeholder content pages for all 4 sections

### Phase 17: Screenshot Automation
**Goal**: Playwright script generates all required screenshots of the running app, producing assets ready for documentation pages
**Depends on**: Phase 16 (screenshots saved to docs/public/screenshots/)
**Requirements**: MAKE-02, SHOT-01, SHOT-02, SHOT-03, SHOT-04, SHOT-05, SHOT-06, SHOT-07, SHOT-08, SHOT-09, SHOT-10, SHOT-11, SHOT-12, SHOT-13, SHOT-14, SHOT-15, SHOT-16, SHOT-17
**Success Criteria** (what must be TRUE):
  1. Running `make screenshots` builds the app, starts preview server, generates 14 PNG files in docs/public/screenshots/, and stops the server
  2. Key UI elements have data-testid attributes enabling reliable element targeting by the script
  3. The clinical disclaimer dialog is auto-dismissed before any screenshots are captured
  4. Screenshots render at correct viewport sizes (1200x800 for desktop, 375x812 for mobile) with appropriate theme (light or dark as specified)
  5. All screenshots show realistic data (CFTR gene with actual gnomAD results) rather than empty or error states
**Plans**: TBD

### Phase 18: Documentation Content
**Goal**: All documentation pages are written with clinical accuracy, embedded screenshots, and cross-links forming a complete user guide
**Depends on**: Phase 17 (screenshots must exist for embedding)
**Requirements**: GUID-01, GUID-02, GUID-03, GUID-04, GUID-05, GUID-06, CASE-01, CASE-02, CASE-03, REF-01, REF-02, REF-03, REF-04, ABOU-01, ABOU-02, ABOU-03
**Success Criteria** (what must be TRUE):
  1. Getting Started page walks a new user through all 4 wizard steps in under 1 minute with annotated screenshots at each step
  2. Three use case pages (carrier screening, family planning, clinical letter) each present a complete clinical scenario with step-by-step walkthrough and relevant screenshots
  3. Reference pages for methodology, data sources, filters, and templates provide technically accurate details that a genetic counselor can cite (Hardy-Weinberg formula, gnomAD version differences, filter options, template syntax)
  4. Citation page includes both CITATION.cff content and a BibTeX entry ready to copy
  5. All pages have working cross-links to related content and screenshots render correctly in the VitePress build
**Plans**: TBD

### Phase 19: CI/CD Integration
**Goal**: Both the app and documentation site deploy automatically from a single GitHub Actions workflow, with screenshots updating when UI changes
**Depends on**: Phase 18 (docs content must exist for deployment verification)
**Requirements**: CICD-01, CICD-02, CICD-03, CICD-04, CICD-05
**Success Criteria** (what must be TRUE):
  1. Pushing to main triggers a deploy workflow that builds both the Vue app and the VitePress docs, merging them into a single GitHub Pages artifact
  2. The app is accessible at https://berntpopp.github.io/gnomad-carrier-frequency/ and the docs at https://berntpopp.github.io/gnomad-carrier-frequency/docs/
  3. A separate screenshot workflow triggers on UI component changes, regenerates screenshots, and auto-commits any changes
  4. Both sites render correctly at their respective URLs after deployment (no 404s, no broken assets)
**Plans**: TBD

### Phase 20: README Streamlining
**Goal**: README is concise and directs users to the documentation site for detailed information
**Depends on**: Phase 19 (docs site URL must be live)
**Requirements**: READ-01, READ-02, READ-03
**Success Criteria** (what must be TRUE):
  1. README contains only essentials: title, badges, one-line description, hero screenshot, 3-step quick start, and link to full documentation
  2. A documentation badge links directly to the live docs site
  3. License and citation section references the docs citation page for full details
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 16 --> 17 --> 18 --> 19 --> 20

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 16. VitePress Setup | v1.3 | 0/2 | Planned | - |
| 17. Screenshot Automation | v1.3 | 0/TBD | Not started | - |
| 18. Documentation Content | v1.3 | 0/TBD | Not started | - |
| 19. CI/CD Integration | v1.3 | 0/TBD | Not started | - |
| 20. README Streamlining | v1.3 | 0/TBD | Not started | - |

---
*Roadmap created: 2026-02-09*
*Last updated: 2026-02-09*
