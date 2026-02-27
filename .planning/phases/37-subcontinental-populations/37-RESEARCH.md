# Phase 37: Subcontinental Populations - Research

**Researched:** 2026-02-27
**Domain:** gnomAD v2.1.1 API, Vue 3 UI patterns, @gnomad-cf/core config extension
**Confidence:** HIGH (API behavior verified from gnomad-browser source; population codes confirmed from official gnomAD methods docs; UI patterns verified against existing codebase)

## Summary

Phase 37 adds subcontinental population breakdowns to the population frequency table, available only for gnomAD v2.1.1. The implementation requires an N+1 query pattern: the existing gene-level variant query (`gene.variants`) deliberately filters out subcontinental population IDs (those with underscores, e.g., `nfe_bgr`), so after fetching qualifying variants from the gene query, each qualifying variant must be fetched individually via the `variant(variantId, dataset)` query to retrieve the full unfiltered population array including subcontinental subgroups.

The subcontinental population codes for v2.1.1 are confirmed: NFE has 6 subgroups (`nfe_bgr`, `nfe_est`, `nfe_nwe`, `nfe_seu`, `nfe_swe`, `nfe_onf`) and EAS has 3 subgroups (`eas_jpn`, `eas_kor`, `eas_oea`). These 9 subgroups are the only subcontinental populations available in v2.1.1. gnomAD v4 does not expose subcontinental populations via its API.

The implementation follows the established ClinVar submissions pattern (useClinvarSubmissions) for per-variant N+1 queries with progress tracking. The UI pattern for nested rows already exists in StepResults.vue (the source breakdown expansion pattern using inline `<tr>` after each parent row). The gnomad.json config file will be extended with a `subpopulations` array per population entry, making future additions straightforward.

**Primary recommendation:** Implement subcontinental data as a new `useSubcontinentalData` composable that fetches per-variant data in parallel after the main gene query completes, using the existing `fetch`-based GraphQL pattern (no villus, since this is a secondary N+1 fetch). Store results in a Pinia session-cache store. Wire a "Show subcontinental populations" toggle into the population table toolbar, and render subcontinental rows as inline `<tr>` elements nested under their parent continental row using the same pattern as the existing source breakdown expansion.

## Standard Stack

No new npm dependencies are needed. Everything required is already installed.

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| native fetch | browser built-in | Per-variant GraphQL queries | Already used by useClinvarSubmissions; villus is only for main gene query |
| Pinia | existing | Session-level subcontinental cache | All session data (Orphanet, ClinVar submissions) uses Pinia stores |
| Vue 3 Composition API | existing | Reactive composable | Project standard |
| Vuetify 3 | existing | `v-progress-linear`, `v-switch`/`v-btn`, `v-chip` | All UI components already available |

### No new dependencies needed
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure

New files to create:

```
packages/core/src/
├── config/
│   └── gnomad.json                    # MODIFY: add subpopulations to v2 populations

packages/core/src/types/
│   └── frequency.ts                   # MODIFY: add SubcontinentalPopulationFrequency type

apps/web/src/
├── stores/
│   └── useSubcontinentalStore.ts      # NEW: Pinia session cache for subcontinental data
├── composables/
│   └── useSubcontinentalData.ts       # NEW: fetch per-variant, aggregate per subpopulation
└── components/wizard/
    └── StepResults.vue                # MODIFY: toggle + nested rows
```

### Pattern 1: N+1 Individual Variant Query

**What:** The gnomAD `gene.variants` query (used by `useGeneVariants`) applies this filter in the gnomad-browser backend before returning data:

```typescript
// From: gnomad-browser/graphql-api/src/queries/variant-datasets/gnomad-v2-variant-queries.ts
populations: variant.exome.freq[exomeSubset].populations.filter(
  (pop: any) => !(pop.id.includes('_') || pop.id === 'XX' || pop.id === 'XY')
)
```

This means subcontinental populations (IDs with underscores) are **never returned** by the gene-level query. The individual `variant(variantId, dataset)` query does NOT apply this filter — it returns the raw population array including all subcontinental IDs.

**When to use:** Always for subcontinental data. This is the only supported path via the public gnomAD GraphQL API.

