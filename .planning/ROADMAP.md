# Roadmap: gnomAD Carrier Frequency Calculator

## Milestones

- **v1.0 MVP** - Phases 1-4 (shipped 2026-01-19)
- **v1.1 Release-Ready** - Phases 5-10 (shipped 2026-01-19)
- **v1.2 Sharing** - Phases 11-15 (shipped 2026-01-20)
- **v1.3 Documentation Site** - Phases 16-20 (shipped 2026-02-23)
- **v1.4 Discoverability & Polish** - Phases 21-24 (in progress)

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

<details>
<summary>v1.3 Documentation Site (Phases 16-20) - SHIPPED 2026-02-23</summary>

5 phases, 14 plans, 52 requirements. See milestone archive.

</details>

### v1.4 Discoverability & Polish (In Progress)

**Milestone Goal:** Fix Google indexing with static HTML seed content and structured data, improve CTA visibility with WCAG-compliant color system, add first-time onboarding experience, and expand documentation with educational content pages.

- [ ] **Phase 21: SEO Foundation** - Make the site visible to Google and social media platforms
- [ ] **Phase 22: CTA Color System & Accessibility** - WCAG-compliant interactive colors and accessibility improvements
- [ ] **Phase 23: Onboarding & Visual Polish** - First-time user guidance and native dialog replacement
- [ ] **Phase 24: Documentation Content** - Educational pages for carrier frequency concepts

## Phase Details

### Phase 21: SEO Foundation
**Goal**: Google can discover, index, and display the site with rich results; social media platforms render correct preview cards
**Depends on**: Phase 20 (v1.3 complete)
**Requirements**: SEO-01, SEO-02, SEO-03, SEO-04, SEO-05, SEO-06, SEO-07, SEO-08, SEO-09, SEO-10, SEO-11, SEO-12, SOP-01, SOP-02, SOP-03, SOP-04, SOP-05
**Success Criteria** (what must be TRUE):
  1. Viewing page source of the deployed site shows 500+ words of meaningful content inside the `<div id="app">` element, visible before JavaScript executes
  2. Google Search Console reports the site as indexable after submitting the URL for inspection (no "page is not indexed" errors from empty body)
  3. Sharing the app URL on social media (Facebook Sharing Debugger, Twitter Card Validator) renders a 1200x630 preview image with correct title and description
  4. The VitePress docs site generates a sitemap at `/docs/sitemap.xml`, and `robots.txt` references both the app and docs sitemaps
  5. Navigating from app footer to docs and from docs content back to the calculator works in both directions without broken links
**Plans**: 4 plans

Plans:
- [ ] 21-01-PLAN.md -- Static HTML seed content (500+ words), meta tags, canonical URL, robots directive, preconnect hints, noscript fallback
- [ ] 21-02-PLAN.md -- OG image PNG generation, app sitemap.xml, robots.txt update, VitePress sitemap config
- [ ] 21-03-PLAN.md -- Expanded JSON-LD structured data (WebApplication + bilingual FAQPage), OG/Twitter meta tag correction
- [ ] 21-04-PLAN.md -- Cross-linking: app footer docs link, docs pages calculator CTAs with deep-links

### Phase 22: CTA Color System & Accessibility
**Goal**: Interactive elements have clear visual hierarchy with WCAG AA contrast, and keyboard-only users can navigate efficiently
**Depends on**: Phase 21
**Requirements**: UXC-01, UXC-02, UXC-03, UXC-04, UXC-05, A11-01, A11-02, A11-03, A11-04
**Success Criteria** (what must be TRUE):
  1. Primary CTA buttons (e.g., "Search", "Next Step") are visually distinct from disabled buttons, with the new primary color passing WCAG AA contrast ratio (4.5:1 minimum) in both light and dark themes
  2. Non-CTA elements that previously used primary color (filter chips, switches, informational indicators) use the secondary/accent color, preserving the warm gray brand identity
  3. A keyboard user pressing Tab on first page load focuses a visible "Skip to main content" link that jumps past the AppBar to the wizard content
  4. Footer icons on desktop (sm+ breakpoint) display text labels alongside icons, improving discoverability of Settings, Docs, and other footer actions
  5. Transitioning between wizard steps shows a progress indicator during async data loading, providing feedback that the app is working
**Plans**: TBD

Plans:
- [ ] 22-01: Primary color change (light + dark themes), secondary color assignment, PWA manifest update
- [ ] 22-02: Visual audit of all `color="primary"` bindings, migrate non-CTA uses to secondary
- [ ] 22-03: Skip-to-content link, main-content ID, footer labels, step transition loading indicator

### Phase 23: Onboarding & Visual Polish
**Goal**: First-time users receive guided entry into the tool, and the UI uses consistent Vuetify dialogs throughout
**Depends on**: Phase 22 (onboarding CTA needs visible primary color)
**Requirements**: UXO-01, UXO-02, UXO-03, UXO-04, UXV-01, UXV-02, UXV-03, UXV-04
**Success Criteria** (what must be TRUE):
  1. A first-time visitor (no localStorage state) sees a welcome hero card after accepting the disclaimer, with a "Try with CFTR" button that pre-fills the gene search and advances the wizard
  2. Returning users (onboarding dismissed) never see the welcome card again, and the dismissal state persists across browser sessions
  3. On mobile (xs breakpoint), the app title is hidden to save vertical space, and on Steps 2-4 a persistent gene context chip shows the selected gene and gnomAD version
  4. All former native `alert()` and `confirm()` calls (template import, template reset, log clear) use Vuetify dialogs via a `useConfirmDialog` composable
**Plans**: TBD

Plans:
- [ ] 23-01: Welcome hero card, "Try with CFTR" quick-start, onboarding state in useAppStore
- [ ] 23-02: Mobile title reduction, persistent gene context chip on Steps 2-4
- [ ] 23-03: useConfirmDialog composable, migrate all native dialog calls to Vuetify dialogs

### Phase 24: Documentation Content
**Goal**: Users searching for carrier frequency concepts find educational content that establishes the tool's authority and drives calculator usage
**Depends on**: Phase 21 (sitemap and cross-linking infrastructure in place)
**Requirements**: DOC-01, DOC-02, DOC-03
**Success Criteria** (what must be TRUE):
  1. A "What is Carrier Frequency?" page (~1,500 words) exists in the docs site explaining the concept with clinical context, and includes a CTA linking to the calculator
  2. A "How to Calculate Carrier Frequency" tutorial page (~1,200 words) exists with worked examples using Hardy-Weinberg, linking to the calculator for real data
  3. The FAQ page is expanded with additional questions and each docs page with FAQ content includes FAQPage structured data for Google rich results
**Plans**: TBD

Plans:
- [ ] 24-01: Educational pages (carrier frequency explainer, calculation tutorial) and expanded FAQ with structured data

## Progress

**Execution Order:**
Phases execute sequentially: 21 -> 22 -> 23 -> 24

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-4 | v1.0 | 15/15 | Complete | 2026-01-19 |
| 5-10 | v1.1 | 27/27 | Complete | 2026-01-19 |
| 11-15 | v1.2 | 15/15 | Complete | 2026-01-20 |
| 16-20 | v1.3 | 14/14 | Complete | 2026-02-23 |
| 21. SEO Foundation | v1.4 | 0/4 | Not started | - |
| 22. CTA Color & A11y | v1.4 | 0/3 | Not started | - |
| 23. Onboarding & Polish | v1.4 | 0/3 | Not started | - |
| 24. Docs Content | v1.4 | 0/1 | Not started | - |

---
*Roadmap created: 2026-01-18*
*Last updated: 2026-02-23 (Phase 21 planned)*
