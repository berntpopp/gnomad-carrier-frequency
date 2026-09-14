# Remediation Specification & Architecture Design (Revision 7.0)

**Document ID:** `SPEC-2026-09-14-REMEDIATION`  
**Revision:** 7.0 (Astra Spec Review Resolution Round 6)  
**Date:** 2026-09-14  
**Author:** Lead Engineer (`gnomad-carrier-frequency`)  
**Status:** Approved / Plan Ready  
**Target Repository:** `gnomad-carrier-frequency`  
**Integration Base SHA:** `083375e` (docs: add evidence-based codebase review for 2026-09-14)

---

## 1. Executive Summary & Problem Formulation

The September 14, 2026 codebase review identified critical calculation discrepancies, state-coordination race conditions, data-loss failure modes during history restore, unverified asset updates, accessibility barriers, and continuous-integration enforcement bypasses in `gnomad-carrier-frequency`.

This revised specification incorporates all resolutions from the adversarial Astra specification reviews (SPEC-01 through SPEC-16 and Rounds 3/4/5 feedback), establishing verifiable mathematical, genetic, concurrency, and toolchain contracts across all workspaces.

---

## 2. Architectural Design & Subsystem Specifications

### 2.1 Explicit Analysis Context & Serialization Contract (SPEC-01, R5-DOC-01)

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

  /** Quality Filter Parameters (Lossless Alignment with QualitySettings & QualityExclusionConfig) */
  readonly quality: {
    // Flag detection toggles and thresholds
    readonly highAfEnabled: boolean;
    readonly highAfThreshold: number; // e.g. 0.05
    readonly highHomEnabled: boolean;
    readonly highHomMethod: 'hwe_relative' | 'absolute';
    readonly highHomAbsoluteThreshold: number; // e.g. 10
    readonly highHomHWEMultiplier: number; // e.g. 2.0
    readonly gnomadFilteredEnabled: boolean;
    readonly genomesOnlyEnabled: boolean;

    // Flag exclusion policies
    readonly excludeHighAf: boolean;
    readonly excludeHighHom: boolean;
    readonly excludeGnomadFiltered: boolean;
    readonly excludeGenomesOnly: boolean;

    // Optional Allele Number policy (proposed extension)
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

#### Serialization Invariants (R5-DOC-01):
1. **JSON Compatibility:** Arrays are used for all collections (`manualExcludedVariantIds`, `qualityExcludedVariantIds`) to ensure transparent JSON round-tripping (`JSON.stringify` / `JSON.parse`).
2. **Dual-Exclusion Tracking:** Variants excluded both manually and by quality appear in both arrays, with composite entries in `exclusionReasons` (e.g. `"Manual exclusion; Quality: High homozygote count"`).
3. **Lossless Quality Mapping:** Every switch in `QualitySettings` (`highAfEnabled`, `highAfThreshold`, `highHomEnabled`, `highHomMethod`, `highHomAbsoluteThreshold`, `highHomHWEMultiplier`, `gnomadFilteredEnabled`, `genomesOnlyEnabled`), every policy in `QualityExclusionConfig` (`excludeHighAf`, `excludeHighHom`, `excludeGnomadFiltered`, `excludeGenomesOnly`), and proposed extension policies (`excludeLowAN`, `minAlleleNumber`) are directly serialized.

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

#### 2.2.2 URL State Schema & Default Carrier / Source Encoding (SPEC-02, R4-URL-01)
In `useUrlState.ts`, the URL encoder omits `status` when it is `'heterozygous'` and omits `source` when it is `'gnomad'` to produce concise shareable links. Therefore, `UrlStateSchema` in `packages/core/src/types/url-state.ts` must define explicit defaults:
```typescript
export const UrlStateSchema = z.object({
  gene: z.string().min(1).max(50).optional(),
  step: z.coerce.number().int().min(1).max(4).optional().default(1),
  status: z.enum(['heterozygous', 'homozygous', 'compound_het_confirmed', 'compound_het_assumed'])
    .optional()
    .default('heterozygous'),
  source: z.enum(['gnomad', 'literature', 'default'])
    .optional()
    .default('gnomad'),
  litFreq: z.coerce.number().min(0.0).max(1.0).optional(),
  litPmid: z.string().optional(),
  penetrance: z.coerce.number().min(0.0).max(1.0).optional().default(1.0),
  // ... filter, quality, and exclusion fields ...
});
```
When `status` or `source` is omitted in the URL query string, `UrlStateSchema.safeParse` restores them cleanly as `'heterozygous'` and `'gnomad'`. An explicit `source=default` parses validly. Penetrance bounds are validated to `[0.0, 1.0]`.

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

#### 2.2.5 Truth Table & Decision Matrix for Zero, Missing, and Fallback Semantics (SPEC-05)

Let variants for the queried gene be partitioned into well-defined evaluation sets:
- $V_{\text{raw}}$: all variant records returned by gnomAD API for the target gene coordinates.
- $V_{\text{path}} = \{ v \in V_{\text{raw}} \mid \text{matchesPathogenicityFilters}(v) \}$: variants satisfying active consequence and ClinVar criteria.
- $V_{\text{inc}} = \{ v \in V_{\text{path}} \mid \neg\text{isManuallyExcluded}(v) \land \neg\text{isQualityExcluded}(v) \}$: evaluable variants passing both manual and quality exclusion rules.

The evaluation cases are strictly exhaustive and evaluated in mutually exclusive order:

| Case | Disjoint Predicate | Raw CF | Fallback CF (if enabled) | Genetic Prevalence ($q^2$) | Penetrance-Adjusted Prev | UI Display | Export Metadata Flags |
|---|---|---|---|---|---|---|---|
| **1. Missing / Unsampled Data** | $(\|V_{\text{inc}}\| > 0 \land \sum_{v \in V_{\text{inc}}} AN_v = 0) \lor (\|V_{\text{inc}}\| = 0 \land \|V_{\text{path}}\| > 0 \land \sum_{v \in V_{\text{path}}} AN_v = 0) \lor (\|V_{\text{path}}\| = 0 \land (\|V_{\text{raw}}\| = 0 \lor \forall v \in V_{\text{raw}}, AN_v = 0))$ | `null` | `null` | `null` | `null` | `"No data"` | `missingData: true, rawCarrierFrequency: null` |
| **2. No Pathogenic Candidates** | $\|V_{\text{path}}\| = 0 \land (\exists v \in V_{\text{raw}}, AN_v > 0)$ | `null` | `0.01` (1.0%) | If fallback: $(0.01/2)^2 = 0.000025$; else `null` | If fallback: $0.000025 \times \text{penetrance}$; else `null` | If fallback: `"1% (Default assumption)"`; else `"Not detected"` | `isDefaultFallback: boolean, noQualifyingVariants: true` |
| **3. All Candidates Excluded** | $\|V_{\text{path}}\| > 0 \land \|V_{\text{inc}}\| = 0 \land \sum_{v \in V_{\text{path}}} AN_v > 0$ | `null` | `0.01` (1.0%) | If fallback: $(0.01/2)^2 = 0.000025$; else `null` | If fallback: $0.000025 \times \text{penetrance}$; else `null` | If fallback: `"1% (Default assumption)"`; else `"Not detected"` | `isDefaultFallback: boolean, allExcluded: true` |
| **4. Observed Zero** | $\|V_{\text{inc}}\| > 0 \land \sum_{v \in V_{\text{inc}}} AN_v > 0 \land \sum_{v \in V_{\text{inc}}} AC_v = 0$ | `0.0` | N/A | `0.0` | `0.0` | `"0% (0 / N)"` | `observedZero: true, rawCarrierFrequency: 0.0` |
| **5. Positive Homozygotes-Only Sites** | $\|V_{\text{inc}}\| > 0 \land \sum_{v \in V_{\text{inc}}} AN_v > 0 \land \sum_{v \in V_{\text{inc}}} AC_v > 0 \land \forall v \in V_{\text{inc}}, AC_v = 2 \cdot Hom_v$ | If HomExcl: `0.0` (via GCR); else active formula: $2q(1-q)$ (HWE) or $2q$ (simplified) | N/A | $q^2 = (\sum q_i)^2 > 0$ | $q^2 \times \text{penetrance}$ ($0.0$ if penetrance is $0.0$, else $> 0$) | If HomExcl: `"0% (Homozygotes only)"`; else formatted % | `variantHomozygoteOnly: true`, `rawCarrierFrequency: 0.0` (if HomExcl) else $CF$ |
| **6. Normal Residual Calculation** | $\|V_{\text{inc}}\| > 0 \land \sum_{v \in V_{\text{inc}}} AN_v > 0 \land \sum_{v \in V_{\text{inc}}} AC_v > 0 \land \exists v \in V_{\text{inc}}, AC_v > 2 \cdot Hom_v$ | If HomExcl: $GCR = 1 - \prod (1 - VCR_i)$; else active formula: $2q(1-q)$ (HWE) or $2q$ (simplified) | N/A | $q^2 = (\sum q_i)^2$ | $q^2 \times \text{penetrance}$ | Formatted % and 1:N ratio | `isDefaultFallback: false, rawCarrierFrequency: CF` |

*Policy on Fallback Prior Inversion:* The user-configured fallback prior is a **carrier frequency** ($CF = 0.01 = 1\%$). Under the standard diploid assumption $CF \approx 2q$, the implied carrier allele frequency is $q = \frac{CF}{2} = 0.005$. Therefore, the implied genetic prevalence is $q^2 = 0.005^2 = 0.000025$ (1 in 40,000), and the penetrance-adjusted disease prevalence is $0.000025 \times \text{penetrance}$. Observed zero (Case 4) and positive homozygote-only sites (Case 5) are strictly distinguished. In Case 5, when homozygote exclusion is disabled, calculation follows the active formula branch ($2q(1-q)$ under HWE, $2q$ under simplified) rather than GCR. When penetrance is 0.0, penetrance-adjusted prevalence is 0.0 for all cases with an available prevalence estimate (Cases 2–6 if fallback active or qualifying variants exist; remains `null` when data is missing in Case 1).

---

### 2.3 Worker Coordination, Concurrency & Lifecycle Architecture (SPEC-06, SPEC-07)

#### 2.3.1 Worker State Machine, Revision Guard & Session Invalidation (SPEC-06)
In `useCarrierFrequency.ts` and `useHistoryAutoSave.ts`:

1. **Context Revision Counter & Execution State:**
   - Single authoritative revision ref: `activeContextRevision: Ref<number> = ref(1)`.
   - Increment `activeContextRevision.value++` whenever any active analysis setting (gene, dataset, filters, calc, quality, exclusions) changes.
   - Dispatch tracking:
     - `inFlightSession: string | null = null;`
     - `inFlightRevision: number | null = null;`
     - `isCalculating: Ref<boolean> = ref(false);`
2. **Dispatch & Coalescing Protocol:**
   - When inputs change, caller invokes `requestCalculation()`:
     - If `isCalculating.value === true`: Do **not** spawn a parallel worker job. The running job will detect `activeContextRevision.value > inFlightRevision` upon completion and dispatch exactly one coalesced follow-up.
     - If `isCalculating.value === false`:
       ```typescript
       const sessionKey = `${wizardState.gene.symbol}:${selectedVersion.value}`;
       const reqRevision = activeContextRevision.value;
       inFlightSession = sessionKey;
       inFlightRevision = reqRevision;
       isCalculating.value = true;

       workerAdapter.processGene(buildPayload(activeContext))
         .then((result) => {
           // Atomic commit guard: commit ONLY if session matches and revision is current
           if (inFlightSession === sessionKey && reqRevision === activeContextRevision.value) {
             commitResult(result);
           } else {
             logger.debug(`[Worker] Discarded stale revision ${reqRevision} (current: ${activeContextRevision.value})`);
           }
         })
         .catch((error) => {
           if (inFlightSession === sessionKey && reqRevision === activeContextRevision.value) {
             handleCalculationError(error);
           }
         })
          .finally(() => {
            // Session ownership check: ignore callbacks from discarded sessions
            if (inFlightSession !== sessionKey) {
              return;
            }
            const hasPendingEdits = activeContextRevision.value > reqRevision;
            // Clear execution ownership prior to potential re-dispatch
            isCalculating.value = false;
            inFlightSession = null;
            inFlightRevision = null;

            // Coalesced replay check: dispatch exactly ONE follow-up if settings changed while in flight
            if (hasPendingEdits) {
              requestCalculation();
            }
          });
       ```
3. **Autosave Synchronization Guard:**
   - In `useHistoryAutoSave.ts`, filter and exclusion debounce timers must check `if (isCalculating.value) return;` — this strictly prevents saving new filter criteria alongside stale frequencies.
   - History entry updates occur only when `commitResult` publishes a verified `(AnalysisContext, Result)` pair for the current revision.
4. **Worker Cache Invalidation:**
   - In `variant-worker.ts`, cache raw datasets in a Map keyed by `geneSessionKey`. Switching genes clears previous session caches.

#### 2.3.2 Atomic Transactional History & URL Restoration (SPEC-07-MIG, SPEC-07-TXN)
In `useHistoryRestore.ts`, `useWizard.ts`, `useGeneConfig.ts`, and `useHistoryAutoSave.ts`:

1. **Transaction Lifecycle & Mutex:**
   - Generate unique token: `const token = Symbol('restore')`.
   - Set lock flags: `activeRestoreToken.value = token`, `isRestoring.value = true`.
   - Cancel any pending debounced autosaves immediately (`saveDebounced.cancel()`). Autosave writes are completely suppressed while `isRestoring.value === true`.
2. **Invalidate In-Flight Asynchronous Profile Loads:**
   - In `useGeneConfig.ts`, maintain module-level `activeConfigToken = Symbol()`.
   - Restore immediately assigns `activeConfigToken = Symbol()`.
   - In `useGeneConfig.ts`'s watcher on `selectedGene`:
     ```typescript
     const wasStartedDuringRestore = isRestoring.value;
     const reqToken = Symbol();
     activeConfigToken = reqToken;
     const targetSymbol = gene?.symbol;

     const config = await loadGeneConfig(gene.symbol);
     // Guard: discard if started during restore, superseded by another gene selection, or restore active
     if (wasStartedDuringRestore || activeConfigToken !== reqToken || wizardState.gene?.symbol !== targetSymbol || isRestoring.value) {
       if (wasStartedDuringRestore && config && wizardState.gene?.symbol === targetSymbol) {
         // Populate active config for metadata display only; strictly suppress applyProfile and store resets
         activeGeneConfig.value = config;
         configLoaded.value = true;
       }
       return;
     }
     ```
   - This guarantees that a slow, previously initiated configuration fetch cannot resolve after restore and clobber restored filters or calculation settings. While restore is active or if the gene load was initiated during a restore transaction, default profile application (`applyProfile`) and factory store resets are strictly suppressed; only metadata is populated for display.
3. **Dataset & Version Sequencing (Assembly Scope):**
   - Update target gnomAD dataset/version in `versionStore` **before** gene selection or worker fetch:
     `versionStore.setVersion(restored.dataset);`
   - This ensures the reference genome (`GRCh38` vs `GRCh37`) and API endpoints match the restored dataset before any network or worker requests are constructed.
4. **Gene Selection & Watcher Suppression:**
   - Update selected gene: `wizardStore.setSelectedGene(restored.gene);`
   - In `useWizard.ts`, the watcher on `selectedGene` checks `if (isRestoring.value) return;` — this strictly suppresses resetting `currentStep`, `indexPatientStatus`, and `frequencySource`.
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
         frequencySource: raw.clinical?.frequencySource ?? raw.frequencySource ?? raw.source ?? 'gnomad',
         literatureCarrierFrequency: raw.clinical?.literatureCarrierFrequency ?? raw.literatureFrequency ?? null,
         literaturePmid: raw.clinical?.literaturePmid ?? raw.literaturePmid ?? null,
         penetrance: raw.clinical?.penetrance ?? raw.penetrance ?? 1.0
       },
       calculation: raw.calculation ?? { formula: 'hwe', useHomozygoteExclusion: true, useBayesianPrevalence: true }
     };
   }
   ```
6. **State Hydration & Watcher Settlement:**
   - Atomically hydrate `filterStore`, `calcStore`, `qualityStore`, `exclusionStore`, and `wizardStore` with restored values.
   - `await nextTick();` — hold `isRestoring.value = true` across the microtask queue until all dependent Vue watchers and computed refs settle.
7. **Owner Verification & Release:**
   - In a `try...finally` block: verify `if (activeRestoreToken.value !== token) return;` (if a concurrent restore superseded this one, do not touch its lock).
   - Release lock: `isRestoring.value = false;`
   - Synchronize URL parameters with the restored state.
   - Dispatch worker calculation with the restored `AnalysisContext`. If an exception occurs, the `finally` block releases `isRestoring.value = false` only if the active token matches.

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

### 2.6 CI/CD Enforcement & Deployment Gating (SPEC-12-COV, SPEC-12-DOCS)

#### 2.6.1 Working Package Scripts & Coverage Threshold Enforcement (SPEC-12-COV)
In root `package.json`, define:
- `"test:coverage": "bun run --filter @gnomad-cf/core test:coverage && bun run --filter @gnomad-cf/cli test:coverage && bun run --filter gnomad-cf-web test:coverage"`
- `"test:e2e": "CI=1 playwright test"`

In each package `package.json`, define:
- `"test:coverage": "vitest run --coverage"`

Vitest 4 evaluates coverage thresholds at the root configuration level. Invoking package-level coverage runs loads each package's `vitest.config.ts` as its own root configuration, directly enforcing each package's calibrated thresholds:
- `@gnomad-cf/core`: `lines: 80` (enforcing core math and filter contracts)
- `@gnomad-cf/cli`: `lines: 70` (enforcing formatter, commands, and options)
- `gnomad-cf-web` (`apps/web`): `lines: 35` (enforcing stores, composables, and utils)

#### 2.6.2 Tests Workflow (`.github/workflows/tests.yml`)
- Trigger: `push` on `main`, `pull_request` on `main`.
- Jobs:
  - `lint-and-typecheck`: `bun run lint && bun run typecheck`
  - `unit-tests`: `bun run test --run`
  - `coverage`: `bun run test:coverage` (independent job failing if any package threshold is breached)
  - `e2e-tests`: `bun run test:e2e` (runs on both PR and main push)
- All steps must succeed (`continue-on-error` removed).

#### 2.6.3 Gated Deployment & Pages Artifact Composition (`.github/workflows/deploy.yml`, SPEC-12-DOCS)
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
      - name: Merge built documentation into web distribution
        run: cp -r apps/web/docs/.vitepress/dist apps/web/dist/docs
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

#### 2.8.1 Pinned Environment, Deterministic Replay & Complete Isolation
- **Browser:** Chromium bundled with `@playwright/test` (exact revision pinned in `bun.lock`).
- **Profile:** Desktop viewport (1280×800), headless, unthrottled CPU and network.
- **Server:** `bun run preview` serving production build on `http://127.0.0.1:4173/`.
- **Deterministic Fixtures:** Static mock response for CFTR (`apps/web/e2e/fixtures/cftr-mock.json`) and Orphanet prevalence (`apps/web/e2e/fixtures/orphanet-mock.json`).
- **Strict Network Isolation:** Playwright intercepts:
  - `https://gnomad.broadinstitute.org/api/**`
  - `https://search.clinicalgenome.org/**`
  - `https://api.orphadata.com/**`
  - `**/data/clingen-gene-validity.csv` (served locally from `apps/web/public/data/clingen-gene-validity.csv` on the preview server)
  Any unmocked external network request triggers immediate test assertion failure. Harness verifies fixture consumption by asserting expected qualifying variant counts prior to measurement.

