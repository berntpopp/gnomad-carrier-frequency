# Project Research Summary

**Project:** gnomAD Carrier Frequency Calculator — v1.5 Core Extraction & CLI
**Domain:** TypeScript monorepo extraction, CLI tooling, bioinformatics calculation accuracy
**Researched:** 2026-02-23
**Confidence:** HIGH

## Executive Summary

The v1.5 milestone converts an existing Vue 3 SPA into a bun workspaces monorepo with three packages: `packages/core` (pure TypeScript calculation engine), `packages/cli` (CLI consumer), and `apps/web` (the existing web app). The central insight from direct codebase analysis is that the extraction seam is already clean: every utility in `src/utils/` and `src/api/queries/` has zero Vue imports. The composables are thin reactive wrappers over pure functions. This means the bulk of the extraction is mechanical import-path rewriting, not logic refactoring. The deployed GitHub Pages app must not break — and it will not, because `apps/web` source is structurally unchanged; only its import paths update from `@/utils/...` to `@gnomad-cf/core`.

The recommended approach is: set up bun workspaces first, move pure utilities to `packages/core`, update web app imports to `@gnomad-cf/core`, then build the CLI as a pure consumer of core. Calculation improvements (HWE 2pq, homozygote exclusion, genetic prevalence q²) should be implemented directly in core during extraction and validated against published reference values before any further work. The full test suite is built on top of the stabilized core package — testing pure functions first, then composable wrappers, then CLI integration, then Playwright E2E.

The primary risk is violation of the extraction boundary: accidentally pulling Vue reactivity, villus, or Pinia into the core package. Pitfalls research identifies six specific patterns that cause this — singleton composables, `@/` alias persistence, villus `useQuery` calls, Pinia `localStorage` dependency, TypeScript `as Type` assertions on JSON, and bun `--filter` install misdirection. All six are preventable with conventions established before any code moves. The secondary risk is the GitHub Pages deploy breaking due to lockfile staleness or changed artifact path in `deploy.yml`. Both are mitigated by updating the workflow as the first task of the monorepo setup phase.

## Key Findings

### Recommended Stack

The stack for v1.5 builds entirely on existing tooling with targeted additions. Bun 1.3.9 (already in use) provides native workspace support via `--filter` and `workspace:*` protocol — no Turborepo or Nx needed for a three-package monorepo. `tsdown` v0.20.x becomes the library bundler for `packages/core` and `packages/cli`; it is the actively-maintained successor to the abandoned `tsup`, built on Rolldown by the same team behind Vite. Vitest 4.0.18 becomes the unified test runner across all packages using the `projects` configuration. Commander v14.0.3 (TypeScript types included) handles the CLI framework; `@clack/prompts` v1.0.1 provides interactive terminal UX for batch mode.

**Core technologies:**
- **bun workspaces (native):** monorepo orchestration — no additional tooling for 3 packages; `--filter` covers all use cases; `workspace:*` links packages via symlinks
- **tsdown v0.20.x:** library bundler for core and cli — tsup successor, Rolldown-based, same config API, ESM-only output sufficient for bun and Vite consumers
- **Vitest 4.0.18:** unified test runner — `projects` config discovers all packages from root; `node` environment for core/cli; `jsdom` for web
- **commander v14.0.3:** CLI framework — most-adopted Node CLI library, built-in TypeScript types, works identically under bun runtime
- **@clack/prompts v1.0.1:** interactive terminal prompts — ESM-first, lightweight, fresher than inquirer; for batch mode interactive flow
- **Zod v4.3.5 (existing):** gene config schema validation — already installed; provides both TypeScript types and runtime validation; no AJV needed
- **js-yaml v4.1.0:** YAML gene config parsing — lightweight, standard; enables human-readable community config files
- **@vue/test-utils v2.4.6:** Vue component testing — official library, Vitest-native integration

See `.planning/research/STACK.md` for the full version matrix, alternatives analysis, and installation commands.

### Expected Features

The v1.5 milestone has a clearly defined MVP verified against peer-reviewed literature (Guo et al. 2022 npj Genomic Medicine, Kandolin et al. 2024 AJMG, Genetics in Medicine 2024). The existing `2 × Σ(AF)` formula is a valid approximation for rare alleles but diverges meaningfully from the clinically-correct formula for common variants like CFTR ΔF508 (2% overestimate at q≈0.02). Published pipelines use homozygote exclusion (VCR = (AC - 2×Hom) / (AN/2)) and inclusion-exclusion for multi-variant genes (GCR = 1 - Π(1 - VCRᵢ)). These are table-stakes corrections for a clinical-grade tool.

