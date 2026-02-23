# Project State: gnomAD Carrier Frequency Calculator

---

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-09)

**Core value:** Accurate recurrence risk calculation from gnomAD population data with clinical documentation output
**Current focus:** v1.3 Documentation Site

---

## Current Position

**Milestone:** v1.3 Documentation Site
**Phase:** 18 of 20 (Documentation Content) — In progress
**Plan:** 1 of ~5 complete
**Status:** Phase 18 plan 01 complete. Guide section written. Ready for next content plan.
**Last activity:** 2026-02-23 -- Completed 18-01-PLAN.md (screenshot CSS, Contributing sidebar, Guide intro + Getting Started)

### Progress

```
v1.0 MVP:           [##########] 100% - SHIPPED 2026-01-19
v1.1 Release-Ready: [##########] 100% - SHIPPED 2026-01-19
v1.2 Sharing:       [##########] 100% - SHIPPED 2026-01-20
v1.3 Docs:          [██████    ]  60% - Phase 18 started (6/10 plans)
```

**Overall:** 65 plans complete across v1.0 + v1.1 + v1.2 + v1.3

---

## Performance Metrics

**Velocity:**
- Total plans completed: 65
- v1.3 plans completed: 6

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
- 18-01: Screenshot embedding via <figure class="screenshot-frame"> with /screenshots/ absolute paths (no /public/ prefix)
- 18-01: Research disclaimer ::: warning block at top of guide entry-point pages
- 18-01: Hardy-Weinberg explanation included in Guide intro for broad clinical audience
- 18-01: Risk divisors documented inline in Getting Started (carrier_frequency / 4 for heterozygous, / 2 for homozygous/compound het)

### Pending Todos

None yet.

### Blockers/Concerns

- Local dev environment: node_modules installed by bun (Linux binaries) require @rollup/rollup-win32-x64-msvc for VitePress build under Windows node. Install with `npm install @rollup/rollup-win32-x64-msvc --no-save` if running builds in Windows shell (does not affect CI which uses ubuntu-latest).

---

## Session Continuity

### Last Session

**Date:** 2026-02-23
**Completed:** Phase 18 Plan 01 — screenshot CSS, Contributing sidebar, Guide intro + Getting Started walkthrough
**Status:** Plan 18-01 complete — ready for next content plan (Use Cases or Reference section)

### Handoff Notes

v1.3 Documentation Site milestone:
- Phase 16: VitePress Setup -- COMPLETE
- Phase 17: Screenshot Automation -- COMPLETE
- Phase 18: Documentation Content (16 requirements) — IN PROGRESS (plan 01 done)
  - 18-01: Guide section (Introduction + Getting Started) -- COMPLETE
  - Remaining: Use Cases, Reference section, About section, etc.
- Phase 19: CI/CD Integration (5 requirements)
- Phase 20: README Streamlining (3 requirements)
- Branch: feature/v1.3-documentation

Screenshot-frame CSS pattern established. All future doc plans embedding screenshots should use:
```html
<figure class="screenshot-frame">
  <img src="/screenshots/filename.webp" alt="..." />
  <figcaption>Caption text.</figcaption>
</figure>
```

---

*State initialized: 2026-01-18*
*v1.0 shipped: 2026-01-19*
*v1.1 shipped: 2026-01-19*
*v1.2 shipped: 2026-01-20*
*v1.3 roadmap created: 2026-02-09*
