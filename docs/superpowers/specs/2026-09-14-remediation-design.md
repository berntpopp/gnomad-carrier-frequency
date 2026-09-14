# Remediation Specification & Architecture Design

**Document ID:** `SPEC-2026-09-14-REMEDIATION`  
**Date:** 2026-09-14  
**Author:** Lead Engineer (`gnomad-carrier-frequency`)  
**Status:** Under Review (Astra Review Gate Pending)  
**Target Repository:** `gnomad-carrier-frequency`  
**Integration Base SHA:** `083375e` (docs: add evidence-based codebase review for 2026-09-14)

---

## 1. Executive Summary & Problem Formulation

The September 14, 2026 codebase review identified critical calculation discrepancies, state-coordination race conditions, data-loss failure modes during history restore, unverified asset updates, accessibility barriers, and continuous-integration enforcement bypasses in `gnomad-carrier-frequency`.

### Core Defects Being Addressed
1. **Recurrence Risk & Export Discrepancies (NEW-01, NEW-06, NEW-08, ARCH-5, CLI-1):**
   - Population TSV exports halve the recurrence risk for an affected index patient (dividing carrier frequency by 4 instead of 2).
   - Source breakdowns and variant TSV disregard the selected homozygote-exclusion formula and report contradictory frequencies.
   - Quality-excluded variants are marked as included in exported data files.
   - CLI clinical letter generation hardcodes the carrier factor (1/4) regardless of affected patient status.
2. **Worker Concurrency & State Incoherence (NEW-02, NEW-03, NEW-07, ARCH-4):**
   - Rapid user changes during an in-flight gnomAD API fetch discard subsequent filter, quality, and exclusion settings, leading to stale or desynchronized calculations.
   - Applying condition-specific gene profiles (e.g. CFTR classic vs non-classic) updates default store preferences but fails to update active calculation state.
   - Quality threshold changes in `SettingsDialog` do not trigger worker re-filtering.
3. **History & URL Restoration State Loss (NEW-04, PERF-6):**
   - Restoring a saved history entry synchronously resets downstream fields in the wizard stepper, erasing selected index genotypes, literature frequencies, and data sources.
   - Restoring an entry from a different dataset version (e.g. v2 vs v4) ignores the saved dataset and queries the current active dataset with mismatched reference assemblies.
4. **Assembly-Scoped External Queries (NEW-05, DX-5, CRIT-1):**
   - ClinVar individual submission queries for gnomAD v2 (GRCh37) erroneously query the GRCh38 endpoint coordinates.
   - GraphQL query interpolation exposes a fragile boundary against upstream/cache data.
5. **CLI Packaging & Resource Resolution (NEW-09, CRIT-4, DX-3):**
   - Built CLI cannot locate clinical text templates because the loader searches `packages/src` instead of relative to `packages/core/dist`.
   - CLI package externalizes undeclared `zod` dependency under strict isolated package layouts.
   - Built CLI version prints `1.5.0` instead of matching `package.json` (`1.7.2`).
6. **Accessibility, Interaction & Resilience (NEW-12, A11Y-1, A11Y-2, A11Y-3, A11Y-4):**
   - Touch interactions on the population bar chart suppress synthesized click events, preventing mobile drilldown.
   - Population table rows and SVG chart bars are interactive only via mouse pointer and lack keyboard focus/activation affordances.
   - Wizard step changes announce step transitions via ARIA live regions but fail to move DOM focus to the new step container.
   - Absence of an application-level Vue error boundary causes unhandled exceptions to leave the interface unresponsive without recovery affordances.
7. **CI/CD Enforcement, Toolchain & Data Updaters (CRIT-2, DX-7, TEST-1–TEST-5, NEW-10, NEW-11, NEW-13, BUILD-4, BUILD-5):**
   - CI workflows tolerate test assertion failures using `continue-on-error: true`, and GitHub Pages deployment has no dependency on test success.
   - Root `bun run lint` omits `core` and `cli`.
   - The weekly ClinGen automated updater writes to a non-shipped root path (`public/data/`), leaving the bundled web asset frozen.
   - Documentation build emits 19 missing `.lean.js` preload references due to VitePress/Vite 8 Rolldown bundling conflicts.
   - Playwright screenshot workflow keys its browser cache on non-existent `bun.lockb`.

---

