# Project State: gnomAD Carrier Frequency Calculator

---

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-23)

**Core value:** Accurate recurrence risk calculation from gnomAD population data with clinical documentation output
**Current focus:** Phase 24 - Documentation Content -- COMPLETE

---

## Current Position

**Milestone:** v1.4 Discoverability & Polish -- COMPLETE
**Phase:** 24 of 24 (Documentation Content) -- COMPLETE
**Plan:** 2 of 2 in current phase (Plan 02 COMPLETE)
**Status:** COMPLETE
**Last activity:** 2026-02-23 -- Completed 24-02-PLAN.md (FAQ page with FAQPage JSON-LD)

### Progress

```
v1.0 MVP:           [##########] 100% - SHIPPED 2026-01-19
v1.1 Release-Ready: [##########] 100% - SHIPPED 2026-01-19
v1.2 Sharing:       [##########] 100% - SHIPPED 2026-01-20
v1.3 Docs:          [##########] 100% - SHIPPED 2026-02-23 (14/14 plans)
v1.4 Discover:      [##########] 100% - COMPLETE (12/12 plans)
```

**Overall:** 82 plans complete across v1.0-v1.4. All milestones shipped.

---

## Performance Metrics

**Velocity:**
- Total plans completed: 82
- v1.4 plans completed: 12

**v1.4 Phases:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 21. SEO Foundation | 4/4 COMPLETE | ~8 min | 2 min |
| 22. CTA Color & A11y | 3/3 COMPLETE | ~9 min | 3 min |
| 23. Onboarding & Polish | 3/3 COMPLETE | - | - |
| 24. Docs Content | 2/2 COMPLETE | ~8 min | 4 min |

---

## Accumulated Context

### Decisions

| Plan | Decision | Rationale |
|------|----------|-----------|
| 21-01 | Title leads with "Carrier Frequency Calculator" not "gnomAD" | Primary search term users type; gnomAD is secondary qualifier |
| 21-01 | seed-* CSS class prefix for pre-mount styles | Avoids Vuetify global style conflicts at runtime |
| 21-01 | Noscript outside <div id="app"> | Persists after Vue mounts and replaces app innerHTML |
| 21-02 | VitePress sitemap.hostname includes /docs/ path | VitePress #3863 - does not auto-append base to hostname |
| 21-02 | OG image shared via absolute URL between app and docs | Single source of truth at /og-image.png |
| 21-02 | SVG-to-PNG via sharp for OG image generation | Playwright fallback works in all environments |
| 21-03 | German FAQ uses natural German targeting distinct search queries, not direct translations | German clinicians search with different terminology (Heterozygotenfrequenz vs carrier frequency) |
| 21-03 | OG image meta always uses absolute HTTPS URL, never relative path | Social platforms require absolute URLs; relative paths fail in unfurl/scraper contexts |
| 21-04 | Docs link in footer-primary (always-visible) row | Maximum discoverability on all screen sizes; also in mobile menu |
| 21-04 | Docs href uses /docs/ relative path (not absolute) | Works across dev/staging/production without domain hardcoding |
| 21-04 | CFTR deep-link uses ?gene=CFTR query param | Recognized by useUrlState composable for pre-filled search |
| 22-01 | Light primary #117A7F, dark primary #4DB6AC (both WCAG AA) | 5.10:1 and 6.83:1 contrast ratios; warm gray #a09588 -> secondary |
| 22-01 | Warm gray #a09588 assigned as secondary in both themes | Preserves brand identity for secondary actions |
| 22-01 | No component files touched for color change | Vuetify theme system propagates automatically to all color="primary" bindings |
| 22-02 | LoF HC chip/switch, DNA icons, variable chips, version chip → secondary | Informational/decorative elements should not use CTA color (teal) |
| 22-02 | Install, Save, language toggle in SettingsDialog retain primary | These are confirmed CTAs that trigger user actions |
| 22-03 | Skip-link targets v-main container (not first input) | Works universally across all 4 wizard steps without step-aware logic |
| 22-03 | icon prop removed from footer buttons (not just label added) | Vuetify icon prop enforces icon-only rendering, suppresses label content |
| 22-03 | Footer primary row also received labels (3 primary + 5 secondary = 8 total) | Plan explicitly required 8 labeled buttons across both rows |
| 23-02 | v-if="!xs" on outer v-tooltip wrapper (not just v-app-bar-title) | Hides both tooltip and title together; avoids orphaned tooltip on mobile |
| 23-02 | goToStep(1) used for chip click (not resetWizard) | Preserves gene for re-selection; user can keep or change gene on Step 1 |
| 23-01 | prefillGene inside useGeneSearch() function body (not module-level) | Retains closure access to caller's useQuery data/results refs; shared debouncedTerm fires all active queries |
| 23-01 | WelcomeCard dismisses before prefillGene() resolves | Immediate visual feedback; card disappears on click, not after async search completes |
| 23-01 | GeneSearch watch(selectedGene) does NOT emit select | Prevents duplicate selectGene() call and double constraint fetch when prefillGene triggers selection |
| 23-01 | StepGene watch(selectedGene) as single selection code path | Handles both manual dropdown selection and programmatic prefillGene; removes @select emit dependency |
| 23-03 | Module-level singleton refs in useConfirmDialog | Module scope ensures all consumers share same dialog state without duplication |
| 23-03 | Template import validates structure locally before summary dialog | Enables preview summary (language, section count) before applying; mirrors store validation |
| 23-03 | FileReader.onload made async | Required to await ask() inside callback; safe as FileReader doesn't use return value |
| 24-01 | Concepts nav entry placed between Use Cases and Reference | Logical progression: how to use (Guide/Use Cases) -> conceptual background (Concepts) -> technical reference (Reference) |
| 24-01 | FAQ sidebar entry pre-registered in config.ts before file exists | Avoids config change in Plan 02; 404 expected until Plan 02 creates /reference/faq |
| 24-01 | Table carrier frequency values framed as approximate estimates, not exact gnomAD values | Prevents outdated figures becoming authoritative; directs users to calculator for current data |
| 24-02 | Two FAQ categories: Hardy-Weinberg Equilibrium (3 Qs) and gnomAD Data (4 Qs) | Logical grouping by domain; HWE questions are conceptual, gnomAD questions are data-technical |
| 24-02 | No Research Use Only callout on FAQ page | FAQ is reference content, not educational claims requiring research disclaimer |
| 24-02 | Visible Q&A text verbatim matches JSON-LD acceptedAnswer text | Google requires FAQ content visible to users; verbatim match ensures schema validity |