**Must have (table stakes):**
- **HWE 2pq carrier frequency** — published gnomAD pipelines use 2pq, not 2q; 2% accuracy improvement for common variants like CFTR
- **Homozygote exclusion** — VCR formula per variant, inclusion-exclusion GCR per gene; verified against npj Genomic Medicine 2022 pipeline
- **Genetic prevalence q²** — GeniE (Broad/gnomAD, 2024) uses this as primary output; expected by clinical users
- **Monorepo restructure** — bun workspaces with `packages/core`, `packages/cli`, `apps/web`; prerequisite for CLI and test suite
- **CLI: single gene mode** — `gnomad-cf CFTR --population nfe --format json`; table stakes for any bioinformatics tool
- **CLI: batch mode** — `gnomad-cf --batch genes.json`; primary use case for research users processing gene panels
- **Gene config schema + 3-5 initial configs** — CFTR, SMN1, HEXA, PAH; validates schema design against real clinical use
- **Core unit tests** — reference values from CFTR/SMN1/HEXA literature; no test suite currently exists

**Should have (competitive):**
- **Homozygote count pathogenicity filter** — Hom >= 10 threshold flags likely non-pathogenic variants; differentiator vs. GeniE
- **Bayesian prevalence (penetrance-adjusted)** — q² × penetrance for partial-penetrance conditions (HCM genes, CFTR mild alleles)
- **At-risk couple frequency** — CF² display; standard in carrier screening reports, absent from GeniE
- **Vue component tests** — frequency display, variant table; needed for post-extraction regression confidence
- **Playwright E2E** — wizard completion flow; validates web app is unchanged after monorepo restructure

**Defer to v1.6+:**
- X-linked recessive calculation (different formula, different clinical interpretation, different scope)
- npm registry publishing (premature; GitHub-based consumption sufficient during active development)
- PDF export, interactive TUI, VCF file upload, Bayesian residual risk for negative carrier test

See `.planning/research/FEATURES.md` for the full competitor analysis, reference values table, and build-order dependency graph.

### Architecture Approach

The monorepo architecture is justified by a clean extraction boundary confirmed through direct source-code analysis. Every file in `src/utils/` (`frequency-calc.ts`, `variant-filters.ts`, `template-renderer.ts`, `template-parser.ts`) and `src/api/queries/` has zero Vue imports. Every composable is a thin Vue reactive wrapper over these pure functions. The extraction is therefore import-path rewriting, not refactoring. The `packages/core` barrel exports all public types and functions; the web app replaces `@/utils/...`, `@/types/...`, and `@/config/...` with `@gnomad-cf/core`; the CLI calls core functions imperatively with plain `fetch` replacing villus. The deployed artifact (`apps/web/dist`) is unchanged except its import source.

**Major components:**
1. **`packages/core`** — pure TypeScript; `calculations/`, `filters/`, `text/`, `api/` (plain fetch), `config/`, `types/`; zero Vue/Pinia/villus; built with tsdown; tested with Vitest in `node` environment
2. **`apps/web`** — Vue 3 + Vuetify + Pinia; composables become thin wrappers importing from `@gnomad-cf/core`; all `.vue` files, Pinia stores, and villus client are entirely unchanged
3. **`packages/cli`** — commander + @clack/prompts; calls core functions imperatively; accepts gene symbols, outputs JSON/TSV/text to stdout; no Vue dependency whatsoever
4. **`packages/core/src/api/gnomad-fetch.ts`** — new file only: plain `fetch` wrapper for gene variants and search, modeling the existing `useClinvarSubmissions.ts` pattern which already uses native fetch (zero villus dependency)

See `.planning/research/ARCHITECTURE.md` for the complete 25-file migration plan with exact destination paths, import changes, and a 10-step implementation order.

### Critical Pitfalls

1. **Singleton composables carry Vue into core** — `useCarrierFrequency`, `useExclusionState`, `useWizard`, `useGeneSearch` all use module-level reactive state (`let instance`, `reactive({})`). Extract only pure functions from `src/utils/`; composables stay in `apps/web`. Warning sign: `import { ref, computed } from 'vue'` anywhere in `packages/core/`.

2. **`@/` alias breaks in workspace packages** — the alias is Vite-scoped to `apps/web/src/`. Every file moved to `packages/core/` must have its `@/` imports rewritten to relative paths before extraction. Never define `@/` in core's tsconfig. Use trailing slash in the Vite alias (`'@/':`) to prevent partial matches against `@gnomad-cf/core`.

