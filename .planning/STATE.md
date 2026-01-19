# Project State: gnomAD Carrier Frequency Calculator

---

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-19)

**Core value:** Accurate recurrence risk calculation from gnomAD population data with clinical documentation output
**Current focus:** v1.1 Release-Ready polish for wider distribution

---

## Current Position

**Milestone:** v1.1 Release-Ready
**Phase:** 10 - Export + Templates + Logging - IN PROGRESS
**Plan:** 7 of 8 complete
**Status:** In progress

### Progress

```
v1.0 MVP:           [##########] 100% - SHIPPED 2026-01-19
v1.1 Release-Ready: [#########-] ~98% - Phase 10 plan 7 complete
```

**Overall:** Phase 10 in progress (7/8 plans complete)

---

## Shipped

**v1.0 MVP** (2026-01-19)
- 4 phases, 15 plans
- 32/32 requirements
- 3,285 lines TypeScript/Vue
- Deployed: https://berntpopp.github.io/gnomad-carrier-frequency/

---

## v1.1 Milestone Summary

**Phases:** 6 (Phases 5-10)
**Requirements:** 69 total

| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 5 | Foundation | 4 | Complete (2/2 plans) |
| 6 | App Shell | 5 | Complete (2/2 plans) |
| 7 | SEO + Accessibility | 9 | Complete (4/4 plans) |
| 8 | Filtering + Variant Display | 14 | Complete (4/4 plans) |
| 9 | ClinGen + Documentation | 15 | Complete (7/7 plans) |
| 10 | Export + Templates + Logging | 22 | In Progress (7/8 plans) |

---

## Accumulated Context

### Key Decisions (v1.1)

| Decision | Rationale | Date |
|----------|-----------|------|
| Settings store first | Other features depend on settings infrastructure | 2026-01-19 |
| 6 phases from requirements | Natural delivery boundaries from research | 2026-01-19 |
| ClinGen via JSON API | https://search.clinicalgenome.org/api/validity?queryParams is CORS-enabled | 2026-01-19 |
| Theme storage key 'carrier-freq-theme' | Namespaced key avoids conflicts with other apps | 2026-01-19 |
| Title in content area | App bar has app name, page content has descriptive header | 2026-01-19 |
| SVG favicon with CSS dark mode | Modern browsers support @media prefers-color-scheme in SVG | 2026-01-19 |
| RequiForm palette #a09588 | LaborBerlin-inspired muted taupe for professional clinical appearance | 2026-01-19 |
| Persistent settings dialog | Prevents accidental close, requires deliberate user action | 2026-01-19 |
| Tabs placeholder content | Establishes structure for Phase 8 (Filters) and Phase 10 (Templates) | 2026-01-19 |
| SVG for OG image | Modern platforms support SVG, no external conversion tools needed | 2026-01-19 |
| Clinical tone for meta description | Target audience is genetic counselors, professional language | 2026-01-19 |
| VueAnnouncer before pinia | Supports future router integration for route announcements | 2026-01-19 |
| sr-only CSS pattern | Standard screen-reader-only visibility pattern | 2026-01-19 |
| nextTick before focus trap | Ensure dialog DOM is rendered before activating trap | 2026-01-19 |
| allowOutsideClick for Vuetify | Focus trap allows overlay clicks to work with Vuetify dialogs | 2026-01-19 |
| Perf warn, a11y/SEO error in Lighthouse | CI perf varies, a11y/SEO are stable and must be enforced | 2026-01-19 |
| aria-label on tooltips and buttons | Ensures screen reader support regardless of Vuetify internals | 2026-01-19 |
| HGVS fields nullable strings | gnomAD may not have HGVS annotation for all variants | 2026-01-19 |
| DisplayVariant boolean flags | isLoF, isClinvarPathogenic, isMissense for efficient table filtering | 2026-01-19 |
| Local filter state in composable | Per-calculation overrides without persisting to store | 2026-01-19 |
| FrequencyResults.vue orphaned | Integration target changed to StepResults.vue (active component) | 2026-01-19 |
| Dynamic v-slot for Vuetify data-table | #[\`item.xxx\`] syntax required for column slot names with dots | 2026-01-19 |
| Population drill-down via row click | Cleaner UX than buttons; chevron provides visual affordance | 2026-01-19 |
| Skip SOP column in ClinGen mapping | SOP not needed for gene validity lookup, simplifies mapping | 2026-01-19 |
| Singleton state for constraint data | Module-level refs share state between GeneSearch and StepGene | 2026-01-19 |
| Version-specific LOEUF thresholds | v4 (0.6/1.5) vs v2/v3 (0.35/1.0) per gnomAD documentation | 2026-01-19 |
| Hardy-Weinberg formula in code blocks | Mathematical notation for clear visual distinction | 2026-01-19 |
| FAQ 4 categories | Grouped by user question areas: gnomAD, Calculations, Usage, Limitations | 2026-01-19 |
| Help content in JSON | Structured documentation for potential i18n support | 2026-01-19 |
| Persistent disclaimer modal | Cannot dismiss without acknowledgment - ensures users read clinical disclaimer | 2026-01-19 |
| carrier-freq-app storage key | Namespaced localStorage key for app-level state | 2026-01-19 |
| DataSourcesDialog replaces gnomAD link | More comprehensive - shows all data sources and versions in one place | 2026-01-19 |
| Separate coverage warning from quality flags | Coverage issues warrant distinct alert for clarity | 2026-01-19 |
| Coverage detection via flag keywords | Check for coverage/no_constraint/no_lof in flags array | 2026-01-19 |
| Consistent tooltip-text class | 280px max-width for readable tooltips across components | 2026-01-19 |
| Ring buffer for log storage | Prune oldest entries when maxEntries exceeded for memory safety | 2026-01-19 |
| Category-scoped logging | useLogger(category) pattern for domain-specific log filtering | 2026-01-19 |
| carrier-freq-logs storage key | Namespaced localStorage key for log persistence | 2026-01-19 |
| Variable categories | gene, frequency, risk, context, formatting for logical grouping in picker UI | 2026-01-19 |
| Export format versioning | version field enables future compatibility checks | 2026-01-19 |
| Per-language reset | Clears customizations when user is on that language | 2026-01-19 |
| vueTsc: true for checker | Enable parallel TypeScript checking during development | 2026-01-19 |
| useFlatConfig: true for ESLint | Support ESLint flat config format in vite-plugin-checker | 2026-01-19 |
| overlay.initialIsOpen: false | Show badge but don't auto-open for non-intrusive DX | 2026-01-19 |
| SheetJS xlsx for Excel export | Mature library, browser-native, multi-sheet workbook support | 2026-01-19 |
| Blob URL download pattern | Browser-native file download without server dependency | 2026-01-19 |