**Query structure:**
```typescript
// Source: gnomAD GraphQL API (verified against gnomad-browser source)
const VARIANT_SUBCONTINENTAL_QUERY = `
  query VariantSubcontinental(
    $variantId: String!,
    $dataset: DatasetId!,
    $referenceGenome: ReferenceGenomeId!
  ) {
    variant(variant_id: $variantId, dataset: $dataset, reference_genome: $referenceGenome) {
      variant_id
      exome {
        populations {
          id
          ac
          an
          ac_hom
        }
      }
      genome {
        populations {
          id
          ac
          an
          ac_hom
        }
      }
    }
  }
`;
```

**Key detail:** The `populations` field returns ALL population IDs including:
- Continental: `afr`, `amr`, `asj`, `eas`, `fin`, `nfe`, `oth`, `sas`
- Subcontinental NFE: `nfe_bgr`, `nfe_est`, `nfe_nwe`, `nfe_seu`, `nfe_swe`, `nfe_onf`
- Subcontinental EAS: `eas_jpn`, `eas_kor`, `eas_oea`
- Sex-specific (ignore): `XX`, `XY`, `afr_XX`, `afr_XY`, etc.

**v2.1.1 only:** gnomAD v4 does not expose subcontinental populations via any public API endpoint. The toggle must be hidden/disabled when version is not v2.

### Pattern 2: Parallel Fetch with Progress Tracking

Follow the existing `useClinvarSubmissions` pattern exactly:

```typescript
// Source: apps/web/src/composables/useClinvarSubmissions.ts (existing pattern)
export function useSubcontinentalData(): UseSubcontinentalDataReturn {
  const results = ref<Map<string, SubcontinentalVariantData>>(new Map());
  const isLoading = ref(false);
  const progress = ref(0); // 0-100
  const error = ref<string | null>(null);

  async function fetchForVariants(
    variantIds: string[],
    dataset: string,       // 'gnomad_r2_1'
    referenceGenome: string // 'GRCh37'
  ): Promise<void> {
    isLoading.value = true;
    progress.value = 0;
    error.value = null;

    // Fetch in parallel batches of ~10 to avoid overwhelming the API
    const BATCH_SIZE = 10;
    let completed = 0;

    for (let i = 0; i < variantIds.length; i += BATCH_SIZE) {
      const batch = variantIds.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (id) => {
        const data = await fetchSingleVariantSubcontinental(id, dataset, referenceGenome);
        if (data) results.value.set(id, data);
        completed++;
        progress.value = Math.round((completed / variantIds.length) * 100);
      }));
    }

    isLoading.value = false;
  }
}
```

**Important distinction from ClinVar submissions:** ClinVar submissions uses sequential batching with `BATCH_DELAY_MS` between batches to avoid rate limiting. Subcontinental fetches should use parallel batches of ~10 variants. If rate limiting becomes an issue, add sequential batching with delays.

### Pattern 3: Config-Driven Subpopulation Definitions

Extend `gnomad.json` to add a `subpopulations` array to relevant population entries in the v2 version config:

```json
// packages/core/src/config/gnomad.json — v2 populations array addition
{
  "versions": {
    "v2": {
      "populations": [
        {
          "code": "nfe",
          "label": "Non-Finnish European",
          "subpopulations": [
            { "code": "nfe_bgr", "label": "Bulgarian (Eastern European)" },
            { "code": "nfe_est", "label": "Estonian" },
            { "code": "nfe_nwe", "label": "North-Western European" },
            { "code": "nfe_seu", "label": "Southern European" },
            { "code": "nfe_swe", "label": "Swedish" },
            { "code": "nfe_onf", "label": "Other Non-Finnish European" }
          ]
        },
        {
          "code": "eas",
          "label": "East Asian",
          "subpopulations": [
            { "code": "eas_jpn", "label": "Japanese" },
            { "code": "eas_kor", "label": "Korean" },
            { "code": "eas_oea", "label": "Other East Asian" }
          ]
        }
      ]
    }
  }
}
```

The `PopulationConfig` type must be extended to optionally include `subpopulations`:

```typescript
// packages/core/src/config/types.ts
export interface PopulationConfig {
  code: string;
  label: string;
  description?: string;
  subpopulations?: SubpopulationConfig[];  // NEW — only present for NFE and EAS in v2
}

export interface SubpopulationConfig {
  code: string;  // e.g., "nfe_bgr"
  label: string; // e.g., "Bulgarian (Eastern European)"
}
```

