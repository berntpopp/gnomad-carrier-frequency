# Remediation Specification & Architecture Design (Revision 3.0)

**Document ID:** `SPEC-2026-09-14-REMEDIATION`  
**Revision:** 3.0 (Post-Astra Spec Re-Review Resolution)  
**Date:** 2026-09-14  
**Author:** Lead Engineer (`gnomad-carrier-frequency`)  
**Status:** Ready for Plan Review  
**Target Repository:** `gnomad-carrier-frequency`  
**Integration Base SHA:** `083375e` (docs: add evidence-based codebase review for 2026-09-14)

---

## 1. Executive Summary & Problem Formulation

The September 14, 2026 codebase review identified critical calculation discrepancies, state-coordination race conditions, data-loss failure modes during history restore, unverified asset updates, accessibility barriers, and continuous-integration enforcement bypasses in `gnomad-carrier-frequency`.

This specification provides exhaustive, mathematically and clinically validated contracts resolving all defects and incorporates all findings from the adversarial Astra specification reviews.

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
    readonly clinvarConflictingThreshold: number; // e.g. 0.8 (80%)
    readonly conflictingReviewStarsMin: number;
  };

  /** Quality Filter Parameters */
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

#### Serialization Contract:
- Arrays are used for all collections (`enabledFlags`, `manualExcludedVariantIds`, `qualityExcludedVariantIds`) to ensure transparent JSON round-tripping (`JSON.stringify` / `JSON.parse`).
- Memory representations use `Set<string>` internally via typed converter utilities (`toAnalysisContext` / `serializeAnalysisContext`).
- Dual exclusion provenance: variants excluded both manually and by quality appear in both arrays, with composite entries in `exclusionReasons`.

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
  Recurrence risk calculation requires a known index genotype. If `indexStatus` is missing or not a valid `IndexPatientStatus`, recurrence risk is `null`, and UI displays `"N/A — Index status required"`. Fictitious risks ($CF^2/4$) are not computed.
- **Penetrance Range:**
  $0.0 \le \text{penetrance} \le 1.0$. If penetrance is 0, recurrence risk is 0.0. CLI `--penetrance` validator accepts range `[0, 1]`.

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

#### 2.2.2 Narrative Text & Template Alignment (SPEC-02)
- English templates (`en.json`) and German templates (`de.json`) shall dynamically interpolate the conditional transmission factor:
  - For affected index parents: 50% conditional probability given partner carrier status.
  - For heterozygous carrier index parents: 25% conditional probability.
- When penetrance $< 1.0$, narrative reports: `"assuming a clinical penetrance of {{penetrancePercent}}% (reduced penetrance model)"`.
- Update `UrlStateSchema` in `packages/core/src/types/url-state.ts` to validate all four supported statuses:
  `status: z.enum(['heterozygous', 'homozygous', 'compound_het_confirmed', 'compound_het_assumed']).optional()`.

#### 2.2.3 Clinical Interpretation, Prevalence & Applicability Boundaries (SPEC-03)
1. **Autosomal Recessive Diploid Model:** Bi-allelic pathogenicity causes disease.
2. **Linkage & Phase Disclaimer:** The Gene Carrier Rate formula ($GCR = 1 - \prod (1 - VCR_i)$) assumes variants are independent and unlinked. It does NOT infer phase or separate cis from trans co-occurrence.
3. **Partner Assumptions:** Non-consanguineous mating with a partner representative of the gnomAD reference population without family history.
4. **Prevalence Clarification:**
   - **Genetic Prevalence:** Computed directly from allele frequencies: $q^2 = (\sum q_i)^2$.
   - **Penetrance-Adjusted Prevalence:** Computed as $q^2 \times \text{penetrance}$.
   - **Orphanet Prevalence:** Displayed purely as external clinical contextual reference; it is NOT multiplied or bayesian-updated into the gnomAD calculation.

