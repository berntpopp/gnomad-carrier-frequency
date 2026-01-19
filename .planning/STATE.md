# Project State: gnomAD Carrier Frequency Calculator

---

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-19)

**Core value:** Accurate recurrence risk calculation from gnomAD population data with clinical documentation output
**Current focus:** v1.2 Sharing & Collaboration - Phase 13 in progress

---

## Current Position

**Milestone:** v1.2 Sharing & Collaboration
**Phase:** 13 - Variant Exclusion - IN PROGRESS
**Plan:** 4 of ? complete (plan count TBD)
**Status:** Phase 13 in progress

### Progress

```
v1.0 MVP:           [##########] 100% - SHIPPED 2026-01-19
v1.1 Release-Ready: [##########] 100% - SHIPPED 2026-01-19
v1.2 Sharing:       [########  ]  90% - Phase 13 in progress (2/3 phases, 9/? plans)
```

**Overall:** 36 plans complete for v1.0+v1.1+v1.2 (Phases 11-13)

---

## Shipped

**v1.0 MVP** (2026-01-19)
- 4 phases, 15 plans
- 32/32 requirements
- 3,285 lines TypeScript/Vue
- Deployed: https://berntpopp.github.io/gnomad-carrier-frequency/

**v1.1 Release-Ready** (2026-01-19)
- 6 phases, 27 plans total (12 new plans)
- 69 requirements
- Full feature set: settings, theming, accessibility, filtering, ClinGen integration, export, templates, logging
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
| 10 | Export + Templates + Logging | 22 | Complete (8/8 plans) |

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
| Console icon for log viewer | Footer access via mdi-console icon | 2026-01-19 |
| Right-side temporary drawer for logs | 450px width, temporary overlay panel | 2026-01-19 |
| Level checkboxes for log filtering | DEBUG hidden by default, INFO/WARN/ERROR visible | 2026-01-19 |
| Dynamic dialog width for templates tab | 900px for templates, 600px for others to fit editor + picker | 2026-01-19 |
| formatVariable helper for Vue templates | Avoid template literal parsing issues with curly braces | 2026-01-19 |
| Module-level logApi helper | Try/catch wrapped for non-composable contexts in client.ts | 2026-01-19 |
| Watch-based logging | Track reactive state changes via watchers for separation of concerns | 2026-01-19 |
| Zod for URL validation | Type-safe runtime validation with graceful fallbacks to defaults | 2026-01-19 |
| Compact filter flags (l/m/c) | Single-letter encoding keeps URLs short while readable | 2026-01-19 |
| replaceState for URL updates | Avoid browser history pollution with wizard step changes | 2026-01-19 |
| URL singleton init state | Module-level refs prevent multiple initializations | 2026-01-19 |
| VueUse useClipboard with legacy | Legacy fallback for older browsers without Clipboard API | 2026-01-19 |
| Polite/assertive announcements | Copy success is polite (non-urgent), failure is assertive | 2026-01-19 |
| NetworkFirst for API caching | APIs need fresh data when online, cached data acceptable offline | 2026-01-19 |
| registerType: 'prompt' | Per CONTEXT.md, user decides when to update (never auto-update) | 2026-01-19 |
| Maskable icon with RequiForm background | #a09588 background, white text for contrast in safe zone | 2026-01-19 |
| Separate cache names per API | gnomad-api-cache and clingen-api-cache for independent management | 2026-01-19 |
| useOnline from VueUse for network detection | Leverages existing VueUse dependency for reliable network detection | 2026-01-19 |
| Subtle vs prominent offline indicators | OfflineIndicator chip subtle, OfflineFallback alert prominent per context | 2026-01-19 |
| Auto-dismiss back-online notification | 3 second timeout balances visibility with non-intrusiveness | 2026-01-19 |
| ComputedRef<T> for typed computed refs | Match project conventions in composable interfaces | 2026-01-20 |
| Singleton exclusion state pattern | Module-level reactive state shared across components | 2026-01-20 |
| Four predefined exclusion reasons | likely_benign, low_quality, population_specific, other | 2026-01-20 |
| lz-string for URL compression | Efficient encoding keeps exclusion data compact in shareable URLs | 2026-01-20 |
| 1500 char exclusion URL limit | Conservative MAX_EXCLUSION_URL_LENGTH leaves buffer for other params | 2026-01-20 |
| exclWarn flag for truncated exclusions | Graceful degradation when exclusions too large for URL | 2026-01-20 |
| Dynamic slot syntax for header columns | #[\`header.xxx\`] syntax required for ESLint vue/valid-v-slot compliance | 2026-01-20 |
| Checkbox inclusion semantics | Checked = included, unchecked = excluded (intuitive selection) | 2026-01-20 |
| 500ms debounce for exclusion | Prevents jittery recalculation during rapid checkbox toggling | 2026-01-20 |
| Separate totalPathogenicCount | Pre-exclusion count for transparency in UI display | 2026-01-20 |

### Roadmap Evolution

- Phase 11 added: URL State Sharing - shareable/reproducible calculation links (2026-01-19)
- Phase 12 added: PWA - installable app with offline support (2026-01-19)
- Phase 13 added: Variant Exclusion - manual variant exclusion from calculations (2026-01-19)

