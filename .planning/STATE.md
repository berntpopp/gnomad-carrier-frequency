# Project State: gnomAD Carrier Frequency Calculator

---

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-23)

**Core value:** Accurate recurrence risk calculation from gnomAD population data with clinical documentation output
**Current focus:** v1.5 Phase 27 — CLI Package (next)

---

## Current Position

**Milestone:** v1.5 Core Extraction & CLI
**Phase:** 26 of 29 (Calculation Improvements in Core) — COMPLETE
**Plan:** 5 of 5 in current phase
**Status:** Phase complete, verified
**Last activity:** 2026-02-24 — Phase 26 verified (5/5 must-haves passed)

### Progress

```
v1.0 MVP:           [##########] 100% - SHIPPED 2026-01-19
v1.1 Release-Ready: [##########] 100% - SHIPPED 2026-01-19
v1.2 Sharing:       [##########] 100% - SHIPPED 2026-01-20
v1.3 Docs:          [##########] 100% - SHIPPED 2026-02-23 (14/14 plans)
v1.4 Discover:      [##########] 100% - SHIPPED 2026-02-23 (12/12 plans)
v1.5 Core & CLI:    [██████░░░░] ~50% - Phase 26 complete (10/10 plans done in phases 25-26)
```

**Overall:** 93 plans complete across 26 phases in 5 milestones.

---

## Performance Metrics

**Velocity:**
- Total plans completed: 93
- v1.5 plans completed: 10

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

### Pending Todos

None.

### Blockers/Concerns

- Phase 27: gnomAD API rate limits undocumented — default `--concurrency 3` is empirical; make user-configurable

---

## Session Continuity

### Last Session

**Date:** 2026-02-24
**Completed:** Phase 26 — all 5 plans executed, verified (5/5 must-haves passed, 130 core tests passing)
**Status:** Phase 26 complete. Next: Phase 27 (CLI Package) or Phase 28 (Gene Config System)

### Handoff Notes

v1.5 scope: monorepo extraction, HWE 2pq + homozygote exclusion + genetic prevalence, full CLI, gene configs, comprehensive test suite.

Phase 26 delivered:
- packages/core/src/calculations/ — carrier-frequency.ts, homozygote-exclusion.ts, prevalence.ts (pure TS, 0 Vue deps)
- packages/core/src/types/calculations.ts — CalcConfig, CalcResult, FACTORY_CALC_DEFAULTS
- 130 core tests passing (43 golden-value calc tests + 55 variant filter tests + 32 template renderer tests)
- GraphQL query fetches ac_hom at all 4 levels
- useCalcStore Pinia store with localStorage persistence + URL state sync
- useCarrierFrequency composable reactively wired to CalcConfig
- FilterPanel: HWE toggle, hom exclusion toggle, penetrance slider
- StepResults: genetic/Bayesian prevalence display, warning chip, population table prevalence column
- Export metadata captures CalcConfig

Next phases:
- Phase 27 (CLI) depends on Phase 26 ✓
- Phase 28 (Gene Configs) depends on Phase 26 ✓ — can run in parallel with 27
- Phase 29 (Test Suite) depends on 25, 26, 27, 28

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
*26-01 complete: 2026-02-24*
*26-02 complete: 2026-02-24*
*26-03 complete: 2026-02-24*
*26-04 complete: 2026-02-24*
*26-05 complete: 2026-02-24*
*Phase 26 verified: 2026-02-24*
