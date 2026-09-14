# Remediation Specification & Architecture Design (Revised)

**Document ID:** `SPEC-2026-09-14-REMEDIATION`  
**Revision:** 2.0 (Post-Astra Spec Review Resolution)  
**Date:** 2026-09-14  
**Author:** Lead Engineer (`gnomad-carrier-frequency`)  
**Status:** Ready for Plan Review  
**Target Repository:** `gnomad-carrier-frequency`  
**Integration Base SHA:** `083375e` (docs: add evidence-based codebase review for 2026-09-14)

---

## 1. Executive Summary & Problem Formulation

The September 14, 2026 codebase review identified critical calculation discrepancies, state-coordination race conditions, data-loss failure modes during history restore, unverified asset updates, accessibility barriers, and continuous-integration enforcement bypasses in `gnomad-carrier-frequency`.

This revised specification incorporates all resolutions from the independent Astra specification review (SPEC-01 through SPEC-16), providing complete mathematical, clinical, state, security, and toolchain contracts.

---

## 2. Architectural Design & Subsystem Specifications

### 2.1 Explicit Analysis Context & Serialization Contract (SPEC-01)

To eliminate distributed, desynchronized state and ensure complete export/reproducibility fidelity, all calculations, exports, and UI components reference a single authoritative `AnalysisContext`:

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
    readonly subcontinentalEnabled: boolean; // applicable only to v2
  };

  /** Clinical Index Assumptions */
  readonly clinical: {
    readonly indexStatus: IndexGenotypeStatus;
    // 'heterozygous' | 'homozygous' | 'compound_het_confirmed' | 'compound_het_assumed' | 'unknown'
    readonly frequencySource: FrequencySource; // 'gnomad' | 'literature'
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
    readonly conflictingReviewStarsMin: number;
  };

  /** Quality Filter Parameters */
  readonly quality: {
    readonly excludeQualityFailures: boolean;
    readonly enabledFlags: QualityFlagId[]; // Serialized as Array, converted to Set in memory
    readonly minAlleleNumber: number;
    readonly maxHomozygotes: number;
    readonly highAfThreshold: number; // e.g. 0.05
    readonly homozygoteMultiplier: number; // e.g. 2.0
  };

  /** Independent Exclusions */
  readonly exclusions: {
    /** Manually excluded by user in UI */
    readonly manualExcludedVariantIds: string[];
    /** Excluded automatically by active quality filters */
    readonly qualityExcludedVariantIds: string[];
    /** Structured exclusion reasons mapping variantId -> reason string */
    readonly exclusionReasons: Record<string, string>;
  };

  /** Calculation Formula Parameters */
  readonly calculation: {
    readonly formula: CarrierFormula; // 'hwe' | 'simplified'
    readonly useHomozygoteExclusion: boolean;
    readonly useBayesianPrevalence: boolean;
  };

  /** Provenance Metadata */
  readonly provenance: {
    readonly isDefaultFallback: boolean; // True if labelled prior fallback (1%) used
    readonly cacheTimestamp: number | null;
    readonly clinvarSubmissionBatchId: string | null;
    readonly appVersion: string;
  };
}
```

#### Serialization Invariants:
1. **JSON Compatibility:** All sets (e.g. `enabledFlags`, `manualExcludedVariantIds`) are defined and serialized as standard arrays in storage, URL state, worker messages, and export payloads. Runtime helper wrappers convert arrays to `Set<string>` internally for $O(1)$ membership checks.
2. **Dual-Exclusion Tracking:** If a variant is both manually excluded and quality-excluded, it appears in both arrays, and `exclusionReasons[variantId]` records composite provenance (e.g. `"Manual: user excluded; Quality: High homozygote count"`).
3. **Immutability:** Every update produces a new frozen object with an incremented `revision`.

---

### 2.2 Mathematical, Genetic, and Clinical Calculation Contracts (SPEC-02, SPEC-03, SPEC-04, SPEC-05)

#### 2.2.1 Exhaustive Recurrence Risk Transmission Contract (SPEC-02)
Recurrence risk is the probability that a future pregnancy of the index individual/couple results in an affected child under autosomal recessive Mendelian inheritance:
- **Heterozygous Carrier Index Parent:**
  Transmits pathogenic allele with probability $1/2$. A general population partner with carrier frequency $CF$ transmits with probability $CF/2$.
  $$\text{Recurrence Risk} = \frac{1}{2} \times \frac{CF}{2} \times \text{Penetrance} = \frac{CF}{4} \times \text{Penetrance}$$
- **Affected Index Parent (`homozygous`, `compound_het_confirmed`, `compound_het_assumed`):**
  Transmits a pathogenic allele with probability $1.0$. The population partner transmits with probability $CF/2$.
  $$\text{Recurrence Risk} = 1.0 \times \frac{CF}{2} \times \text{Penetrance} = \frac{CF}{2} \times \text{Penetrance}$$
- **Unknown Status (`unknown`):**
  When index genotype status is unknown or unspecified, the index individual is treated as a member of the general population ($CF$). The prior risk that both partners are carriers and both transmit is:
  $$\text{Recurrence Risk} = \frac{CF \times CF}{4} \times \text{Penetrance} = \frac{CF^2}{4} \times \text{Penetrance}$$
  (Or displays "N/A — Index status unknown" depending on clinical mode).

**Implementation in `@gnomad-cf/core/calculations/recurrence-risk.ts`:**
```typescript
export type IndexGenotypeStatus =
  | 'heterozygous'
  | 'homozygous'
  | 'compound_het_confirmed'
  | 'compound_het_assumed'
  | 'unknown';

