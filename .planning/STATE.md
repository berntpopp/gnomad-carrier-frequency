# Project State: gnomAD Carrier Frequency Calculator

---

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-23)

**Core value:** Accurate recurrence risk calculation from gnomAD population data with clinical documentation output
**Current focus:** v1.5 Phase 29 (Test Suite Completion) — All gap closure plans complete (29-06 + 29-07)

---

## Current Position

**Milestone:** v1.5 Core Extraction & CLI
**Phase:** 29 of 29 (Test Suite Completion) — FULLY COMPLETE (7/7 plans including gap closures)
**Plan:** 29-07 of 7 in phase 29 — COMPLETE
**Status:** All gaps closed. Coverage thresholds enforced (vitest) + warn-only in CI (continue-on-error). 380+ tests.
**Last activity:** 2026-02-24 — Completed 29-07: Real vitest coverage thresholds + CI continue-on-error (Gap 2 closed)

### Progress

```
v1.0 MVP:           [##########] 100% - SHIPPED 2026-01-19
v1.1 Release-Ready: [##########] 100% - SHIPPED 2026-01-19
v1.2 Sharing:       [##########] 100% - SHIPPED 2026-01-20
v1.3 Docs:          [##########] 100% - SHIPPED 2026-02-23 (14/14 plans)
v1.4 Discover:      [##########] 100% - SHIPPED 2026-02-23 (12/12 plans)
v1.5 Core & CLI:    [##########] 100% - Phase 27 7/7 + Phase 28 4/4 + Phase 29 7/7 COMPLETE (incl. gap closure 29-06 + 29-07)
```

**Overall:** 109 plans complete across 29 phases in 5 milestones.

---

## Performance Metrics

**Velocity:**
- Total plans completed: 106
- v1.5 plans completed: 23

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
- happy-dom chosen over jsdom for apps/web tests — jsdom@28.1.0 ships html-encoding-sniffer@6.0.0 which require()s @exodus/bytes ESM, causing ERR_REQUIRE_ESM crash (29-01)
- Minimal createVuetify() in test setup (no wildcard component import) — importing vuetify/components wholesale triggers ~200 CSS imports that vitest Node runner cannot handle (29-01)
- Store unit tests use real createPinia() with setActivePinia in beforeEach — isolation without persistence plugin, not createTestingPinia (29-01)
- virtual:pwa-register mocked via vitest resolve alias to test/mocks/virtual-pwa-register.ts — Vite plugin virtual module not available in test env (29-02)
- createTestingPinia requires createSpy: vi.fn — auto-detection of vi.fn fails without explicit config (29-02)
- Vuetify disabled state: btn.attributes('disabled') returns "false" string when enabled (not undefined) — check === '' || === 'true' for disabled (29-02)
- Composable mocks must return real Vue ref() not plain objects — Vue watch() requires ref/reactive/getter, plain {value:x} causes Invalid watch source warning (29-02)
- vi.mock('vuetify', ...) with factory: useDisplay requires display injection not provided by minimal createVuetify() in test setup — override just useDisplay, spread rest of actual module (29-02)
- page.route('https://gnomad.broadinstitute.org/api') exact URL — glob ** prefix/suffix unnecessary for exact match (29-04)
- Vuetify stub rendering in happy-dom: v-btn inside v-tooltip activator slots not rendered — test via html() string contains on tooltip text, not data-testid (29-03)
- useGeneConfig mock must return Vue ref() objects not plain {value: false} — template v-if needs real reactive ref for auto-unwrap to work (29-03)
- TemplateEditor requires createTestingPinia stubActions: false — getEffectiveTemplate() is a store action called from computed; stub returns undefined which crashes parseTemplate() (29-03)
- DisclaimerBanner is persistent v-dialog; dismissDisclaimer() helper required before any page interaction in E2E tests (29-04)
- v-autocomplete data-testid is on outer div wrapper; use .locator('input') to target actual <input> element (29-04)
- gnomAD gene search returns CFTR, CFTRP1, CFTRP2 etc.; use .first() + regex /^CFTR\b/ to avoid strict mode violation (29-04)
- StepFrequency success alert text: "Carrier frequency calculated from gnomAD data." (verified from source) (29-04)
- Coverage thresholds at 0 in vitest (warn-only) — advisory targets 90%/80%/40% in comments and CI summary step (29-05)
- Vitest line-coverage thresholds activated (core: 90, CLI: 80, web: 40) + CI continue-on-error for warn-only behavior (29-07)
- Lines-only threshold strategy — functions/branches/statements at 0 to avoid false positives on untargeted metrics (29-07)
- E2E gated to pull_request events targeting main — avoids playwright install overhead on every push (29-05)
- playwright.config.ts uses isCI flag to switch between preview:4173 in CI and dev:5173 locally (29-05)
- tests.yml is additive to ci.yml — tests-only workflow, ci.yml keeps lint/typecheck/build (29-05)
- History restore E2E: stronger approach (reload page after Step 4 then restore) more convincingly proves cross-page-load persistence (29-06)
- Route handlers re-registered after page.goto() — each navigation creates new interception context (29-06)

### Pending Todos

None.

### Blockers/Concerns

- Phase 27: gnomAD API rate limits undocumented — default `--concurrency 3` is empirical; make user-configurable (plans 27-02, 27-04)

---

## Session Continuity

### Last Session

**Date:** 2026-02-24
**Completed:** Plan 29-07 — Real vitest coverage thresholds (core: 90, CLI: 80, web: 40) + CI continue-on-error. Gap 2 from 29-VERIFICATION.md closed.
**Status:** ALL gap closure plans complete. Both VERIFICATION.md gaps closed. Phase 29 fully done. v1.5 milestone complete.
**Resume file:** None

### Handoff Notes

v1.5 scope: monorepo extraction, HWE 2pq + homozygote exclusion + genetic prevalence, full CLI, gene configs, comprehensive test suite.

E2E verification confirmed:
- App loads, renders Vuetify + stepper, zero console errors
- Gene search + selection works (CFTR, HEXA, GJB2, PKD1)
- Full 4-step wizard flow: gene → status → freq → results with live gnomAD API
- Gene config chip visible on Step 4 for config genes (CFTR, HEXA, GJB2)
- CFTR profile dropdown: Classic CF (100% penetrance) + CFTR-RD (~3% penetrance)
- Profile switching updates penetrance slider in real time
- Chip dismiss resets filters to defaults
- No state bleed between config and non-config genes
- Clinical text generated with carrier frequency data

Phase 27 CLI Package complete (7/7 plans)
Phase 28 Gene Config System complete (4/4 plans)

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
*28-03 complete: 2026-02-24*
*Phase 28 E2E verified: 2026-02-24*
*29-01 complete: 2026-02-24*
*29-04 complete: 2026-02-24*
*29-03 complete: 2026-02-24*
*29-02 complete: 2026-02-24*
*29-05 complete: 2026-02-24*
*Phase 29 complete: 2026-02-24*
*v1.5 milestone complete: 2026-02-24*
*29-06 complete: 2026-02-24*
*29-07 complete: 2026-02-24*
*Phase 29 gap closure complete: 2026-02-24*