## 2. Architectural Design & Subsystem Specifications

### 2.1 Explicit Analysis Context (Single Source of Truth)

To eliminate distributed, desynchronized state, all application calculations, export generators, and UI displays shall reference a single, strictly typed `AnalysisContext` data structure:

```typescript
export interface AnalysisContext {
  /** Unique revision number monotonically incremented on any state mutation */
  readonly revision: number;
  
  /** Genetic & Dataset Target */
  readonly target: {
    readonly geneSymbol: string;
    readonly geneId: string;
    readonly dataset: GnomadDatasetId; // 'v4' | 'v3' | 'v2'
    readonly referenceGenome: ReferenceGenome; // 'GRCh38' | 'GRCh37'
  };

  /** Clinical Index Assumptions */
  readonly clinical: {
    readonly indexStatus: IndexStatus; // 'heterozygous' | 'affected' | 'unknown'
    readonly frequencySource: FrequencySource; // 'gnomad' | 'literature'
    readonly literatureCarrierFrequency: number | null;
    readonly literaturePmid: string | null;
    readonly penetrance: number; // default 1.0, range (0, 1]
  };

  /** Filter & Profile Settings */
  readonly filters: {
    readonly selectedProfileName: string | null;
    readonly includeLof: boolean;
    readonly includeMissense: boolean;
    readonly includeClinvarPathogenic: boolean;
    readonly clinvarReviewStarsMin: number;
  };

  /** Quality Settings */
  readonly quality: {
    readonly enabledFlags: ReadonlySet<QualityFlagId>;
    readonly excludeQualityFailures: boolean;
    readonly minAlleleNumber: number;
    readonly maxHomozygotes: number;
  };

  /** Exclusions */
  readonly exclusions: {
    readonly manualExcludedVariantIds: ReadonlySet<string>;
    readonly qualityExcludedVariantIds: ReadonlySet<string>;
  };

  /** Calculation Formula Parameters */
  readonly calculation: {
    readonly formula: CarrierFormula; // 'hwe' | 'simplified'
    readonly useHomozygoteExclusion: boolean;
    readonly useBayesianPrevalence: boolean;
  };

  /** Provenance Metadata */
  readonly provenance: {
    readonly isDefaultFallback: boolean; // True if fallback 1% used due to zero qualifying variants
    readonly cacheTimestamp: number | null;
    readonly clientVersion: string;
  };
}
```

#### Principles of Analysis Context:
1. **Immutability per Evaluation:** Every calculation request to the web worker or CLI aggregation engine receives an immutable snapshot of `AnalysisContext`.
2. **Revision Tracking:** Every change to filters, exclusions, quality settings, or dataset version increments `revision`. Any worker response bearing an older revision than the current context is discarded immediately.
3. **Downstream Export Fidelity:** Exports (JSON, XLSX, TSV) serialize this exact context alongside results, ensuring complete reproducibility of any generated risk estimate.

---

### 2.2 Mathematical, Genetic, and Clinical Calculation Contracts

#### 2.2.1 Recurrence Risk Shared Contract (ARCH-5, NEW-01, CLI-1)
Recurrence risk represents the probability that a future child of the index couple inherits an autosomal recessive condition:
- **Index Parent is Heterozygous Carrier:**
  The index parent has probability $1/2$ of transmitting the pathogenic variant. If the reproductive partner is drawn from the general population with carrier frequency $CF$, the partner has probability $CF$ of being a carrier, and if so, probability $1/2$ of transmitting the variant. Assuming independent assortment and no consanguinity:
  $$\text{Recurrence Risk} = \frac{1}{2} \times \left(\frac{1}{2} \times CF\right) \times \text{Penetrance} = \frac{CF}{4} \times \text{Penetrance}$$
- **Index Parent is Affected (Homozygous or Compound Heterozygous):**
  The index parent transmits a pathogenic allele with probability $1$. The partner has probability $CF$ of being a carrier, transmitting with probability $1/2$:
  $$\text{Recurrence Risk} = 1 \times \left(\frac{1}{2} \times CF\right) \times \text{Penetrance} = \frac{CF}{2} \times \text{Penetrance}$$

**Authoritative Sources:**
- MedlinePlus Genetics: *Inheritance Patterns and Risk Assessment* (NLM/NIH).
- GeneReviews: *Cystic Fibrosis*, Risk to Family Members (NCBI Bookshelf).

