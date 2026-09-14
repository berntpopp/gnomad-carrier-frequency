# Remediation Specification & Architecture Design (Revision 4.0)

**Document ID:** `SPEC-2026-09-14-REMEDIATION`  
**Revision:** 4.0 (Astra Spec Review Resolution)  
**Date:** 2026-09-14  
**Author:** Lead Engineer (`gnomad-carrier-frequency`)  
**Status:** Under Review (Round 4)  
**Target Repository:** `gnomad-carrier-frequency`  
**Integration Base SHA:** `083375e` (docs: add evidence-based codebase review for 2026-09-14)

---

## 1. Executive Summary & Problem Formulation

The September 14, 2026 codebase review identified critical calculation discrepancies, state-coordination race conditions, data-loss failure modes during history restore, unverified asset updates, accessibility barriers, and continuous-integration enforcement bypasses in `gnomad-carrier-frequency`.

This revised specification incorporates all resolutions from the adversarial Astra specification reviews (SPEC-01 through SPEC-16 and Round 3 feedback), establishing verifiable mathematical, genetic, concurrency, and toolchain contracts across all workspaces.

---

## 2. Architectural Design & Subsystem Specifications

### 2.1 Explicit Analysis Context & Serialization Contract (SPEC-01)

All calculations, worker messages, persistent history entries, URL parameters, and exports reference a single, strictly typed `AnalysisContext` schema representing all influential settings without loss:

```typescript
export interface AnalysisContext {
  /** Monotonically incrementing revision counter */
  readonly revision: number;

  /** Genetic & Dataset Target */
  readonly target: {
    readonly geneSymbol: string;
    readonly geneId: string;
    readonly dataset: GnomadDatasetId; // 'v4' | 'v3' | 'v2'
    readonly referenceGenome: ReferenceGenome; // 'GRCh38' | 'GRCh37'
    readonly subcontinentalEnabled: boolean; // applicable to v2
  };

  /** Clinical Index Assumptions */
  readonly clinical: {
    readonly indexStatus: IndexPatientStatus;
    // 'heterozygous' | 'homozygous' | 'compound_het_confirmed' | 'compound_het_assumed'
    readonly frequencySource: FrequencySource; // 'gnomad' | 'literature' | 'default'
    readonly literatureCarrierFrequency: number | null;
    readonly literaturePmid: string | null;
    readonly penetrance: number; // default 1.0, range [0.0, 1.0]
  };

  /** Pathogenicity & Classification Filters */
  readonly filters: {
    readonly selectedProfileName: string | null;
    readonly includeLof: boolean;
    readonly includeMissense: boolean;
    readonly includeClinvarPathogenic: boolean;
    readonly clinvarReviewStarsMin: number;
    readonly includeConflictingClinvar: boolean;
    readonly clinvarConflictingThreshold: number; // integer percentage 0-100 (e.g. 80)
    readonly conflictingReviewStarsMin: number;
  };

  /** Quality Filter Parameters (Lossless Representation of QualityStore) */
  readonly quality: {
    readonly excludeQualityFailures: boolean;
    readonly enabledFlags: QualityFlagId[]; // Array for JSON compatibility
    readonly excludeHighAF: boolean;
    readonly highAfThreshold: number; // e.g. 0.05
    readonly excludeHighHomozygotes: boolean;
    readonly highHomMethod: 'absolute' | 'hwe_relative';
    readonly highHomAbsoluteThreshold: number; // e.g. 10
    readonly highHomHWEMultiplier: number; // e.g. 2.0
    readonly excludeLowAN: boolean;
    readonly minAlleleNumber: number;
    readonly excludeGnomadFiltered: boolean;
    readonly excludeGenomesOnly: boolean;
  };

  /** Independent Exclusions */
  readonly exclusions: {
    readonly manualExcludedVariantIds: string[];
    readonly qualityExcludedVariantIds: string[];
    readonly exclusionReasons: Record<string, string>;
  };

  /** Calculation Formula Parameters */
  readonly calculation: {
    readonly formula: CarrierFormula; // 'hwe' | 'simplified'
    readonly useHomozygoteExclusion: boolean;
    readonly useBayesianPrevalence: boolean; // penetrance-adjusted prevalence
  };

  /** Provenance Metadata */
  readonly provenance: {
    readonly isDefaultFallback: boolean;
    readonly cacheTimestamp: number | null;
    readonly clinvarSubmissionBatchId: string | null;
    readonly appVersion: string;
  };
}
```

