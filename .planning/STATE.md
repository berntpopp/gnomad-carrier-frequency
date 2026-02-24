# Project State: gnomAD Carrier Frequency Calculator

---

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-23)

**Core value:** Accurate recurrence risk calculation from gnomAD population data with clinical documentation output
**Current focus:** v1.5 Phase 26 — Calculation Improvements in Core

---

## Current Position

**Milestone:** v1.5 Core Extraction & CLI
**Phase:** 26 of 29 (Calculation Improvements in Core)
**Plan:** 2 of 5 in current phase (in progress)
**Status:** Executing
**Last activity:** 2026-02-24 — Completed 26-02-PLAN.md (ac_hom in GraphQL/types, CalcConfig store, URL state extension)

### Progress

```
v1.0 MVP:           [##########] 100% - SHIPPED 2026-01-19
v1.1 Release-Ready: [##########] 100% - SHIPPED 2026-01-19
v1.2 Sharing:       [##########] 100% - SHIPPED 2026-01-20
v1.3 Docs:          [##########] 100% - SHIPPED 2026-02-23 (14/14 plans)
v1.4 Discover:      [##########] 100% - SHIPPED 2026-02-23 (12/12 plans)
v1.5 Core & CLI:    [████░░░░░░] ~30% - Phase 26 plan 2/5 in progress
```

**Overall:** 88 plans complete across 26+ phases in 5 milestones.

---

## Performance Metrics

**Velocity:**
- Total plans completed: 86
- v1.5 plans completed: 4

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

### Pending Todos

None.

### Blockers/Concerns

- Phase 25 bun.lock resolved: text format confirmed working (migrated from package-lock.json)
- Phase 25 Vite alias resolved: `@gnomad-cf/core` regex alias works alongside `@/`
- Phase 26: ac_hom confirmed as gnomAD field name (26-02 resolved this concern)
- Phase 27: gnomAD API rate limits undocumented — default `--concurrency 3` is empirical; make user-configurable

---

## Session Continuity

### Last Session

**Date:** 2026-02-24
**Completed:** 26-02-PLAN.md — ac_hom added to GraphQL query and types; CalcConfig Pinia store created; URL state extended with calc params
**Status:** Phase 26 plan 2/5 complete. Plans 3-5 remain (calculation composable, UI controls, tests)

### Handoff Notes

v1.5 scope: monorepo extraction, HWE 2pq + homozygote exclusion + genetic prevalence, full CLI, gene configs, comprehensive test suite.

Phase order is dependency-driven: Core must exist before CLI or tests can be meaningful. Calculations must be correct before CLI ships them. Gene configs need stable core API. Full E2E validation last.

GitHub issues addressed: #1 (HWE 2pq), #2 (tests), #3 (homozygote exclusion), #7 (genetic prevalence), #14 (gene configs), #16 (monorepo).

Monorepo state after plan 25-04:
- `packages/core/src/types/` — 14 type files, fully extracted
- `packages/core/src/config/` — 8 files + help/ + templates/ subdirs, fully extracted
- `packages/core/src/queries/` — 5 query files, fully extracted (+ GENE_DETAILS_QUERY, GeneDetailsResponse exported)
- `packages/core/src/filters/` — variant-filters.ts, variant-display.ts, fully extracted
- `packages/core/src/calculations/` — frequency-calc.ts, formatters.ts, fully extracted
- `packages/core/src/templates/` — template-renderer.ts, template-parser.ts, fully extracted
- `packages/core/src/utils/` — exclusion-url.ts, fully extracted
- `packages/core/src/client/` — index.ts with executeGraphQLQuery (fetch-based, platform-neutral)
- `packages/core/tsdown.config.ts` — 9 entry points: index, types, config, queries, filters, calculations, templates, utils, client
- `packages/core/package.json` exports — auto-updated by tsdown with all 9 subpath exports
- `apps/web/src/` — Vue-specific code only: composables, stores, components, api/client.ts (villus), utils/export-utils.ts
- All 12 composables, 5 stores, 15+ components rewired to @gnomad-cf/core/*
- `bun run build` — builds core (dist/ with 9 subpath bundles) then web, both verified
- `vue-tsc --noEmit` — passes with zero errors

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
*26-01 complete: 2026-02-24*
*26-02 complete: 2026-02-24*
