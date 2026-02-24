# Project State: gnomAD Carrier Frequency Calculator

---

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-23)

**Core value:** Accurate recurrence risk calculation from gnomAD population data with clinical documentation output
**Current focus:** v1.5 Phase 27 — CLI Package (in progress)

---

## Current Position

**Milestone:** v1.5 Core Extraction & CLI
**Phase:** 27 of 29 (CLI Package) — In progress
**Plan:** 1 of 5 in current phase — COMPLETE
**Status:** 27-01 complete — CLI scaffold with Commander skeleton, shared types, and tsdown build
**Last activity:** 2026-02-24 — Completed 27-01-PLAN.md (CLI package scaffold)

### Progress

```
v1.0 MVP:           [##########] 100% - SHIPPED 2026-01-19
v1.1 Release-Ready: [##########] 100% - SHIPPED 2026-01-19
v1.2 Sharing:       [##########] 100% - SHIPPED 2026-01-20
v1.3 Docs:          [##########] 100% - SHIPPED 2026-02-23 (14/14 plans)
v1.4 Discover:      [##########] 100% - SHIPPED 2026-02-23 (12/12 plans)
v1.5 Core & CLI:    [██████░░░░] ~55% - Phase 27 Plan 1/5 complete
```

**Overall:** 89 plans complete across 26 phases in 5 milestones.

---

## Performance Metrics

**Velocity:**
- Total plans completed: 89
- v1.5 plans completed: 6

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
- Core client (packages/core/src/client/) uses fetch API — platform-neutral, no villus dependency; villus stays only in apps/web/src/api/client.ts
- JSON deep-path imports (@gnomad-cf/core/config/templates/de.json) work via Vite regex alias + tsconfig resolveJsonModule — no separate JSON export needed
- Root typecheck script must use `tsc --build packages/core && bun run --filter gnomad-cf-web typecheck` — plain `tsc --build` fails on .vue files
- GCR uses inclusion-exclusion product (1 - ∏(1-VCRi)), not sum, to avoid double-counting compound heterozygotes (26-01)
- Genetic prevalence always from raw q=SumAF (never derived from carrier frequency 2pq) to avoid compounding approximation errors (26-01)
- formatPrevalence uses en-US locale for thousands separator in ratio format (26-01)
- ac_hom is required (not optional) on all variant interfaces — gnomAD API always returns 0 when no homozygotes, never null (26-02)
- UrlStateSchema lives in @gnomad-cf/core/types (not web-only) — shared core type usable by CLI and web (26-02)
- URL boolean params use '0'/'1' string encoding for consistency with existing conflicting param pattern (26-02)
- aggregatePopulationFrequencies removed; replaced by aggregatePopulationFrequenciesWithConfig — CalcConfig applied once in aggregation (26-03)
- FilterPanel receives calcConfig prop + emits update:calcConfig — store access stays in StepResults, not FilterPanel (26-04)
- Penetrance slider operates in 0-100% integer space in UI; converts to 0-1 fraction before emit (26-04)
- Bayesian prevalence row displayed only when penetrance < 1 (26-04)
- CLI tsdown outputs dist/cli.mjs (not cli.js) on Windows with ESM — bin path must point to .mjs extension (27-01)
- CLI tsconfig is standalone (not extending root tsconfig.json) — root is references-only with no compilerOptions (27-01)
- CLI uses platform:node in tsdown (not neutral) — needs Node.js built-ins; dts:false (binary, not library) (27-01)
- p-limit chosen over p-queue for batch concurrency — simpler API sufficient for rate limiting gnomAD calls (27-01)
- Shared types (QueryResult, VariantDetail, QueryOptions) defined in Wave 1 (27-01) to prevent cross-plan deps in Wave 2 (27-01)

### Pending Todos

None.

### Blockers/Concerns

- Phase 27: gnomAD API rate limits undocumented — default `--concurrency 3` is empirical; make user-configurable (plans 27-02, 27-04)

---

## Session Continuity

### Last Session

**Date:** 2026-02-24
**Completed:** 27-01 — CLI package scaffold (Commander skeleton, tsdown build, shared types)
**Status:** Phase 27 Plan 1 complete. Next: Plan 2 (gene-query command) and Plan 3 (formatters) — Wave 2, runnable in parallel
**Resume file:** None

### Handoff Notes

v1.5 scope: monorepo extraction, HWE 2pq + homozygote exclusion + genetic prevalence, full CLI, gene configs, comprehensive test suite.

Phase 27 Plan 01 delivered:
- @gnomad-cf/cli workspace package with commander, @clack/prompts, p-limit
- tsdown build: dist/cli.mjs with #!/usr/bin/env node shebang
- gnomad-cf --version prints 1.5.0; gnomad-cf --help prints usage
- packages/cli/src/types.ts: QueryResult, VariantDetail, QueryOptions interfaces
- Root build:cli script and CLI added to main build chain
- bun install resolves all workspace + npm dependencies

Next plans in Phase 27:
- 27-02: gene-query command (imports types.ts, uses @gnomad-cf/core/client + filters + calculations)
- 27-03: formatters (table, JSON, CSV output; imports QueryResult)
- 27-04: batch command (multi-gene CSV input, p-limit concurrency)
- 27-05: integration + CI

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
*25-04 complete: 2026-02-24*
*25-05 complete: 2026-02-24*
*Phase 25 verified: 2026-02-24*
*27-01 complete: 2026-02-24*