3. **`villus useQuery` requires a mounted Vue app** — the CLI has no Vue context; `useQuery()` throws at runtime with "Could not resolve client". The CLI must use plain `fetch()` with shared GraphQL query string constants from core. The pattern already exists: `useClinvarSubmissions.ts` uses native fetch with zero villus dependency.

4. **Pinia `localStorage` crash in CLI** — `useCarrierFrequency` reads from `useFilterStore` (Pinia + persisted state). Any CLI code path that touches a Pinia store crashes with `localStorage is not defined`. Keep all Pinia stores in `apps/web`; CLI accepts config via flags, not stores.

5. **`bun add --filter` installs to root** — bun issue #18195 confirms `--filter` for package installation is broken in 1.3.x; dependencies land in root `package.json`. Always use `bun add --cwd packages/core zod`. Document in contributing guide immediately.

6. **`bun install --frozen-lockfile` CI failure** — the deploy workflow uses `--frozen-lockfile`. Adding workspace packages changes `bun.lock`. Always commit the updated lockfile alongside any `package.json` changes. Migrate from `bun.lockb` (binary) to `bun.lock` (text) on day one.

7. **HWE formula change without golden-value tests** — the existing `2 × Σ(AF)` is an intentional approximation, not a bug. Any change to `calculateCarrierFrequency` without prior golden-value tests (CFTR NFE: expected 2pq≈0.0431; q²≈0.00048) risks silent regression in the deployed app.

See `.planning/research/PITFALLS.md` for the complete pitfall-to-phase mapping, warning signs, and recovery strategies.

## Implications for Roadmap

Based on combined research, the suggested phase structure has five main blocks. The monorepo setup and core extraction must come before CLI implementation. Calculation improvements belong in the core extraction phase — not later — because they inform test fixtures and the CLI must inherit correct formulas from day one. Testing is woven throughout rather than deferred to a final phase.

### Phase 1: Monorepo Foundation and Core Extraction

**Rationale:** Everything else depends on this. The CLI cannot exist without core. Tests cannot be meaningful without the correct extraction boundary. The web app cannot be validated without the monorepo build succeeding. This phase has the most pitfall exposure (all six critical pitfalls apply here) and must be established first and correctly. The architecture file provides a complete 25-file migration plan — no design decisions remain open.

**Delivers:** Working bun workspace with `packages/core` building via tsdown; `apps/web` importing from `@gnomad-cf/core` and producing an identical GitHub Pages build; `deploy.yml` updated with correct artifact path; `bun.lock` (text format) committed; TypeScript project references configured.

**Addresses:** Monorepo restructure (P1 must-have), extraction boundary definition, CI pipeline stability

**Avoids:** Singleton composable extraction (P1), `@/` alias breakage (P2), villus context leak (P3), locked lockfile CI failure (P6), TypeScript project references gap (P8), alias conflict (P13), binary lockfile (P14)

**Research flag:** None needed — ARCHITECTURE.md provides the exact migration plan. The only empirical verification needed is the Vite `@gnomad-cf/core` dev alias resolving correctly alongside `@/` with trailing slash.

### Phase 2: Calculation Improvements in Core

**Rationale:** Implement HWE 2pq, homozygote exclusion, genetic prevalence q², and inclusion-exclusion GCR directly in core immediately after extraction — before building the CLI or expanding the test suite. This order means calculation improvements are validated with unit tests before being consumed by anything else, and the CLI inherits correct formulas from day one. Golden-value tests for current behavior must be written before any formula changes.

**Delivers:** Updated `frequency-calc.ts` in core with published-correct formulas; homozygote count in variant types; reference-value unit tests for CFTR, SMN1, and HEXA passing against literature values.

**Addresses:** HWE 2pq (P1 must-have), homozygote exclusion (P1 must-have), genetic prevalence q² (P1 must-have), core unit tests (P1 must-have)

**Avoids:** Silent formula regression (P7) — golden-value tests precede every formula change; test isolation failures (P5) — core tests run on pure functions with no singleton state

**Research flag:** None needed — FEATURES.md provides reference values table (CFTR NFE: q≈0.022, expected 2pq≈0.0431, q²≈0.00048) from peer-reviewed literature.

### Phase 3: CLI Package

**Rationale:** CLI is the user-visible milestone deliverable and can only be built after core is stable and calculation-correct. Single gene mode validates the full imperative pipeline before batch mode adds concurrency complexity. Clinical text output extends the value proposition beyond what GeniE provides.

