# Project State: gnomAD Carrier Frequency Calculator

---

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-23)

**Core value:** Accurate recurrence risk calculation from gnomAD population data with clinical documentation output
**Current focus:** v1.5 Phase 25 — Monorepo Foundation & Core Extraction

---

## Current Position

**Milestone:** v1.5 Core Extraction & CLI
**Phase:** 25 of 29 (Monorepo Foundation & Core Extraction)
**Plan:** 3 of 5 in current phase
**Status:** Executing
**Last activity:** 2026-02-24 — Completed 25-03-PLAN.md (filters, calculations, templates, and utils extraction to core)

### Progress

```
v1.0 MVP:           [##########] 100% - SHIPPED 2026-01-19
v1.1 Release-Ready: [##########] 100% - SHIPPED 2026-01-19
v1.2 Sharing:       [##########] 100% - SHIPPED 2026-01-20
v1.3 Docs:          [##########] 100% - SHIPPED 2026-02-23 (14/14 plans)
v1.4 Discover:      [##########] 100% - SHIPPED 2026-02-23 (12/12 plans)
v1.5 Core & CLI:    [███░░░░░░░] ~15% - Phase 25 plan 3/5 complete
```

**Overall:** 86 plans complete across 24+ phases in 5 milestones.

---

## Performance Metrics

**Velocity:**
- Total plans completed: 86
- v1.5 plans completed: 3

---

## Accumulated Context

### Decisions

See PROJECT.md Key Decisions table for full history.

Recent decisions for v1.5:
- Monorepo with bun workspaces (packages/core, packages/cli, apps/web) — core logic reusable across CLI + web + tests
- tsdown v0.20.x for library bundling (tsup successor, pin exact version — pre-1.0)
- Calculation tests written alongside formula changes (not deferred to Phase 29)
- Phase 28 (Gene Configs) depends on Phase 26 (stable calculation API), not Phase 27 (CLI)
- tsdown entry points in packages/core added incrementally as modules are extracted (not declared upfront)
- packages/core tsconfig.json include must be ["src/**/*.ts", "src/**/*.json"] — composite project mode requires JSON files listed explicitly
- vitest `--passWithNoTests` in root script — prevents CI failures before Phase 29 test suite
- export-utils.ts stays in apps/web (uses import.meta.env.VITE_APP_VERSION — Vite-specific, not portable to neutral core)
- variant-display.ts placed in core/filters/ (co-located with variant-filters.ts it imports from)

### Pending Todos

None.

### Blockers/Concerns

- Phase 25 bun.lock resolved: text format confirmed working (migrated from package-lock.json)
- Phase 25 Vite alias resolved: `@gnomad-cf/core` regex alias works alongside `@/`
- Phase 26: Confirm gnomAD GraphQL response field name for homozygote count per variant per population before writing updated types
- Phase 27: gnomAD API rate limits undocumented — default `--concurrency 3` is empirical; make user-configurable

---

## Session Continuity

### Last Session

**Date:** 2026-02-24
**Completed:** 25-03-PLAN.md — filters, calculations, templates, and utils extracted to packages/core/src/, all @/ imports fixed to relative ESM paths, tsc and tsdown builds verified (8 subpath bundles)
**Status:** Phase 25 plan 3/5 complete, ready for plan 4

### Handoff Notes

v1.5 scope: monorepo extraction, HWE 2pq + homozygote exclusion + genetic prevalence, full CLI, gene configs, comprehensive test suite.

Phase order is dependency-driven: Core must exist before CLI or tests can be meaningful. Calculations must be correct before CLI ships them. Gene configs need stable core API. Full E2E validation last.

GitHub issues addressed: #1 (HWE 2pq), #2 (tests), #3 (homozygote exclusion), #7 (genetic prevalence), #14 (gene configs), #16 (monorepo).

Monorepo state after plan 25-03:
- `packages/core/src/types/` — 14 type files, fully extracted (no @/ imports)
- `packages/core/src/config/` — 8 files + help/ + templates/ subdirs, fully extracted
- `packages/core/src/queries/` — 5 query files, fully extracted
- `packages/core/src/filters/` — variant-filters.ts, variant-display.ts, fully extracted
- `packages/core/src/calculations/` — frequency-calc.ts, formatters.ts, fully extracted
- `packages/core/src/templates/` — template-renderer.ts, template-parser.ts, fully extracted
- `packages/core/src/utils/` — exclusion-url.ts, fully extracted
- `packages/core/tsdown.config.ts` — 8 entry points: index, types, config, queries, filters, calculations, templates, utils
- `packages/core/package.json` exports — auto-updated by tsdown with all 8 subpath exports
- `bun run build` — builds core (dist/ with 8 subpath bundles) then web, both verified
- Web app still uses @/ imports from apps/web/src/ (rewiring is Plan 25-04)
- `apps/web/src/utils/export-utils.ts` — left in web (uses import.meta.env.VITE_APP_VERSION)

App: https://gnomad-carrier-frequency.kidney-genetics.org/
Docs: https://gnomad-carrier-frequency.kidney-genetics.org/docs/

---

*State initialized: 2026-01-18*
*v1.0 shipped: 2026-01-19*
*v1.1 shipped: 2026-01-19*
*v1.2 shipped: 2026-01-20*
*v1.3 shipped: 2026-02-23*
*v1.4 shipped: 2026-02-23*
*v1.5 started: 2026-02-23*
*v1.5 roadmap: 2026-02-23*
*25-01 complete: 2026-02-24*
*25-02 complete: 2026-02-24*
*25-03 complete: 2026-02-24*
