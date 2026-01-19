# Roadmap: gnomAD Carrier Frequency Calculator

## Milestones

- **v1.0 MVP** --- Phases 1-4 (shipped 2026-01-19) -> [Archive](milestones/v1.0-ROADMAP.md)
- **v1.1 Release-Ready** --- Phases 5-10 (in progress)

## v1.1 Release-Ready

Polish for wider distribution: app shell, filtering configuration, ClinGen integration, data export, template editing, browser logging, documentation, and accessibility improvements.

### Phase 5: Foundation (Settings + Theme) ✓

**Goal:** User can configure app preferences and theme persists across sessions

**Dependencies:** None (foundation for other phases)

**Requirements:**
- SHELL-04: User can toggle dark/light theme ✓
- SHELL-05: Theme preference persists across sessions ✓
- INFRA-01: Version number in package.json follows semver ✓
- INFRA-02: Version displayed in app UI ✓

**Plans:** 2 plans (complete)

Plans:
- [x] 05-01-PLAN.md - Theme and version infrastructure (composable, Vuetify config, version injection)
- [x] 05-02-PLAN.md - UI components (AppBar with toggle, AppFooter with version, App.vue integration)

**Success Criteria:**
1. ✓ User can toggle between dark and light theme via a visible control
2. ✓ Theme preference survives browser refresh and new sessions
3. ✓ App displays current version number in the UI
4. ✓ Version follows semver format (e.g., 1.1.0)

**Completed:** 2026-01-19

---

### Phase 6: App Shell (Navigation + Branding) ✓

**Goal:** User experiences professional app shell with branded logo, custom favicon, and settings access

**Dependencies:** Phase 5 (settings infrastructure)

**Requirements:**
- SHELL-01: App displays logo in app bar ✓
- SHELL-02: App bar contains navigation menu (N/A - single page app, no menu needed)
- SHELL-03: Settings accessible via gear icon in app bar ✓
- SHELL-06: App has custom favicon ✓
- SHELL-07: Logo and favicon follow consistent branding ✓

**Plans:** 2 plans (complete)

Plans:
- [x] 06-01-PLAN.md - Branding assets and theme colors (favicon with dark mode, RequiForm palette)
- [x] 06-02-PLAN.md - UI component enhancements (AppBar logo/settings, AppFooter icons, SettingsDialog shell)

**Success Criteria:**
1. ✓ User sees logo in app bar on every page
2. ✓ User can open settings dialog via gear icon in app bar
3. ✓ Browser tab displays custom favicon
4. ✓ Logo and favicon share consistent visual identity (gCFCalc branding)
5. ✓ Footer displays GitHub and gnomAD attribution icons

**Completed:** 2026-01-19

---

### Phase 7: SEO + Accessibility ✓

**Goal:** App meets WCAG 2.1 AA and achieves Lighthouse scores >= 90/95/95

**Dependencies:** Phase 6 (app shell structure)

**Requirements:**
- SEO-01: Page has descriptive meta description ✓
- SEO-02: Heading elements in sequential order ✓
- SEO-03: Color contrast meets WCAG 2.1 AA (4.5:1 ratio) ✓
- SEO-04: ARIA live regions announce dynamic content changes ✓
- SEO-05: Focus management for modal dialogs ✓
- SEO-06: Keyboard navigation works throughout app ✓
- INFRA-05: Lighthouse performance score >= 90 ✓
- INFRA-06: Lighthouse accessibility score >= 95 ✓
- INFRA-07: Lighthouse SEO score >= 95 ✓

**Plans:** 4 plans (complete)

Plans:
- [x] 07-01-PLAN.md - SEO meta tags, OG tags, structured data, preview image
- [x] 07-02-PLAN.md - Accessibility infrastructure (announcer, focus-trap, sr-only class)
- [x] 07-03-PLAN.md - Component accessibility integration (wizard announcements, dialog focus trap)
- [x] 07-04-PLAN.md - Lighthouse CI workflow, heading audit, keyboard navigation verification

**Success Criteria:**
1. ✓ User can navigate entire app using only keyboard (Tab, Enter, Escape)
2. ✓ Screen reader announces calculation results and errors without page refresh
3. ✓ All text meets 4.5:1 contrast ratio (verifiable via Lighthouse)
4. ✓ Lighthouse scores meet thresholds: Performance >= 90, Accessibility >= 95, SEO >= 95
5. ✓ Modal dialogs trap focus and return focus on close

**Completed:** 2026-01-19

---

### Phase 8: Filtering + Variant Display ✓

**Goal:** User can configure variant filters and inspect contributing variants

**Dependencies:** Phase 5 (settings store for filter defaults)

**Requirements:**
- FILT-01: User can see current filter criteria displayed ✓
- FILT-02: User can toggle LoF HC filter on/off ✓
- FILT-03: User can toggle missense inclusion on/off ✓
- FILT-04: User can toggle ClinVar P/LP filter on/off ✓
- FILT-05: User can adjust ClinVar star threshold (0-4) ✓
- FILT-06: Filter defaults stored in settings ✓
- FILT-07: User can override filter defaults per calculation ✓
- FILT-08: User can reset filters to defaults ✓
- FILT-09: Filter changes show real-time variant count feedback ✓
- VAR-01: User can open modal showing contributing variants ✓
- VAR-02: Variant modal displays variant ID, consequence, allele frequency, ClinVar status ✓
- VAR-03: Variant table columns are sortable ✓
- VAR-04: User can click population row to see population-specific variants ✓
- VAR-05: Population drill-down shows variant frequencies for that population ✓

