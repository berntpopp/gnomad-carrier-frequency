# Project State: gnomAD Carrier Frequency Calculator

---

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-09)

**Core value:** Accurate recurrence risk calculation from gnomAD population data with clinical documentation output
**Current focus:** v1.3 Documentation Site

---

## Current Position

**Milestone:** v1.3 Documentation Site
**Phase:** 17 of 20 (Screenshot Automation) — IN PROGRESS
**Plan:** 1 of 4 complete (17-02-PLAN.md done)
**Status:** Phase 17 in progress. Test ID attributes added to 19 components.
**Last activity:** 2026-02-09 -- Completed 17-02-PLAN.md (42 data-testid attributes added)

### Progress

```
v1.0 MVP:           [##########] 100% - SHIPPED 2026-01-19
v1.1 Release-Ready: [##########] 100% - SHIPPED 2026-01-19
v1.2 Sharing:       [##########] 100% - SHIPPED 2026-01-20
v1.3 Docs:          [███       ]  30% - Phase 17 started (3/10 plans)
```

**Overall:** 61 plans complete across v1.0 + v1.1 + v1.2 + v1.3

---

## Performance Metrics

**Velocity:**
- Total plans completed: 61
- v1.3 plans completed: 3

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
- 17-02: data-testid on Vuetify components (stable selectors for Playwright, decoupled from CSS)
- 17-02: kebab-case naming convention for testids (readable, collision-resistant)
- 17-02: Settings/history buttons in AppBar not AppFooter (corrected plan assumption)

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

---

## Session Continuity

### Last Session

**Date:** 2026-02-09
**Completed:** 17-02-PLAN.md (Test ID Attributes)
**Status:** Phase 17 in progress — 42 testids added to 19 components in 11 minutes

### Handoff Notes

v1.3 Documentation Site milestone roadmapped:
- Phase 16: VitePress Setup (8 requirements)
- Phase 17: Screenshot Automation (17 requirements)
- Phase 18: Documentation Content (16 requirements)
- Phase 19: CI/CD Integration (5 requirements)
- Phase 20: README Streamlining (3 requirements)
- DOCUMENTATION-PLAN.md has detailed architecture decisions and research
- Branch: feature/v1.3-documentation

---

*State initialized: 2026-01-18*
*v1.0 shipped: 2026-01-19*
*v1.1 shipped: 2026-01-19*
*v1.2 shipped: 2026-01-20*
*v1.3 roadmap created: 2026-02-09*
