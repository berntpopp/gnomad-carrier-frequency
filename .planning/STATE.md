# Project State: gnomAD Carrier Frequency Calculator

---

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-23)

**Core value:** Accurate recurrence risk calculation from gnomAD population data with clinical documentation output
**Current focus:** v1.5 Phase 28 — Gene Config System (in progress)

---

## Current Position

**Milestone:** v1.5 Core Extraction & CLI
**Phase:** 28 of 29 (Gene Config System) — In progress
**Plan:** 1 of 4 in current phase — COMPLETE
**Status:** 28-01 complete — GeneConfigSchema (Zod v4), platform-neutral loader, @gnomad-cf/core/gene-config subpath, 24 passing tests
**Last activity:** 2026-02-24 — Completed 28-01-PLAN.md (gene-config module)

### Progress

```
v1.0 MVP:           [##########] 100% - SHIPPED 2026-01-19
v1.1 Release-Ready: [##########] 100% - SHIPPED 2026-01-19
v1.2 Sharing:       [##########] 100% - SHIPPED 2026-01-20
v1.3 Docs:          [##########] 100% - SHIPPED 2026-02-23 (14/14 plans)
v1.4 Discover:      [##########] 100% - SHIPPED 2026-02-23 (12/12 plans)
v1.5 Core & CLI:    [████████░░] ~70% - Phase 28 Plan 1/4 complete
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
- computeGlobalStats() applies same HWE/simplified/VCR branch logic as aggregatePopulationFrequenciesWithConfig — consistent global stats (27-02)
- 429 rate limit errors not counted toward retry limit — dedicated always-retry path separate from transient 5xx retries (27-02)
- Genetic prevalence always q^2 from raw globalSumAF — matches core convention, never derived from carrier frequency (27-02)
- zod not added to CLI package.json — already a hoisted workspace dep from packages/core (27-02)
- loadTemplateContent added to @gnomad-cf/core/templates (not CLI-local) — reusable by any consumer; node: built-ins are external in neutral core build, resolved by Node.js at runtime (27-03)
- formatJson pretty:true by default — CLI output is human-friendly; machine processing can use jq (27-03)
- Population Bayesian prevalence computed inline in formatters as geneticPrevalence * penetrance — not stored separately in PopulationFrequency (27-03)
- Clinical formatter defaults: carrier perspective, * gender style, neutral patient sex (27-03)
- FilterConfigOverrideSchema defined independently in schema.ts — avoids circular imports between tsdown entry points (28-01)
- Gene config registry keys stored uppercase; loadGeneConfig normalizes with toUpperCase() for case-insensitive lookup (28-01)
- Platform loader uses module-level variable injection — simple and sufficient for CLI fs use (28-01)

### Pending Todos

None.

### Blockers/Concerns

- Phase 27: gnomAD API rate limits undocumented — default `--concurrency 3` is empirical; make user-configurable (plans 27-02, 27-04)

---

## Session Continuity

### Last Session

**Date:** 2026-02-24
**Completed:** 28-01 — GeneConfigSchema (Zod v4), platform-neutral loader with registry + injectable fs loader, @gnomad-cf/core/gene-config subpath, 24 passing unit tests
**Status:** Phase 28 Plan 1 complete. Next: Plan 2 (seed gene configs CFTR/HEXA), Plan 3 (web auto-apply), Plan 4 (CI validation)
**Resume file:** None

### Handoff Notes

v1.5 scope: monorepo extraction, HWE 2pq + homozygote exclusion + genetic prevalence, full CLI, gene configs, comprehensive test suite.

Phase 28 Plan 01 delivered:
- packages/core/src/gene-config/schema.ts: GeneConfigSchema, ConditionProfileSchema, DiseaseIdentifierSchema, FilterConfigOverrideSchema (Zod v4)
- packages/core/src/gene-config/loader.ts: registry Map, registerGeneConfig, setPlatformLoader, loadGeneConfig (case-insensitive), getRegisteredGenes
- packages/core/src/gene-config/index.ts: barrel re-export
- @gnomad-cf/core/gene-config subpath: tsdown entry + package.json exports map + dist/gene-config.js verified
- 24 passing unit tests covering all constraints and loader behaviors

Next plans in Phase 28:
- 28-02: Seed gene config JSON files (CFTR, HEXA) registered via registerGeneConfig
- 28-03: Web auto-apply — load gene config in wizard, pre-populate filter overrides
- 28-04: CI validation script using GeneConfigSchema.safeParse

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
*27-02 complete: 2026-02-24*
*27-03 complete: 2026-02-24*
*28-01 complete: 2026-02-24*
