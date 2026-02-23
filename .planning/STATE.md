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
**Plan:** 0 of TBD in current phase
**Status:** Ready to plan
**Last activity:** 2026-02-23 — v1.5 roadmap created (5 phases, 54 requirements mapped)

### Progress

```
v1.0 MVP:           [##########] 100% - SHIPPED 2026-01-19
v1.1 Release-Ready: [##########] 100% - SHIPPED 2026-01-19
v1.2 Sharing:       [##########] 100% - SHIPPED 2026-01-20
v1.3 Docs:          [##########] 100% - SHIPPED 2026-02-23 (14/14 plans)
v1.4 Discover:      [##########] 100% - SHIPPED 2026-02-23 (12/12 plans)
v1.5 Core & CLI:    [░░░░░░░░░░]   0% - Phase 25 ready to plan
```

**Overall:** 83 plans complete across 24 phases in 5 milestones. v1.5 starts at Phase 25.

---

## Performance Metrics

**Velocity:**
- Total plans completed: 83
- v1.5 plans completed: 0

---

## Accumulated Context

### Decisions

See PROJECT.md Key Decisions table for full history.

Recent decisions for v1.5:
- Monorepo with bun workspaces (packages/core, packages/cli, apps/web) — core logic reusable across CLI + web + tests
- tsdown v0.20.x for library bundling (tsup successor, pin exact version — pre-1.0)
- Calculation tests written alongside formula changes (not deferred to Phase 29)
- Phase 28 (Gene Configs) depends on Phase 26 (stable calculation API), not Phase 27 (CLI)

### Pending Todos

None.

### Blockers/Concerns

- Phase 25: Verify `bun.lock` text format vs binary `bun.lockb` on day one — migrate if binary
- Phase 25: Empirically verify Vite `@gnomad-cf/core` dev alias resolves alongside `@/` with trailing slash
- Phase 26: Confirm gnomAD GraphQL response field name for homozygote count per variant per population before writing updated types
- Phase 27: gnomAD API rate limits undocumented — default `--concurrency 3` is empirical; make user-configurable

---

## Session Continuity

### Last Session

**Date:** 2026-02-23
**Completed:** v1.5 roadmap created — 5 phases (25-29), 54 requirements mapped, STATE.md updated
**Status:** Ready to plan Phase 25

### Handoff Notes

v1.5 scope: monorepo extraction, HWE 2pq + homozygote exclusion + genetic prevalence, full CLI, gene configs, comprehensive test suite.

Phase order is dependency-driven: Core must exist before CLI or tests can be meaningful. Calculations must be correct before CLI ships them. Gene configs need stable core API. Full E2E validation last.

GitHub issues addressed: #1 (HWE 2pq), #2 (tests), #3 (homozygote exclusion), #7 (genetic prevalence), #14 (gene configs), #16 (monorepo).

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
