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
**Plan:** 1 of 5 in current phase
**Status:** Executing
**Last activity:** 2026-02-24 — Completed 25-01-PLAN.md (monorepo scaffold + web app relocation)

### Progress

```
v1.0 MVP:           [##########] 100% - SHIPPED 2026-01-19
v1.1 Release-Ready: [##########] 100% - SHIPPED 2026-01-19
v1.2 Sharing:       [##########] 100% - SHIPPED 2026-01-20
v1.3 Docs:          [##########] 100% - SHIPPED 2026-02-23 (14/14 plans)
v1.4 Discover:      [##########] 100% - SHIPPED 2026-02-23 (12/12 plans)
v1.5 Core & CLI:    [█░░░░░░░░░]  ~5% - Phase 25 plan 1/5 complete
```

**Overall:** 84 plans complete across 24+ phases in 5 milestones.

---

## Performance Metrics

**Velocity:**
- Total plans completed: 84
- v1.5 plans completed: 1

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
- vitest `--passWithNoTests` in root script — prevents CI failures before Phase 29 test suite

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
**Completed:** 25-01-PLAN.md — bun workspaces monorepo scaffold, core package created, web app moved to apps/web/, builds verified
**Status:** Phase 25 plan 1/5 complete, ready for plan 2

### Handoff Notes

v1.5 scope: monorepo extraction, HWE 2pq + homozygote exclusion + genetic prevalence, full CLI, gene configs, comprehensive test suite.

Phase order is dependency-driven: Core must exist before CLI or tests can be meaningful. Calculations must be correct before CLI ships them. Gene configs need stable core API. Full E2E validation last.

GitHub issues addressed: #1 (HWE 2pq), #2 (tests), #3 (homozygote exclusion), #7 (genetic prevalence), #14 (gene configs), #16 (monorepo).

Monorepo state after plan 25-01:
- `packages/core/src/index.ts` — empty barrel, ready for module extraction
- `apps/web/` — full web app, builds and serves correctly
- `bun run build` — builds core then web, verified
- `bun run test` — vitest workspace config ready, 0 tests (passWithNoTests)

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
