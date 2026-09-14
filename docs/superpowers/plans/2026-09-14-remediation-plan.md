# Remediation Implementation Plan: Parallel Lanes & Verification (Revision 2.0)

**Document ID:** `PLAN-2026-09-14-REMEDIATION`  
**Revision:** 2.0 (Astra Plan Review Resolution Round 1)  
**Date:** 2026-09-14  
**Author:** Lead Engineer (`gnomad-carrier-frequency`)  
**Target Repository:** `gnomad-carrier-frequency`  
**Specification Reference:** `docs/superpowers/specs/2026-09-14-remediation-design.md` (Revision 8.0, Approved)  
**Ledger Reference:** `.planning/remediation/STATUS.md`  
**Integration Base SHA:** `083375e`  

---

## 1. Executive Summary, Integration Sequencing & Rollback Protocol (PLAN-13)

This plan operationalizes the approved architecture design (`SPEC-2026-09-14-REMEDIATION` Rev 8.0) across **six sequential integration groups**. Each lane executes on a dedicated feature branch in an isolated worktree, adheres to Test-Driven Development (TDD with explicit baseline-failure recording before implementation), enforces the strict **`< 650 LOC` per file limit** from [`AGENTS.md`](file:///home/bernt-popp/development/gnomad-carrier-frequency/AGENTS.md), and drives package coverage toward the **`> 89%` target**.

```
Strict Integration Sequence (SPEC-16, PLAN-13):
Phase A: Lane 4 (Toolchain, CI & Shared Types)
    └──► Phase B: Lane 1 (Core Calculations & Prevalence Subsystem)
             └──► Phase C: Lane 2 (Reactive State, Worker Pipelines & Submissions)
                      └──► Phase D: Lane 3 (Clinical Reporting & Multi-Format Exports)
                               └──► Phase E: Lane 5 (Accessible Components & Decompositions)
                                        └──► Phase F: Lane 6 (Performance Optimization & Benchmarks)
```

### Rollback Strategy (Reverse-Topological Order):
If an integrated feature branch exhibits regressions during integration testing, revert in reverse dependency order:
$\text{Group F} \to \text{Group E} \to \text{Group D} \to \text{Group C} \to \text{Group B} \to \text{Group A}$.
Each lane maintains independent commits to permit clean `git revert` without collateral diffs.

### Monorepo Worktree Allocation:
- **Lane 1 (`.worktrees/lane-1`):** Branch `remediation/lane-1-core-calc`
- **Lane 2 (`.worktrees/lane-2`):** Branch `remediation/lane-2-state-worker`
- **Lane 3 (`.worktrees/lane-3`):** Branch `remediation/lane-3-reports-exports`
- **Lane 4 (`.worktrees/lane-4`):** Branch `remediation/lane-4-toolchain-ci`
- **Lane 5 (`.worktrees/lane-5`):** Branch `remediation/lane-5-a11y-ui`
- **Lane 6 (`.worktrees/lane-6`):** Branch `remediation/lane-6-perf-benchmarks`

---

## 2. Lane 4 (Phase A): Monorepo Toolchains, CI Quality Gates & Asset Automation

**Branch:** `remediation/lane-4-toolchain-ci`  
**Packages:** Root, `.github/workflows/`, `scripts/`, `packages/core/tsconfig.json`  
**Findings Addressed:** `CRIT-2`, `BUILD-5`, `DX-1`, `DX-8`, `NEW-11`, `DX-9`, `NEW-10`, `NEW-13`, `SPEC-09`, `SPEC-11`, `SPEC-12-COV`, `SPEC-12-DOCS`, `PLAN-09`, `PLAN-14`, `DEBT-01`, `DEBT-05`  
**File Limit Rule:** No non-test source file may exceed 650 LOC.

### File Map:
- **New Files:**
  - `scripts/update-clingen-gene-validity.ts` (< 280 LOC): ClinGen downloader, preamble skipper, separator skipper, and schema validator (PLAN-14).
  - `scripts/__tests__/update-clingen.test.ts` (< 250 LOC): Unit tests for ClinGen validation (valid, truncated, malformed, HTML).
  - `scripts/check-docs-assets.ts` (< 150 LOC): Verifies zero missing `.lean.js` 404 preloads (NEW-10, DEBT-01).
  - `scripts/check-file-size.ts` (< 100 LOC): Strict `< 650 LOC` git-tracked file enforcement script (PLAN-10).
  - `.github/hooks/pre-commit` (< 50 LOC): Git pre-commit hook executing `check-file-size.ts`, typecheck, and lint (DX-1, DEBT-05).
- **Modified Files:**
  - `.github/workflows/tests.yml` (< 200 LOC): Remove `continue-on-error`, run unit and E2E jobs unconditionally on push and PR (CRIT-2, PLAN-09).
  - `.github/workflows/deploy.yml` (< 150 LOC): Gate deploy on test/E2E SHA; merge docs from `apps/web/docs/.vitepress/dist` to `apps/web/dist/docs` (SPEC-12-DOCS).
  - `.github/workflows/screenshots.yml` (< 120 LOC): Hash `bun.lock` (not `bun.lockb`) (DX-8, NEW-11).
  - `.github/workflows/update-clingen-data.yml` (< 120 LOC): Invoke `update-clingen-gene-validity.ts` targeting `apps/web/public/data/` (NEW-13).
  - `packages/core/tsconfig.json` (< 50 LOC): Enable `noUnusedLocals` and `noUnusedParameters` (BUILD-5).
  - `apps/web/package.json` (< 150 LOC): Remove unused `jsdom` (DX-9); add `"test:coverage": "vitest run --coverage"` (PLAN-09).
  - `packages/core/package.json` (< 100 LOC): Add `"test:coverage": "vitest run --coverage"` (PLAN-09).
  - `packages/cli/package.json` (< 100 LOC): Add `"test:coverage": "vitest run --coverage"` (PLAN-09); declare `zod` and `commander` dependencies (PLAN-08).
  - `package.json` (< 120 LOC): Calibrated `test:coverage` command; `"test:e2e": "playwright test"`; pre-commit hook installer.
  - `packages/core/vitest.config.ts`, `packages/cli/vitest.config.ts`, `apps/web/vitest.config.ts`: Calibrate thresholds (80% core, 70% CLI, 35% web).

### Implementation Tasks:

#### Task 4.1: Executable Package Coverage Scripts & CI Quality Gates (CRIT-2, SPEC-12-COV, SPEC-12-DOCS, PLAN-09)
- [ ] **Step 1 (Config):** Add `"test:coverage": "vitest run --coverage"` to `packages/core/package.json`, `packages/cli/package.json`, and `apps/web/package.json`. Add `"test:e2e": "playwright test"` to root `package.json`. Update root `"test:coverage"` to `bun run --filter @gnomad-cf/core test:coverage && bun run --filter @gnomad-cf/cli test:coverage && bun run --filter gnomad-cf-web test:coverage`.
- [ ] **Step 2 (Thresholds):** Calibrate line thresholds: 80% in `packages/core/vitest.config.ts`, 70% in `packages/cli/vitest.config.ts`, 35% in `apps/web/vitest.config.ts`.
- [ ] **Step 3 (Workflows):** Update `.github/workflows/tests.yml` to remove all `continue-on-error` directives; run E2E test step on both `push: [main]` and `pull_request: [main]`. Update `.github/workflows/deploy.yml` to verify that the `test` workflow passed on the exact deployment `github.sha`, and merge docs from `apps/web/docs/.vitepress/dist` to `apps/web/dist/docs`.
- [ ] **Step 4 (Verify):** Execute `bun run test:coverage`. Assert all three package coverage suites execute and enforce calibrated thresholds.
- [ ] **Step 5 (Commit):** `git commit -m "ci: enforce test assertions as non-tolerated gates and calibrate package coverage scripts (CRIT-2, SPEC-12-COV, PLAN-09)"`

#### Task 4.2: ClinGen Data Integrity Validator & Automated Updater (NEW-13, SPEC-09, PLAN-14)
- [ ] **Step 1 (Test):** Create `scripts/__tests__/update-clingen.test.ts`. Assert: (1) skips 4 preamble lines; (2) validates line 5 headers; (3) skips line 6 separator row; (4) asserts $\ge 1,000$ curation rows; (5) asserts valid classifications (`Definitive`, `Strong`, `Moderate`, `Limited`); (6) fails on truncated CSV or HTML error responses without overwriting target file.
- [ ] **Step 2 (Code):** Implement `scripts/update-clingen-gene-validity.ts`. Download to `.tmp` staging file, validate all data-integrity rules, and atomically overwrite `apps/web/public/data/clingen-gene-validity.csv` only on complete pass.
- [ ] **Step 3 (Verify):** Run `bun test scripts/__tests__/update-clingen.test.ts`. Assert clean pass.
- [ ] **Step 4 (Commit):** `git commit -m "fix(scripts,ci): add ClinGen data-integrity validator and updater (NEW-13, SPEC-09, PLAN-14)"`

#### Task 4.3: Docs Asset Checker & Monorepo Toolchain Cleanups (BUILD-5, DX-8, DX-9, NEW-10, NEW-11, DEBT-01, DEBT-05)
- [ ] **Step 1 (Code):** Implement `scripts/check-docs-assets.ts` verifying no missing `.lean.js` 404 preloads in VitePress build output. Update `apps/web/docs/.vitepress/config.ts` if needed to resolve bundle asset collisions.
- [ ] **Step 2 (Toolchain):** Remove `jsdom` from `apps/web/package.json`. Hash `bun.lock` in `.github/workflows/screenshots.yml`. Enable `noUnusedLocals` and `noUnusedParameters` in `packages/core/tsconfig.json`.
- [ ] **Step 3 (LOC Script & Hook):** Implement `scripts/check-file-size.ts` and `.github/hooks/pre-commit` enforcing strictly `< 650 LOC` on git-tracked source files.
- [ ] **Step 4 (Verify):** Run `bun run typecheck && bun test scripts/check-docs-assets.ts`.
- [ ] **Step 5 (Commit):** `git commit -m "chore(toolchain): add docs asset checker, file size check, and prune unused dependencies (BUILD-5, DX-8, DX-9, NEW-10)"`

---

## 3. Lane 1 (Phase B): Core Mathematical Calculations & Prevalence Subsystem

**Branch:** `remediation/lane-1-core-calc`  
**Package:** `@gnomad-cf/core`  
**Findings Addressed:** `ARCH-3`, `ARCH-5`, `NEW-01`, `NEW-06`, `SPEC-01`, `SPEC-02`, `SPEC-03`, `SPEC-05`, `PLAN-01`, `PLAN-02`  
**Prerequisite:** Phase A (`remediation/lane-4-toolchain-ci`)  
**File Limit Rule:** No non-test source file may exceed 650 LOC.

### File Map:
- **New Files:**
  - `packages/core/src/types/context.ts` (< 150 LOC): `AnalysisContext` schema & Zod parser (SPEC-01).
  - `packages/core/src/calculations/recurrence-risk.ts` (< 100 LOC): Authoritative `calculateRecurrenceRisk` (SPEC-02, ARCH-5, NEW-01).
  - `packages/core/src/calculations/decision-matrix.ts` (< 280 LOC): Cases 1–6 disjoint evaluation matrix (SPEC-05).
  - `packages/core/src/calculations/__tests__/recurrence-risk.test.ts` (< 200 LOC)
  - `packages/core/src/calculations/__tests__/decision-matrix.test.ts` (< 350 LOC)
  - `packages/core/src/types/__tests__/context.test.ts` (< 180 LOC)
- **Modified Files:**
  - `packages/core/src/calculations/prevalence.ts` (< 150 LOC): Preserve signature `calculateBayesianPrevalence(geneticPrevalence, penetrance)`; add `deriveFallbackGeneticPrevalence(fallbackCF)` (PLAN-01).
  - `packages/core/src/calculations/carrier-frequency.ts` (< 400 LOC): Route through canonical decision matrix and risk helper (ARCH-3).
  - `packages/core/src/calculations/source-frequency.ts` (< 250 LOC): Respect `useHomExclusion` in source calculations (NEW-06).
  - `packages/core/src/index.ts` (< 100 LOC): Export all canonical calculation helpers and types.

### Implementation Tasks:

#### Task 1.1: Canonical AnalysisContext Schema & Serialization (SPEC-01)
- [ ] **Step 1 (Baseline Failure):** Create `packages/core/src/types/__tests__/context.test.ts`. Assert failure when importing non-existent `AnalysisContextSchema`.
- [ ] **Step 2 (Code):** Create `packages/core/src/types/context.ts`. Define `AnalysisContext` TypeScript interface and `AnalysisContextSchema` with all `QualitySettings` and `QualityExclusionConfig` fields, penetrance `[0.0, 1.0]`, and integer `clinvarConflictingThreshold`.
- [ ] **Step 3 (Verify):** Run `bun run --filter @gnomad-cf/core test context.test.ts`. Assert clean pass.
- [ ] **Step 4 (Commit):** `git commit -m "feat(core): implement canonical AnalysisContext schema and serialization (SPEC-01)"`

#### Task 1.2: Authoritative Recurrence Risk Helper (SPEC-02, ARCH-5, NEW-01)
- [ ] **Step 1 (Baseline Failure):** Create `packages/core/src/calculations/__tests__/recurrence-risk.test.ts`. Assert failure on missing `calculateRecurrenceRisk`.
- [ ] **Step 2 (Code):** Create `packages/core/src/calculations/recurrence-risk.ts`. Implement:
  - `heterozygous`: $CF \times 0.25 \times \text{penetrance}$
  - `homozygous` | `compound_het_confirmed` | `compound_het_assumed`: $CF \times 0.5 \times \text{penetrance}$
  - Unknown / undefined: returns `null`
  - Penetrance bounded to `[0.0, 1.0]`
- [ ] **Step 3 (Verify):** Run `bun run --filter @gnomad-cf/core test recurrence-risk.test.ts`. Assert clean pass.
- [ ] **Step 4 (Commit):** `git commit -m "feat(core): implement authoritative calculateRecurrenceRisk helper (SPEC-02, ARCH-5, NEW-01)"`

#### Task 1.3: Bayesian Prevalence Input Preservation & Fallback Prior Inversion (SPEC-03, PLAN-01)
- [ ] **Step 1 (Test):** In `packages/core/tests/prevalence.test.ts`, assert `calculateBayesianPrevalence(geneticPrevalence, penetrance)` computes `geneticPrevalence * penetrance`, returns `0.0` when penetrance is `0.0` for valid prevalence, and returns `null` when genetic prevalence is `null`. Test `deriveFallbackGeneticPrevalence(0.01)` returns $(0.01/2)^2 = 0.000025$.
- [ ] **Step 2 (Code):** Update `packages/core/src/calculations/prevalence.ts`. Preserve `calculateBayesianPrevalence(geneticPrevalence: number | null, penetrance: number): number | null`. Export `deriveFallbackGeneticPrevalence(fallbackCF: number): number`.
- [ ] **Step 3 (Verify):** Run `bun run --filter @gnomad-cf/core test prevalence.test.ts`. Assert clean pass.
- [ ] **Step 4 (Commit):** `git commit -m "fix(core): preserve genetic prevalence input in calculateBayesianPrevalence and isolate fallback prior inversion (SPEC-03, PLAN-01)"`

#### Task 1.4: Exhaustive Disjoint Decision Matrix for Zero, Missing, and Fallback (SPEC-05)
- [ ] **Step 1 (Test):** Create `packages/core/src/calculations/__tests__/decision-matrix.test.ts`. Write boundary tests for all 6 cases: Case 1 missing data, Case 2 no pathogenic candidates, Case 3 all excluded, Case 4 observed zero, Case 5 positive homozygotes-only, Case 6 normal residual. Assert counterexample with 1 excluded candidate ($AN=0$) and 1 benign variant ($AN=100$) matches Case 1.
- [ ] **Step 2 (Code):** Create `packages/core/src/calculations/decision-matrix.ts`. Implement partition sets ($V_{\text{raw}}$, $V_{\text{path}}$, $V_{\text{inc}}$) and exhaustive disjoint rules per Spec §2.2.5.
- [ ] **Step 3 (Verify):** Run `bun run --filter @gnomad-cf/core test decision-matrix.test.ts`. Assert clean pass.
- [ ] **Step 4 (Commit):** `git commit -m "feat(core): implement exhaustive disjoint decision matrix for Cases 1-6 (SPEC-05)"`

#### Task 1.5: Source Frequency Homozygote Exclusion Consistency (NEW-06)
- [ ] **Step 1 (Test):** In `packages/core/tests/source-frequency.test.ts`, assert that `calculateSourceFrequency` respects `useHomExclusion` and matches parent carrier frequency when only a single source is present.
- [ ] **Step 2 (Code):** Update `packages/core/src/calculations/source-frequency.ts` lines 107–115 to respect `useHomExclusion`.
- [ ] **Step 3 (Verify):** Run `bun run --filter @gnomad-cf/core test source-frequency.test.ts`. Assert clean pass.
- [ ] **Step 4 (Commit):** `git commit -m "fix(core): ensure source frequency calculation respects homozygote exclusion (NEW-06)"`

---

## 4. Lane 2 (Phase C): Reactive State Coordination & Worker Pipelines

**Branch:** `remediation/lane-2-state-worker`  
**Packages:** `apps/web`, `@gnomad-cf/core`  
**Findings Addressed:** `CRIT-1`, `NEW-02`, `NEW-03`, `NEW-04`, `NEW-05`, `NEW-07`, `SPEC-01`, `SPEC-04`, `SPEC-06`, `SPEC-07-TXN`, `SPEC-07-MIG`, `SPEC-08`, `SPEC-11`, `PLAN-02`, `PLAN-03`, `PLAN-04`, `PLAN-07`, `DEBT-03`  
**Prerequisites:** Phase A (`remediation/lane-4-toolchain-ci`), Phase B (`remediation/lane-1-core-calc`)  
**File Limit Rule:** No non-test source file may exceed 650 LOC.

### File Map:
- **New Files:**
  - `apps/web/src/composables/useAnalysisContext.ts` (< 200 LOC): Unified reactive `activeContext: ComputedRef<AnalysisContext>` and revision coordinator (PLAN-03).
  - `apps/web/src/composables/__tests__/useCarrierFrequency.concurrency.test.ts` (< 350 LOC): Rapid toggles, ownership release before replay, atomic commit guard.
  - `apps/web/src/composables/__tests__/useHistoryRestore.test.ts` (< 400 LOC): Transactional restore, legacy migration, URL sync.
  - `apps/web/src/composables/__tests__/useGeneConfig.restore.test.ts` (< 300 LOC): Stale async loads, token invalidation, null config profile clearance.
  - `packages/core/src/queries/__tests__/clinvar-submissions.test.ts` (< 200 LOC): Parameterized GraphQL query building.
- **Modified Files:**
  - `apps/web/src/composables/useCarrierFrequency.ts` (< 500 LOC): Worker state machine, monotonic revision tracking, disposal/reset helper (DEBT-03).
  - `apps/web/src/composables/useGeneConfig.ts` (< 300 LOC): Token tracking, `wasStartedDuringRestore`, owner-checked null settlement, profile switch bridge (PLAN-03).
  - `apps/web/src/composables/useHistoryRestore.ts` (< 450 LOC): Transaction mutex, dataset sequencing before gene selection, legacy normalization.
  - `apps/web/src/composables/useHistoryAutoSave.ts` (< 250 LOC): Check `isCalculating` before debounced writes.
  - `apps/web/src/composables/useWizard.ts` (< 350 LOC): Suppress resets during restore.
  - `apps/web/src/composables/useClinvarSubmissions.ts` (< 300 LOC): Proper `{ query, variables }` POST body, assembly-scoped invalidation (PLAN-04).
  - `apps/web/src/composables/useUrlState.ts` (< 350 LOC): Support all 4 index statuses and complete URL deserialization.
  - `apps/web/src/types/url-state.ts` (< 150 LOC): Add compound het statuses to `UrlStateSchema`.
  - `apps/web/src/stores/useTemplateStore.ts` (< 300 LOC): Strict Zod validation for imported templates (SPEC-11, PLAN-07).
  - `apps/web/src/workers/variant-pipeline.ts` (< 450 LOC): Integrate decision matrix into aggregation pipeline (PLAN-02).
  - `apps/web/src/workers/variant-worker.ts` (< 300 LOC): Cache keyed by `${geneSymbol}:${datasetVersion}`.
  - `packages/core/src/queries/clinvar-submissions.ts` (< 150 LOC): Singular `clinvar_variant`, `ReferenceGenomeId!`, `submitter_name`.

### Implementation Tasks:

#### Task 2.1: Unified AnalysisContext Bridge & Monotonic Revision Machine (SPEC-01, SPEC-06, NEW-02, PLAN-03)
- [ ] **Step 1 (Test):** Create `apps/web/src/composables/__tests__/useCarrierFrequency.concurrency.test.ts`. Test: (1) rapid filter toggles increment revision; (2) intermediate worker results discarded; (3) `finally` block clears execution ownership before triggering follow-up; (4) single coalesced successor executes.
- [ ] **Step 2 (Code):** Implement `apps/web/src/composables/useAnalysisContext.ts` bridging `wizardStore`, `filterStore`, `calcStore`, `qualityStore`, and `exclusionsStore`. Update `useCarrierFrequency.ts` per Spec §2.3.1. Add `disposeCarrierFrequencyInstance()` (DEBT-03).
- [ ] **Step 3 (Verify):** Run `bun run --filter gnomad-cf-web test useCarrierFrequency.concurrency.test.ts`. Assert clean pass.
- [ ] **Step 4 (Commit):** `git commit -m "feat(web): implement unified AnalysisContext bridge and worker revision protocol (SPEC-01, SPEC-06, NEW-02, PLAN-03)"`

#### Task 2.2: Atomic Token Guard & Profile Clearance in useGeneConfig (SPEC-07-TXN, NEW-03, PLAN-03)
- [ ] **Step 1 (Test):** Create `apps/web/src/composables/__tests__/useGeneConfig.restore.test.ts`. Test: (1) restore started load completing post-unlock preserves restored settings; (2) superseded same-symbol loads discard older responses; (3) unconfigured gene (TTN) clears previous profiles (CFTR) without resetting stores; (4) selecting profile updates filter/calc stores and increments active context revision.
- [ ] **Step 2 (Code):** Update `apps/web/src/composables/useGeneConfig.ts` per Spec §2.3.2. Implement `wasStartedDuringRestore`, `activeConfigToken`, atomic rejection before mutation, and owner-checked settlement.
- [ ] **Step 3 (Verify):** Run `bun run --filter gnomad-cf-web test useGeneConfig.restore.test.ts`. Assert clean pass.
- [ ] **Step 4 (Commit):** `git commit -m "fix(web): add atomic token guard, restore profile clearance, and active store bridge to useGeneConfig (SPEC-07-TXN, NEW-03, PLAN-03)"`

#### Task 2.3: Transactional History Restoration, URL State & Template Validation (SPEC-07-MIG, SPEC-07-TXN, SPEC-11, NEW-04, PLAN-03, PLAN-07)
- [ ] **Step 1 (Test):** Create `apps/web/src/composables/__tests__/useHistoryRestore.test.ts`. Test: `isRestoring` lock, dataset version sequencing before gene selection, legacy migration mapping `raw.frequencySource ?? raw.source ?? 'gnomad'`, and URL restoration with `compound_het_confirmed`. In `useTemplateStore.test.ts`, test strict schema rejection of malformed template imports.
- [ ] **Step 2 (Code):** Update `useHistoryRestore.ts`, `useWizard.ts`, `useUrlState.ts`, `apps/web/src/types/url-state.ts`, and `apps/web/src/stores/useTemplateStore.ts`.
- [ ] **Step 3 (Verify):** Run `bun run --filter gnomad-cf-web test useHistoryRestore.test.ts`. Assert clean pass.
- [ ] **Step 4 (Commit):** `git commit -m "fix(web): implement transactional history restore, full URL state schema, and template validation (SPEC-07-TXN, SPEC-07-MIG, SPEC-11, NEW-04)"`

#### Task 2.4: Upstream ClinVar GraphQL Schema, Assembly Ownership & Pipeline Aggregation (SPEC-08, NEW-05, CRIT-1, PLAN-02, PLAN-04)
- [ ] **Step 1 (Test):** Create `packages/core/src/queries/__tests__/clinvar-submissions.test.ts`. Test: query uses singular `clinvar_variant`, `ReferenceGenomeId!`, and typed variables. In `useClinvarSubmissions.test.ts`, test that switching assemblies invalidates pending batches and sends `{ query, variables }`.
- [ ] **Step 2 (Code):** Update `packages/core/src/queries/clinvar-submissions.ts` and `apps/web/src/composables/useClinvarSubmissions.ts`. Update `apps/web/src/workers/variant-pipeline.ts` to integrate `evaluateCarrierFrequencyDecisionMatrix` into global and population aggregation.
- [ ] **Step 3 (Verify):** Run `bun run --filter @gnomad-cf/core test clinvar-submissions.test.ts && bun run --filter gnomad-cf-web test useClinvarSubmissions.test.ts`.
- [ ] **Step 4 (Commit):** `git commit -m "fix(core,web): align ClinVar submissions query, assembly scoping, and worker pipeline decision matrix (SPEC-08, NEW-05, CRIT-1, PLAN-02, PLAN-04)"`

---

## 5. Lane 3 (Phase D): Clinical Reporting & Multi-Format Data Exports

**Branch:** `remediation/lane-3-reports-exports`  
**Packages:** `@gnomad-cf/core`, `@gnomad-cf/cli`, `apps/web`  
**Findings Addressed:** `ARCH-2`, `ARCH-5`, `NEW-01`, `NEW-06`, `NEW-08`, `NEW-09`, `SPEC-01`, `SPEC-10`, `DX-4`, `PLAN-05`, `PLAN-06`, `PLAN-08`, `DEBT-02`  
**Prerequisites:** Phase A (`lane-4-toolchain-ci`), Phase B (`lane-1-core-calc`), Phase C (`lane-2-state-worker`)  
**File Limit Rule:** No non-test source file may exceed 650 LOC.

### File Map:
- **New Files:**
  - `packages/core/src/types/tokens.ts` (< 100 LOC): Semantic tokens (`warning`, `danger`, `info`) (ARCH-2).
  - `packages/core/src/templates/__tests__/load-templates.test.ts` (< 150 LOC): Template asset resolution test.
  - `packages/cli/src/__tests__/clinical-formatter.test.ts` (< 250 LOC): Built CLI formatter test (PLAN-08).
  - `apps/web/src/utils/__tests__/export-utils.test.ts` (< 450 LOC): Multi-format export verification (TSV, JSON, XLSX).
- **Modified Files:**
  - `packages/core/src/templates/load-templates.ts` (< 150 LOC): Bundled asset resolution via `import.meta.url` (SPEC-10, NEW-09).
  - `packages/core/src/filters/quality-flags.ts` (< 350 LOC): Return semantic tokens instead of Vuetify colors (ARCH-2, DEBT-02).
  - `packages/core/tsdown.config.ts` (< 80 LOC): Copy templates to `dist/templates/`.
  - `packages/cli/src/commands/analyze.ts` (< 350 LOC): Validate `--penetrance` in `[0.0, 1.0]` before query (PLAN-08).
  - `apps/web/src/composables/useTextGenerator.ts` (< 400 LOC): Dynamic dataset version attribution (`"gnomAD v4.1"`, etc.) (DX-4, PLAN-06).
  - `apps/web/src/utils/export-utils.ts` (< 500 LOC): Accept full export context payload, use `calculateRecurrenceRisk`, distinguish manual vs quality exclusions, preserve homozygote counts (NEW-01, NEW-06, NEW-08, PLAN-05).
  - `apps/web/src/utils/xlsx-export.ts` (< 350 LOC): Format Excel workbook with complete provenance flags.

### Implementation Tasks:

#### Task 3.1: Bundled Core Templates, CLI Packaging & Penetrance Validation (SPEC-10, NEW-09, PLAN-08)
- [ ] **Step 1 (Test):** Create `packages/cli/src/__tests__/clinical-formatter.test.ts` and `packages/core/src/templates/__tests__/load-templates.test.ts`. Test: (1) `loadTemplateContent('en')` and `loadTemplateContent('de')` succeed from dist; (2) CLI `--penetrance 1.5` is rejected before query; (3) CLI reports match manifest version.
- [ ] **Step 2 (Code):** Update `packages/core/tsdown.config.ts` to emit templates to `dist/templates/`. Update `load-templates.ts` to resolve via `import.meta.url`. In `packages/cli/src/commands/analyze.ts`, validate penetrance with Zod and declare `zod` and `commander` dependencies in `package.json`.
- [ ] **Step 3 (Verify):** Run `bun run --filter @gnomad-cf/core build && bun run --filter @gnomad-cf/cli test`. Assert clean pass.
- [ ] **Step 4 (Commit):** `git commit -m "fix(core,cli): bundle templates to dist and enforce CLI penetrance validation (SPEC-10, NEW-09, PLAN-08)"`

#### Task 3.2: Dynamic Clinical Report Attribution & Semantic Tokens (ARCH-2, DX-4, PLAN-06, DEBT-02)
- [ ] **Step 1 (Test):** In `apps/web/src/composables/__tests__/useTextGenerator.test.ts`, assert German and English clinical reports dynamically display active gnomAD dataset label (`"gnomAD v4.1"`, `"gnomAD v3.1.2"`, `"gnomAD v2.1.1"`). In `quality-flags.test.ts`, assert return of semantic tokens (`warning`, `danger`, `info`).
- [ ] **Step 2 (Code):** Update `apps/web/src/composables/useTextGenerator.ts` to read dataset version label from `versionStore`. Update `packages/core/src/filters/quality-flags.ts` and `packages/core/src/types/tokens.ts`.
- [ ] **Step 3 (Verify):** Run `bun run --filter gnomad-cf-web test useTextGenerator.test.ts && bun run --filter @gnomad-cf/core test quality-flags.test.ts`.
- [ ] **Step 4 (Commit):** `git commit -m "feat(web,core): add dynamic report dataset attribution and semantic color tokens (ARCH-2, DX-4, PLAN-06, DEBT-02)"`

#### Task 3.3: Authoritative Recurrence Risk, Homozygote Counts & Exclusion Parity in Exports (NEW-01, NEW-06, NEW-08, PLAN-05)
- [ ] **Step 1 (Test):** Create `apps/web/src/utils/__tests__/export-utils.test.ts`. Test: (1) recurrence risk matches `calculateRecurrenceRisk` for all 4 index statuses; (2) variants with identical AC/AN but different Hom counts produce distinct TSV source carrier frequencies under active homozygote exclusion; (3) JSON/XLSX/TSV distinctly flag manual vs quality exclusions with provenance reasons.
- [ ] **Step 2 (Code):** Refactor `apps/web/src/utils/export-utils.ts` and `xlsx-export.ts` to accept complete export payload (`context`, `result`, `variants`, `manualExclusions`, `qualityExclusions`, `indexStatus`, `penetrance`), preserving homozygote counts and exclusion reasons.
- [ ] **Step 3 (Verify):** Run `bun run --filter gnomad-cf-web test export-utils.test.ts`. Assert clean pass.
- [ ] **Step 4 (Commit):** `git commit -m "fix(web): align multi-format exports with core recurrence risk, homozygote counts, and quality exclusions (NEW-01, NEW-06, NEW-08, PLAN-05)"`

---

## 6. Lane 5 (Phase E): Accessible Component Architecture & Ergonomics

**Branch:** `remediation/lane-5-a11y-ui`  
**Package:** `apps/web`  
**Findings Addressed:** `ARCH-1`, `A11Y-1`, `A11Y-2`, `A11Y-3`, `A11Y-4`, `NEW-12`, `PLAN-05`, `PLAN-10`, `DEBT-06`  
**Prerequisites:** Phase A (`lane-4-toolchain-ci`), Phase B (`lane-1-core-calc`), Phase C (`lane-2-state-worker`), Phase D (`lane-3-reports-exports`)  
**File Limit Rule:** **STRICT: No file may exceed 650 LOC.** Monolithic `StepResults.vue` (> 1150 LOC) and `SettingsDialog.vue` (1223 LOC) MUST be decomposed.

### File Map:
- **New Decomposed Subcomponents (`StepResults.vue` Decomposition, ARCH-1):**
  - `apps/web/src/components/results/ResultsSummaryCard.vue` (< 250 LOC): Carrier frequency, risk, and Bayesian prevalence metrics.
  - `apps/web/src/components/results/PopulationFrequencyTable.vue` (< 380 LOC): Accessible table with keyboard activation (A11Y-1).
  - `apps/web/src/components/results/SourceFrequencyBreakdown.vue` (< 280 LOC): ClinVar / pLoF / Both category breakdown (DEBT-06).
  - `apps/web/src/components/results/VariantDrilldownDialog.vue` (< 350 LOC): Variant inspection modal with focus trapping and focus return.
  - `apps/web/src/components/results/ResultsExportActions.vue` (< 250 LOC): Export buttons passing complete context payload (PLAN-05).
- **New Decomposed Subcomponents (`SettingsDialog.vue` Decomposition, PLAN-10):**
  - `apps/web/src/components/settings/GeneralSettingsTab.vue` (< 250 LOC)
  - `apps/web/src/components/settings/QualitySettingsTab.vue` (< 300 LOC)
  - `apps/web/src/components/settings/FilterSettingsTab.vue` (< 300 LOC)
  - `apps/web/src/components/settings/CacheSettingsTab.vue` (< 200 LOC)
- **New Common Components & Tests:**
  - `apps/web/src/components/common/ErrorBoundary.vue` (< 180 LOC): Global error boundary with recoverable reset (A11Y-4).
  - `apps/web/src/components/common/__tests__/ErrorBoundary.test.ts` (< 180 LOC)
  - `apps/web/e2e/a11y-keyboard-drilldown.spec.ts` (< 200 LOC)
  - `apps/web/e2e/mobile-chart-drilldown.spec.ts` (< 180 LOC)
- **Modified Files:**
  - `apps/web/src/components/wizard/StepResults.vue` (< 280 LOC): Thin coordinator importing decomposed subcomponents.
  - `apps/web/src/components/SettingsDialog.vue` (< 250 LOC): Thin modal coordinator importing settings tabs.
  - `apps/web/src/components/PopulationBarChart.vue` (< 350 LOC): Keyboard affordances, remove `touchstart.prevent` (A11Y-2, NEW-12).
  - `apps/web/src/components/wizard/WizardStepper.vue` (< 400 LOC): Programmatic focus to step header on transition (A11Y-3).
  - `apps/web/src/App.vue` (< 150 LOC): Wrap `<WizardStepper>` in `<ErrorBoundary>`.

### Implementation Tasks:

#### Task 5.1: Global Error Boundary Component (A11Y-4, DEBT-06)
- [ ] **Step 1 (Test):** Create `apps/web/src/components/common/__tests__/ErrorBoundary.test.ts`. Test: (1) catches render error; (2) displays alert card; (3) logs to store; (4) reset button clears error state without corrupting saved history in IndexedDB.
- [ ] **Step 2 (Code):** Implement `apps/web/src/components/common/ErrorBoundary.vue` using Vue 3 `onErrorCaptured`. In `apps/web/src/App.vue`, wrap `<WizardStepper />` in `<ErrorBoundary>`.
- [ ] **Step 3 (Verify):** Run `bun run --filter gnomad-cf-web test ErrorBoundary.test.ts`. Assert clean pass.
- [ ] **Step 4 (Commit):** `git commit -m "feat(web): add global ErrorBoundary with recoverable reset flow (A11Y-4)"`

#### Task 5.2: Decompose StepResults.vue and SettingsDialog.vue into Subcomponents < 650 LOC (ARCH-1, PLAN-10)
- [ ] **Step 1 (Results Decomposition):** Extract `StepResults.vue` into `ResultsSummaryCard.vue`, `PopulationFrequencyTable.vue`, `SourceFrequencyBreakdown.vue`, `VariantDrilldownDialog.vue`, and `ResultsExportActions.vue`. In `ResultsExportActions.vue`, construct full export payload per Task 3.3.
- [ ] **Step 2 (Settings Decomposition):** Extract `SettingsDialog.vue` into `GeneralSettingsTab.vue`, `QualitySettingsTab.vue`, `FilterSettingsTab.vue`, and `CacheSettingsTab.vue`.
- [ ] **Step 3 (Verify LOC):** Run `bun test scripts/check-file-size.ts`. Assert **zero** files exceed 650 LOC across the entire repository.
- [ ] **Step 4 (Commit):** `git commit -m "refactor(web): decompose StepResults.vue and SettingsDialog.vue into subcomponents strictly < 650 LOC (ARCH-1, PLAN-10)"`

#### Task 5.3: Accessible Keyboard Navigation, Focus Return & Mobile Touch Drilldown (A11Y-1, A11Y-2, A11Y-3, NEW-12, DEBT-06)
- [ ] **Step 1 (Test):** Create `apps/web/e2e/a11y-keyboard-drilldown.spec.ts` and `apps/web/e2e/mobile-chart-drilldown.spec.ts`.
- [ ] **Step 2 (Code):**
  - In `PopulationFrequencyTable.vue`: add `tabindex="0"`, focus rings, and Enter/Space event handlers.
  - In `PopulationBarChart.vue`: add `role="button"`, focus outline, Enter/Space activation, and remove `touchstart.prevent`.
  - In `VariantDrilldownDialog.vue`: return focus to activating button/bar upon dialog close.
  - In `WizardStepper.vue`: programmatically focus step heading on transition.
- [ ] **Step 3 (Verify):** Run `CI=1 bunx playwright test apps/web/e2e/a11y-keyboard-drilldown.spec.ts apps/web/e2e/mobile-chart-drilldown.spec.ts`. Assert clean pass.
- [ ] **Step 4 (Commit):** `git commit -m "feat(web): implement accessible keyboard navigation, focus return, and mobile chart drilldown (A11Y-1, A11Y-2, A11Y-3, NEW-12)"`

---

## 7. Lane 6 (Phase F): Performance Engineering, Bundle Optimization & Rigorous Benchmarks

**Branch:** `remediation/lane-6-perf-benchmarks`  
**Package:** `apps/web`  
**Findings Addressed:** `PERF-1`, `PERF-2`, `PERF-4`, `BUILD-3`, `SPEC-13`, `SPEC-14`, `PLAN-11`, `PLAN-12`, `DEBT-04`  
**Prerequisites:** Phase A through Phase E  
**File Limit Rule:** No non-test source file may exceed 650 LOC.

### File Map:
- **New Files:**
  - `apps/web/e2e/fixtures/cftr-mock.json`: Static mock response for CFTR.
  - `apps/web/e2e/fixtures/orphanet-mock.json`: Static mock response for Orphanet prevalence.
  - `apps/web/e2e/benchmarks/performance-benchmark.spec.ts` (< 350 LOC): Isolated benchmark measuring TTFB, FCP, LCP, TBT, refilter, and drilldown (SPEC-13, PLAN-11).
  - `scripts/run-benchmarks.ts` (< 200 LOC): Runner script executing 5 iterations and computing median and IQR.
- **Modified Files:**
  - `apps/web/vite.config.ts` (< 250 LOC): Manual chunk vendor splitting and Workbox rule cleanup (PERF-4, BUILD-3).
  - `apps/web/src/utils/xlsx-export.ts` (< 300 LOC): Dynamic import via `write-excel-file/universal` (PERF-2, PLAN-12).
  - `apps/web/src/main.ts` (< 150 LOC): Optimize Vuetify icon and font loading (PERF-1, DEBT-04).

### Implementation Tasks:

#### Task 6.1: Dynamic Excel Export Loading & Vendor Code Splitting (PERF-2, PERF-4, SPEC-14, BUILD-3, PLAN-12, DEBT-04)
- [ ] **Step 1 (Code):** In `apps/web/src/utils/xlsx-export.ts`, dynamically import `write-excel-file/universal` (`const { default: writeXlsxFile } = await import('write-excel-file/universal')`).
- [ ] **Step 2 (Vite & Main Config):** In `apps/web/vite.config.ts`, configure `manualChunks` splitting `vue`, `vuetify`, `comlink`, and `idb`. Clean up Workbox opaque caching. In `apps/web/src/main.ts`, prune unused webfont formats.
- [ ] **Step 3 (Verify):** Run `bun run build`. Assert main vendor chunk size reduction and creation of isolated `write-excel-file` chunk.
- [ ] **Step 4 (Commit):** `git commit -m "perf(web): dynamic import write-excel-file/universal and configure vendor code splitting (PERF-2, PERF-4, PLAN-12)"`

#### Task 6.2: Deterministic Isolated Benchmark Harness & Metric Reporting (SPEC-13, PLAN-11)
- [ ] **Step 1 (Fixtures):** Create `apps/web/e2e/fixtures/cftr-mock.json` and `apps/web/e2e/fixtures/orphanet-mock.json`.
- [ ] **Step 2 (Harness Implementation):** Implement `apps/web/e2e/benchmarks/performance-benchmark.spec.ts`:
  - Browser: Pinned Chromium, desktop viewport (1280×800), origin `http://127.0.0.1:4173/`.
  - Network Interception: Intercept `https://gnomad.broadinstitute.org/api`, `https://gnomad.broadinstitute.org/api/**`, `https://search.clinicalgenome.org/**`, `https://api.orphadata.com/**`, and local `**/data/clingen-gene-validity.csv`. Fail test on any unmocked external request.
  - Fixture Verification: Assert CFTR fixture produces expected 12 qualifying variants before measurement.
  - Cold Navigation (5 samples): Clear CDP storage (`Storage.clearDataForOrigin`), collect TTFB, FCP, LCP (PerformanceObserver), and TBT ($\sum (\text{duration} - 50)$ for `longtask` entries between FCP and 500ms quiet window).
  - Warm Interaction (5 samples): 1 warm-up navigation, measure refilter duration and drilldown dialog render interval (`page.locator('.v-dialog .v-card').waitFor({ state: 'visible' })`).
  - Reporting: Compute and output median and IQR across the 5 runs.
- [ ] **Step 3 (Verify):** Run `CI=1 bunx playwright test apps/web/e2e/benchmarks/performance-benchmark.spec.ts`. Assert all 5 runs succeed and output valid median/IQR statistics.
- [ ] **Step 4 (Commit):** `git commit -m "test(benchmarks): implement isolated deterministic benchmark harness with 5-sample median and IQR (SPEC-13, PLAN-11)"`

---

## 8. Cross-Lane Verification Gates & Draft PR Protocol

### Verification Gate Checklist (Pre-PR for Each Lane):
1. **File LOC Check:**
   `bun test scripts/check-file-size.ts`
   Must output **zero** tracked non-test files $\ge 650$ LOC.
2. **Typecheck & Unit Test Validation:**
   `bun run typecheck && bun run test --run`
   Must pass with 0 errors.
3. **Calibrated Coverage Gate:**
   `bun run test:coverage`
   Enforce calibrated thresholds: Core $\ge 80\%$, CLI $\ge 70\%$, Web $\ge 35\%$.
4. **Lint Validation:**
   `bun run lint`
   Must pass with 0 warnings.
5. **E2E Suite:**
   `bun run test:e2e`
   Must pass without errors.

### Draft PR Creation Protocol:
For each lane, upon passing all verification gates:
1. Push feature branch: `git push origin <branch-name>`
2. Create GitHub Draft PR using GitHub CLI:
   `gh pr create --draft --title "<Title>" --body "<Detailed Description linking to SPEC, PLAN, and STATUS.md>"`
3. Update `.planning/remediation/STATUS.md` with commit SHA and PR number.
