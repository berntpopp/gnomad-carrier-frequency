# Roadmap: gnomAD Carrier Frequency Calculator

## Milestones

- **v1.0 MVP** - Phases 1-4 (shipped 2026-01-19)
- **v1.1 Release-Ready** - Phases 5-10 (shipped 2026-01-19)
- **v1.2 Sharing** - Phases 11-15 (shipped 2026-01-20)
- **v1.3 Documentation Site** - Phases 16-20 (shipped 2026-02-23)
- **v1.4 Discoverability & Polish** - Phases 21-24 (shipped 2026-02-23)
- **v1.5 Core Extraction & CLI** - Phases 25-29 (in progress)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-4) - SHIPPED 2026-01-19</summary>

4 phases, 15 plans, 32 requirements. See milestone archive.

</details>

<details>
<summary>v1.1 Release-Ready (Phases 5-10) - SHIPPED 2026-01-19</summary>

6 phases, 27 plans, 69 requirements. See milestone archive.

</details>

<details>
<summary>v1.2 Sharing (Phases 11-15) - SHIPPED 2026-01-20</summary>

5 phases, 15 plans, 38 requirements. See milestone archive.

</details>

<details>
<summary>v1.3 Documentation Site (Phases 16-20) - SHIPPED 2026-02-23</summary>

5 phases, 14 plans, 52 requirements. See milestone archive.

</details>

<details>
<summary>v1.4 Discoverability & Polish (Phases 21-24) - SHIPPED 2026-02-23</summary>

4 phases, 12 plans, 37 requirements. See milestone archive.

</details>

### v1.5 Core Extraction & CLI (In Progress)

**Milestone Goal:** Extract the calculation engine into a reusable monorepo package, improve carrier frequency math to published clinical standards, build a full CLI for batch analyses, add community-curated gene configs, and validate the entire system with a comprehensive test suite.

#### Phase 25: Monorepo Foundation & Core Extraction

**Goal**: The repository is restructured as a bun workspaces monorepo and the web app builds and deploys identically from the new structure.
**Depends on**: Phase 24 (v1.4 complete)
**Requirements**: MONO-01, MONO-02, MONO-03, MONO-04, MONO-05, MONO-06, MONO-07, MONO-08, MONO-09, MONO-10, MONO-11, MONO-12, MONO-13, TEST-01
**Success Criteria** (what must be TRUE):
  1. Running `bun install` at repo root installs all workspace dependencies without errors
  2. Running `bun run build` builds `packages/core` (via tsdown) and then `apps/web` (via Vite) in dependency order, producing a dist artifact identical to the pre-v1.5 deployment
  3. The deployed GitHub Pages app at the live URL loads and the CFTR wizard completes without errors, proving the web app's import path migration to `@gnomad-cf/core` is transparent to end users
  4. `packages/core` has zero imports from Vue, Pinia, or villus — verified by TypeScript compilation in an isolated `node` environment
  5. Vitest is configured at monorepo root with per-package project configs and `bun run test` runs without errors (even with zero tests yet)
**Plans**: TBD

Plans:
- [ ] 25-01: TBD

---

#### Phase 26: Calculation Improvements in Core

**Goal**: The carrier frequency calculations in `packages/core` use clinically-correct published formulas (Hardy-Weinberg 2pq, homozygote exclusion, genetic prevalence) validated against reference values from peer-reviewed literature, and these formulas are the default in the web app.
**Depends on**: Phase 25
**Requirements**: CALC-01, CALC-02, CALC-03, CALC-04, CALC-05, CALC-06, CALC-07, CALC-08, CALC-09, TEST-02, TEST-03, TEST-04, TEST-05, TEST-06
**Success Criteria** (what must be TRUE):
  1. The web app results step shows HWE 2pq carrier frequency by default, with a toggle to switch to the simplified formula — the displayed value for CFTR NFE matches the expected ~1:23 (2pq ≈ 0.0431)
  2. Enabling the homozygote exclusion toggle updates the displayed carrier frequency in real time using the VCR formula per variant and GCR inclusion-exclusion across variants
  3. The web app results step shows genetic prevalence (q²) and Bayesian prevalence (penetrance-adjusted) alongside carrier frequency
  4. Running `bun run test --filter @gnomad-cf/core` executes unit tests for all calculation functions with CFTR, SMN1, and HEXA reference values and all tests pass
  5. No calculation change is merged without a corresponding golden-value test asserting the expected output against published reference values
**Plans**: 5 plans

Plans:
- [ ] 26-01-PLAN.md — Core calculation engine (HWE, VCR/GCR, prevalence) with golden-value TDD tests
- [ ] 26-02-PLAN.md — GraphQL ac_hom extension, CalcConfig Pinia store, URL state sync
- [ ] 26-03-PLAN.md — Composable & frequency-calc integration (wire formulas to reactive layer)
- [ ] 26-04-PLAN.md — FilterPanel calc controls & StepResults prevalence display
- [ ] 26-05-PLAN.md — Variant filter & template renderer unit tests (TEST-05, TEST-06)