**Plans:** 4 plans (complete)

Plans:
- [x] 08-01-PLAN.md - Filter infrastructure (types, store, configurable filter functions)
- [x] 08-02-PLAN.md - GraphQL query extension (HGVS fields, display variant types)
- [x] 08-03-PLAN.md - Filter UI components (composable, FilterPanel, Settings integration)
- [x] 08-04-PLAN.md - Variant modal (VariantTable, population drill-down)

**Success Criteria:**
1. ✓ User can see which filters produced current results (displayed in UI)
2. ✓ User can toggle individual filter criteria and see variant count update in real-time
3. ✓ User can open variant detail modal and sort by any column
4. ✓ User can drill down from population row to see that population's contributing variants
5. ✓ Filter preferences persist across sessions when saved to settings

**Completed:** 2026-01-19

---

### Phase 9: ClinGen + Documentation ✓

**Goal:** User receives clinical validation warnings and can access comprehensive help

**Dependencies:** Phase 6 (app shell for help navigation)

**Requirements:**
- CLIN-01: App fetches ClinGen gene-disease validity data ✓
- CLIN-02: ClinGen data cached with 30-day expiry ✓
- CLIN-03: User can manually refresh ClinGen cache in settings ✓
- CLIN-04: Non-blocking warning displayed if gene not AR-associated ✓
- CLIN-05: Gene constraint scores (pLI/LOEUF) displayed from gnomAD ✓
- CLIN-06: Warning displayed for genes with low exome coverage ✓
- DOC-01: README.md describes project purpose and features ✓
- DOC-02: README.md includes technology tags/badges ✓
- DOC-03: Methodology page explains carrier frequency calculation ✓
- DOC-04: Methodology page explains Hardy-Weinberg principles ✓
- DOC-05: Help/FAQ page with expandable accordion sections ✓
- DOC-06: FAQ addresses common questions about gnomAD data ✓
- DOC-07: Contextual help tooltips on key UI elements ✓
- DOC-08: Data sources attributed (gnomAD, ClinVar versions) ✓
- DOC-09: Clinical disclaimer displayed appropriately ✓

**Plans:** 7 plans (complete)

Plans:
- [x] 09-01-PLAN.md - ClinGen infrastructure (types, store, composable for JSON API fetch/cache)
- [x] 09-02-PLAN.md - Gene constraint query and GeneConstraintCard component
- [x] 09-03-PLAN.md - ClingenWarning component integration (StepGene, StepResults)
- [x] 09-04-PLAN.md - Disclaimer banner, app store, settings ClinGen management
- [x] 09-05-PLAN.md - Methodology and FAQ dialogs with content files
- [x] 09-06-PLAN.md - About and DataSources dialogs, README documentation
- [x] 09-07-PLAN.md - Contextual tooltips and coverage warning

**Success Criteria:**
1. ✓ User sees non-blocking warning banner when gene is not AR-associated per ClinGen
2. ✓ User can view gene constraint scores (pLI/LOEUF) during gene selection
3. ✓ User can access Help/FAQ page from navigation with expandable accordion sections
4. ✓ User can see methodology explanation including Hardy-Weinberg derivation
5. ✓ User sees clinical disclaimer and data source attribution in app

**Completed:** 2026-01-19

---

### Phase 10: Export + Templates + Logging

**Goal:** User can export results, customize templates, and access debug logs

**Dependencies:** Phase 5 (settings), Phase 6 (app shell for log viewer)

**Requirements:**
- EXP-01: User can export results as JSON file
- EXP-02: User can export results as Excel (.xlsx) file
- EXP-03: Export includes gene, populations, frequencies, calculated risks
- EXP-04: Export includes metadata (gnomAD version, date, filters used)
- TMPL-01: User can edit German clinical text templates in settings
- TMPL-02: User can edit English clinical text templates in settings
- TMPL-03: Template editor highlights {{variable}} placeholders
- TMPL-04: Variable picker shows available template variables
- TMPL-05: User can insert variables via picker/autocomplete
- TMPL-06: User can export templates to file
- TMPL-07: User can import templates from file
- TMPL-08: Template changes persist across sessions
- LOG-01: App logs key events (API calls, calculations, errors)
- LOG-02: LogViewer panel accessible from app shell
- LOG-03: User can search logs by text
- LOG-04: User can filter logs by level (DEBUG, INFO, WARN, ERROR)
- LOG-05: User can download logs as JSON
- LOG-06: User can clear all logs
- LOG-07: Log statistics displayed (count, dropped, memory)
- LOG-08: Log max entries configurable in settings
- INFRA-03: Build time improved with vite-plugin-checker
- INFRA-04: Lint/typecheck runs in parallel

**Success Criteria:**
1. User can export calculation results as JSON or Excel file with full metadata
2. User can edit clinical text templates with syntax highlighting for variables
3. User can import/export templates to/from files
4. User can access LogViewer from app shell and search/filter logs
5. User can configure log max entries in settings and download logs as JSON

---

## Progress

| Milestone | Phases | Plans | Status | Shipped |
|-----------|--------|-------|--------|---------|
| v1.0 MVP | 1-4 | 15/15 | Complete | 2026-01-19 |
| v1.1 Release-Ready | 5-10 | 19/TBD | In Progress (Phase 9 complete) | - |

---

*Last updated: 2026-01-19 (Phase 9 complete)*