**Implementation Contract:**
Create `@gnomad-cf/core/calculations/recurrence-risk.ts`:
```typescript
export function calculateRecurrenceRisk(
  carrierFrequency: number | null,
  indexStatus: IndexStatus,
  penetrance: number = 1.0
): number | null {
  if (carrierFrequency === null || carrierFrequency < 0) return null;
  const factor = indexStatus === 'affected' ? 0.5 : 0.25;
  return carrierFrequency * factor * penetrance;
}
```
*Rule:* All UI displays, text generators (German & English), export generators (TSV, JSON, XLSX), and CLI clinical formatters MUST call this single authoritative function. Hardcoded `/4` or `/2` constants are strictly prohibited across all workspaces.

#### 2.2.2 Joint-First Allele Counts and Per-Variant Denominators
- In gnomAD v4.1+, joint exome+genome calling provides joint allele count (`joint_ac`), joint allele number (`joint_an`), and joint homozygote count (`joint_hom`).
- For each variant $i$, the allele frequency is:
  $$q_i = \frac{AC_i}{AN_i}$$
  where $AC_i$ and $AN_i$ prioritize joint counts when present; otherwise fallback to exome count if present, else genome count.
- **Denominator Rule:** Summing allele counts across variants ($\sum AC_i$) divided by a single maximum sample size ($\max AN_i$) is mathematically invalid because individual variants have distinct missingness/coverage profiles. Core aggregation MUST sum individual allele frequencies ($q = \sum q_i$) or calculate individual variant carrier rates ($VCR_i$) when computing combined gene carrier rates ($GCR$).
- Reported `alleleNumber` in summaries is purely descriptive context ($\max AN_i$) and is never used as an aggregate calculation divisor.

#### 2.2.3 Observed Homozygotes and Source Breakdown Consistency (NEW-06)
- **Homozygote Exclusion Formula:**
  When `useHomExclusion` is enabled, the variant carrier rate is computed by removing observed homozygotes from the heterozygous carrier count:
  $$VCR_i = \frac{AC_i - 2 \cdot Hom_i}{AN_i / 2}$$
  The combined Gene Carrier Rate ($GCR$) across $k$ independent pathogenic variants is:
  $$GCR = 1 - \prod_{i=1}^k (1 - VCR_i)$$
- **Source Breakdown Inconsistency (NEW-06):**
  Currently `source-frequency.ts` ignores `useHomExclusion` and calculates $2q(1-q)$ unconditionally, causing individual source rows to contradict the parent frequency.
  *Repair:* `calculateSourceFrequencies` MUST accept `CalculationConfig` and apply the identical formula (`hwe`, `simplified`, or `homozygote-exclusion`) to each population and functional source subset.

#### 2.2.4 Zero vs Missing Semantics (SEM-1)
1. **Observed Zero ($AC = 0, AN > 0$):** A called site where no alternate alleles were observed in the sample. Frequency is $0$.
2. **Missing / Uncalled Data ($AN = 0$):** The genomic region was not called in the sample. Frequency is `null` (undefined).
3. **No Qualifying Pathogenic Variants Found:** If all variants are filtered out or none exist, the raw calculated carrier frequency is `null`. If clinical default fallback is enabled (1%), the UI displays the labelled 1% fallback, but the exported metadata explicitly sets `isDefaultFallback: true` and preserves `rawCarrierFrequency: null`.

---

### 2.3 Latest-Input-Wins Worker Coordination & Concurrency Architecture

#### 2.3.1 Worker State Machine & Cancellation Tokens (NEW-02, NEW-07)
The web worker coordination in `useCarrierFrequency.ts` shall be refactored into a cancellation-safe, revision-tracked controller:

```
[User Action: Filter / Quality / Exclusion / Gene Change]
                     │
                     ▼
          Increment revision number
                     │
         Is worker currently busy?
         ├── YES ──► Mark `hasPendingChanges = true`
         │           Store latest `AnalysisContext` snapshot
         │           (Do not discard request!)
         │
         └── NO  ──► Post message to Worker with { context, revision }
                     Set `isCalculating = true`
```