New config helpers needed:
```typescript
// packages/core/src/config/index.ts — new helper functions
export function getSubpopulations(version?: GnomadVersion): SubpopulationConfig[]
export function hasSubcontinentalData(version?: GnomadVersion): boolean // true only for v2
export function getSubpopulationParent(subCode: string): string // "nfe_bgr" -> "nfe"
```

### Pattern 4: Population Table Nested Row Expansion

The existing `StepResults.vue` already implements inline `<tr>` expansion for source breakdowns. Use the exact same pattern for subcontinental rows:

```vue
<!-- Inside <template #item="{ item }"> in v-data-table -->
<tr :class="getRowClass(item)" @click="...">
  <td>
    <div class="d-flex align-center">
      <!-- Subcontinental expand button — shown when: v2 + toggle enabled + pop has subpopulations -->
      <v-btn
        v-if="hasSubpopulations(item.code) && showSubcontinental && isV2"
        :icon="isSubcontinentalExpanded(item.code) ? 'mdi-chevron-down' : 'mdi-chevron-right'"
        variant="plain"
        density="compact"
        size="small"
        @click.stop="toggleSubcontinentalExpand(item.code)"
      />
      <!-- Existing source breakdown expand button still present -->
      <v-btn v-if="!item.isGlobal" ... @click="togglePopExpand(item.code, $event)" />
      <span class="population-label">{{ item.label }}</span>
    </div>
  </td>
  ...
</tr>

<!-- Subcontinental sub-rows (inline after parent row) -->
<template v-if="hasSubpopulations(item.code) && showSubcontinental && isSubcontinentalExpanded(item.code)">
  <tr
    v-if="isLoadingSubcontinental"
    class="subcontinental-loading-row"
  >
    <td colspan="8">
      <v-progress-linear :model-value="subcontinentalProgress" color="primary" />
    </td>
  </tr>
  <tr
    v-for="sub in getSubpopulationRows(item.code)"
    :key="sub.code"
    class="subcontinental-row"
  >
    <td>
      <div class="d-flex align-center pl-8">
        <span class="text-body-2">{{ sub.label }}</span>
        <v-chip v-if="sub.isLowSampleSize" color="warning" size="x-small" class="ml-2">Low sample</v-chip>
        <v-chip v-if="sub.isFounderEffect" color="info" size="x-small" class="ml-2">Founder effect</v-chip>
      </div>
    </td>
    <td class="text-right">{{ formatFrequency(sub.carrierFrequency) }}</td>
    <td class="text-right">{{ formatRatioDisplay(sub.carrierFrequency) }}</td>
    <td class="text-right">{{ formatPrevalenceRatio(sub.geneticPrevalence) }}</td>
    <td class="text-right">-</td>
    <td class="text-right">{{ sub.alleleCount }}</td>
    <td class="text-right">{{ sub.alleleNumber?.toLocaleString() ?? "-" }}</td>
    <td />
  </tr>
</template>
```

### Pattern 5: Toggle Placement and v2-Only Indicator

The toggle belongs in the population table toolbar (same div as the format buttons and export dropdown). For v4/v3, show a disabled chip or tooltip:

```vue
<!-- In the table toolbar div -->
<!-- v2: show active toggle -->
<v-switch
  v-if="isV2"
  v-model="showSubcontinental"
  label="Subcontinental"
  density="compact"
  hide-details
  :loading="isLoadingSubcontinental ? 'primary' : false"
/>

<!-- v3/v4: show disabled indicator -->
<v-tooltip v-else location="top">
  <template #activator="{ props: tooltipProps }">
    <v-chip v-bind="tooltipProps" size="small" variant="outlined" color="grey" class="ml-2">
      <v-icon start size="x-small">mdi-information</v-icon>
      Subcontinental (v2.1.1 only)
    </v-chip>
  </template>
  Subcontinental population breakdowns are only available for gnomAD v2.1.1 queries
</v-tooltip>
```

### Pattern 6: Data Aggregation for Subcontinental Frequencies

The subcontinental carrier frequency for a subpopulation is calculated the same way as continental frequencies — sum allele frequencies across qualifying variants for that subpopulation ID, then apply the formula from CalcConfig. Reuse `aggregatePopulationFrequenciesWithConfig` with the subpopulation codes list. Do NOT create a parallel calculation system.