**Delivers:** `gnomad-cf CFTR --format json` producing correct output matching the web app; batch mode with stdin support and configurable concurrency; CLI integration tests with mocked gnomAD responses; clinical text output via `--output text --language de`.

**Addresses:** CLI single gene (P1), CLI batch mode (P1), CLI JSON output (P1), CLI integration tests (P1), clinical text CLI (P3 differentiator)

**Avoids:** villus context requirement (P3) — CLI uses plain fetch from core; Pinia localStorage (P10) — CLI uses flags not stores; phantom dependencies (P9) — use bun isolated linker or `--cwd` installs

**Research flag:** gnomAD GraphQL rate limits are undocumented. The recommended default of 3 concurrent requests for batch mode is empirical, not documented by Broad. Implement `--concurrency` as a user-configurable flag to allow adjustment without code changes.

### Phase 4: Gene Config System

**Rationale:** Gene configs depend on having a stable core API to validate against. The schema must be finalized after calculation improvements so configs can encode `excludeHomozygoteThreshold`, `penetrance`, and `founderVariants` in a way the calculation engine actually uses. Community contribution workflow (PR validation via GitHub Actions) requires the schema to be stable before external contributors can participate.

**Delivers:** Zod schema for gene configs with YAML/JSON loading; 4-5 initial configs (CFTR, SMN1, HEXA, PAH); config loader in core; GitHub Actions PR validation; web app integration loading gene config on gene selection.

**Addresses:** Community gene config schema (P1), initial gene configs (P1), PR validation CI (P3), founder variant annotations (P3 differentiator)

**Avoids:** Config validation absence (P11) — Zod validation at load time enforced in CI, not just TypeScript types; lazy loading (performance trap) — load per gene on demand, not all configs at startup

**Research flag:** None needed — STACK.md specifies the full Zod schema pattern with YAML/JSON loading and the required vs. optional field breakdown.

### Phase 5: Test Suite Completion and Web App Validation

**Rationale:** Core unit tests are built in Phase 2. This phase adds the remaining testing layers: Vue component tests (validates web app post-extraction), Playwright E2E (validates wizard flow unchanged end-to-end), and expanded CLI integration tests. This phase confirms the entire system is coherent and the GitHub Pages deployment is regression-free.

**Delivers:** Full test suite across all three packages with coverage reporting; Playwright E2E for wizard completion flow; verified GitHub Pages deploy identical to pre-v1.5 behavior.

**Addresses:** Vue component tests (P2 should-have), Playwright E2E (P2 should-have), full CLI integration test suite (follow-up to P1 must-have)

**Avoids:** Test isolation failures from singleton state (P5) — use `vi.isolateModules()` and `setActivePinia(createPinia())` patterns documented in PITFALLS.md

**Research flag:** None needed — STACK.md provides the complete Vitest 4 `projects` config with the `jsdom`/`node` environment split and the `@vue/test-utils` Vuetify setup pattern.

### Phase Ordering Rationale

- **Foundation before consumers:** Core must build before CLI and the updated web app can function. The build dependency graph is linear: core → web, core → cli.
- **Calculation correctness before distribution:** Implementing HWE/homozygote improvements in Phase 2 (before CLI in Phase 3) ensures the CLI never ships with the old approximation formulas. CLI integration tests can use the same CFTR reference values that validated the formulas.
- **Gene configs after stable API:** Phase 4 after Phase 2 ensures the config schema references real calculation parameters rather than being designed speculatively and retrofitted later.
- **Tests woven throughout, not deferred:** Core unit tests are in Phase 2 (not a final "testing phase") because they validate calculation changes as they are made. Deferring tests risks shipping calculation regressions. Vue component and E2E tests go last because they validate the assembled system, not individual components.

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 3 (CLI, batch mode):** gnomAD GraphQL rate limits are undocumented. The 3-concurrent-request default is empirical. Implement `--concurrency` as a configurable flag and document the empirical basis in CLI help text. If the rate limit proves more restrictive than observed, sequential processing may be required as a fallback.

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Monorepo):** Complete 25-file migration plan with exact paths and import changes in ARCHITECTURE.md. Build dependency order is linear and well-understood.
- **Phase 2 (Calculations):** Reference values from three peer-reviewed papers; formulas verified. No additional research needed.
- **Phase 4 (Gene Configs):** Zod schema pattern and YAML/JSON loading strategy fully specified in STACK.md.
- **Phase 5 (Tests):** Vitest 4 `projects` configuration and environment split fully specified in STACK.md; pitfall mitigations for singleton state in PITFALLS.md.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All packages verified against npm registry current as of 2026-02-23; bun workspaces verified against official docs; tsdown pre-1.0 but API stable per migration guide — pin version |
| Features | HIGH | Calculation formulas verified against three peer-reviewed papers; GeniE (official Broad tool) confirms q² method; reference values table available for test fixtures |
| Architecture | HIGH | Based on direct source-code analysis of every composable and utility file; 25-file migration plan with exact paths; no inference needed |
| Pitfalls | HIGH | Six of seven critical pitfalls verified by reading specific lines in source files; bun `--filter` bug confirmed via GitHub issue #18195 |

