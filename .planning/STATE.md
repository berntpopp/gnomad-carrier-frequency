# Project State: gnomAD Carrier Frequency Calculator

---

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-09)

**Core value:** Accurate recurrence risk calculation from gnomAD population data with clinical documentation output
**Current focus:** v1.3 Documentation Site

---

## Current Position

**Milestone:** v1.3 Documentation Site
**Phase:** 17 of 20 (Screenshot Automation) — COMPLETE
**Plan:** 3 of 3 complete
**Status:** Phase 17 complete. All 14 screenshots generated. Ready for Phase 18.
**Last activity:** 2026-02-09 -- Phase 17 complete (3 plans, 14 WebP screenshots)

### Progress

```
v1.0 MVP:           [##########] 100% - SHIPPED 2026-01-19
v1.1 Release-Ready: [##########] 100% - SHIPPED 2026-01-19
v1.2 Sharing:       [##########] 100% - SHIPPED 2026-01-20
v1.3 Docs:          [█████     ]  50% - Phase 17 complete (5/10 plans)
```

**Overall:** 64 plans complete across v1.0 + v1.1 + v1.2 + v1.3

---

## Performance Metrics

**Velocity:**
- Total plans completed: 64
- v1.3 plans completed: 5

---

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- v1.3: VitePress chosen over Astro Starlight (same Vite/Vue ecosystem, shared node_modules)
- v1.3: Playwright for screenshots (same Node/TS ecosystem, full wizard navigation control)
- v1.3: Merged deployment artifact (app at root, docs at /docs/, single GitHub Pages deploy)
- 16-01: VitePress alpha (@next) for Vite 7 compatibility
- 16-01: PWA navigateFallbackDenylist for /docs/ path (enables coexistence)
- 16-01: Brand color #a09588 for docs theme (matches app RequiForm palette)
- 16-02: Landing page uses clinical-first voice (research tool supporting clinical work)
- 16-02: Placeholder pages kept substantive for search indexing
- 17-01: Playwright Chromium-only for smaller install size
- 17-01: Fixture-based gnomAD API mocking with realistic CFTR data
- 17-02: data-testid on Vuetify components (42 attributes across 19 components)
- 17-02: Settings/history buttons in AppBar not AppFooter (corrected plan assumption)
- 17-03: Click label text for Vuetify v-radio (more reliable than component click)
- 17-03: emulateMedia for dark mode (avoids reload and wizard state loss)
- 17-03: Simple timeouts over networkidle (SPA never settles with route interception)

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

---

## Session Continuity

### Last Session

**Date:** 2026-02-09
**Completed:** Phase 17 Screenshot Automation (3 plans, 18 requirements)
**Status:** Phase 17 complete — ready for Phase 18 planning

### Handoff Notes

v1.3 Documentation Site milestone:
- Phase 16: VitePress Setup -- COMPLETE
- Phase 17: Screenshot Automation -- COMPLETE
- Phase 18: Documentation Content (16 requirements)
- Phase 19: CI/CD Integration (5 requirements)
- Phase 20: README Streamlining (3 requirements)
- Branch: feature/v1.3-documentation

---

*State initialized: 2026-01-18*
*v1.0 shipped: 2026-01-19*
*v1.1 shipped: 2026-01-19*
*v1.2 shipped: 2026-01-20*
*v1.3 roadmap created: 2026-02-09*