```typescript
// In useSubcontinentalData.ts — after fetching per-variant data:
const subpopCodes = getSubpopulations('v2').map(s => s.code);
// subcontinental variants have the same structure as continental variants
// just use aggregatePopulationFrequenciesWithConfig with subpopCodes
const aggregated = aggregatePopulationFrequenciesWithConfig(
  subcontinentalVariants,  // GnomadVariant[] with full population arrays
  'v2',
  calcConfig
);
// Then filter to just subcontinental codes
```

### Anti-Patterns to Avoid

- **Fetching all variants instead of qualifying variants only:** Only fetch subcontinental data for qualifying variants (those that pass pathogenicity filters and are not excluded). This minimizes the N+1 query count.
- **Fetching on every version/toggle change:** Fetch once after qualifying variants are determined, cache in store. Re-use cache on toggle show/hide.
- **Implementing a separate carrier frequency calculation:** Reuse `aggregatePopulationFrequenciesWithConfig` from `@gnomad-cf/core/calculations`.
- **Polling instead of awaiting:** The N+1 fetch is await-based with Promise.all; do not poll.
- **villus for the N+1 queries:** villus is for the main reactive gene query. The subcontinental fetches are imperative (triggered once on demand), so use native `fetch` like `useClinvarSubmissions`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Carrier frequency for subpopulations | Custom aggregation | `aggregatePopulationFrequenciesWithConfig` | Already handles HWE/simplified/VCR-GCR |
| Low sample size detection | Custom threshold check | Existing `isLowSampleSize` logic from `buildPopulationFrequencies` | Uses config threshold (1000 AN) |
| Founder effect detection | Custom multiplier check | Existing `isFounderEffect` logic | Uses config multiplier (5x global) |
| Progress tracking | Custom counter | Pattern from `useClinvarSubmissions.progress` | Proven, tested pattern |
| Retry logic | Custom retry | Add basic retry (MAX_RETRIES=2) following the `fetchBatchWithRetry` pattern | Already proven |

**Key insight:** The subcontinental calculation is identical to continental calculation — same data shape, same formulas, same thresholds. The only difference is which population codes are processed.

## Common Pitfalls

### Pitfall 1: Fetching Gene-Level Variants Expecting Subcontinental Data
**What goes wrong:** Developer queries `gene.variants` and sees no subcontinental population IDs in the response.
**Why it happens:** The gnomad-browser backend explicitly filters them out with `pop.id.includes('_')`.
**How to avoid:** Always use the individual `variant(variant_id, dataset)` query for subcontinental data.
**Warning signs:** Populations array for a variant contains only top-level codes; no underscore IDs.

### Pitfall 2: Including Sex-Specific Populations
**What goes wrong:** The individual variant query returns `XX`, `XY`, and sex-stratified subcontinental IDs (e.g., `nfe_bgr_XX`). Including these inflates allele counts.
**Why it happens:** `fetchVariantById` returns everything without filtering.
**How to avoid:** Filter population IDs to only those present in the config's `subpopulations` list. Never include IDs not in the config.
**Warning signs:** Population counts don't sum correctly; AN appears doubled.

### Pitfall 3: N+1 on All Gene Variants Instead of Qualifying Variants
**What goes wrong:** Querying subcontinental data for all 500+ LoF variants in a gene, when only 3 qualify.
**Why it happens:** Triggering fetch too early in the pipeline before pathogenicity filtering.
**How to avoid:** Trigger `fetchForVariants(qualifyingVariants.value.map(v => v.variant_id))` — not on raw `variants`.
**Warning signs:** Fetching takes 30+ seconds; hundreds of API calls for a simple gene.

### Pitfall 4: Not Resetting Cache When Gene Changes
**What goes wrong:** User switches gene; old subcontinental data is still visible.
**Why it happens:** Forgetting to clear the subcontinental cache on gene symbol change.
**How to avoid:** Watch `geneSymbol` in `useSubcontinentalData` and clear results when it changes. Follow the `clearSubmissions` pattern from `useClinvarSubmissions`.
**Warning signs:** Subcontinental population rows show data from the previous gene.

### Pitfall 5: Showing Toggle When No Qualifying Variants
**What goes wrong:** Toggle appears enabled but clicking loads nothing; no subcontinental rows appear.
**Why it happens:** Toggle shown before qualifying variants are determined.
**How to avoid:** Disable the toggle (or show loading state) while main data is loading. Only enable after `qualifyingVariantCount > 0`.
**Warning signs:** Toggle active but table shows no subcontinental rows.