export function calculateRecurrenceRisk(
  carrierFrequency: number | null,
  indexStatus: IndexGenotypeStatus,
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
    case 'unknown':
      return (carrierFrequency * carrierFrequency * 0.25) * penetrance;
    default:
      return null;
  }
}
```

#### 2.2.2 Narrative Text Consistency (SPEC-02)
- English templates (`en.json`) and German templates (`de.json`) shall be updated so that conditional disease probability descriptions dynamically interpolate the effective risk factor (e.g. 50% conditional on partner carrier status for affected index parent, 25% for carrier parent).
- When penetrance $< 1.0$, narrative text explicitly notes: `"assuming a clinical penetrance of {{penetrancePercent}}% (reduced penetrance model)"`.

#### 2.2.3 Clinical Interpretation & Applicability Boundaries (SPEC-03)
The application estimates carrier frequencies under standard population genetics assumptions:
1. **Autosomal Recessive Diploid Model:** Assumes bi-allelic loss of function or pathogenicity causes disease.
2. **Linkage & Phase Disclaimer:** The Gene Carrier Rate formula ($GCR = 1 - \prod (1 - VCR_i)$) assumes variants are unlinked and independent in the population. It does NOT distinguish cis (same allele) from trans (compound heterozygote) co-occurrence.
3. **Partner Assumptions:** Assumes non-consanguineous mating with a partner representative of the chosen gnomAD population without known family history.
4. **Bayesian Prevalence:** When enabled, Bayesian prevalence incorporates Orphanet/literature disease prevalence as an empirical prior to modulate the population genetic prevalence ($q^2$).
*Requirement:* Generated clinical letters and exports must include standard research-use and clinical genetics modeling disclaimers citing these boundaries.

#### 2.2.4 Fallback Count Pooling Contract (SPEC-04)
When joint calling counts (`joint_ac`, `joint_an`, `joint_hom`) are absent or incomplete:
- Exome and genome counts are pooled across called sites:
  $$AC = (AC_{\text{exome}} \lor 0) + (AC_{\text{genome}} \lor 0)$$
  $$AN = (AN_{\text{exome}} \lor 0) + (AN_{\text{genome}} \lor 0)$$
  $$Hom = (Hom_{\text{exome}} \lor 0) + (Hom_{\text{genome}} \lor 0)$$
- An exome-only or genome-only fallback is used ONLY when the other source has $AN = 0$ or is completely uncalled. Available counts are never silently discarded.

#### 2.2.5 Truth Table for Zero vs Missing Semantics (SPEC-05)

| Case | Condition | Raw CF | Fallback CF (if enabled) | Prevalence | UI Display | Export Flags |
|---|---|---|---|---|---|---|
| **A: Observed Zero** | Qualifying variants exist; all have $AC = 0, AN > 0$ | `0.0` | `0.0` | `0.0` | `0% (0 / N)` | `isDefaultFallback: false, observedZero: true` |
| **B: Missing Data** | All sites in gene have $AN = 0$ (uncalled) | `null` | `null` | `null` | `"No data"` | `isDefaultFallback: false, missingData: true` |
| **C: No Qualifying Variants** | No variants meet pathogenicity filters | `null` | `0.01` (1.0%) | $0.01^2 / 4$ | `"1% (Default assumption)"` | `isDefaultFallback: true, rawCarrierFrequency: null` |
| **D: All Variants Excluded** | Variants exist but all excluded manually/quality | `null` | `0.01` (1.0%) | $0.01^2 / 4$ | `"1% (Default assumption)"` | `isDefaultFallback: true, allExcluded: true` |
| **E: All-Homozygote Site** | $AC_i = 2 \cdot Hom_i$ | $VCR_i = 0$ | N/A | $VCR_i = 0$ | Contributes 0 to GCR | `variantHomozygoteOnly: true` |

---

### 2.3 Worker Coordination, Lifecycle & State Synchronization (SPEC-06, SPEC-07)

#### 2.3.1 Complete Worker Lifecycle State Machine (SPEC-06)
`useCarrierFrequency.ts` shall manage worker execution with complete handling of success, failure, cancellation, and pending re-dispatch:

```
                  ┌──────────────┐
                  │     IDLE     │◄───────────────────┐
                  └──────┬───────┘                    │
                         │ dispatchRequest            │
                         ▼                            │
                  ┌──────────────┐                    │
                  │  CALCULATING │                    │
                  └──┬────────┬──┘                    │
                     │        │                       │
      new mutation   │        │ worker response       │
      arrives        │        │                       │
         ▼           │        ▼                       │
   set pendingState  │   revision matches?            │
   keep calculating  │   ├── YES: commit result ──────┤
                     │   └── NO:  discard stale ──────┤
                     │                                │
                     │ worker error/reject            │
                     ▼                                │
                 handle error                         │
                 has pendingState?                    │
                 ├── YES: dispatch pending ───────────┘
                 └── NO:  set IDLE / error state ─────┘