When the worker finishes a calculation:
```
[Worker returns { result, revision }]
                     │
                     ▼
       Does result.revision === currentContext.revision?
         ├── YES ──► Commit result to reactive store
         │           Set `isCalculating = false`
         │
         └── NO  ──► Discard stale result!
                     Check `hasPendingChanges`:
                     If true:
                       Clear flag
                       Post latest `AnalysisContext` to Worker immediately
```

#### 2.3.2 Deep Reactive Watching of All Influential Settings (NEW-07)
The watcher in `useCarrierFrequency.ts` shall monitor:
- Gene selection & dataset version
- Filter store parameters (`includeLof`, `includeMissense`, `includeClinvarPathogenic`, `reviewStarsMin`)
- Quality store parameters (`excludeQualityFailures`, `flags`, `thresholds`)
- Exclusion sets (`manualExclusions`, `qualityExclusions`)
- Calculation formulas (`hwe`, `useHomExclusion`, `bayesian`)

#### 2.3.3 Condition-Profile Synchronization (NEW-03)
When `selectProfile(profile)` is called in `useGeneConfig.ts`:
1. It MUST NOT merely modify `filterStore.defaults`.
2. It MUST atomically invoke `setFilterConfig(profile.filterOverrides)` on the active `useCarrierFrequency` controller.
3. This increments the context `revision` and triggers an immediate re-filtering cycle in the worker.

#### 2.3.4 Atomic Transactional History & URL Restoration (NEW-04)
To eliminate state destruction caused by Vue watcher cascading during restoration:
1. Expose a `isRestoring` boolean flag in `useWizardStore` or `useWizard`.
2. While `isRestoring === true`, all downstream reset watchers (`onGeneChange`, step resetting) are suppressed.
3. The restore operation executes in a single transaction:
   ```typescript
   async function restoreHistoryEntry(entry: HistoryEntry) {
     isRestoring.value = true;
     try {
       // 1. Set target dataset version & reference genome
       datasetStore.setVersion(entry.datasetVersion);
       
       // 2. Set gene symbol & metadata
       geneStore.setGene(entry.gene);
       
       // 3. Set clinical inputs
       clinicalStore.setIndexStatus(entry.indexStatus);
       clinicalStore.setSource(entry.source);
       if (entry.literatureFrequency) {
         clinicalStore.setLiteratureData(entry.literatureFrequency, entry.pmid);
       }
       
       // 4. Set filter, quality, and exclusion state
       filterStore.setFilters(entry.filters);
       qualityStore.setQuality(entry.quality);
       exclusionStore.setManualExclusions(new Set(entry.manualExclusions));
       
       // 5. Navigate to Step 4 (Results)
       wizardStore.setStep(4);
       
       // 6. Await Vue reactivity settlement
       await nextTick();
       
       // 7. Trigger calculation with restored parameters
       await recalculateActiveContext();
     } finally {
       isRestoring.value = false;
     }
   }
   ```

#### 2.3.5 Assembly-Scoped ClinVar Submissions (NEW-05, DX-5)
- `useClinvarSubmissions.ts` MUST accept `referenceGenome: ReferenceGenome` in all query construction methods.
- For gnomAD v2 queries, it explicitly passes `'GRCh37'`. For v3 and v4, it passes `'GRCh38'`.
- The submissions cache key is prefixed with `${referenceGenome}:`.
- When switching dataset versions while submission batches are pending, in-flight requests for the previous assembly are aborted using `AbortController`.

---

### 2.4 Security, Input Validation & Data Freshness Contracts

#### 2.4.1 Strict Zod Validation for Template Imports (SEC-1)
All template imports via `useTemplateStore.ts` shall be validated using a strict Zod schema before any reactive state is modified:

```typescript
export const TemplateImportSchema = z.object({
  version: z.string(),
  language: z.enum(['de', 'en']),
  customSections: z.record(z.string(), z.string()).optional(),
  enabledSections: z.record(
    z.enum(['affected', 'carrier', 'unknown']),
    z.array(z.string())
  )
});
```
If validation fails:
- State remains completely untouched.
- An informative error message with validation issues is returned to the UI.
- No partial mutations occur.