#### 2.2.4 Fallback Count Pooling Contract (SPEC-04)
When joint counts are absent:
- Pool available exome and genome counts:
  $$AC = (AC_{\text{exome}} \lor 0) + (AC_{\text{genome}} \lor 0)$$
  $$AN = (AN_{\text{exome}} \lor 0) + (AN_{\text{genome}} \lor 0)$$
  $$Hom = (Hom_{\text{exome}} \lor 0) + (Hom_{\text{genome}} \lor 0)$$
- An exome-only or genome-only value is used ONLY if the other source has $AN = 0$. Counts are never discarded.

#### 2.2.5 Truth Table for Zero, Missing, and Fallback Semantics (SPEC-05)

| Precedence | Condition | Raw CF | Fallback CF (if enabled) | Genetic Prevalence ($q^2$) | UI Display | Export Metadata Flags |
|---|---|---|---|---|---|---|
| **1. Missing Data** | All sites in gene have $AN = 0$ | `null` | `null` | `null` | `"No data"` | `missingData: true, rawCarrierFrequency: null` |
| **2. No Pathogenic Variants** | Zero variants meet pathogenicity filters | `null` | `0.01` (1.0%) | If fallback: $0.01^2 \times \text{penetrance}$; else `null` | `"1% (Default assumption)"` or `"Not detected"` | `isDefaultFallback: true/false, noQualifyingVariants: true` |
| **3. All Excluded** | Pathogenic variants exist, all excluded manually/quality | `null` | `0.01` (1.0%) | If fallback: $0.01^2 \times \text{penetrance}$; else `null` | `"1% (Default assumption)"` or `"Not detected"` | `isDefaultFallback: true/false, allExcluded: true` |
| **4. All-Homozygote Sites Only** | For all variants $AC_i = 2 \cdot Hom_i$ | If HomExcl: $0.0$; else $2q(1-q)$ | N/A (variants exist) | $q^2 = (\sum q_i)^2 > 0$ | If HomExcl: `"0% (Homozygotes only)"` | `variantHomozygoteOnly: true, rawCarrierFrequency: 0.0` |
| **5. Observed Zero** | $AC_i = 0, AN_i > 0$ for all variants | `0.0` | N/A | `0.0` | `"0% (0 / N)"` | `observedZero: true, rawCarrierFrequency: 0.0` |
| **6. Normal Calculation** | Qualifying variants included | Computed $GCR$ | N/A | $q^2 \times \text{penetrance}$ | Formatted % and 1:N ratio | `isDefaultFallback: false, rawCarrierFrequency: GCR` |

---

### 2.3 Worker Coordination, Concurrency & Lifecycle Architecture (SPEC-06, SPEC-07)

#### 2.3.1 Worker State Machine with Infallible Pending Dispatch (SPEC-06)
In `useCarrierFrequency.ts`:
1. Every dispatch assigns a unique `sessionId: string` (tied to `gene:datasetVersion`) and a monotonically increasing `revision: number`.
2. When the worker responds (either `onmessage` success or `onerror` failure):
   - If `response.sessionId !== activeSessionId || response.revision < activeRevision`: discard stale result.
   - If `response.revision === activeRevision` and success: commit result to store.
   - If `response.revision === activeRevision` and failure: record error state.
   - **Crucial Invariant:** Regardless of whether the in-flight calculation succeeded or failed, check `hasPendingChanges`. If `hasPendingChanges === true`:
     - Clear `hasPendingChanges`.
     - Dispatch latest `AnalysisContext` snapshot to worker immediately!
   - If no pending changes: set state to `IDLE`.
3. In `variant-worker.ts`:
   - All cached raw datasets (`variants`, `clinvarVariants`, `subcontinentalData`) are stored in a map keyed by `sessionId`.
   - Switching genes purges the previous session's raw data to prevent cross-gene data corruption.