#### Serialization Invariants:
1. **JSON Compatibility:** Arrays are used for all collections (`enabledFlags`, `manualExcludedVariantIds`, `qualityExcludedVariantIds`) to ensure transparent JSON round-tripping (`JSON.stringify` / `JSON.parse`).
2. **Dual-Exclusion Tracking:** Variants excluded both manually and by quality appear in both arrays, with composite entries in `exclusionReasons` (e.g. `"Manual exclusion; Quality: High homozygote count"`).
3. **Lossless Quality Mapping:** Every switch in `QualityExclusionConfig` (`excludeHighAF`, `excludeHighHomozygotes`, `excludeLowAN`, `excludeGnomadFiltered`, `excludeGenomesOnly`) and both homozygote detection methods (`absolute`, `hwe_relative`) are directly serialized.

---

### 2.2 Mathematical, Genetic, and Clinical Calculation Contracts (SPEC-02, SPEC-03, SPEC-04, SPEC-05)

#### 2.2.1 Exhaustive Recurrence Risk Transmission Contract (SPEC-02)
Recurrence risk is the probability that a future pregnancy of the index couple results in an affected child under autosomal recessive Mendelian inheritance:
- **Heterozygous Carrier Index Parent (`'heterozygous'`):**
  Transmits pathogenic allele with probability $1/2$. A general population partner with carrier frequency $CF$ transmits with probability $CF/2$.
  $$\text{Recurrence Risk} = \frac{1}{2} \times \frac{CF}{2} \times \text{Penetrance} = \frac{CF}{4} \times \text{Penetrance}$$
- **Affected Index Parent (`'homozygous'`, `'compound_het_confirmed'`, `'compound_het_assumed'`):**
  Transmits a pathogenic allele with probability $1.0$. The population partner transmits with probability $CF/2$.
  $$\text{Recurrence Risk} = 1.0 \times \frac{CF}{2} \times \text{Penetrance} = \frac{CF}{2} \times \text{Penetrance}$$
- **Unknown / Unspecified Index Status:**
  Recurrence risk calculation requires a known index genotype. If `indexStatus` is not a valid `IndexPatientStatus`, recurrence risk is `null`, and UI displays `"N/A — Index status required"`.
- **Penetrance Range:**
  $0.0 \le \text{penetrance} \le 1.0$. If penetrance is 0.0, recurrence risk is 0.0. CLI `--penetrance <n>` validator asserts $0.0 \le n \le 1.0$.

**Authoritative Sources:**
- MedlinePlus Genetics: *Inheritance Patterns and Risk Assessment* (NLM/NIH).
- GeneReviews: *Cystic Fibrosis*, Risk to Family Members (NCBI Bookshelf).

**Implementation in `@gnomad-cf/core/calculations/recurrence-risk.ts`:**
```typescript
export type IndexPatientStatus =
  | 'heterozygous'
  | 'homozygous'
  | 'compound_het_confirmed'
  | 'compound_het_assumed';

export function calculateRecurrenceRisk(
  carrierFrequency: number | null,
  indexStatus: IndexPatientStatus,
  penetrance: number = 1.0
): number | null {
  if (carrierFrequency === null || !Number.isFinite(carrierFrequency)) return null;
  if (carrierFrequency < 0 || carrierFrequency > 1) return null;
  if (!Number.isFinite(penetrance) || penetrance < 0 || penetrance > 1) return null;

  switch (indexStatus) {
    case 'homozygous':
    case 'compound_het_confirmed':
    case 'compound_het_assumed':
      return carrierFrequency * 0.5 * penetrance;
    case 'heterozygous':
      return carrierFrequency * 0.25 * penetrance;
    default:
      return null;
  }
}
```

#### 2.2.2 URL State Schema & Default Carrier Encoding (SPEC-02)
In `useUrlState.ts`, the URL encoder omits `status` when it is `'heterozygous'` to produce clean URLs. Therefore, `UrlStateSchema` in `packages/core/src/types/url-state.ts` must define a default:
```typescript
export const UrlStateSchema = z.object({
  gene: z.string().optional(),
  step: z.coerce.number().min(1).max(4).optional(),
  status: z.enum(['heterozygous', 'homozygous', 'compound_het_confirmed', 'compound_het_assumed'])
    .default('heterozygous'),
  source: z.enum(['gnomad', 'literature']).optional(),
  // ... other fields ...
});
```
When `status` is omitted in the URL query string, `UrlStateSchema.safeParse` restores it cleanly as `'heterozygous'`.