### Blockers

None currently.

### TODOs

- [x] Run `/gsd:plan-phase 5` to create Foundation plans
- [x] Execute 05-01-PLAN.md (theme + version infrastructure)
- [x] Execute 05-02-PLAN.md (settings UI integration)
- [x] Execute 06-01-PLAN.md (favicon and theme colors)
- [x] Execute 06-02-PLAN.md (app shell UI)
- [x] Run `/gsd:plan-phase 7` to create SEO + Accessibility plans
- [x] Execute 07-01-PLAN.md (SEO meta tags + OG image)
- [x] Execute 07-02-PLAN.md (accessibility infrastructure)
- [x] Execute 07-03-PLAN.md (component accessibility integration)
- [x] Execute 07-04-PLAN.md (Lighthouse CI + accessibility audit)
- [x] Run `/gsd:plan-phase 8` to create Filtering + Variant Display plans
- [x] Execute 08-01-PLAN.md (filter types + settings store extension)
- [x] Execute 08-02-PLAN.md (HGVS fields + display types)
- [x] Execute 08-03-PLAN.md (filter UI + composable)
- [x] Execute 08-04-PLAN.md (variant modal component)
- [x] Run `/gsd:plan-phase 9` to create ClinGen + Documentation plans
- [x] Execute 09-01-PLAN.md (ClinGen infrastructure)
- [x] Execute 09-02-PLAN.md (Gene constraint display)
- [x] Execute 09-03-PLAN.md (ClinGen warning UI)
- [x] Execute 09-04-PLAN.md (Disclaimer banner and ClinGen settings)
- [x] Execute 09-05-PLAN.md (Help system: methodology + FAQ)
- [x] Execute 09-06-PLAN.md (About dialog, data sources, README)
- [x] Execute 09-07-PLAN.md (Contextual help tooltips + coverage warning)
- [x] Run `/gsd:plan-phase 10` to create Export + Templates + Logging plans
- [x] Execute 10-01-PLAN.md (logging infrastructure)
- [x] Execute 10-02-PLAN.md (log viewer UI)
- [x] Execute 10-03-PLAN.md (export infrastructure)
- [x] Execute 10-04-PLAN.md (template infrastructure)
- [ ] Execute 10-05-PLAN.md
- [ ] Execute 10-06-PLAN.md
- [x] Execute 10-07-PLAN.md (vite-plugin-checker)
- [ ] Execute 10-08-PLAN.md