#### 2.4.2 Hardened ClinVar Submissions Query Builder (CRIT-1)
Replace string interpolation with standard GraphQL variable definitions:
```typescript
export function buildSubmissionsQuery(variantIds: string[], referenceGenome: ReferenceGenome): {
  query: string;
  variables: Record<string, any>;
} {
  // Strict format validation on variantIds (e.g. ^(\d+|X|Y)-\d+-[ACGT]+-[ACGT]+$)
  validateVariantIds(variantIds);
  
  // Construct parameterized query using GraphQL variables
  const query = `
    query GetClinvarSubmissions($variants: [String!]!, $referenceGenome: ReferenceGenome!) {
      clinvar_variants(variant_ids: $variants, reference_genome: $referenceGenome) {
        variant_id
        submissions {
          submission_id
          clinical_significance
          review_status
          last_evaluated
        }
      }
    }
  `;
  return { query, variables: { variants: variantIds, referenceGenome } };
}
```

#### 2.4.3 ClinGen Updater Path Correction & Schema Verification (NEW-13)
The workflow `.github/workflows/update-clingen-data.yml` shall be updated:
1. Download destination corrected to: `apps/web/public/data/clingen-gene-validity.csv`.
2. Prior to staging, execute a validation script `scripts/validate-clingen-csv.ts` that:
   - Verifies the file is a valid CSV (not an HTML error page from ClinGen).
   - Validates that mandatory columns (`GENE SYMBOL`, `DISEASE LABEL`, `CLASSIFICATION`, `GDM ID`) exist.
   - Checks that row count is non-trivial (>1,000 records).
3. If validation succeeds and content differs from the shipped file, commit and create a PR or update branch.

#### 2.4.4 Export Provenance and Exclusion Integrity (NEW-08)
Exports (JSON, XLSX, TSV) shall serialize a unified variant representation:
- Every variant row includes: `variant_id`, `hgvsc`, `hgvsp`, `consequence`, `ac`, `an`, `af`, `homozygote_count`, `flags`, `included_in_calculation` (boolean), `exclusion_type` (`'none' | 'manual' | 'quality'`), and `exclusion_reason`.
- Summary sheets/headers contain:
  - Exact `AnalysisContext` parameters.
  - Selected recurrence risk with explicit formula ($CF/4$ or $CF/2$) and index status.
  - Clear label if default fallback frequency (1%) was utilized.

---

### 2.5 CLI Distribution, Resource Bundling & Execution Model

#### 2.5.1 Template Asset Bundling (NEW-09)
In `packages/core/tsdown.config.ts`:
- Configure asset copying or inline bundling of `src/config/templates/*.json` into `packages/core/dist/templates/`.
- Update `packages/core/src/templates/load-templates.ts` to locate templates relative to `import.meta.url` or `__dirname` within `dist`, with fallback support for source environments.
- Add regression test importing `loadTemplateContent` from built dist and executing it against both `de` and `en`.

#### 2.5.2 Declared Dependencies & Isolated Execution (CRIT-4)
- Add `"zod": "^3.24.0"` (or repository workspace version) to `packages/cli/package.json` dependencies.
- Update `packages/cli/src/cli.ts` to read version dynamically from package manifest or inject it via bundler define, ensuring `gnomad-cf --version` prints the true release version (`1.7.2`).
- Validate CLI execution in a clean isolated directory with no hoisted root dependencies.

---

### 2.6 CI/CD, Enforcement, Test Harness & Toolchain Architecture

#### 2.6.1 Non-Tolerated CI Test Enforcement (CRIT-2, DX-7)
In `.github/workflows/tests.yml`:
- Remove `continue-on-error: true` from all test steps (`bun run test`, `bun run test:coverage`, `bun run test:e2e`).
- Unify GitHub Pages deployment workflow (`.github/workflows/deploy.yml`):
  - Add `needs: [test, lint]` so deployment is triggered ONLY when all tests, typechecks, and linters pass on the exact same commit SHA.

#### 2.6.2 Monorepo-Wide Linting & Typecheck (TEST-3, BUILD-4, BUILD-5)
- Root `package.json`: update `"lint"` script to run `eslint .` across all workspaces (`apps/web`, `packages/core`, `packages/cli`).
- Enable `noUnusedLocals` and `noUnusedParameters` in `packages/core/tsconfig.json`.
- Add `packages/cli` to root `tsconfig.json` references to ensure `tsc --build` is fully unified.

