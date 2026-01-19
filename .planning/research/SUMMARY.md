# Research Summary: v1.1

**Project:** gnomAD Carrier Frequency Calculator v1.1
**Synthesized:** 2026-01-19
**Overall Confidence:** HIGH

---

## Executive Summary

The v1.1 enhancement release adds significant clinical utility through ClinGen gene-disease validity integration, configurable variant filtering, data export capabilities, and improved user experience with dark/light theming and an app shell navigation pattern. The existing Vue 3/Vuetify 3/Pinia architecture is well-suited for these additions, with most features requiring only new composables and Pinia stores following established patterns. The key technical insight is that ClinGen data is accessible via public CSV download (not a REST API), requiring a caching strategy with monthly TTL.

Three critical pitfalls demand attention before implementation: (1) ClinVar's "conflicting" classification currently over-excludes valid pathogenic variants, potentially understating carrier frequencies; (2) ARIA live regions break when conditionally rendered with `v-if`, requiring always-mounted containers for screen reader accessibility; (3) user-editable templates must be text-only or sanitized with DOMPurify to prevent XSS vulnerabilities. These are addressable with known patterns but must be explicitly designed for.

The recommended implementation approach follows a dependency-driven phase structure: foundation (settings/theme) first since other features depend on the settings store, then app shell (UI container for all features), followed by parallel tracks for filtering configuration, ClinGen integration, and template editing. Browser logging should be added mid-project to support debugging. Accessibility and SEO improvements (meta tags, contrast fixes, heading hierarchy) should be addressed in an early phase to prevent accumulating technical debt.

---

## Key Findings

### From STACK.md

| Technology | Version | Rationale |
|------------|---------|-----------|
| ClinGen CSV endpoint | N/A | Public download at `search.clinicalgenome.org/kb/downloads`, CORS-enabled, no auth required; cache with 24-hour TTL |
| SheetJS (xlsx) | 0.20.3 | **CRITICAL: Install from CDN, NOT npm** (npm version 0.18.5 has vulnerabilities); use with file-saver 2.0.5 |
| loglevel | 1.9.2 | 1.4KB gzip, zero dependencies, preserves stack traces and line numbers in browser console |
| VueUse useDark | 12.x (existing) | System preference detection + localStorage persistence; sync with Vuetify useTheme |
| vite-plugin-checker | 0.8.x | Optional parallel type checking to speed up development workflow |

**No new dependencies needed for:** ClinGen integration (native fetch), dark/light theme (VueUse already installed), ESLint optimizations (already on flat config).

### From FEATURES.md

**Table Stakes (Must Have):**
- Sortable variant/population table columns with units
- Current filter criteria display (what produced the results)
- Filter state persistence across sessions
- Help page with methodology explanation and variable glossary
- Gene symbol validation with clear error messages

**Differentiators (Should Have for v1.1):**
- Expandable population rows for subcontinental breakdown (gnomAD pattern)
- Filter chip toggles with real-time result count feedback
- ClinVar star threshold slider (0-4 stars)
- FAQ accordion with native `<details>`/`<summary>` for accessibility
- Inheritance pattern warning (non-blocking banner if gene not AR)

**Anti-Features (Explicitly Avoid):**
- Full genome browser embed (scope creep)
- WYSIWYG template editor (clinical text is plain text for pasting)
- Conditional logic in templates (complexity explosion)
- Allele frequency threshold filter (changes calculation meaning)
- Multi-gene batch processing (different product scope)

### From ARCHITECTURE.md

**Integration patterns follow existing codebase conventions:**

| New Feature | Pattern | Primary File(s) |
|-------------|---------|-----------------|
| ClinGen caching | Pinia store with TTL | `useClingenStore.ts` |
| Settings system | Pinia store (extends template store pattern) | `useSettingsStore.ts` |
| Browser logging | Composable with circular buffer | `useLogger.ts` |
| App shell | Vuetify layout refactor | `App.vue`, `AppBar.vue`, `AppDrawer.vue` |
| Filter configuration | Config-driven pure functions | `FilterConfig` type, modified `variant-filters.ts` |
| Template editor | Extend existing `useTemplateStore.customSections` | `TemplateEditor.vue` |

**Key architectural decisions:**
- ClinGen data: Pre-process CSV to JSON at build time OR fetch/parse at runtime with 30-day cache TTL
- Defer `vue-router` unless multi-page navigation is truly needed; use conditional rendering for Help/About
- Keep filter logic as pure functions accepting config parameter for testability
- LogViewer uses `v-virtual-scroll` for performance with 500+ entries

### From PITFALLS-v1.1.md

**Critical (Must Address):**

| Pitfall | Impact | Prevention |
|---------|--------|------------|
| ClinVar "conflicting" over-exclusion | False negatives for well-established pathogenic variants (e.g., HFE c.845G>A) | Accept conflicting variants with 3+ stars (expert panel review) |
| ARIA live regions break with v-if | Screen reader users miss calculation results and errors | Keep aria-live containers always mounted; use `@vue-a11y/announcer` |
| XSS in custom templates | Security vulnerability if templates contain HTML | Keep templates text-only OR use `vue-dompurify-html` |