---

#### Phase 27: CLI Package

**Goal**: A developer or researcher can run `gnomad-cf CFTR --format json` from the terminal and receive correct carrier frequency output, and can process a gene list in batch mode with configurable output formats.
**Depends on**: Phase 26
**Requirements**: CLI-01, CLI-02, CLI-03, CLI-04, CLI-05, CLI-06, CLI-07, CLI-08, CLI-09, CLI-10, CLI-11, CLI-12, CLI-13, TEST-08
**Success Criteria** (what must be TRUE):
  1. `gnomad-cf CFTR --population nfe --format json` returns a JSON object with carrier frequency matching the web app output for the same gene and population
  2. `gnomad-cf batch genes.json --format tsv --output results.tsv` processes a multi-gene JSON input file and writes a TSV file with one row per gene-population combination
  3. `gnomad-cf` run without arguments launches an interactive prompt that guides the user through gene selection, population filter, and output format
  4. `gnomad-cf --help` and `gnomad-cf --version` print usage information and the current version without errors
  5. CLI integration tests with mocked gnomAD responses pass for single gene mode, batch mode, all format flags, and error handling edge cases
**Plans**: TBD

Plans:
- [ ] 27-01: TBD

---

#### Phase 28: Gene Config System

**Goal**: Community-curated per-gene configuration files exist for CFTR, HEXA, and SMN1, are loaded automatically in the web app on gene selection, and can be applied in the CLI — with a validated schema and a GitHub Actions CI workflow that checks contributed configs.
**Depends on**: Phase 26
**Requirements**: GENE-01, GENE-02, GENE-03, GENE-04, GENE-05, GENE-06, GENE-07, TEST-07
**Success Criteria** (what must be TRUE):
  1. Selecting CFTR in the web app automatically applies the curated recommended filter settings and shows a visible indicator that a gene config was loaded (with a user override option)
  2. Running `gnomad-cf CFTR --config cftr` applies the CFTR gene config (recommended filters, penetrance) to the CLI calculation without requiring manual flags
  3. A new JSON or YAML gene config file submitted via pull request triggers the GitHub Actions CI validation workflow, which fails with a descriptive error if the Zod schema is violated
  4. The contributing guide describes the gene config schema fields, how to submit a PR, and what the CI checks validate
  5. Vitest unit tests for gene config loading pass, covering schema validation errors, missing optional fields, and successful loading for CFTR, HEXA, and SMN1
**Plans**: TBD

Plans:
- [ ] 28-01: TBD

---

#### Phase 29: Test Suite Completion & Web App Validation

**Goal**: The assembled system — web app, core package, CLI, and gene configs — is verified end-to-end: Vue component tests confirm the web app renders correctly after monorepo restructure, Playwright E2E confirms the wizard flow is unchanged, and CI enforces coverage thresholds on every push.
**Depends on**: Phases 25, 26, 27, 28
**Requirements**: TEST-09, TEST-10, TEST-11, TEST-12
**Success Criteria** (what must be TRUE):
  1. Vue Test Utils component tests for wizard steps, settings panel, and results display pass, confirming no regressions from the monorepo import path migration
  2. Playwright E2E tests complete the full wizard flow (CFTR gene search → carrier status selection → frequency display → results with clinical text) and validate URL sharing and history restore
  3. The CI pipeline runs all tests (core unit, CLI integration, web component, E2E) on every push and pull request, reporting coverage percentages
  4. Coverage thresholds are enforced and a build with coverage below threshold (core: 90%+, CLI: 80%+, web: 60%+) fails the CI pipeline with a clear coverage report
**Plans**: TBD

Plans:
- [ ] 29-01: TBD

---

## Progress

**Execution Order:** 25 → 26 → 27 → 28 → 29

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-4 | v1.0 | 15/15 | Complete | 2026-01-19 |
| 5-10 | v1.1 | 27/27 | Complete | 2026-01-19 |
| 11-15 | v1.2 | 15/15 | Complete | 2026-01-20 |
| 16-20 | v1.3 | 14/14 | Complete | 2026-02-23 |
| 21-24 | v1.4 | 12/12 | Complete | 2026-02-23 |
| 25. Monorepo Foundation & Core Extraction | v1.5 | 0/TBD | Not started | - |
| 26. Calculation Improvements in Core | v1.5 | 0/5 | Planned | - |
| 27. CLI Package | v1.5 | 0/TBD | Not started | - |
| 28. Gene Config System | v1.5 | 0/TBD | Not started | - |
| 29. Test Suite Completion & Web App Validation | v1.5 | 0/TBD | Not started | - |

**Total:** 83 plans complete across 24 phases in 5 milestones. v1.5 planning in progress (5 phases, 54 requirements).

---
*Roadmap created: 2026-01-18*
*Last updated: 2026-02-23 (Phase 26 planned: 5 plans in 2 waves)*