### Blockers

None.

### TODOs

- [x] Run `/gsd:plan-phase 11` to create URL State Sharing plans
- [x] Execute 11-01-PLAN.md (URL state infrastructure)
- [x] Execute 11-02-PLAN.md (share UI)
- [x] Run `/gsd:plan-phase 12` to create PWA plans
- [x] Execute 12-01-PLAN.md (PWA infrastructure)
- [x] Execute 12-02-PLAN.md (PWA UI)
- [x] Execute 12-03-PLAN.md (install prompt)
- [x] Run `/gsd:plan-phase 13` to create Variant Exclusion plans
- [x] Execute 13-01-PLAN.md (exclusion infrastructure)
- [x] Execute 13-02-PLAN.md (exclusion UI)
- [x] Execute 13-03-PLAN.md (frequency recalculation integration)
- [x] Execute 13-04-PLAN.md (export and URL integration)
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
- [x] Execute 10-02-PLAN.md (export infrastructure)
- [x] Execute 10-03-PLAN.md (export UI integration)
- [x] Execute 10-04-PLAN.md (template infrastructure)
- [x] Execute 10-05-PLAN.md (template editor UI)
- [x] Execute 10-06-PLAN.md (log viewer UI)
- [x] Execute 10-07-PLAN.md (vite-plugin-checker)
- [x] Execute 10-08-PLAN.md (final integration)

---

## Session Continuity

### Last Session

**Date:** 2026-01-20
**Completed:** Phase 13 Plan 04 - Export and URL Integration
**Status:** Phase 13 in progress (4/? plans)

### Handoff Notes

v1.2 Phase 13 Plan 04 complete:
- Extended ExportVariant with excluded and exclusionReason fields (EXCL-06)
- Created exclusion-url.ts with lz-string compression utilities
- Extended useUrlState to sync exclusion state bidirectionally with URL
- Updated StepResults and VariantModal to pass exclusion data to export
- Exports now include exclusion status and reason for all variants
- Shared URLs preserve exclusion state via excl parameter

v1.2 Phase 13 Plan 03 complete:
- Debounced exclusion filtering in useCarrierFrequency (500ms)
- Exclusion note in results "(X manually excluded)"
- Info alert when variants excluded
- Exclusion reset on gene change in StepGene

v1.2 Phase 13 Plan 02 complete:
- Exclusion checkboxes in VariantTable (header + row level)
- Visual styling for excluded variants (dimmed rows, strikethrough)
- Exclusion count badge in VariantModal title
- "Clear exclusions" button in modal actions

v1.2 Phase 13 Plan 01 complete:
- ExclusionState, ExclusionReason, PredefinedExclusionReason types
- EXCLUSION_REASONS config with 4 predefined options
- useExclusionState singleton composable for variant exclusion management
- Supports: excludeVariant, includeVariant, toggleVariant, excludeAll, includeAll
- Tracks exclusion reasons per variant
- Resets on gene change via resetForGene()

Phase 12 (PWA) complete:
- PWA infrastructure with vite-plugin-pwa and Workbox
- Service worker with NetworkFirst caching for APIs
- Installable app with manifest and icons
- Offline indicator and fallback messaging
- Update notifications with user control

v1.1 roadmap derived from requirements and research:
- Phase 5: Foundation (settings store, theme, version display) - COMPLETE
- Phase 6: App Shell (navigation, logo, favicon, settings access) - COMPLETE
- Phase 7: SEO + Accessibility - COMPLETE (4/4 plans)
- Phase 8: Filtering + Variant Display (configurable filters, variant modal) - COMPLETE
- Phase 9: ClinGen + Documentation (clinical validation, help content) - COMPLETE
- Phase 10: Export + Templates + Logging (data export, template editor, debug tools) - COMPLETE (8/8)

**All v1.1 features implemented:**
- Settings store with persistence
- Theme toggle (light/dark/system)
- Version display
- Favicon with dark mode support
- App shell with navigation
- SEO meta tags and OG image
- WCAG 2.1 AA accessibility
- Configurable variant filters
- Variant modal with detailed view
- ClinGen gene validity integration
- Disclaimer banner
- Help system with methodology and FAQ
- About dialog and data sources
- Contextual help tooltips
- Coverage warnings
- Excel/JSON export
- Template editor with variables
- Log viewer panel
- Application-wide logging

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
*10-06 complete: 2026-01-19*
*10-05 complete: 2026-01-19*
*10-07 complete: 2026-01-19*
*10-08 complete: 2026-01-19*
*Phase 10 complete: 2026-01-19*
*v1.1 complete: 2026-01-19*
*11-01 complete: 2026-01-19*
*11-02 complete: 2026-01-19*
*Phase 11 complete: 2026-01-19*
*12-01 complete: 2026-01-19*
*12-02 complete: 2026-01-19*
*12-03 complete: 2026-01-19*
*Phase 12 complete: 2026-01-19*
*13-01 complete: 2026-01-20*
*13-02 complete: 2026-01-20*
*13-03 complete: 2026-01-20*
*13-04 complete: 2026-01-20*