**High Priority:**

| Pitfall | Phase | Prevention |
|---------|-------|------------|
| ClinGen uses GraphQL/CSV, not REST | Data Enhancement | Use CSV download endpoint, not hypothetical REST API |
| Meta tags render too late for social sharing | SEO | Add static meta tags in index.html; use `@unhead/vue` (not deprecated `@vueuse/head`) |
| Vuetify default contrast fails WCAG | Accessibility | Override tooltip colors in SASS; test all colors for 4.5:1 ratio |
| No ClinVar data handling | Data Enhancement | Distinguish "no ClinVar data" from "no pathogenic variants found" |

---

## Implications for Roadmap

### Suggested Phase Structure

Based on feature dependencies and architectural analysis, recommend **6 phases**:

#### Phase 1: Foundation (Settings + Theme)
**Rationale:** Other features depend on `useSettingsStore` for filter defaults, theme, and log level configuration.

- Create `useSettingsStore.ts` with theme and filterDefaults
- Implement dark/light theme toggle using VueUse `useDark` + Vuetify sync
- Add theme toggle button to existing UI

**Delivers:** Working theme persistence, settings infrastructure
**Features from FEATURES.md:** Theme toggle (prerequisite for app shell)
**Pitfalls to avoid:** None specific; foundational work

---

#### Phase 2: App Shell + Navigation
**Rationale:** Provides UI container for settings dialog, help pages, and navigation before adding feature content.

- Refactor `App.vue` with Vuetify `v-app-bar`, `v-navigation-drawer`, `v-main`
- Create `AppBar.vue` with logo, title, theme toggle, settings gear
- Create `AppDrawer.vue` with navigation links
- Create `SettingsDialog.vue` shell
- Add logo and favicon assets

**Delivers:** Professional app shell with navigation and settings access
**Features from FEATURES.md:** App shell structure
**Pitfalls to avoid:** Keep drawer minimal initially; defer complex routing

---

#### Phase 3: SEO + Accessibility Fixes
**Rationale:** Address known Lighthouse issues and accessibility gaps before adding new features that could introduce more issues.

- Add static meta description and Open Graph tags to `index.html`
- Install `@unhead/vue` for dynamic meta management
- Fix Vuetify contrast ratios (tooltips, inputs) via SASS overrides
- Audit and fix heading hierarchy (h1 -> h2 -> h3)
- Implement always-mounted ARIA live regions for announcements

**Delivers:** WCAG-compliant contrast, proper SEO, screen reader support
**Features from FEATURES.md:** Help/documentation accessibility prerequisites
**Pitfalls to avoid:** #6 (meta tags), #7 (contrast), #8 (ARIA live regions), #9 (headings)
**Research flag:** Standard patterns, no additional research needed

---

#### Phase 4: Filter Configuration + Variant Refinement
**Rationale:** Isolated improvement to core calculation accuracy and user control.

- Create `FilterConfig` type and refactor `variant-filters.ts` to accept config
- Build `FilterSettings.vue` panel for settings dialog
- Add filter chip UI in `StepFrequency.vue` for per-calculation override
- Fix ClinVar "conflicting" exclusion (accept 3+ star conflicting as pathogenic)
- Improve UX when zero qualifying variants found

**Delivers:** Configurable filtering, improved pathogenic variant detection
**Features from FEATURES.md:** Filter chip toggles, ClinVar star threshold, filter presets
**Pitfalls to avoid:** #3 (conflicting exclusion), #4 (zero variants UX)

---

#### Phase 5: ClinGen Integration + Validation
**Rationale:** Adds significant clinical value; independent of filtering changes.

- Create `useClingenStore.ts` with TTL-based cache (30 days)
- Implement CSV fetch and parse logic in `clingen-service.ts`
- Add inheritance pattern warning banner in gene selection step
- Implement gene constraint display (pLI/LOEUF from gnomAD)
- Add clinical disclaimer text

**Delivers:** ClinGen gene validity lookup, inheritance warnings, gene constraint info
**Features from FEATURES.md:** Inheritance pattern warning, gene validation enhancements
**Pitfalls to avoid:** #1 (GraphQL/CSV not REST), #2 (rate limiting), #5 (no ClinVar data)
**Research flag:** May need deeper research on ClinGen CSV schema if undocumented

---

#### Phase 6: Data Export + Template Editor + Logging
**Rationale:** Polish features that extend existing functionality; can be developed in parallel.

- Install SheetJS from CDN (not npm) and file-saver
- Implement Excel and JSON export for results
- Create `TemplateEditor.vue` with variable highlighting and preview
- Add `useLogger.ts` composable with circular buffer
- Create `LogViewer.vue` component for debugging

**Delivers:** Data export, template customization, debugging tools
**Features from FEATURES.md:** Export to CSV/Excel, inline template editing, variable autocomplete
**Pitfalls to avoid:** #13 (XSS in templates), #14 (variable injection), #15 (localStorage data)
**Research flag:** Standard patterns, no additional research needed

---