#### 2.3.2 Atomic Transactional History & URL Restoration (SPEC-07)
In `useHistoryRestore.ts`:
1. Generate unique `restoreToken = Symbol()`. Set `isRestoring = true` and `activeRestoreToken = restoreToken`.
2. **Autosave Suppression:** In `useHistoryAutoSave.ts`, cancel active debounced autosaves (`saveDebounced.cancel()`) and suppress autosaving while `isRestoring === true`.
3. **Profile Synchronization:** `loadGeneConfig(entry.gene)` checks `isRestoring`: if active, it loads disease metadata but skips applying factory default profile overrides. Restored filter settings take precedence.
4. **Legacy History Migration:**
   ```typescript
   function migrateHistoryEntry(raw: any): RestoredSettings {
     return {
       dataset: raw.target?.dataset ?? raw.results?.gnomadVersion ?? 'v4',
       filters: {
         includeLof: raw.filters?.includeLof ?? raw.filterConfig?.lofHcEnabled ?? true,
         includeMissense: raw.filters?.includeMissense ?? raw.filterConfig?.missenseEnabled ?? false,
         includeClinvarPathogenic: raw.filters?.includeClinvarPathogenic ?? raw.filterConfig?.clinvarEnabled ?? true,
         clinvarReviewStarsMin: raw.filters?.clinvarReviewStarsMin ?? raw.filterConfig?.clinvarStars ?? 1,
         includeConflictingClinvar: raw.filters?.includeConflictingClinvar ?? raw.filterConfig?.conflictingEnabled ?? false,
         clinvarConflictingThreshold: raw.filters?.clinvarConflictingThreshold ?? raw.filterConfig?.conflictingThreshold ?? 0.8,
         conflictingReviewStarsMin: raw.filters?.conflictingReviewStarsMin ?? 1
       },
       manualExclusions: raw.exclusions?.manualExcludedVariantIds ?? raw.excludedVariantIds ?? [],
       penetrance: raw.clinical?.penetrance ?? raw.penetrance ?? 1.0,
       calculation: raw.calculation ?? { formula: 'hwe', useHomozygoteExclusion: true, useBayesianPrevalence: true }
     };
   }
   ```
5. On completion, verify `activeRestoreToken === restoreToken`. Synchronize URL state and release `isRestoring = false`.

---

### 2.4 Security, External Queries & Freshness (SPEC-08, SPEC-09, SPEC-11)

#### 2.4.1 gnomAD GraphQL ClinVar Submissions Query Schema (SPEC-08)
gnomAD's GraphQL schema defines singular `clinvar_variant(variant_id: String!, reference_genome: ReferenceGenomeId!)` with `submitter_name` (NOT `submission_names`).

**Parameterized Implementation in `packages/core/src/queries/clinvar-submissions.ts`:**
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
Client transport passes `{ query, variables }` over HTTPS POST.

#### 2.4.2 ClinGen Updater Validation & Canonical Headers (SPEC-09)
In `.github/workflows/update-clingen-data.yml`:
- Download destination: `apps/web/public/data/clingen-gene-validity.csv`.
- Validator `scripts/validate-clingen-csv.ts`:
  - Ignores leading `#` comment lines.
  - Matches canonical headers: `GENE SYMBOL`, `HGNC ID`, `DISEASE LABEL`, `DISEASE ID (MONDO)`, `MOI`, `SOP`, `CLASSIFICATION`, `ONLINE REPORT`, `CLASSIFICATION DATE`, `GCEP`.
  - Asserts $\ge 1,000$ valid records.
  - If valid and content differs from shipped asset, stages to `apps/web/public/data/clingen-gene-validity.csv` and commits.

#### 2.4.3 Template Store Zod Schema Alignment (SPEC-11, SPEC-11-D1)
In `useTemplateStore.ts`, import validation is strictly typed on both outer and inner objects:
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