#### 2.6.3 Coverage Policy & Calibration (TEST-4)
- Separate critical calculation/filter coverage from broad UI component coverage.
- Calibrate Vitest thresholds to attainable, strictly enforced gates:
  - `@gnomad-cf/core`: 85% lines, 80% branches on calculations and filters.
  - `packages/cli`: 75% lines.
  - `apps/web`: 50% lines (excluding mock files and third-party wrappers).

#### 2.6.4 Docs Toolchain & Missing Preload Resolution (NEW-10)
- Resolve VitePress 1.6.4 / Vite 8 / Rolldown bundling conflicts by aligning VitePress and Vite configuration options or configuring `.vitepress/config.ts` to disable lean bundle preloading incompatibilities.
- Verify that clean `bun run docs:build` generates zero 404 preloads and zero Rolldown warnings.

#### 2.6.5 Screenshot Cache Invalidation (NEW-11)
- Update `.github/workflows/screenshots.yml` to hash `bun.lock` (text format) instead of non-existent `bun.lockb`.
- Ensure cache restore falls back gracefully to `bunx playwright install --with-deps` if browser binaries are missing.

---

### 2.7 Accessibility, Interaction & Impeccable UI Refinement

#### 2.7.1 Keyboard-Operable Population Table Rows (A11Y-1)
- In `StepResults.vue`, provide clear, accessible button controls within population table rows (e.g. "View variants for [Population]") with `aria-label`, visible focus indicator (`focus-visible` ring), and keyboard activation (`Enter` / `Space`).
- Retain row expansion toggle as an independent, accessible control.

#### 2.7.2 Accessible SVG Chart Bars (A11Y-2)
- In `PopulationBarChart.vue`, add `tabindex="0"`, `role="button"`, and `aria-label="[Population Name] carrier frequency: [Value]. Press Enter to view variants."` to interactive SVG bar groups.
- Add `@keydown.enter.prevent` and `@keydown.space.prevent` listeners to open the population drilldown modal.
- Render high-contrast SVG focus rings around focused bar groups.

#### 2.7.3 Mobile Touch Interaction on Bar Chart (NEW-12)
- Remove `touchstart.prevent` suppression that blocks the click event for modal drilldown.
- Implement clear mobile gesture handling:
  - Short tap: Open variant drilldown modal.
  - Long press / hover: Display tooltip.
  - Vertical swipe: Allow normal page scrolling without interception.

#### 2.7.4 Wizard Stepper Focus Management (A11Y-3)
- In `WizardStepper.vue`, on step change:
  1. Emit step announcement via ARIA live region (preserved).
  2. Programmatically set focus to the step header element (`tabindex="-1"`) with `.focus()` after `nextTick()`.
  3. Ensure screen reader immediately reads the new step title and instructions.

#### 2.7.5 Global Error Boundary with Recovery (A11Y-4)
- Implement `ErrorBoundary.vue` wrapping the main router/wizard view in `App.vue`.
- Utilize `onErrorCaptured` lifecycle hook.
- When an uncaught exception occurs:
  - Prevent white-screen crash.
  - Render an accessible alert card: "An unexpected error occurred during calculation."
  - Provide two actions:
    1. "Reset to Default State" (clears corrupted store state and restarts wizard).
    2. "Download Diagnostic Log" (exports sanitized log buffer from `useLogStore`).

---

### 2.8 Performance Budgets & Optimization Strategy

#### 2.8.1 Playwright-Driven Lighthouse Benchmark Harness
Build a committed, reproducible benchmark harness `scripts/benchmark-lighthouse.ts`:
- Uses Playwright to launch a headless Chromium instance with remote debugging port.
- Starts a local preview server (`bun run preview`) serving the production build.
- Runs 5 cold-load and 5 warm-cache repetitions with median and spread metrics.
- Measures: LCP (Largest Contentful Paint), CLS (Cumulative Layout Shift), TBT (Total Blocking Time), and total JS/CSS transferred bytes.
- Asserts state readiness before audit: navigates to CFTR results and verifies calculation completion before capturing timespan metrics.

#### 2.8.2 Optimization Targets & Acceptance Budgets
1. **Initial Bundle Footprint:**
   - Lazy-load `write-excel-file` on demand via dynamic `import('../utils/xlsx-export')` when the user triggers Excel export (PERF-2).
   - Optimize Vuetify icon font loading: prune unreferenced webfont formats (TTF/EOT) from precache; only precache WOFF2 (PERF-3).