### Pitfall 6: EAS Subpopulation Zeros in Genome-Only Variants
**What goes wrong:** EAS subpopulations all show 0 AC/AN for some variants, skewing the aggregate.
**Why it happens:** gnomAD v2.1.1 EAS subpopulation data is only in exome; genome-only variants have no EAS subpopulation breakdowns.
**How to avoid:** The gnomad-browser itself handles this by inserting zero-filled EAS subpopulations when a variant is genome-only. Use the same approach: if exome populations are absent, treat all subpopulations as AN=0. The aggregation code already handles AN=0 correctly (skips the sumAF contribution).
**Warning signs:** EAS subpopulations always show "Not detected" even for variants with EAS alleles.

### Pitfall 7: Performance - Too Many Parallel Requests
**What goes wrong:** Firing 50+ individual variant queries simultaneously; browser or API rate-limits the connection.
**Why it happens:** Using `Promise.all(allVariantIds.map(fetch))` without batching.
**How to avoid:** Batch into groups of 10 with parallel execution per group; sequential groups. Start with this, profile with real genes (CFTR has ~100 qualifying variants, HEXA fewer).
**Warning signs:** Console shows many 429 or 503 errors; fetch takes unreasonably long.

## Code Examples

### Subcontinental GraphQL Query (Individual Variant)
```typescript
// packages/core/src/queries/subcontinental-variants.ts (NEW file)
// Source: Verified against gnomad-browser variant-datasets/gnomad-v2-variant-queries.ts
export const VARIANT_SUBCONTINENTAL_QUERY = `
  query VariantSubcontinental(
    $variantId: String!,
    $dataset: DatasetId!,
    $referenceGenome: ReferenceGenomeId!
  ) {
    variant(variant_id: $variantId, dataset: $dataset, reference_genome: $referenceGenome) {
      variant_id
      exome {
        ac
        an
        ac_hom
        populations {
          id
          ac
          an
          ac_hom
        }
      }
      genome {
        ac
        an
        ac_hom
        populations {
          id
          ac
          an
          ac_hom
        }
      }
    }
  }
`;
```

### Config Extension
```typescript
// packages/core/src/config/gnomad.json (modified v2 NFE entry)
{
  "code": "nfe",
  "label": "Non-Finnish European",
  "subpopulations": [
    { "code": "nfe_bgr", "label": "Bulgarian (Eastern European)" },
    { "code": "nfe_est", "label": "Estonian" },
    { "code": "nfe_nwe", "label": "North-Western European" },
    { "code": "nfe_seu", "label": "Southern European" },
    { "code": "nfe_swe", "label": "Swedish" },
    { "code": "nfe_onf", "label": "Other Non-Finnish European" }
  ]
}
```

### Version Gate in StepResults
```typescript
// In StepResults.vue <script setup>
import { useGnomadVersion } from "@/api";
const { version } = useGnomadVersion();
const isV2 = computed(() => version.value === 'v2');
const showSubcontinental = ref(false); // default off (SUBP-01)

// Reset toggle when version changes
watch(version, () => { showSubcontinental.value = false; });
```

### Aggregating Subcontinental Data
```typescript
// In useSubcontinentalData.ts
// After fetching per-variant data, build GnomadVariant-compatible structures
// and pass to existing aggregation function

// The per-variant response shape matches GnomadVariant:
// { variant_id, exome: { ac, an, ac_hom, populations: [...] }, genome: {...} }
// So subcontinentalVariants is already GnomadVariant[]

const subpopCodes = ['nfe_bgr', 'nfe_est', 'nfe_nwe', 'nfe_seu', 'nfe_swe', 'nfe_onf',
                     'eas_jpn', 'eas_kor', 'eas_oea'];

// Use aggregatePopulationFrequenciesWithConfig but we need to extend getPopulationCodes
// to accept explicit codes OR pass the subcontinental codes directly
// OPTION: Build a thin wrapper that accepts explicit code list
```

**Note on aggregation wrapper:** `aggregatePopulationFrequenciesWithConfig` calls `getPopulationCodes(version)` internally to know which populations to aggregate. For subcontinental codes, we need to either:
- (A) Pass the subpopulation codes from config and call the aggregation function with them directly (preferred — no modification to core function)
- (B) Add a `codesOverride?: string[]` parameter to `aggregatePopulationFrequenciesWithConfig`