### Pending Todos

None.

### Blockers/Concerns

- Phase 21: Vite build may be stripping `<head>` meta tags (needs fresh `bun run build` verification) -- Plan 21-03 addresses this
- Phase 21: SW `registerType` change from 'prompt' to 'autoUpdate' needs testing

---

## Session Continuity

### Last Session

**Date:** 2026-02-23
**Completed:** 24-02-PLAN.md -- FAQ page with FAQPage JSON-LD, 7 net-new Q&A pairs
**Status:** Phase 24 COMPLETE, v1.4 COMPLETE

### Handoff Notes

All v1.4 phases and plans are complete:

Phase 24 (Documentation Content) COMPLETE:
- Plan 01 COMPLETE: docs/concepts/what-is-carrier-frequency.md (~1,573 words), docs/concepts/how-to-calculate.md (~1,595 words), VitePress config updated with Concepts nav + sidebar, FAQ pre-registered
- Plan 02 COMPLETE: docs/reference/faq.md with 7 net-new Q&A pairs (HWE + gnomAD Data categories), FAQPage JSON-LD, all cross-links validated

Phase 23 (Onboarding & Visual Polish) COMPLETE:
- Plan 01 COMPLETE: onboarding state in useAppStore (persisted), WelcomeCard.vue with CFTR quick-start, singleton useGeneSearch (module-level state), prefillGene function
- Plan 02 COMPLETE: AppBar title hidden on mobile xs; gene context chip shows "GENE · version" on Steps 2-4; tap navigates to Step 1
- Plan 03 COMPLETE: useConfirmDialog composable + ConfirmDialog singleton; all 4 native dialog calls migrated; template import shows summary before applying

v1.4 remaining: None. All 12 plans complete.

App: https://gnomad-carrier-frequency.kidney-genetics.org/
Docs: https://gnomad-carrier-frequency.kidney-genetics.org/docs/

---

*State initialized: 2026-01-18*
*v1.0 shipped: 2026-01-19*
*v1.1 shipped: 2026-01-19*
*v1.2 shipped: 2026-01-20*
*v1.3 shipped: 2026-02-23*
*v1.4 shipped: 2026-02-23*
