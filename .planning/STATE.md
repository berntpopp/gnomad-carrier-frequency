# Project State: gnomAD Carrier Frequency Calculator

---

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-09)

**Core value:** Accurate recurrence risk calculation from gnomAD population data with clinical documentation output
**Current focus:** v1.3 Documentation Site

---

## Current Position

**Milestone:** v1.3 Documentation Site
**Phase:** 19 of 20 (CI/CD Integration) — In progress
**Plan:** 2 of 5 complete
**Status:** Phase 19 Plan 02 complete. CI workflow migrated to bun with app + docs build validation. Screenshots automation workflow created.
**Last activity:** 2026-02-23 -- Completed 19-02-PLAN.md (CI workflow bun migration + screenshots automation workflow)

### Progress

```
v1.0 MVP:           [##########] 100% - SHIPPED 2026-01-19
v1.1 Release-Ready: [##########] 100% - SHIPPED 2026-01-19
v1.2 Sharing:       [##########] 100% - SHIPPED 2026-01-20
v1.3 Docs:          [█████████ ]  97% - Phase 19 In Progress (2/5 plans)
```

**Overall:** 72 plans complete across v1.0 + v1.1 + v1.2 + v1.3

---

## Performance Metrics

**Velocity:**
- Total plans completed: 70
- v1.3 plans completed: 11

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
- 18-02: Use case pages start with clinical scenario paragraph before any calculator steps (WHY before HOW)
- 18-02: family-planning.md text-only (no screenshot) — carrier-screening already shows the variant table
- 18-02: HFE clinical letter page uses markdown table for three-perspective comparison
- 18-02: English text snippet shown in clinical-letter.md (docs are English; German mentioned as available)
- 18-04: CITATION.cff uses ORCID for author identification (CFF 1.2.0 standard)
- 18-04: Changelog stops at v1.2.0 (v1.3 in progress, not released)
- 18-04: BibTeX @software type used for software citations
- 18-03: Use <span v-pre>{{variable}}</span> in markdown to escape Vue interpolation (backtick code spans inside tables and ::: containers still processed by VitePress alpha 16)
- 18-03: Avoid {{}} in ::: tip/warning/info container text — Vue processes container content as Vue template
- 18-05: Landing page disclaimer placed as ::: warning block in content section after frontmatter (not inside frontmatter)
- 19-01: Open Calculator nav link and hero action link use absolute URL https://gnomad-carrier-frequency.kidney-genetics.org/ (not relative /) — VitePress resolves relative / against base '/docs/', navigating to docs index not app root
- 19-01: packageManager: "bun@1.3.9" in package.json is single source of truth; oven-sh/setup-bun@v2 reads it automatically (no bun-version input needed)
- 19-01: Deploy workflow is self-contained with lint + typecheck gates before build steps
- 19-02: No [skip ci] in screenshot auto-commit — technically impossible to skip CI but allow deploy; paths allow-list + actor check handle loop prevention
- 19-02: SCREENSHOTS_TOKEN PAT with GITHUB_TOKEN fallback — graceful degradation if PAT not configured (no cascade deploy, but no failure)
- 19-02: Playwright cache keyed on bun.lockb hash; cache-miss installs --with-deps, cache-hit installs system deps only

### Pending Todos

None yet.

### Blockers/Concerns

- Local dev environment: node_modules installed by bun (Linux binaries) require @rollup/rollup-win32-x64-msvc for VitePress build under Windows node. Install with `npm install @rollup/rollup-win32-x64-msvc --no-save` if running builds in Windows shell (does not affect CI which uses ubuntu-latest).

---

## Session Continuity

### Last Session

**Date:** 2026-02-23
**Completed:** Phase 19 Plan 02 — CI workflow bun migration + screenshots automation workflow
**Status:** 19-02 COMPLETE — CI validates app + docs build with bun. screenshots.yml created with path-filtered trigger, Playwright caching, auto-commit, cascade deploy, and failure alerting.

### Handoff Notes

v1.3 Documentation Site milestone:
- Phase 16: VitePress Setup -- COMPLETE
- Phase 17: Screenshot Automation -- COMPLETE
- Phase 18: Documentation Content (16 requirements) — COMPLETE
  - 18-01: Guide section (Introduction + Getting Started) -- COMPLETE
  - 18-02: Use Cases section (carrier screening, family planning, clinical letter) -- COMPLETE
  - 18-03: Reference section (overview, methodology, data sources, filters, templates) -- COMPLETE
  - 18-04: About section (overview, citation, changelog, contributing) + CITATION.cff -- COMPLETE
  - 18-05: Final quality gate (landing page disclaimer + build verification) -- COMPLETE
- Phase 19: CI/CD Integration — IN PROGRESS
  - 19-01: Base path fixes + unified deploy workflow -- COMPLETE
  - 19-02: CI workflow bun migration + screenshots automation workflow -- COMPLETE
  - 19-03 through 19-05: NEXT
- Phase 20: README Streamlining (3 requirements)
- Branch: feature/v1.3-documentation

SCREENSHOTS_TOKEN PAT setup is required for cascade deploy (screenshots commit → deploy.yml trigger). Without PAT, screenshots still auto-commit but deploy won't cascade. Set secret in GitHub repo settings as SCREENSHOTS_TOKEN with repo scope.

Template variable escaping pattern for VitePress: use `<span v-pre>{{variable}}</span>` for any {{}} in markdown docs. This is documented in 18-03-SUMMARY.md.

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