#### 2.2.3 Clinical Interpretation & Prevalence Clarification (SPEC-03)
1. **Autosomal Recessive Diploid Model:** Bi-allelic loss-of-function or pathogenicity causes disease.
2. **Linkage & Phase Disclaimer:** The Gene Carrier Rate formula ($GCR = 1 - \prod (1 - VCR_i)$) assumes variants are unlinked in the population. It does NOT infer phase or separate cis from trans co-occurrence.
3. **Prevalence Formulations:**
   - **Genetic Prevalence ($q^2$):** Calculated directly from aggregate allele frequency: $q^2 = (\sum q_i)^2$.
   - **Penetrance-Adjusted Prevalence:** Calculated as $q^2 \times \text{penetrance}$.
   - **Orphanet Disease Prevalence:** Displayed as external clinical reference data; it is NOT multiplied or bayesian-updated into the gnomAD frequency calculations.

#### 2.2.4 Fallback Count Pooling Contract (SPEC-04)
When joint counts are absent:
- Pool available exome and genome counts:
  $$AC = (AC_{\text{exome}} \lor 0) + (AC_{\text{genome}} \lor 0)$$
  $$AN = (AN_{\text{exome}} \lor 0) + (AN_{\text{genome}} \lor 0)$$
  $$Hom = (Hom_{\text{exome}} \lor 0) + (Hom_{\text{genome}} \lor 0)$$
- An exome-only or genome-only value is used ONLY if the other source has $AN = 0$. Counts are never discarded.

#### 2.2.5 Truth Table for Zero, Missing, and Fallback Semantics (SPEC-05)

| Precedence | Condition | Raw CF | Fallback CF (if enabled) | Genetic Prevalence ($q^2$) | Penetrance-Adjusted Prev | UI Display | Export Metadata Flags |
|---|---|---|---|---|---|---|---|
| **1. Missing Data** | All sites in gene have $AN = 0$ | `null` | `null` | `null` | `null` | `"No data"` | `missingData: true, rawCarrierFrequency: null` |
| **2. No Pathogenic Candidates** | Zero variants meet pathogenicity filters | `null` | `0.01` (1.0%) | If fallback: $(0.01/2)^2 = 0.000025$; else `null` | If fallback: $0.000025 \times \text{penetrance}$; else `null` | `"1% (Default assumption)"` or `"Not detected"` | `isDefaultFallback: true/false, noQualifyingVariants: true` |
| **3. All Candidates Excluded** | Pathogenic variants exist, all excluded manually/quality | `null` | `0.01` (1.0%) | If fallback: $(0.01/2)^2 = 0.000025$; else `null` | If fallback: $0.000025 \times \text{penetrance}$; else `null` | `"1% (Default assumption)"` or `"Not detected"` | `isDefaultFallback: true/false, allExcluded: true` |
| **4. All-Homozygote Sites Only** | Qualifying variants present, and for all variants $AC_i = 2 \cdot Hom_i$ | If HomExcl: $0.0$; else $2q(1-q)$ | N/A | $q^2 = (\sum q_i)^2 > 0$ | $q^2 \times \text{penetrance}$ | If HomExcl: `"0% (Homozygotes only)"` | `variantHomozygoteOnly: true, rawCarrierFrequency: 0.0` |
| **5. Observed Zero** | $AC_i = 0, AN_i > 0$ for all variants | `0.0` | N/A | `0.0` | `0.0` | `"0% (0 / N)"` | `observedZero: true, rawCarrierFrequency: 0.0` |
| **6. Normal Calculation** | Qualifying included variants present | Computed $GCR$ | N/A | $q^2 = (\sum q_i)^2$ | $q^2 \times \text{penetrance}$ | Formatted % and 1:N ratio | `isDefaultFallback: false, rawCarrierFrequency: GCR` |

*Note on Fallback Inversion:* Fallback assumes a carrier frequency $CF = 0.01$. Under the diploid relationship $CF \approx 2q \implies q = 0.005$. Therefore genetic prevalence is $q^2 = 0.005^2 = 0.000025$ (1 in 40,000).

