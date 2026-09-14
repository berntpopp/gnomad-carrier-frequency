# Remediation Implementation Plan: Parallel Lanes & Verification

**Document ID:** `PLAN-2026-09-14-REMEDIATION`  
**Revision:** 1.0  
**Date:** 2026-09-14  
**Author:** Lead Engineer (`gnomad-carrier-frequency`)  
**Target Repository:** `gnomad-carrier-frequency`  
**Specification Reference:** `docs/superpowers/specs/2026-09-14-remediation-design.md` (Revision 8.0, Approved)  
**Ledger Reference:** `.planning/remediation/STATUS.md`  
**Integration Base SHA:** `083375e`  

---

## 1. Executive Summary & Lane Architecture

This plan operationalizes the approved architecture design (`SPEC-2026-09-14-REMEDIATION` Rev 8.0) across **six independent, parallel implementation lanes**. Each lane executes in an isolated Git worktree on a dedicated feature branch, follows Test-Driven Development (TDD), enforces the strict **`< 650 LOC` per file limit** from [`AGENTS.md`](file:///home/bernt-popp/development/gnomad-carrier-frequency/AGENTS.md), and strives towards the repository's **`> 89%` test coverage target**.

```
                           ┌─────────────────────────┐
                           │   remediation/          │
                           │   integration (Base)    │
                           └────────────┬────────────┘
         ┌───────────────┬──────────────┼──────────────┬───────────────┬──────────────┐
         ▼               ▼              ▼              ▼               ▼              ▼
   ┌───────────┐   ┌───────────┐  ┌───────────┐  ┌───────────┐   ┌───────────┐  ┌───────────┐
   │  Lane 1   │   │  Lane 2   │  │  Lane 3   │  │  Lane 4   │   │  Lane 5   │  │  Lane 6   │
   │Core Math &│   │State, Txn │  │Reports &  │  │Toolchain, │   │Accessible │  │Perf, Bund-│
   │Prevalence │   │& Workers  │  │Exports    │  │CI & Assets│   │Components │  │le & Bench │
   └─────┬─────┘   └─────┬─────┘  └─────┬─────┘  └─────┬─────┘   └─────┬─────┘  └─────┬─────┘
         │               │              │              │               │              │
         ▼               ▼              ▼              ▼               ▼              ▼
   Draft PR 1      Draft PR 2     Draft PR 3     Draft PR 4      Draft PR 5     Draft PR 6
```

### Monorepo Worktree Allocation:
- **Lane 1 (`.worktrees/lane-1`):** Branch `remediation/lane-1-core-calc`
- **Lane 2 (`.worktrees/lane-2`):** Branch `remediation/lane-2-state-worker`
- **Lane 3 (`.worktrees/lane-3`):** Branch `remediation/lane-3-reports-exports`
- **Lane 4 (`.worktrees/lane-4`):** Branch `remediation/lane-4-toolchain-ci`
- **Lane 5 (`.worktrees/lane-5`):** Branch `remediation/lane-5-a11y-ui`
- **Lane 6 (`.worktrees/lane-6`):** Branch `remediation/lane-6-perf-benchmarks`

---

## 2. Lane 1: Core Mathematical Calculations & Prevalence Subsystem

**Branch:** `remediation/lane-1-core-calc`  
**Package:** `@gnomad-cf/core`  
**Findings Addressed:** `ARCH-3`, `ARCH-5`, `NEW-01`, `NEW-06`, `SPEC-01`, `SPEC-02`, `SPEC-03`, `SPEC-05`  
**File Limit Rule:** No file may exceed 650 LOC.

### File Map:
- **New Files:**
  - `packages/core/src/types/context.ts` (< 150 LOC): `AnalysisContext` schema & Zod parser.
  - `packages/core/src/calculations/recurrence-risk.ts` (< 100 LOC): Canonical `calculateRecurrenceRisk`.
  - `packages/core/src/calculations/bayesian-prevalence.ts` (< 80 LOC): Canonical `calculateBayesianPrevalence`.
  - `packages/core/src/calculations/decision-matrix.ts` (< 250 LOC): Cases 1–6 evaluation with exhaustive disjoint predicates.
  - `packages/core/src/calculations/__tests__/recurrence-risk.test.ts` (< 200 LOC)
  - `packages/core/src/calculations/__tests__/bayesian-prevalence.test.ts` (< 150 LOC)
  - `packages/core/src/calculations/__tests__/decision-matrix.test.ts` (< 350 LOC)
  - `packages/core/src/types/__tests__/context.test.ts` (< 180 LOC)
- **Modified Files:**
  - `packages/core/src/calculations/carrier-frequency.ts` (< 400 LOC): Route through canonical decision matrix and risk helper.
  - `packages/core/src/calculations/source-frequency.ts` (< 250 LOC): Respect `useHomExclusion` in source calculations.
  - `packages/core/src/index.ts` (< 100 LOC): Re-export new modules.

### Bite-Sized Implementation Tasks:

#### Task 1.1: Canonical AnalysisContext Schema & Serialization (SPEC-01)
- [ ] **Step 1 (Test):** Create `packages/core/src/types/__tests__/context.test.ts`. Write parameterized unit tests verifying `AnalysisContextSchema` serialization, validation of all `QualitySettings` and `QualityExclusionConfig` fields, penetrance bounds `[0.0, 1.0]`, and integer `clinvarConflictingThreshold`.
- [ ] **Step 2 (Code):** Create `packages/core/src/types/context.ts`. Implement `AnalysisContext` TypeScript interface and `AnalysisContextSchema` using Zod.
- [ ] **Step 3 (Verify):** Run `bun run --filter @gnomad-cf/core test context.test.ts`. Assert clean pass.
- [ ] **Step 4 (Commit):** `git commit -m "feat(core): add AnalysisContext schema and serialization validation (SPEC-01)"`

#### Task 1.2: Authoritative Recurrence Risk Helper (SPEC-02, ARCH-5, NEW-01)
- [ ] **Step 1 (Test):** Create `packages/core/src/calculations/__tests__/recurrence-risk.test.ts`. Assert `heterozygous` returns $CF \times 0.25 \times \text{penetrance}$, `homozygous`/`compound_het_confirmed`/`compound_het_assumed` returns $CF \times 0.5 \times \text{penetrance}$, unknown/undefined returns `null`, and penetrance is clamped/validated in `[0.0, 1.0]`.
- [ ] **Step 2 (Code):** Create `packages/core/src/calculations/recurrence-risk.ts`. Export `calculateRecurrenceRisk(carrierFrequency, indexStatus, penetrance)`.
- [ ] **Step 3 (Verify):** Run `bun run --filter @gnomad-cf/core test recurrence-risk.test.ts`. Assert clean pass.
- [ ] **Step 4 (Commit):** `git commit -m "feat(core): implement authoritative calculateRecurrenceRisk helper (SPEC-02, ARCH-5, NEW-01)"`

#### Task 1.3: Bayesian Genetic Prevalence & Contextual Orphanet Separation (SPEC-03)
- [ ] **Step 1 (Test):** Create `packages/core/src/calculations/__tests__/bayesian-prevalence.test.ts`. Assert $q^2 \times \text{penetrance}$ formulation, penetrance 0.0 boundary behavior, and fallback prior inversion ($CF=0.01 \implies q=0.005 \implies q^2=0.000025$).
- [ ] **Step 2 (Code):** Create `packages/core/src/calculations/bayesian-prevalence.ts`. Export `calculateBayesianPrevalence(carrierFrequency, penetrance)`.
- [ ] **Step 3 (Verify):** Run `bun run --filter @gnomad-cf/core test bayesian-prevalence.test.ts`. Assert clean pass.
- [ ] **Step 4 (Commit):** `git commit -m "feat(core): implement calculateBayesianPrevalence and fallback prior inversion (SPEC-03)"`

#### Task 1.4: Exhaustive Disjoint Decision Matrix for Zero, Missing, and Fallback (SPEC-05)
- [ ] **Step 1 (Test):** Create `packages/core/src/calculations/__tests__/decision-matrix.test.ts`. Write test cases covering all 6 cases: Case 1 (missing data), Case 2 (no pathogenic candidates), Case 3 (all candidates excluded), Case 4 (observed zero), Case 5 (positive homozygotes-only), Case 6 (normal residual). Include edge case with 1 excluded pathogenic variant ($AN=0$) and 1 benign variant ($AN=100$) asserting Case 1 match.
- [ ] **Step 2 (Code):** Create `packages/core/src/calculations/decision-matrix.ts`. Implement formal variant partition sets ($V_{\text{raw}}$, $V_{\text{path}}$, $V_{\text{inc}}$) and disjoint decision rules per Spec §2.2.5.
- [ ] **Step 3 (Verify):** Run `bun run --filter @gnomad-cf/core test decision-matrix.test.ts`. Assert clean pass.
- [ ] **Step 4 (Commit):** `git commit -m "feat(core): implement exhaustive disjoint decision matrix for Cases 1-6 (SPEC-05)"`

#### Task 1.5: Source Frequency Homozygote Exclusion Consistency (NEW-06)
- [ ] **Step 1 (Test):** Add test in `packages/core/tests/source-frequency.test.ts` asserting that `calculateSourceFrequency` respects `useHomExclusion` and matches parent carrier frequency when only a single source is present.
- [ ] **Step 2 (Code):** Modify `packages/core/src/calculations/source-frequency.ts` lines 107–115 to branch on `useHomExclusion`.
- [ ] **Step 3 (Verify):** Run `bun run --filter @gnomad-cf/core test source-frequency.test.ts`. Assert clean pass.
- [ ] **Step 4 (Commit):** `git commit -m "fix(core): ensure source frequency calculation respects homozygote exclusion (NEW-06)"`

---

## 3. Lane 2: Reactive State Coordination & Worker Pipelines

**Branch:** `remediation/lane-2-state-worker`  
**Packages:** `apps/web`, `@gnomad-cf/core`  
**Findings Addressed:** `CRIT-1`, `NEW-02`, `NEW-03`, `NEW-04`, `NEW-05`, `NEW-07`, `SPEC-01`, `SPEC-04`, `SPEC-06`, `SPEC-07-TXN`, `SPEC-07-MIG`, `SPEC-08`  
**File Limit Rule:** No file may exceed 650 LOC.

### File Map:
- **New Files:**
  - `apps/web/src/composables/__tests__/useCarrierFrequency.concurrency.test.ts` (< 350 LOC): Tests for rapid edits, worker replay, and atomic commit guards.
  - `apps/web/src/composables/__tests__/useHistoryRestore.test.ts` (< 400 LOC): Transactional restore across datasets, legacy migrations, and watcher suppression.
  - `apps/web/src/composables/__tests__/useGeneConfig.restore.test.ts` (< 300 LOC): Stale completion, token invalidation, and null config profile clearance.
  - `packages/core/tests/clinvar-submissions-query.test.ts` (< 200 LOC): Parameterized GraphQL query building and assembly scoping.
- **Modified Files:**
  - `apps/web/src/composables/useCarrierFrequency.ts` (< 500 LOC): Revision tracking, atomic commit guard, coalesced replay in `finally`.
  - `apps/web/src/composables/useGeneConfig.ts` (< 300 LOC): `activeConfigToken`, `wasStartedDuringRestore`, owner-checked null settlement.
  - `apps/web/src/composables/useHistoryRestore.ts` (< 450 LOC): Transaction mutex, dataset sequencing, legacy history migration.
  - `apps/web/src/composables/useHistoryAutoSave.ts` (< 250 LOC): Autosave debounce deferred when `isCalculating` is true.
  - `apps/web/src/composables/useWizard.ts` (< 350 LOC): Watcher suppression when `isRestoring` is true.
  - `apps/web/src/composables/useClinvarSubmissions.ts` (< 300 LOC): Assembly-scoped ClinVar submissions querying.
  - `packages/core/src/queries/clinvar-submissions.ts` (< 150 LOC): Upstream schema conformance (singular `clinvar_variant`, `submitter_name`).

### Bite-Sized Implementation Tasks:

#### Task 2.1: Worker Revision Machine & Coalesced Replay (SPEC-06, NEW-02)
- [ ] **Step 1 (Test):** Create `apps/web/src/composables/__tests__/useCarrierFrequency.concurrency.test.ts`. Simulate rapid filter toggles while worker promises are in-flight; verify intermediate results are discarded, exactly one follow-up is replayed in `finally`, and `isCalculating` releases ownership before replay.
- [ ] **Step 2 (Code):** Update `apps/web/src/composables/useCarrierFrequency.ts` per Spec §2.3.1. Implement `activeContextRevision`, `inFlightSession`, `inFlightRevision`, atomic commit guard, and ownership clearance prior to `requestCalculation()` in `finally`.
- [ ] **Step 3 (Verify):** Run `bun run --filter gnomad-cf-web test useCarrierFrequency.concurrency.test.ts`. Assert clean pass.
- [ ] **Step 4 (Commit):** `git commit -m "fix(web): implement worker revision machine and coalesced replay protocol (SPEC-06, NEW-02)"`

#### Task 2.2: Atomic Token Guard & Profile Load Suppression in useGeneConfig (SPEC-07-TXN, NEW-03)
- [ ] **Step 1 (Test):** Create `apps/web/src/composables/__tests__/useGeneConfig.restore.test.ts`. Test: (1) restore started load completes after lock release; (2) same-symbol superseded loads discard older response; (3) unconfigured gene (TTN) clears previous gene profiles (CFTR) without resetting restored stores.
- [ ] **Step 2 (Code):** Update `apps/web/src/composables/useGeneConfig.ts` per Spec §2.3.2. Implement `wasStartedDuringRestore`, `activeConfigToken`, reject superseded tokens before mutation, and owner-checked settlement clearing obsolete profiles on `config === null` without resetting stores.
- [ ] **Step 3 (Verify):** Run `bun run --filter gnomad-cf-web test useGeneConfig.restore.test.ts`. Assert clean pass.
- [ ] **Step 4 (Commit):** `git commit -m "fix(web): add atomic token guard and restore profile settlement to useGeneConfig (SPEC-07-TXN, NEW-03)"`

#### Task 2.3: Transactional History Restoration & Legacy Migration (SPEC-07-MIG, SPEC-07-TXN, NEW-04)
- [ ] **Step 1 (Test):** Create `apps/web/src/composables/__tests__/useHistoryRestore.test.ts`. Verify: `isRestoring` mutex lock, cancellation of pending autosaves, version update in `versionStore` before gene selection, watcher suppression in `useWizard.ts`, and exact legacy migration mapping `raw.frequencySource ?? raw.source ?? 'gnomad'`.
- [ ] **Step 2 (Code):** Update `apps/web/src/composables/useHistoryRestore.ts`, `useWizard.ts`, and `useHistoryAutoSave.ts`.
- [ ] **Step 3 (Verify):** Run `bun run --filter gnomad-cf-web test useHistoryRestore.test.ts`. Assert clean pass.
- [ ] **Step 4 (Commit):** `git commit -m "fix(web): implement transactional history restore and legacy migration (SPEC-07-TXN, SPEC-07-MIG, NEW-04)"`

#### Task 2.4: Upstream ClinVar GraphQL Query & Assembly Scoping (SPEC-08, NEW-05, CRIT-1)
- [ ] **Step 1 (Test):** Create `packages/core/tests/clinvar-submissions-query.test.ts`. Assert query uses singular `clinvar_variant(variant_id: ..., reference_genome: ...)`, `submitter_name`, and typed GraphQL variables.
- [ ] **Step 2 (Code):** Refactor `packages/core/src/queries/clinvar-submissions.ts` and `apps/web/src/composables/useClinvarSubmissions.ts` to pass reference genome matching active dataset.
- [ ] **Step 3 (Verify):** Run `bun run --filter @gnomad-cf/core test clinvar-submissions-query.test.ts`. Assert clean pass.
- [ ] **Step 4 (Commit):** `git commit -m "fix(core,web): align ClinVar submissions query with upstream schema and assembly (SPEC-08, NEW-05, CRIT-1)"`

---

## 4. Lane 3: Clinical Reporting & Multi-Format Data Exports

**Branch:** `remediation/lane-3-reports-exports`  
**Packages:** `@gnomad-cf/core`, `@gnomad-cf/cli`, `apps/web`  
**Findings Addressed:** `ARCH-2`, `ARCH-5`, `NEW-01`, `NEW-06`, `NEW-08`, `NEW-09`, `SPEC-01`, `SPEC-10`, `DX-4`  
**File Limit Rule:** No file may exceed 650 LOC.

### File Map:
- **New Files:**
  - `packages/core/src/types/tokens.ts` (< 100 LOC): Semantic color and severity tokens.
  - `packages/core/src/templates/__tests__/load-templates.test.ts` (< 150 LOC): Template resolution test.
  - `packages/cli/tests/clinical-formatter.test.ts` (< 250 LOC): CLI report generation test across languages.
  - `apps/web/src/utils/__tests__/export-utils.test.ts` (< 450 LOC): Multi-format export verification (TSV, JSON).
  - `apps/web/src/utils/__tests__/xlsx-export.test.ts` (< 350 LOC): Excel workbook data structure tests.
- **Modified Files:**
  - `packages/core/src/templates/load-templates.ts` (< 150 LOC): Bundled asset resolution via `import.meta.url`.
  - `packages/core/src/templates/clinical-report.ts` (< 350 LOC): Dynamic version attribution and recurrence risk contract.
  - `packages/core/tsdown.config.ts` (< 80 LOC): Copy templates to `dist/templates/`.
  - `apps/web/src/utils/export-utils.ts` (< 500 LOC): Use `calculateRecurrenceRisk`, distinguish manual vs quality exclusions, correct TSV source calculations.

### Bite-Sized Implementation Tasks:

#### Task 3.1: Bundled Core Templates & CLI Formatter Execution (SPEC-10, NEW-09)
- [ ] **Step 1 (Test):** Create `packages/core/src/templates/__tests__/load-templates.test.ts` and `packages/cli/tests/clinical-formatter.test.ts`. Assert that `loadTemplateContent('en')` and `loadTemplateContent('de')` succeed from built dist.
- [ ] **Step 2 (Code):** Update `packages/core/tsdown.config.ts` to copy `src/config/templates` to `dist/templates/`. Update `load-templates.ts` to resolve relative to `import.meta.url`.
- [ ] **Step 3 (Verify):** Run `bun run --filter @gnomad-cf/core build && bun run --filter @gnomad-cf/cli test clinical-formatter.test.ts`. Assert clean pass.
- [ ] **Step 4 (Commit):** `git commit -m "fix(core,cli): bundle templates into dist and resolve via import.meta.url (SPEC-10, NEW-09)"`

#### Task 3.2: Dynamic Clinical Report Attribution & Semantic Tokens (ARCH-2, DX-4)
- [ ] **Step 1 (Test):** Write unit test asserting dataset version attribution in German ("gnomAD v4.1.0") and English reports, and verifying core calculations return semantic tokens rather than Vuetify colors.
- [ ] **Step 2 (Code):** Update `packages/core/src/templates/clinical-report.ts` and export semantic tokens in `packages/core/src/types/tokens.ts`.
- [ ] **Step 3 (Verify):** Run `bun run --filter @gnomad-cf/core test`. Assert clean pass.
- [ ] **Step 4 (Commit):** `git commit -m "feat(core): add dynamic report dataset attribution and semantic color tokens (ARCH-2, DX-4)"`

#### Task 3.3: Authoritative Recurrence Risk & Exclusion Parity in Exports (NEW-01, NEW-06, NEW-08)
- [ ] **Step 1 (Test):** Create `apps/web/src/utils/__tests__/export-utils.test.ts`. Test: recurrence risk matches `calculateRecurrenceRisk` (heterozygous -> CF/4, homozygous -> CF/2); variant TSV exports source carrier frequencies under active homozygote exclusion; JSON/XLSX/TSV distinctly flag manual vs quality exclusions with provenance reasons.
- [ ] **Step 2 (Code):** Refactor `apps/web/src/utils/export-utils.ts` to import `calculateRecurrenceRisk` from `@gnomad-cf/core`, format source carrier frequencies properly, and populate exclusion reasons.
- [ ] **Step 3 (Verify):** Run `bun run --filter gnomad-cf-web test export-utils.test.ts`. Assert clean pass.
- [ ] **Step 4 (Commit):** `git commit -m "fix(web): align exports with core recurrence risk and quality exclusion schemas (NEW-01, NEW-06, NEW-08)"`

---

## 5. Lane 4: Monorepo Toolchains, CI Quality Gates & Asset Automation

**Branch:** `remediation/lane-4-toolchain-ci`  
**Packages:** Root, `.github/workflows/`, `scripts/`, `packages/core/tsconfig.json`  
**Findings Addressed:** `CRIT-2`, `BUILD-5`, `DX-1`, `DX-8`, `NEW-11`, `DX-9`, `NEW-10`, `NEW-13`, `SPEC-09`, `SPEC-11`, `SPEC-12-COV`, `SPEC-12-DOCS`  
**File Limit Rule:** No file may exceed 650 LOC.

### File Map:
- **New Files:**
  - `scripts/__tests__/update-clingen.test.ts` (< 250 LOC): Validator for ClinGen CSV structure.
  - `scripts/check-docs-assets.ts` (< 150 LOC): Verify no missing lean.js 404 preloads.
  - `.github/hooks/pre-commit` (< 50 LOC): Lightweight typecheck & lint verification.
- **Modified Files:**
  - `.github/workflows/tests.yml` (< 200 LOC): Remove continue-on-error, enforce test assertions.
  - `.github/workflows/deploy.yml` (< 150 LOC): Gate deploy on test/E2E SHA; copy docs from `apps/web/docs/.vitepress/dist` to `apps/web/dist/docs`.
  - `.github/workflows/screenshots.yml` (< 120 LOC): Hash `bun.lock` (not bun.lockb).
  - `.github/workflows/update-clingen-data.yml` (< 100 LOC): Download to `apps/web/public/data/`.
  - `scripts/update-clingen-gene-validity.ts` (< 250 LOC): Skip 4 lines preamble; validate line 5 headers.
  - `packages/core/tsconfig.json` (< 50 LOC): Enable `noUnusedLocals` and `noUnusedParameters`.
  - `apps/web/package.json` (< 150 LOC): Remove unused `jsdom`.
  - `package.json` (< 120 LOC): Calibrated `test:coverage` command using manifest name `gnomad-cf-web`.

### Bite-Sized Implementation Tasks:

#### Task 4.1: CI Test Enforcement & Deployment Gating (CRIT-2, SPEC-12-DOCS)
- [ ] **Step 1 (Config):** Update `.github/workflows/tests.yml` to remove all `continue-on-error: true` directives.
- [ ] **Step 2 (Config):** Update `.github/workflows/deploy.yml` to require passing test workflow on the exact SHA and update documentation merge path to `apps/web/docs/.vitepress/dist` -> `apps/web/dist/docs`.
- [ ] **Step 3 (Verify):** Validate GitHub Action workflow syntax.
- [ ] **Step 4 (Commit):** `git commit -m "ci: enforce test assertions as non-tolerated gates and fix docs merge path (CRIT-2, SPEC-12-DOCS)"`

#### Task 4.2: ClinGen Updater Automation & Preamble Schema Validation (NEW-13, SPEC-09)
- [ ] **Step 1 (Test):** Create `scripts/__tests__/update-clingen.test.ts`. Assert parser skips 4 metadata lines, verifies line 5 header names, and rejects malformed columns.
- [ ] **Step 2 (Code):** Update `scripts/update-clingen-gene-validity.ts` and `.github/workflows/update-clingen-data.yml` targeting `apps/web/public/data/clingen-gene-validity.csv`.
- [ ] **Step 3 (Verify):** Run `bun test scripts/__tests__/update-clingen.test.ts`. Assert clean pass.
- [ ] **Step 4 (Commit):** `git commit -m "fix(scripts,ci): update ClinGen validity script to validate preamble and target web public dir (NEW-13, SPEC-09)"`

#### Task 4.3: Workspace Test Coverage Script Alignment (SPEC-12-COV, DX-8, NEW-11, DX-9, BUILD-5)
- [ ] **Step 1 (Config):** Update root `package.json` `"test:coverage"` to invoke `bun run --filter @gnomad-cf/core test:coverage && bun run --filter @gnomad-cf/cli test:coverage && bun run --filter gnomad-cf-web test:coverage`.
- [ ] **Step 2 (Cleanup):** Remove `jsdom` from `apps/web/package.json`; update `.github/workflows/screenshots.yml` to hash `bun.lock`; enable `noUnusedLocals` in `packages/core/tsconfig.json`.
- [ ] **Step 3 (Verify):** Run `bun run typecheck && bun run test:coverage`. Assert execution of all three workspaces.
- [ ] **Step 4 (Commit):** `git commit -m "chore(toolchain): align coverage script filter names, fix lock caching, and prune jsdom (SPEC-12-COV, DX-8, DX-9)"`

---

## 6. Lane 5: Accessible Component Architecture & Ergonomics

**Branch:** `remediation/lane-5-a11y-ui`  
**Package:** `apps/web`  
**Findings Addressed:** `ARCH-1`, `A11Y-1`, `A11Y-2`, `A11Y-3`, `A11Y-4`, `NEW-12`  
**File Limit Rule:** **STRICT: No file may exceed 650 LOC.** `StepResults.vue` (> 1150 LOC) MUST be decomposed into single-responsibility subcomponents.

### File Map:
- **New Files (Decomposition of StepResults.vue):**
  - `apps/web/src/components/results/ResultsSummaryCard.vue` (< 250 LOC): Primary carrier frequency, risk, and prevalence metrics.
  - `apps/web/src/components/results/PopulationFrequencyTable.vue` (< 380 LOC): Accessible table with keyboard activation for drilldown.
  - `apps/web/src/components/results/SourceFrequencyBreakdown.vue` (< 280 LOC): Exome vs genome comparison breakdown.
  - `apps/web/src/components/results/VariantDrilldownDialog.vue` (< 350 LOC): Population variant inspection modal with focus trapping.
  - `apps/web/src/components/results/ResultsExportActions.vue` (< 250 LOC): Export buttons (TSV, JSON, XLSX) and clinical letter dialog.
  - `apps/web/src/components/common/ErrorBoundary.vue` (< 180 LOC): Component boundary catching runtime render errors with safe reset.
  - `apps/web/src/components/results/__tests__/PopulationFrequencyTable.test.ts` (< 200 LOC)
  - `apps/web/src/components/common/__tests__/ErrorBoundary.test.ts` (< 180 LOC)
  - `apps/web/e2e/a11y-keyboard-drilldown.spec.ts` (< 200 LOC)
  - `apps/web/e2e/mobile-chart-drilldown.spec.ts` (< 180 LOC)
- **Modified Files:**
  - `apps/web/src/components/wizard/StepResults.vue` (< 280 LOC): Thin coordinator importing decomposed subcomponents.
  - `apps/web/src/components/PopulationBarChart.vue` (< 350 LOC): Add keyboard affordances (`role="button"`, focus outline, Enter/Space), remove `touchstart.prevent`.
  - `apps/web/src/components/wizard/WizardStepper.vue` (< 400 LOC): Programmatic focus to step header on transition.
  - `apps/web/src/App.vue` (< 150 LOC): Wrap `<WizardStepper>` in `<ErrorBoundary>`.

### Bite-Sized Implementation Tasks:

#### Task 5.1: Global Error Boundary Component (A11Y-4)
- [ ] **Step 1 (Test):** Create `apps/web/src/components/common/__tests__/ErrorBoundary.test.ts`. Simulate child component error; assert alert card renders, error logs to store, and reset button restores default view.
- [ ] **Step 2 (Code):** Create `apps/web/src/components/common/ErrorBoundary.vue` using Vue 3 `onErrorCaptured`. In `apps/web/src/App.vue`, wrap `<WizardStepper />` in `<ErrorBoundary>`.
- [ ] **Step 3 (Verify):** Run `bun run --filter gnomad-cf-web test ErrorBoundary.test.ts`. Assert clean pass.
- [ ] **Step 4 (Commit):** `git commit -m "feat(web): add global ErrorBoundary with recoverable reset flow (A11Y-4)"`

#### Task 5.2: Decompose StepResults.vue into Subcomponents < 650 LOC (ARCH-1)
- [ ] **Step 1 (Subcomponents):** Create:
  - `apps/web/src/components/results/ResultsSummaryCard.vue`
  - `apps/web/src/components/results/PopulationFrequencyTable.vue`
  - `apps/web/src/components/results/SourceFrequencyBreakdown.vue`
  - `apps/web/src/components/results/VariantDrilldownDialog.vue`
  - `apps/web/src/components/results/ResultsExportActions.vue`
- [ ] **Step 2 (Coordinator):** Refactor `apps/web/src/components/wizard/StepResults.vue` into an orchestration component under 300 LOC delegating state and events to subcomponents.
- [ ] **Step 3 (Verify LOC):** Run `wc -l apps/web/src/components/results/*.vue apps/web/src/components/wizard/StepResults.vue`. Assert EVERY file is strictly < 650 LOC.
- [ ] **Step 4 (Commit):** `git commit -m "refactor(web): decompose StepResults.vue into focused subcomponents < 650 LOC (ARCH-1)"`

#### Task 5.3: Accessible Keyboard Navigation & Mobile Touch Drilldown (A11Y-1, A11Y-2, A11Y-3, NEW-12)
- [ ] **Step 1 (Test):** Create `apps/web/e2e/a11y-keyboard-drilldown.spec.ts` and `apps/web/e2e/mobile-chart-drilldown.spec.ts`.
- [ ] **Step 2 (Code):**
  - In `PopulationFrequencyTable.vue`: add `tabindex="0"`, focus rings, and Enter/Space event handlers.
  - In `PopulationBarChart.vue`: add `role="button"`, focus outline, Enter/Space activation, and remove `touchstart.prevent`.
  - In `WizardStepper.vue`: programmatically focus step heading on transition.
- [ ] **Step 3 (Verify):** Run `CI=1 bunx playwright test apps/web/e2e/a11y-keyboard-drilldown.spec.ts apps/web/e2e/mobile-chart-drilldown.spec.ts`. Assert clean pass.
- [ ] **Step 4 (Commit):** `git commit -m "feat(web): provide accessible keyboard navigation, focus management, and mobile drilldown (A11Y-1, A11Y-2, A11Y-3, NEW-12)"`

---

## 7. Lane 6: Performance Engineering, Bundle Optimization & Rigorous Benchmarks

**Branch:** `remediation/lane-6-perf-benchmarks`  
**Package:** `apps/web`  
**Findings Addressed:** `PERF-1`, `PERF-2`, `PERF-4`, `BUILD-3`, `SPEC-13`, `SPEC-14`  
**File Limit Rule:** No file may exceed 650 LOC.

### File Map:
- **New Files:**
  - `apps/web/e2e/fixtures/cftr-mock.json`: Static mock response for CFTR.
  - `apps/web/e2e/fixtures/orphanet-mock.json`: Static mock response for Orphanet prevalence.
  - `apps/web/e2e/benchmarks/performance-benchmark.spec.ts` (< 350 LOC): Isolated benchmark suite measuring TTFB, FCP, LCP, TBT, refilter, and drilldown.
  - `scripts/run-benchmarks.ts` (< 200 LOC): Execution script reporting 5-sample median and IQR.
- **Modified Files:**
  - `apps/web/vite.config.ts` (< 250 LOC): Manual chunk code splitting and workbox rule cleanup.
  - `apps/web/src/utils/xlsx-export.ts` (< 300 LOC): Dynamic import of `write-excel-file`.
  - `apps/web/src/plugins/vuetify.ts` (< 120 LOC): Prune unused webfonts.

### Bite-Sized Implementation Tasks:

#### Task 6.1: Dynamic Excel Export Loading & Bundle Splitting (PERF-2, PERF-4, SPEC-14, BUILD-3)
- [ ] **Step 1 (Code):** In `apps/web/src/utils/xlsx-export.ts`, convert `write-excel-file` to a dynamic import on click (`await import('write-excel-file')`).
- [ ] **Step 2 (Vite Config):** In `apps/web/vite.config.ts`, configure `build.rollupOptions.output.manualChunks` splitting `vue`, `vuetify`, `comlink`, and `idb`. Clean up outdated Workbox opaque caching rules.
- [ ] **Step 3 (Verify):** Run `bun run build`. Assert main vendor bundle reduction and separate `xlsx` chunk.
- [ ] **Step 4 (Commit):** `git commit -m "perf(web): lazy load excel export writer and configure vendor code splitting (PERF-2, PERF-4, SPEC-14)"`

#### Task 6.2: Deterministic Isolated Benchmark Harness (SPEC-13)
- [ ] **Step 1 (Fixtures):** Create `apps/web/e2e/fixtures/cftr-mock.json` and `apps/web/e2e/fixtures/orphanet-mock.json`.
- [ ] **Step 2 (Harness):** Create `apps/web/e2e/benchmarks/performance-benchmark.spec.ts`. Intercept:
  - `https://gnomad.broadinstitute.org/api` and `https://gnomad.broadinstitute.org/api/**`
  - `https://search.clinicalgenome.org/**`
  - `https://api.orphadata.com/**`
  - `**/data/clingen-gene-validity.csv`
  Assert immediate failure on any unmocked external network request. Implement CDP cache clearance before cold navigation, PerformanceObserver LCP/TBT measurement, and 5-sample reporting with median and IQR.
- [ ] **Step 3 (Verify):** Run `CI=1 bunx playwright test apps/web/e2e/benchmarks/performance-benchmark.spec.ts`. Assert all fixture routes match and measurements output valid statistics.
- [ ] **Step 4 (Commit):** `git commit -m "test(benchmarks): implement isolated deterministic benchmark harness with 5-sample median and IQR (SPEC-13)"`

---

## 8. Cross-Lane Integration, Verification Gates & Draft PR Protocol

```
Integration Sequence:
Lane 4 (Toolchain/CI) ──► Lane 1 (Core Calc) ──► Lane 3 (Exports)
                                │                      │
                                ▼                      ▼
                          Lane 2 (Workers) ──► Lane 5 (A11y/UI) ──► Lane 6 (Perf)
```

### Verification Gate Checklist (Pre-PR):
1. **File LOC Check:**
   `find packages apps -name "*.ts" -o -name "*.vue" | grep -v "node_modules" | xargs wc -l | awk '$1 > 650 {print}'`
   Must output **zero** files exceeding 650 LOC.
2. **Unit & Typecheck Validation:**
   `bun run typecheck && bun run test --run`
   Must pass with 0 errors.
3. **Calibrated Coverage Target (> 89% Target):**
   `bun run test:coverage`
   Enforce thresholds: Core ≥ 80%, CLI ≥ 70%, Web ≥ 35% (progressing toward >89% overall).
4. **Lint Validation:**
   `bun run lint`
   Must pass with 0 warnings.
5. **E2E Suite:**
   `bun run test:e2e`
   Must pass without unhandled errors.

### Draft PR Creation Protocol:
For each lane, upon passing all verification gates:
1. Push feature branch: `git push origin <branch-name>`
2. Create GitHub Draft PR using GitHub CLI:
   `gh pr create --draft --title "<Title>" --body "<Detailed Description linking to SPEC and STATUS.md>"`
3. Update `.planning/remediation/STATUS.md` with commit SHA and PR number.