1. **Distribution Model:** The CLI is supported as an executable Node.js package in the workspace, run via `bun gnomad-cf` or `node packages/cli/dist/cli.mjs`.
2. **Dependency Manifest:**
   - In `packages/cli/package.json`, declare `"zod": "^4.3.5"` matching root catalog.
   - Inject application version during build via tsdown define (`__CLI_VERSION__`) to guarantee `--version` prints manifest version (`1.7.2`).
3. **Template Resolution (NEW-09):**
   - In `packages/core/tsdown.config.ts`, bundle template JSON files into `dist/templates/`.
   - Update `packages/core/src/templates/load-templates.ts` to locate templates relative to `new URL('./templates', import.meta.url)` in ESM.
4. **Test Discovery:** `packages/cli/vitest.config.ts` includes `src/**/__tests__/*.ts` and `tests/**/*.ts`.

---

### 2.6 CI/CD Enforcement & Deployment Gating (SPEC-12)

#### 2.6.1 Working Package Scripts
In root `package.json`, define working scripts:
- `"test:coverage": "vitest run --coverage"`
- `"test:e2e": "CI=1 playwright test"`

#### 2.6.2 Non-Tolerated CI Tests (`tests.yml`)
- Trigger: `push` on `main`, `pull_request` on `main`.
- Jobs:
  - `lint-and-typecheck`: `bun run lint && bun run typecheck`
  - `unit-tests`: `bun run test --run`
  - `e2e-tests`: `bun run test:e2e` (runs on both PR and main push)
- All steps must succeed with exit code 0 (`continue-on-error` removed).

#### 2.6.3 Gated Deployment (`deploy.yml`)
```yaml
name: Deploy
on:
  workflow_run:
    workflows: ["Tests"]
    types: [completed]
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion == 'success' && github.repository == 'berntpopp/gnomad-carrier-frequency' }}
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.workflow_run.head_sha }}
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run build
      - uses: actions/deploy-pages@v4
```

---

### 2.7 Accessibility, Interaction & Error Recovery (SPEC-15)

1. **Population Table Keyboard Navigation (A11Y-1):**
   - Action column includes button: `<v-btn icon aria-label="View variants for {name}" @click="openDrilldown(item)">`.
   - Table rows support `tabindex="0"`, high-contrast outline on `:focus-visible`, and `Enter`/`Space` activation.
2. **Accessible SVG Bar Chart (A11Y-2):**
   - Each population `<g>` has `tabindex="0"`, `role="button"`, and `@keydown.enter.prevent="openDrilldown(item)"` + `@keydown.space.prevent="openDrilldown(item)"`.
   - On modal dismiss, focus programmatically returns to activating table row or SVG bar.
3. **Touch Drilldown Resolution (NEW-12):**
   - Remove `touchstart.prevent` in `PopulationBarChart.vue` so tap triggers click and opens modal on mobile devices.
4. **Wizard Focus Management (A11Y-3):**
   - Programmatically focus `<h2 tabindex="-1">` on step change.
5. **Global Error Boundary (A11Y-4):**
   - `ErrorBoundary.vue` wraps `<router-view>` in `App.vue`. Catches render exceptions, displays alert card, logs error, and provides "Reset Application State" button.

---

### 2.8 Performance Budgets & Benchmark Methodology (SPEC-13)

1. **Methodology:**
   - Harness: `scripts/benchmark-lighthouse.ts`.
   - Pinned profile: headless Chromium, unthrottled desktop, port 4173 (`bun run preview`).
   - 5 cold navigation runs and 5 warm cache runs, recording median and IQR.
2. **Budgets:**
   - Navigation Audit: Performance $\ge 90$, LCP $\le 1.8\text{s}$, CLS $\le 0.05$, TBT $\le 100\text{ms}$.
   - Interaction Duration: Step 1 to Step 4 render for CFTR $\le 500\text{ms}$.
   - Bundle Footprint: Main JS gzip $\le 350\text{kB}$ (dynamically importing `write-excel-file` on export click).

---

### 2.9 Rollback Dependency Groups (SPEC-16)

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