2. **Acceptance Budgets:**
   - Desktop Lighthouse Performance score $\ge 90$.
   - Cold load LCP $\le 1.8\text{s}$ (unthrottled desktop).
   - Total Blocking Time (TBT) $\le 100\text{ms}$.
   - Initial JS transferred size $\le 350\text{kB}$ gzip.

---

## 3. Parallel Implementation Lanes & Dependency DAG

```
                         [Lane 1: Core Math & Contracts]
                                      │
                                      ▼
                       [Lane 2: Worker & Concurrency]
                                      │
                                      ▼
                       [Lane 3: Export & CLI Consistency]
                                      │
                   ┌──────────────────┴──────────────────┐
                   ▼                                     ▼
      [Lane 4: CI, Tooling & Updaters]     [Lane 5: Accessibility & UX]
                   └──────────────────┬──────────────────┘
                                      ▼
                      [Lane 6: Performance & Benchmarks]
```

- **Lane 1 (Core Contracts):** Shared recurrence risk helper, joint count aggregation, source breakdown formulas, semantic color decoupling.
- **Lane 2 (Worker & Concurrency):** Revision tracking, cancelable worker requests, profile application fix, transactional history restore, assembly-scoped ClinVar submissions.
- **Lane 3 (Export & CLI):** Export exclusion tracking, TSV/XLSX/JSON recurrence parity, dynamic text generator dataset attribution, built CLI template loading, CLI dependency and version alignment.
- **Lane 4 (CI, Tooling & Docs):** Non-tolerated test steps, deployment gating, monorepo linting, ClinGen updater path fix, docs build preload fix, screenshot cache key.
- **Lane 5 (Accessibility & UX):** Population table keyboard access, chart bar keyboard access, touch drilldown repair, wizard focus management, global error boundary.
- **Lane 6 (Performance & Optimization):** Lazy-loading Excel writer, icon font pruning, Playwright-Lighthouse benchmark harness, performance budget verification.

---

## 4. Rollback & Migration Strategy

- All database and store schemas are backward compatible.
- The `AnalysisContext` snapshot pattern encapsulates state without breaking legacy Pinia store subscriptions.
- If any individual lane encounters unforeseen integration regressions, each feature branch is designed for independent revert without corrupting sibling subsystems.

---

## 5. Acceptance Criteria Checklist

- [ ] **NEW-01:** Recurrence risk for affected index parent is $CF/2 \times \text{penetrance}$ across UI, German text, English text, TSV, JSON, XLSX, and CLI.
- [ ] **NEW-02:** Rapid filter/exclusion edits during API fetch settle to final chosen values without dropped state.
- [ ] **NEW-03:** Selecting CFTR or other condition profiles immediately updates calculation inputs and yields profile-specific results.
- [ ] **NEW-04:** Restoring history entry preserves all step fields, literature frequencies, and dataset versions without downstream reset.
- [ ] **NEW-05:** gnomAD v2 ClinVar submission queries request GRCh37 coordinates; v3/v4 request GRCh38.
- [ ] **NEW-06:** Source breakdown matches parent carrier frequency when homozygote exclusion is active.
- [ ] **NEW-07:** Changing quality flag settings triggers immediate worker refiltering.
- [ ] **NEW-08:** Exports correctly categorize manual vs quality exclusions with exact reasons.
- [ ] **NEW-09:** Built CLI generates clinical text in both German and English from any working directory.
- [ ] **NEW-10:** Clean docs build produces zero missing preloads and passes asset verification.
- [ ] **NEW-11:** Screenshot workflow keys on `bun.lock`.
- [ ] **NEW-12:** Touching population bars on mobile opens variant drilldown modal reliably.
- [ ] **NEW-13:** ClinGen updater downloads and stages to `apps/web/public/data/clingen-gene-validity.csv`.
- [ ] **CRIT-1:** Submissions query builder uses validated parameterized variables.
- [ ] **CRIT-2:** CI fails on any test assertion failure; deployment is blocked on failures.
- [ ] **A11Y-1–3:** Keyboard users can drill down into population table rows and chart bars; wizard step transitions set focus to new step heading.
- [ ] **A11Y-4:** Uncaught errors trigger recovery UI instead of white screen.
- [ ] **PERF-1–4:** Benchmark harness reports $\ge 90$ Performance score, initial JS $\le 350\text{kB}$ gzip.