### Research Flags

| Phase | Needs `/gsd:research-phase` | Reason |
|-------|----------------------------|--------|
| Phase 1 (Foundation) | NO | Standard Pinia + VueUse patterns |
| Phase 2 (App Shell) | NO | Standard Vuetify layout patterns |
| Phase 3 (SEO/A11y) | NO | Well-documented fixes |
| Phase 4 (Filtering) | NO | Refactoring existing code |
| Phase 5 (ClinGen) | MAYBE | CSV schema may need exploration if documentation insufficient |
| Phase 6 (Export/Templates) | NO | SheetJS and loglevel are well-documented |

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All libraries verified against official documentation; versions confirmed |
| Features | HIGH | Patterns derived from gnomAD browser, Material Design guidelines, and clinical tool best practices |
| Architecture | HIGH | Extensions of existing codebase patterns; verified against current implementation |
| Pitfalls | MEDIUM-HIGH | ClinGen API details sparse; ClinVar behavior verified against known variants |

### Gaps to Address During Planning

1. **ClinGen CSV schema documentation** - May need to fetch sample and document fields during Phase 5 implementation
2. **gnomAD subcontinental population codes** - Need to verify v2.1 vs v4.1 subcontinental breakdown availability for expandable rows
3. **Performance benchmarks** - No baseline established; should measure before/after for filter configuration changes
4. **User testing** - Inheritance warning UX and filter chip usability should be validated with genetic counselors

---

## Aggregated Sources

### Official Documentation
- [ClinGen Downloads Page](https://search.clinicalgenome.org/kb/downloads)
- [ClinGen Gene-Disease Validity](https://clinicalgenome.org/curation-activities/gene-disease-validity/)
- [SheetJS Documentation](https://docs.sheetjs.com/)
- [SheetJS CDN](https://cdn.sheetjs.com/xlsx/)
- [loglevel GitHub](https://github.com/pimterry/loglevel)
- [VueUse useDark](https://vueuse.org/core/usedark/)
- [Vuetify Theme](https://vuetifyjs.com/en/features/theme/)
- [Vuetify Application Layout](https://vuetifyjs.com/en/features/application-layout/)
- [Vite Performance Guide](https://vite.dev/guide/performance)
- [Vue.js Security](https://vuejs.org/guide/best-practices/security)
- [Vue.js Accessibility](https://vuejs.org/guide/best-practices/accessibility)
- [Unhead Vue](https://unhead.unjs.io/docs/vue/head/guides/get-started/installation/)
- [ClinVar Classifications](https://www.ncbi.nlm.nih.gov/clinvar/docs/clinsig/)
- [MDN ARIA Live Regions](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions)

### Research Papers and Clinical Resources
- [ClinGen Data Platforms Paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC12001867/)
- [Variant Interpretation Using gnomAD](https://pmc.ncbi.nlm.nih.gov/articles/PMC9160216/)
- [UCSC Genome Browser 2025 Update](https://academic.oup.com/nar/article/53/D1/D1243/7845169)
- [gnomAD v2.1 Release Notes](https://gnomad.broadinstitute.org/news/2018-10-gnomad-v2-1/)
- [EHR Templates Best Practices](https://pmc.ncbi.nlm.nih.gov/articles/PMC7735456/)
- [ACMG Carrier Screening Guidelines](https://pmc.ncbi.nlm.nih.gov/articles/PMC8488021/)
- [Conflicting ClinVar Variant Study](https://pmc.ncbi.nlm.nih.gov/articles/PMC11355203/)

### UI/UX Guidelines
- [Material Design 3 Chips](https://m3.material.io/components/chips/guidelines)
- [Data Table UX Best Practices](https://uxplanet.org/best-practices-for-usable-and-efficient-data-table-in-applications-4a1d1fb29550)
- [SPA Accessibility Guide](https://testparty.ai/blog/spa-accessibility)
- [Deque SPA Accessibility](https://www.deque.com/blog/accessibility-tips-in-single-page-applications/)
- [Accessible Accordion Patterns](https://www.aditus.io/patterns/accordion/)
- [ARIA Live Regions in Vue](https://dev.to/dkoppenhagen/when-your-live-region-isnt-live-fixing-aria-live-in-angular-react-and-vue-1g0j)

### GitHub Issues and Community
- [Vuetify Tooltip Contrast #17998](https://github.com/vuetifyjs/vuetify/issues/17998)
- [vite-plugin-pwa #583](https://github.com/vite-pwa/vite-plugin-pwa/issues/583)
- [@vueuse/head Sunset Notice](https://github.com/vueuse/head)
- [vue-dompurify-html](https://github.com/LeSuisse/vue-dompurify-html)
- [Simple ClinVar Tool](https://simple-clinvar.broadinstitute.org/)

### npm Packages
- [xlsx npm (outdated warning)](https://www.npmjs.com/package/xlsx)
- [file-saver](https://www.npmjs.com/package/file-saver)
- [loglevel](https://www.npmjs.com/package/loglevel)
- [vite-plugin-checker](https://github.com/fi3ework/vite-plugin-checker)