#### 2.8.2 Cold Navigation & Warm Interaction Protocols
1. **Cold Navigation Suite (5 measured repetitions):**
   - Before each run, invoke Chrome DevTools Protocol (CDP) `Storage.clearDataForOrigin` clearing all origins, IndexedDB, Service Workers, Cache Storage, and Web Storage.
   - Navigate to `http://127.0.0.1:4173/?gene=CFTR`.
   - **Metric Collection Contract:**
     - **TTFB:** `performance.getEntriesByType('navigation')[0].responseStart`.
     - **FCP:** `performance.getEntriesByName('first-contentful-paint')[0].startTime`.
     - **LCP:** `PerformanceObserver` tracking `largest-contentful-paint` until page `load` + 500ms network-and-CPU idle window.
     - **TBT:** Total Blocking Time calculated as $\sum (\text{duration} - 50)$ for all `longtask` PerformanceObserver entries occurring between FCP and the 500ms quiet window.
2. **Warm Interaction Suite (5 measured repetitions):**
   - Perform 1 unmeasured warm-up navigation to seed IndexedDB cache and initialize the worker thread.
   - For each repetition, measure client execution boundaries using `performance.now()`:
     - **Refilter Duration:** Timestamp interval from filter toggle dispatch (e.g. missense consequence toggle) to Pinia store calculation commit event.
     - **Drilldown Dialog Render:** Timestamp interval from population SVG bar click to Vuetify dialog DOM visible state (`page.locator('.v-dialog .v-card').waitFor({ state: 'visible' })`).
3. **Statistical Reporting:**
   - Record all raw samples across the 5 runs; report median and Interquartile Range (IQR) for navigation and interaction metrics.

#### 2.8.3 Provisional Performance Budgets
*Note:* Budgets are established as provisional engineering targets to be calibrated against initial baseline runs on the host runner:
- Cold LCP $\le 2.0\text{s}$ (median), Cold TBT $\le 150\text{ms}$ (median).
- Client Refilter Duration $\le 300\text{ms}$ (median).
- Population Drilldown Dialog Render $\le 100\text{ms}$ (median).
- Initial Main JS Chunk $\le 350\text{kB}$ gzip (achieved by dynamic import of `write-excel-file` on export click and webfont pruning).

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