```

- **Cancellation on Gene Change:** When the user switches genes ($A \to B$), an active fetch for $A$ is immediately aborted via `AbortController`, its session ID is invalidated, and the worker message queue is cleared.
- **Session Identity:** Every worker calculation packet includes a unique `sessionId: string` tied to the active gene and dataset version. Any message received from the worker with a mismatched `sessionId` or older `revision` is dropped silently.
- **Worker Termination & Reset:** On composable unmount or explicit `reset()`, any active worker task is terminated, and state reverts to default.

#### 2.3.2 Atomic Transactional History & URL Restoration (SPEC-07)
To prevent asynchronous profile loading, URL watchers, or autosave hooks from overwriting restored settings:
1. **Restoration Mutex:** Restoration sets `isRestoring = true` with a unique transaction token `restoreToken`.
2. **Suppression:** While `isRestoring === true`:
   - `useHistoryAutoSave` ignores step and result changes.
   - `useUrlState` stops updating the browser location bar.
   - Downstream wizard step reset watchers are disabled.
3. **Gene Config Synchronization:** When `loadGeneConfig(entry.gene)` runs during restore:
   - The restore transaction explicitly flags `skipDefaultProfileApply = true`.
   - The saved profile overrides from the history entry (or explicit saved filter config) take precedence over the gene's factory default profile.
4. **Legacy History Schema Migration:**
   - If `entry.results.gnomadVersion` exists, map to `datasetVersion`.
   - If `entry.filterConfig` exists, map legacy fields (`lof`, `missense`, `clinvar`) to the current `filters` schema.
   - If `entry.excludedVariantIds` exists, populate `manualExcludedVariantIds`.
   - If calculation parameters are absent, default to `formula: 'hwe'`, `useHomExclusion: true`, `penetrance: 1.0`.

---

### 2.4 Security, External Queries & Freshness (SPEC-08, SPEC-09, SPEC-11)

#### 2.4.1 gnomAD GraphQL ClinVar Submissions Query Schema (SPEC-08)
gnomAD's official GraphQL schema exposes singular queries per variant:
`clinvar_variant(variant_id: String!, reference_genome: ReferenceGenomeId!)`.

We parameterize singular aliased queries using standard GraphQL variables:
```typescript
export function buildSubmissionsQuery(
  variantIds: string[],
  referenceGenome: ReferenceGenome // 'GRCh38' | 'GRCh37'
): { query: string; variables: Record<string, string> } {
  // Validate variant ID format strictly
  for (const id of variantIds) {
    if (!/^(?:chr)?(?:\d+|X|Y)-[0-9]+-[ACGT]+-[ACGT]+$/i.test(id)) {
      throw new Error(`Invalid variant ID for ClinVar query: ${id}`);
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
          submission_names
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

#### 2.4.2 ClinGen Updater Validation & Path Alignment (SPEC-09)
In `.github/workflows/update-clingen-data.yml`:
- Download target: `apps/web/public/data/clingen-gene-validity.csv`.
- Validation script `scripts/validate-clingen-csv.ts` asserts:
  - Header row contains: `GENE SYMBOL`, `DISEASE LABEL`, `DISEASE ID`, `MOI`, `CLASSIFICATION`, `ONLINE REPORT`, `CLASSIFICATION DATE`.
  - Record count $\ge 1,000$.
  - First 5 rows parse into valid ClinGen classification records.
- Publication: If validation passes and file has changed, stage changes, commit with `chore(data): update clingen gene validity [skip ci]`, and push to `main` (or PR if branch protection requires).

#### 2.4.3 Template Store Zod Schema Alignment (SPEC-11)
`useTemplateStore.ts` import validation shall strictly match the actual exported structure:
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
  })
}).strict();
```

---

### 2.5 CLI Distribution, Build & Resource Resolution (SPEC-10)

1. **Distribution Model:** The CLI is supported as an executable Node.js package in the workspace and runnable directly via `bun gnomad-cf` or `node packages/cli/dist/cli.mjs`.
2. **Dependency Manifest:**
   - In `packages/cli/package.json`, declare `"zod": "^4.3.5"` matching the monorepo catalog.
   - Inject application version during build via tsdown define (`__CLI_VERSION__`) to guarantee `--version` outputs current manifest version (`1.7.2`).
3. **Template Resolution (NEW-09):**
   - In `packages/core/tsdown.config.ts`, bundle or copy `src/config/templates/*.json` into `dist/templates/`.
   - Update `packages/core/src/templates/load-templates.ts` to locate templates relative to `new URL('./templates', import.meta.url)` in ESM or fallback to embedded templates if file reading is unavailable.
4. **Test Discovery:** Ensure `packages/cli/vitest.config.ts` includes `src/**/__tests__/*.ts` and `tests/**/*.ts`.

---

### 2.6 CI/CD Enforcement & Deployment Gating (SPEC-12)

#### Unified Workflow Architecture:
In `.github/workflows/tests.yml` and `.github/workflows/deploy.yml`:
1. **Tests Workflow (`tests.yml`):**
   - Runs on `push` to `main` and `pull_request`.
   - Executes `bun run lint`, `bun run typecheck`, `bun run test --run`, `bun run test:coverage`, and `bun run test:e2e` (both push and PR).
   - Removes all `continue-on-error: true` flags.
2. **Deployment Workflow (`deploy.yml`):**
   - Triggers on `workflow_run` of `Tests` workflow on branch `main` with `conclusion: success`.
   - Does not run if tests fail or are cancelled.
   - Uses the verified commit SHA from the triggering test run to build and publish GitHub Pages.

---

### 2.7 Accessibility & Error Recovery (SPEC-15)

1. **Keyboard Accessibility for Population Table (A11Y-1):**
   - Table rows include an accessible button in the Action column:
     `<v-btn icon aria-label="View variants for {populationName}" @click="openDrilldown(item)">`
   - Focused row displays high-contrast outline; pressing `Enter` or `Space` activates drilldown.
2. **Accessible SVG Bar Chart (A11Y-2):**
   - Each population `<g>` in `PopulationBarChart.vue` receives `tabindex="0"`, `role="button"`, and `aria-label="{populationName} carrier frequency {value}"`.
   - Visual focus ring SVG element renders on `:focus-visible`.
3. **Touch Drilldown Resolution (NEW-12):**
   - Remove `touchstart.prevent` which stops click events on mobile Chromium/WebKit.
   - Implement tap detection allowing modal opening on mobile while preserving vertical touch scrolling.
4. **Wizard Focus Transition (A11Y-3):**
   - On step transition, programmatic focus moves to the step heading element (`<h2 tabindex="-1">`) via `ref.value?.focus()`, ensuring screen readers announce step content immediately.
5. **Global Error Boundary (A11Y-4):**
   - Implement `ErrorBoundary.vue` with `onErrorCaptured`.
   - Intercepts render and component errors, displays recoverable alert card, logs error to `useLogStore`, and provides "Reset Application State" action.

---

### 2.8 Performance Budgets & Benchmark Methodology (SPEC-13)

1. **Separation of Measurement Modes:**
   - **Navigation Audit (Lighthouse):** Evaluates cold-load initial page load at root `/` with mock service worker inactive.
     - Budgets: Performance Score $\ge 90$, LCP $\le 1.8\text{s}$, CLS $\le 0.05$, TBT $\le 100\text{ms}$.
   - **Interaction Performance (Playwright Timespan):** Measures time from Step 1 gene submission to Step 4 calculation render for CFTR (large variant set).
     - Budget: Total calculation and render duration $\le 500\text{ms}$ on standard desktop profile.
2. **Bundle Optimization Targets:**
   - Lazy-load `write-excel-file` via dynamic `import('../utils/xlsx-export')` when user clicks Excel export.
   - Verify initial main JS bundle remains $\le 350\text{kB}$ gzip (baseline $322.8\text{kB}$).

---

### 2.9 Rollback Dependency Groups & DAG (SPEC-16)

To prevent cascading breakage during potential rollbacks, changes are grouped into explicit dependency clusters:

```
[Group A: Lane 1 - Core Math & Types]
           │
           ▼
[Group B: Lane 2 - Worker & Composable State]
           │
           ▼
[Group C: Lane 3 - Export & CLI Consistency]
           │
     ┌─────┴────────────────┐
     ▼                      ▼
[Group D: Lane 4 - CI]  [Group E: Lane 5 - A11y & UI]
     └─────┬────────────────┘
           ▼
[Group F: Lane 6 - Performance & Budgets]
```

- **Rollback Invariants:**
  - If Group B is rolled back, Group C must also be rolled back.
  - Group D (CI/Workflows) and Group E (UI/A11y) are decoupled from each other and can be rolled back independently once Groups A, B, and C are stable.