---

### 2.3 Worker Coordination, Concurrency & Lifecycle Architecture (SPEC-06, SPEC-07)

#### 2.3.1 Worker State Machine & Session Invalidation (SPEC-06)
In `useCarrierFrequency.ts`:
1. Distinguish stable `geneSessionKey = "${geneSymbol}:${datasetVersion}"` from request `revision: number`.
2. Wrap Comlink calls with captured request context:
   ```typescript
   const currentSessionKey = activeGeneSessionKey.value;
   const currentRevision = ++activeRevision.value;
   isCalculating.value = true;

   try {
     const result = await workerAdapter.processGene(payload);
     if (activeGeneSessionKey.value === currentSessionKey && activeRevision.value === currentRevision) {
       commitResult(result);
     }
   } catch (error) {
     if (activeGeneSessionKey.value === currentSessionKey && activeRevision.value === currentRevision) {
       handleCalculationError(error);
     }
   } finally {
     // Infallible check for pending changes on BOTH resolve and reject
     if (hasPendingChanges.value) {
       hasPendingChanges.value = false;
       dispatchLatestContext();
     } else if (activeRevision.value === currentRevision) {
       isCalculating.value = false;
     }
   }
   ```
3. In `variant-worker.ts`, cache raw datasets in a Map keyed by `geneSessionKey`. Switching genes clears the previous key to prevent stale dataset leaks.

#### 2.3.2 Atomic Transactional History & URL Restoration (SPEC-07-MIG, SPEC-07-TXN)
In `useHistoryRestore.ts` and `useWizard.ts`:
1. **Transaction Mutex:** Generate `restoreToken = Symbol()`. Set `isRestoring = true` and `activeRestoreToken = restoreToken`.
2. **Wizard Reset Suppression:** In `useWizard.ts`, the watcher on `selectedGene` checks `isRestoring`: if true, it skips resetting `currentStep`, `indexPatientStatus`, and `frequencySource`.
3. **Autosave Suppression:** In `useHistoryAutoSave.ts`, cancel pending autosave timers (`saveDebounced.cancel()`) and suppress autosave writes while `isRestoring === true`.
4. **Gene Config Override Suppression:** `loadGeneConfig(gene)` accepts `{ skipProfileApplication: true }` during restore so that factory default profiles do not overwrite restored filter configurations.
5. **Exact Legacy History Migration:**
   ```typescript
   function migrateHistoryEntry(raw: any): RestoredSettings {
     const filterCfg = raw.filterConfig || {};
     return {
       dataset: raw.target?.dataset ?? raw.results?.gnomadVersion ?? 'v4',
       filters: {
         includeLof: raw.filters?.includeLof ?? filterCfg.lofHcEnabled ?? true,
         includeMissense: raw.filters?.includeMissense ?? filterCfg.missenseEnabled ?? false,
         includeClinvarPathogenic: raw.filters?.includeClinvarPathogenic ?? filterCfg.clinvarEnabled ?? true,
         clinvarReviewStarsMin: raw.filters?.clinvarReviewStarsMin ?? filterCfg.clinvarStarThreshold ?? 1,
         includeConflictingClinvar: raw.filters?.includeConflictingClinvar ?? filterCfg.clinvarIncludeConflicting ?? false,
         clinvarConflictingThreshold: raw.filters?.clinvarConflictingThreshold ?? filterCfg.clinvarConflictingThreshold ?? 80,
         conflictingReviewStarsMin: raw.filters?.conflictingReviewStarsMin ?? 1
       },
       manualExclusions: raw.exclusions?.manualExcludedVariantIds ?? raw.excludedVariantIds ?? [],
       clinical: {
         indexStatus: raw.clinical?.indexStatus ?? raw.patientStatus ?? raw.indexStatus ?? 'heterozygous',
         frequencySource: raw.clinical?.frequencySource ?? raw.source ?? 'gnomad',
         literatureCarrierFrequency: raw.clinical?.literatureCarrierFrequency ?? raw.literatureFrequency ?? null,
         literaturePmid: raw.clinical?.literaturePmid ?? raw.literaturePmid ?? null,
         penetrance: raw.clinical?.penetrance ?? raw.penetrance ?? 1.0
       },
       calculation: raw.calculation ?? { formula: 'hwe', useHomozygoteExclusion: true, useBayesianPrevalence: true }
     };
   }
   ```