Option A is cleaner: iterate the subpopulation codes from config and build a Map manually using the same accumulation logic. The function is simple enough to inline.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| gnomAD v2 exome-only data | v2 combines exome+genome (no joint field) | v2.1.1 release | Must sum exome+genome AC/AN for subcontinental (no joint in v2) |
| Continental populations only | Subcontinental available in individual variant query | gnomAD v2.1 (2018) | N+1 individual queries required |
| v4 has subcontinental | v4 does NOT expose subcontinental via API | Ongoing as of Feb 2026 | Toggle must be hidden for v4 |

**Deprecated/outdated:**
- gnomAD v4 subcontinental: The roadmap says "not available for v4 as of Feb 2026" — confirmed. No subcontinental IDs are returned by v4 gene queries. The toggle is hidden, not just disabled.

## Open Questions

1. **Performance with real genes**
   - What we know: CFTR may have 3-10 qualifying variants; HEXA fewer; some genes could have 50+
   - What's unclear: Whether parallel-10 batching is sufficient or if rate limiting occurs at scale
   - Recommendation: Implement with parallel-10, add a note to profile with CFTR and a high-variant gene. If throttled, fall back to sequential with 200ms inter-batch delay (the ClinVar submissions pattern).

2. **joint field in v2.1.1**
   - What we know: gnomAD v2.1.1 does not have a `joint` field (joint was introduced in v4). Only `exome` and `genome`.
   - What's unclear: Whether the individual variant query for v2 returns a `joint` field or null/absent
   - Recommendation: Always sum `exome` + `genome` for v2 subcontinental data; do not attempt to use `joint`. Check for `null`/`undefined` on both before summing.

3. **NFE subpopulations in genome-only v2 variants**
   - What we know: EAS subpopulations are known to be missing from genome-only variants (gnomad-browser inserts zeros). NFE behavior is less documented.
   - What's unclear: Whether NFE subpopulations are present in gnomAD v2 genome sequences
   - Recommendation: Handle missing subpopulation IDs gracefully (treat as AC=0, AN=0). The aggregation code already handles this correctly.

## Sources

### Primary (HIGH confidence)
- gnomad-browser GitHub `graphql-api/src/queries/variant-datasets/gnomad-v2-variant-queries.ts` — verified that gene-level query filters out `pop.id.includes('_')`, and individual variant query does NOT filter populations
- `broadinstitute.github.io/gnomad_methods/_modules/gnomad/resources/grch37/gnomad.html` — confirmed NFE subgroups: `["BGR", "EST", "NWE", "SEU", "SWE", "ONF"]`; EAS subgroups: `["KOR", "JPN", "OEA"]`
- `gnomad.broadinstitute.org/news/2018-10-gnomad-v2-1/` — confirmed gnomAD v2.1 introduced NFE and EAS subcontinental breakdowns
- gnomad-browser GitHub `browser/src/VariantPage/GnomadPopulationsTable.tsx` — confirmed `nestPopulations` function; EAS subpopulations are returned in individual variant query populations array; NFE subpopulations also returned
- Existing codebase: `useClinvarSubmissions.ts`, `StepResults.vue`, `frequency-calc.ts`, `gnomad.json` — verified patterns for N+1 fetch, inline row expansion, config structure, and calculation pipeline

### Secondary (MEDIUM confidence)
- gnomad-browser GitHub `graphql-api/src/graphql/types/variant.graphql` — confirmed `VariantPopulation` type has `id, ac, an, homozygote_count, hemizygote_count, ac_hom`
- gnomad-browser GitHub `graphql-api/src/graphql/types/query.graphql` — confirmed `variant(variant_id, dataset, reference_genome)` query exists in schema

### Tertiary (LOW confidence)
- None needed — all critical claims verified from primary sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries, existing patterns verified
- Architecture: HIGH — N+1 pattern confirmed from gnomad-browser source code; population codes confirmed from official methods docs
- Pitfalls: HIGH — derived from reading gnomad-browser filtering code and existing codebase patterns
- Population codes: HIGH — confirmed from two official Broad Institute sources (methods docs + gnomad-browser source)

**Research date:** 2026-02-27
**Valid until:** 2026-06-01 (gnomAD API changes infrequently; subcontinental population structure for v2.1.1 is stable)