**Overall confidence:** HIGH

### Gaps to Address

- **gnomAD API rate limits:** Undocumented. The recommended 3-concurrent-request default for batch mode is empirical. Flag `--concurrency` should be user-configurable; document the empirical basis in CLI help text and README.

- **tsdown API stability:** At v0.20.x (pre-1.0). The config API is stable per the tsup-to-tsdown migration guide, but a breaking change before 1.0 is possible. Pin the exact version in `package.json` and schedule an update when 1.0 releases.

- **Vite `@gnomad-cf/core` dev alias:** ARCHITECTURE.md recommends pointing the alias to `packages/core/src` for dev mode. This needs empirical verification that it resolves correctly alongside the `@/` alias with trailing slash. Test in Phase 1 before proceeding to Phase 2.

- **`bun.lock` vs `bun.lockb`:** The project uses `packageManager: bun@1.3.9`. Verify which lockfile format is committed on day one and migrate to text `bun.lock` in Phase 1 if still on binary. Binary lockfile merge conflicts are unresolvable.

- **Homozygote count in gnomAD API response:** The homozygote exclusion formula requires `hom` count per variant per population. FEATURES.md states this is available in the gnomAD API. Verify the exact field name and population-level availability in the actual GraphQL response schema before writing the updated type definitions in Phase 2.

## Sources

### Primary (HIGH confidence)
- Guo et al. 2022, npj Genomic Medicine (PMC9763236) — VCR formula `(AC - 2×Hom) / (AN/2)`, GCR inclusion-exclusion; authoritative pipeline reference
- Kandolin et al. 2024, AJMG Part A — ACMG carrier screening with gnomAD v4; CFTR reference values
- Genetics in Medicine 2024 — gnomAD v4.0 carrier frequency validation; peer-reviewed
- [GeniE — Broad Institute 2024](https://gnomad.broadinstitute.org/news/2024-06-genie/) — genetic prevalence q² method; official gnomAD tool
- [Bun Workspaces Documentation](https://bun.com/docs/pm/workspaces) — `--filter`, `workspace:*`, isolated installs behavior
- [Vitest 4.0 Release + Projects Guide](https://vitest.dev/guide/projects) — `projects` config, monorepo test strategy
- [tsdown Getting Started](https://tsdown.dev/guide/getting-started) — library bundler configuration
- [commander npm v14.0.3](https://www.npmjs.com/package/commander) — TypeScript types built in
- Direct codebase analysis — all 12 composable files and all utils read; architecture findings have zero inference

### Secondary (MEDIUM confidence)
- [Vitest 3 Monorepo Setup (Sep 2025)](https://www.thecandidstartup.org/2025/09/08/vitest-3-monorepo-setup.html) — `projects` config pattern confirmed
- [Switching from tsup to tsdown](https://alan.norbauer.com/articles/tsdown-bundler/) — tsup abandonment, API stability
- [fgbyte.com Bun monorepo experience](https://www.fgbyte.com/blog/02-bun-turborepo-hell/) — `--filter` install bug corroboration
- [Bun Issue #18195](https://github.com/oven-sh/bun/issues/18195) — `--filter` installs to root confirmed
- [@clack/prompts npm v1.0.1](https://www.npmjs.com/package/@clack/prompts) — 4000+ dependents, ESM-first, freshly released

### Tertiary (supporting context)
- [ClinGen Community Curation (C3)](https://clinicalgenome.org/working-groups/clingen-community-curation-c3/) — community curation workflow patterns
- [GeniE GitHub Repository](https://github.com/broadinstitute/genetic-prevalence-estimator) — open-source reference for genetic prevalence implementation
- [gnomAD-toolbox GitHub](https://github.com/broadinstitute/gnomad-toolbox) — published pipeline for carrier frequency ranking

---
*Research completed: 2026-02-23*
*Ready for roadmap: yes*