---

## Session Continuity

### Last Session

**Date:** 2026-01-19
**Completed:** Phase 10 Plan 07 - Vite Plugin Checker
**Next:** Execute 10-08-PLAN.md (final integration)

### Handoff Notes

v1.1 roadmap derived from requirements and research:
- Phase 5: Foundation (settings store, theme, version display) - COMPLETE
- Phase 6: App Shell (navigation, logo, favicon, settings access) - COMPLETE
- Phase 7: SEO + Accessibility - COMPLETE (4/4 plans)
- Phase 8: Filtering + Variant Display (configurable filters, variant modal) - COMPLETE
- Phase 9: ClinGen + Documentation (clinical validation, help content) - COMPLETE
- Phase 10: Export + Templates + Logging (data export, template editor, debug tools) - IN PROGRESS (7/8)

Key pitfalls from research:
- ClinVar "conflicting" over-excludes valid variants (Phase 8 - handled)
- ARIA live regions break with v-if (Phase 7 - solved with VueAnnouncer)
- XSS risk in template editor (Phase 10)

**Phase 8 deliverables (all complete):**
- Plan 01: Filter types and settings store extension - COMPLETE
- Plan 02: HGVS fields + display types for variant modal - COMPLETE
- Plan 03: Filter UI component + useVariantFilter composable - COMPLETE
- Plan 04: Variant modal component with sortable table - COMPLETE

**Phase 9 deliverables (all complete):**
- Plan 01: ClinGen infrastructure (types, store, composable) - COMPLETE
- Plan 02: Gene constraint display (pLI, LOEUF metrics) - COMPLETE
- Plan 03: ClinGen warning UI (validation in gene/results steps) - COMPLETE
- Plan 04: Disclaimer and ClinGen settings - COMPLETE
- Plan 05: Help system (methodology + FAQ) - COMPLETE
- Plan 06: About dialog, data sources, README - COMPLETE
- Plan 07: Contextual help tooltips + coverage warning - COMPLETE

**Phase 10 deliverables (in progress):**
- Plan 01: Logging infrastructure (types, store, composable) - COMPLETE
- Plan 02: Log viewer UI - COMPLETE
- Plan 03: Export infrastructure - COMPLETE
- Plan 04: Template infrastructure (variables, parser, store) - COMPLETE
- Plan 05: Template editor UI - PENDING
- Plan 06: Export UI integration - PENDING
- Plan 07: Vite plugin checker (parallel TypeScript/ESLint) - COMPLETE
- Plan 08: Final integration - PENDING

---

*State initialized: 2026-01-18*
*v1.0 shipped: 2026-01-19*
*v1.1 roadmap: 2026-01-19*
*05-01 complete: 2026-01-19*
*05-02 complete: 2026-01-19*
*06-01 complete: 2026-01-19*
*06-02 complete: 2026-01-19*
*07-01 complete: 2026-01-19*
*07-02 complete: 2026-01-19*
*07-03 complete: 2026-01-19*
*07-04 complete: 2026-01-19*
*08-01 complete: 2026-01-19*
*08-02 complete: 2026-01-19*
*08-03 complete: 2026-01-19*
*08-04 complete: 2026-01-19*
*Phase 8 complete: 2026-01-19*
*09-01 complete: 2026-01-19*
*09-02 complete: 2026-01-19*
*09-03 complete: 2026-01-19*
*09-04 complete: 2026-01-19*
*09-05 complete: 2026-01-19*
*09-06 complete: 2026-01-19*
*09-07 complete: 2026-01-19*
*Phase 9 complete: 2026-01-19*
*10-01 complete: 2026-01-19*
*10-02 complete: 2026-01-19*
*10-03 complete: 2026-01-19*
*10-04 complete: 2026-01-19*
*10-07 complete: 2026-01-19*
