# Project State: gnomAD Carrier Frequency Calculator

---

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-23)

**Core value:** Accurate recurrence risk calculation from gnomAD population data with clinical documentation output
**Current focus:** Phase 22 - CTA Color System & Accessibility

---

## Current Position

**Milestone:** v1.4 Discoverability & Polish
**Phase:** 22 of 24 (CTA Color System & Accessibility) -- COMPLETE
**Plan:** 3 of 3 in current phase
**Status:** Phase complete
**Last activity:** 2026-02-23 -- Completed 22-03-PLAN.md (skip-link, footer labels, wizard loading bar)

### Progress

```
v1.0 MVP:           [##########] 100% - SHIPPED 2026-01-19
v1.1 Release-Ready: [##########] 100% - SHIPPED 2026-01-19
v1.2 Sharing:       [##########] 100% - SHIPPED 2026-01-20
v1.3 Docs:          [##########] 100% - SHIPPED 2026-02-23 (14/14 plans)
v1.4 Discover:      [#######   ]  64% - Phase 22 COMPLETE (7/11 plans)
```

**Overall:** 78 plans complete across v1.0-v1.4. 4 plans remaining for v1.4.

---

## Performance Metrics

**Velocity:**
- Total plans completed: 78
- v1.4 plans completed: 7

**v1.4 Phases:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 21. SEO Foundation | 4/4 COMPLETE | ~8 min | 2 min |
| 22. CTA Color & A11y | 3/3 COMPLETE | ~9 min | 3 min |
| 23. Onboarding & Polish | 0/3 | - | - |
| 24. Docs Content | 0/1 | - | - |

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

### Pending Todos

None.

### Blockers/Concerns

- Phase 21: Vite build may be stripping `<head>` meta tags (needs fresh `bun run build` verification) -- Plan 21-03 addresses this
- Phase 21: SW `registerType` change from 'prompt' to 'autoUpdate' needs testing

---

## Session Continuity

### Last Session

**Date:** 2026-02-23
**Completed:** 22-03-PLAN.md -- WCAG 2.4.1 skip-link, 8 labeled footer buttons, wizard loading progress bar
**Status:** Phase 22 COMPLETE (3/3 plans done)

### Handoff Notes

Phase 22 (CTA Color & Accessibility) is COMPLETE:
- Plan 01 COMPLETE: Vuetify primary = teal #117A7F (light) / #4DB6AC (dark); secondary = warm gray #a09588; PWA manifest + seed CSS updated
- Plan 02 COMPLETE: 8 non-CTA elements (filter chips, switches, decorative icons, variable chips) migrated to secondary; 16 primary bindings remain (all CTAs)
- Plan 03 COMPLETE: Skip-link (WCAG 2.4.1), 8 footer icon+label buttons, v-progress-linear in WizardStepper

v1.4 remaining phases:
- Phase 23: Onboarding & Visual Polish (3 plans)
- Phase 24: Documentation Content (1 plan)

App: https://gnomad-carrier-frequency.kidney-genetics.org/
Docs: https://gnomad-carrier-frequency.kidney-genetics.org/docs/

---

*State initialized: 2026-01-18*
*v1.0 shipped: 2026-01-19*
*v1.1 shipped: 2026-01-19*
*v1.2 shipped: 2026-01-20*
*v1.3 shipped: 2026-02-23*
