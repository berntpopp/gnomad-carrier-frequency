# Project State: gnomAD Carrier Frequency Calculator

---

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-23)

**Core value:** Accurate recurrence risk calculation from gnomAD population data with clinical documentation output
**Current focus:** v1.5 Phase 27 (CLI Package) — COMPLETE (7/7 plans) | Phase 28 (Gene Config System) — COMPLETE (4/4 plans)

---

## Current Position

**Milestone:** v1.5 Core Extraction & CLI
**Phase:** 27 of 29 (CLI Package) — COMPLETE | 28 of 29 (Gene Config System) — COMPLETE
**Plan:** 27-07 of 7 in phase 27 — COMPLETE | 28-04 of 4 in phase 28 — COMPLETE
**Status:** 27-07 complete — 72 CLI integration/unit tests (formatters, queryGene, parseGeneListFile, batch processing)
**Last activity:** 2026-02-24 — Completed 27-07-PLAN.md (CLI test suite)

### Progress

```
v1.0 MVP:           [##########] 100% - SHIPPED 2026-01-19
v1.1 Release-Ready: [##########] 100% - SHIPPED 2026-01-19
v1.2 Sharing:       [##########] 100% - SHIPPED 2026-01-20
v1.3 Docs:          [##########] 100% - SHIPPED 2026-02-23 (14/14 plans)
v1.4 Discover:      [##########] 100% - SHIPPED 2026-02-23 (12/12 plans)
v1.5 Core & CLI:    [██████████] ~95% - Phase 27 Plan 7/7 + Phase 28 Plan 4/4 complete (Phase 29 remaining)
```

**Overall:** 100 plans complete across 27 phases in 5 milestones.

---

## Performance Metrics

**Velocity:**
- Total plans completed: 89
- v1.5 plans completed: 6

---

## Accumulated Context

### Decisions

See PROJECT.md Key Decisions table for full history.

Recent decisions for v1.5 (continued):
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
- configs/genes/ placed at repo root — neutral location accessible to CLI, web, and scripts without cross-package imports (28-02)
- ClinVar star threshold 2 for Classic CF (expert panel level), 1 for CFTR-RD/HEXA/GJB2 — reflects clinical evidence hierarchy (28-02)
- CFTR-RD penetrance 0.03 — empirically supported reduced penetrance for CFTR-related disorders (28-02)
- Bun native TS execution for CI scripts — validation script imports schema source directly, no build step (28-02)
- CLI-13 stub: --config flag prints deferral message to stderr and continues with defaults (not exit 1) (27-04)
- gnomadVersion CLI flag remapped to 'version' key before mergeConfig — matches mergeConfig expected key (27-04)
- filterConfig overrides applied post-mergeConfig for --lof/--no-lof — ensures CLI flags win over user config (27-04)
- parseGeneListFile exported as standalone function (not inline in action handler) — enables Plan 07 unit tests without Commander machinery (27-05)
- JSON auto-detection in parseGeneListFile: SyntaxError falls back to plain text; structural errors re-thrown with Zod message (27-05)
- Batch exit codes: 0 all success, 1 partial failure (some genes skipped), 2 fail-fast triggered or fatal error (27-05)
- Interactive wizard gene input: p.text for initial input, searchGenes() for typeahead, p.autocomplete for disambiguation — more robust than live-async options for slow networks (27-06)
- Multi-population client-side filter in interactive: queryGene with undefined population (all), filter result.populations after — avoids multiple API calls (27-06)
- buildEquivalentCommand omits flags matching defaults — produces minimal reproducible CLI command from wizard selections (27-06)
- No-args TTY guard checks process.argv.length === 2 before parseAsync; pushes 'interactive' on TTY, prints help on non-TTY (27-06)
- configs/CONTRIBUTING.md is the canonical contributing guide; VitePress docs page mirrors it with VitePress containers (28-04)
- OMIM gene vs phenotype ID disambiguation given dedicated section with table and danger callout — most common contributor error (28-04)
- withRetry mocked in CLI tests via vi.mock('../utils/retry.js') to bypass retry delays; mock calls fn() directly (27-07)
- Batch processing tests simulate pLimit+Promise.all pattern directly — import parseGeneListFile as standalone function, no Commander machinery (27-07)
- CLI vitest.config.ts follows same pattern as packages/core — name, environment: node, include pattern (27-07)

### Pending Todos

None.

### Blockers/Concerns

- Phase 27: gnomAD API rate limits undocumented — default `--concurrency 3` is empirical; make user-configurable (plans 27-02, 27-04)

---

## Session Continuity

### Last Session

**Date:** 2026-02-24
**Completed:** 27-07 — CLI test suite: 72 tests across 3 files (formatters.test.ts, query.test.ts, batch.test.ts), CFTR mock fixture, vitest config for CLI package, root bun run test now runs 226 tests (core + CLI)
**Status:** Phase 27 Plan 7 complete. All 7 plans in Phase 27 complete. Phase 28 also complete (4/4). v1.5 only Phase 29 (comprehensive test suite) remains.
**Resume file:** None

### Handoff Notes

v1.5 scope: monorepo extraction, HWE 2pq + homozygote exclusion + genetic prevalence, full CLI, gene configs, comprehensive test suite.

Phase 28 Plan 04 delivered:
- configs/CONTRIBUTING.md: 12-section comprehensive guide for clinical geneticists
  - Schema reference: all fields with type, required/optional, examples
  - OMIM gene vs phenotype ID disambiguation table
  - Complete examples: HEXA (simple), CFTR (multi-profile), PAH (minimal)
  - CI validation table, FAQ, resources
- apps/web/docs/guide/contributing-gene-configs.md: VitePress mirror with containers and collapsible FAQ
- apps/web/docs/.vitepress/config.ts: Contributing Gene Configs in /guide/ sidebar

Phase 27 CLI Package complete (7/7 plans):
- 27-01: Setup (tsdown, Commander scaffold, types, p-limit)
- 27-02: Calculation pipeline (gene-query.ts, retry, rate limiting)
- 27-03: Output formatters (text, JSON, TSV, clinical)
- 27-04: Query command (single-gene lookup, all flags)
- 27-05: Batch command (parseGeneListFile, concurrency, fail-fast)
- 27-06: Interactive command (wizard, searchGenes, buildEquivalentCommand)
- 27-07: Test suite (72 tests: formatters, queryGene, parseGeneListFile, batch processing)

Phase 28 Gene Config System complete (4/4 plans):
- 28-01: GeneConfigSchema (Zod v4), loader, tests
- 28-02: Seed gene configs (CFTR, HEXA, GJB2) + CI validation script
- 28-03: Web auto-apply (useGeneConfig composable, wizard integration)
- 28-04: Contributing guide (configs/CONTRIBUTING.md + VitePress page)

Remaining in v1.5:
- Phase 29: Comprehensive test suite

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
*28-02 complete: 2026-02-24*
*27-04 complete: 2026-02-24*
*27-05 complete: 2026-02-24*
*27-06 complete: 2026-02-24*
*28-04 complete: 2026-02-24*
*27-07 complete: 2026-02-24*
*Phase 27 verified: 2026-02-24*