6. On transaction completion, verify `activeRestoreToken === restoreToken`. Synchronize URL state and release `isRestoring = false`.

---

### 2.4 Security, External Queries & Freshness (SPEC-08, SPEC-09, SPEC-11)

#### 2.4.1 gnomAD GraphQL ClinVar Submissions Query Schema (SPEC-08)
gnomAD's GraphQL schema defines singular `clinvar_variant(variant_id: String!, reference_genome: ReferenceGenomeId!)` with `submitter_name` (NOT `submission_names`).

```typescript
export function buildSubmissionsQuery(
  variantIds: string[],
  referenceGenome: ReferenceGenome // 'GRCh38' | 'GRCh37'
): { query: string; variables: Record<string, string> } | null {
  if (!variantIds || variantIds.length === 0) return null;

  for (const id of variantIds) {
    if (!/^(?:chr)?(?:\d+|X|Y)-[0-9]+-[ACGT]+-[ACGT]+$/i.test(id)) {
      throw new Error(`Invalid variant ID format: ${id}`);
    }
  }

  const variables: Record<string, string> = {
    refGenome: referenceGenome
  };

  const fields = variantIds.map((id, index) => {
    const varName = `var${index}`;
    variables[varName] = id;
    return `
      v${index}: clinvar_variant(variant_id: $${varName}, reference_genome: $refGenome) {
        variant_id
        clinical_significance
        review_status
        last_evaluated
        submissions {
          clinical_significance
          review_status
          last_evaluated
          submitter_name
        }
      }
    `;
  }).join('\n');

  const varDeclarations = Object.keys(variables)
    .filter(k => k !== 'refGenome')
    .map(k => `$${k}: String!`)
    .join(', ');

  const query = `
    query GetClinvarSubmissions($refGenome: ReferenceGenomeId!, ${varDeclarations}) {
      ${fields}
    }
  `;

  return { query, variables };
}
```

#### 2.4.2 ClinGen Updater Validation & Canonical Headers (SPEC-09)
In `scripts/validate-clingen-csv.ts`:
- Scans file until locating the canonical header row (line 5 in current file).
- Asserts presence of exact column headers:
  `GENE SYMBOL`, `GENE ID (HGNC)`, `DISEASE LABEL`, `DISEASE ID (MONDO)`, `MOI`, `SOP`, `CLASSIFICATION`, `ONLINE REPORT`, `CLASSIFICATION DATE`, `GCEP`.
- Asserts $\ge 1,000$ data rows following the header.
- Asserts first 5 rows contain valid non-empty gene symbols and classification values (`Definitive`, `Strong`, `Moderate`, `Limited`, `No Known Disease Relationship`).
- Stages to destination: `apps/web/public/data/clingen-gene-validity.csv`.

#### 2.4.3 Template Store Zod Schema (SPEC-11, SPEC-11-D1)
```typescript
export const TemplateImportSchema = z.object({
  version: z.string().regex(/^\d+\.\d+(\.\d+)?$/),
  language: z.enum(['de', 'en']),
  exportDate: z.string().optional(),
  customSections: z.record(z.string(), z.string()).optional().default({}),
  enabledSections: z.object({
    affected: z.array(z.string()),
    carrier: z.array(z.string()),
    familyMember: z.array(z.string())
  }).strict()
}).strict();
```

---

### 2.5 CLI Distribution, Build & Resource Resolution (SPEC-10)

1. **Distribution Model:** CLI is supported as an executable Node.js package in the monorepo, run via `bun gnomad-cf` or `node packages/cli/dist/cli.mjs`.
2. **Dependency Manifest:**
   - In `packages/cli/package.json`, declare `"zod": "^4.3.5"` matching monorepo catalog.
   - Inject application version during build via tsdown define (`__CLI_VERSION__`) to ensure `--version` prints `1.7.2`.
3. **Template Resolution (NEW-09):**
   - In `packages/core/tsdown.config.ts`, bundle template JSON files into `dist/templates/`.
   - Update `packages/core/src/templates/load-templates.ts` to locate templates relative to `new URL('./templates', import.meta.url)` in ESM.
4. **Test Discovery:** `packages/cli/vitest.config.ts` includes `src/**/__tests__/*.ts` and `tests/**/*.ts`.

---

### 2.6 CI/CD Enforcement & Deployment Gating (SPEC-12)

#### 2.6.1 Working Package Scripts
In root `package.json`, define:
- `"test:coverage": "vitest run --coverage"`
- `"test:e2e": "CI=1 playwright test"`

#### 2.6.2 Tests Workflow (`.github/workflows/tests.yml`)
- Trigger: `push` on `main`, `pull_request` on `main`.
- Jobs:
  - `lint-and-typecheck`: `bun run lint && bun run typecheck`
  - `unit-tests`: `bun run test --run`
  - `coverage`: `bun run test:coverage` (calibrated thresholds: 80% core calculations/filters, 70% CLI, 35% web)
  - `e2e-tests`: `bun run test:e2e` (runs on both PR and main push)
- All steps must succeed (`continue-on-error` removed).

#### 2.6.3 Gated Deployment (`.github/workflows/deploy.yml`)
```yaml
name: Deploy
on:
  workflow_run:
    workflows: ["Tests"]
    types: [completed]
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion == 'success' && github.repository == 'berntpopp/gnomad-carrier-frequency' }}
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.workflow_run.head_sha }}
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run build
      - run: bun run docs:build
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: 'apps/web/dist'
      - id: deployment
        uses: actions/deploy-pages@v4
```

---

### 2.7 Accessibility, Interaction & Error Recovery (SPEC-15)

1. **Population Table Keyboard Navigation (A11Y-1):**
   - Action column includes button: `<v-btn icon aria-label="View variants for {name}" @click="openDrilldown(item)">`.
   - Table rows support `tabindex="0"`, outline on `:focus-visible`, and `Enter`/`Space` activation.
2. **Accessible SVG Bar Chart (A11Y-2):**
   - Each population `<g>` has `tabindex="0"`, `role="button"`, and `@keydown.enter.prevent="openDrilldown(item)"` + `@keydown.space.prevent="openDrilldown(item)"`.
   - On modal dismiss, focus programmatically returns to activating table row or SVG bar.
3. **Touch Drilldown Resolution (NEW-12):**
   - Remove `touchstart.prevent` in `PopulationBarChart.vue` so tap triggers click and opens modal on mobile devices.
4. **Wizard Focus Management (A11Y-3):**
   - Programmatically focus `<h2 tabindex="-1">` on step change.
5. **Real Component Boundary for Error Boundary (A11Y-4):**
   - In `apps/web/src/App.vue`: wrap `<WizardStepper />` in `ErrorBoundary.vue`:
     ```html
     <v-main>
       <v-container>
         <ErrorBoundary>
           <WizardStepper />
         </ErrorBoundary>
       </v-container>
     </v-main>
     ```
   - Catches render exceptions, displays alert card, logs error to `useLogStore`, and provides "Reset Application State" button without corrupting saved history.

---

### 2.8 Performance Budgets & Benchmark Methodology (SPEC-13)

1. **Methodology:**
   - Harness: `scripts/benchmark-lighthouse.ts`.
   - Pinned profile: headless Chromium, unthrottled desktop, port 4173 (`bun run preview`).
   - Synthetic fixture: CFTR response served deterministically without live network latency.
   - 5 cold navigation runs and 5 warm cache runs, recording median and IQR.
2. **Budgets:**
   - Navigation Audit: Performance $\ge 90$, LCP $\le 1.8\text{s}$, CLS $\le 0.05$, TBT $\le 100\text{ms}$.
   - Interaction Duration: Step 1 to Step 4 render for CFTR $\le 500\text{ms}$ (CPU time).
   - Bundle Footprint: Main JS gzip $\le 350\text{kB}$ (dynamically importing `write-excel-file` on export click).

---

### 2.9 Rollback Dependency Groups & Ordering (SPEC-16)

```
[Group A: Lane 1 - Core Math & Types]
           │
           ▼
[Group B: Lane 2 - Worker & State Coordination]
           │
           ▼
[Group C: Lane 3 - Export & CLI Consistency]
           │
     ┌─────┴────────────────┐
     ▼                      ▼
[Group D: Lane 4 - CI/Tooling]  [Group E: Lane 5 - Accessibility/UI]
     └─────┬────────────────┘
           ▼
[Group F: Lane 6 - Performance]
```
Rollbacks must be executed in reverse topological order (Group F $\to$ Group D/E $\to$ Group C $\to$ Group B $\to$ Group A).
