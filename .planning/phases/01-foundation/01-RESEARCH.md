# Phase 1: Foundation - Research

**Researched:** 2026-01-18
**Domain:** gnomAD GraphQL API integration, carrier frequency calculation
**Confidence:** MEDIUM-HIGH

## Summary

This research covers the technical requirements for integrating with the gnomAD GraphQL API to build a carrier frequency calculator. The gnomAD v4 API provides gene-based variant queries with population-specific allele frequencies, LoF (LOFTEE) annotations, and ClinVar clinical significance data.

Key findings:
- gnomAD GraphQL API endpoint: `https://gnomad.broadinstitute.org/api`
- Population-level allele frequency must be calculated from `ac/an` (not directly available)
- ClinVar data includes `clinical_significance`, `review_status`, and `gold_stars` fields
- LoF annotations available via `lof` field with values "HC" (High Confidence), "LC" (Low Confidence), "OS" (Other Splice)
- Gene search uses `gene_search` query with `symbol` and `ensembl_id` in response
- Rate limiting exists (~10 queries before potential blocking) - implement request throttling

**Primary recommendation:** Use villus for GraphQL with computed refs for reactive queries, calculate population AF from ac/an, filter variants by `lof === "HC"` OR `(clinical_significance contains "Pathogenic" AND gold_stars >= 1)`.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| villus | 3.x | GraphQL client | 4KB bundle, Vue 3 native, Composition API, built-in caching |
| Vue 3 | 3.x | UI framework | Project requirement |
| TypeScript | 5.x | Type safety | Project requirement |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| graphql | 16.x | GraphQL parser | Required peer dependency for villus |
| @vueuse/core | 10.x | Composition utilities | Debounce for autocomplete, reactive helpers |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| villus | Apollo Client | Apollo is 31KB vs 4KB, overkill for simple queries |
| villus | urql | urql is good but villus has better Vue integration |
| @vueuse/core | lodash-es | vueuse is Vue-native, lodash adds bundle size |

**Installation:**
```bash
bun add villus graphql @vueuse/core
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── api/                    # GraphQL queries and client setup
│   ├── client.ts          # villus client configuration
│   ├── queries/           # GraphQL query definitions
│   │   ├── gene-search.ts
│   │   ├── gene-variants.ts
│   │   └── types.ts       # TypeScript types for API responses
│   └── index.ts
├── composables/           # Vue composition functions
│   ├── useGeneSearch.ts   # Gene autocomplete logic
│   ├── useVariants.ts     # Variant fetching with filtering
│   └── useCarrierFrequency.ts  # Calculation logic
├── utils/                 # Pure functions
│   ├── variant-filters.ts # LoF/ClinVar filtering
│   ├── frequency-calc.ts  # Carrier frequency math
│   └── formatters.ts      # Display formatting
└── types/                 # Shared TypeScript types
    └── index.ts
```

### Pattern 1: villus Client Setup
**What:** Configure villus GraphQL client at app root
**When to use:** App initialization
**Example:**
```typescript
// src/api/client.ts
// Source: https://villus.dev/guide/setup/
import { createClient } from 'villus';

export const graphqlClient = createClient({
  url: 'https://gnomad.broadinstitute.org/api',
});

// main.ts
import { createApp } from 'vue';
import { graphqlClient } from './api/client';
import App from './App.vue';

const app = createApp(App);
app.use(graphqlClient);
app.mount('#app');
```

### Pattern 2: Reactive Query with Computed Variables
**What:** Auto-refetch when search term changes
**When to use:** Gene autocomplete, any query with dynamic variables
**Example:**
```typescript
// src/composables/useGeneSearch.ts
// Source: https://villus.dev/guide/queries/
import { computed, ref } from 'vue';
import { useQuery } from 'villus';
import { useDebounceFn } from '@vueuse/core';

const GENE_SEARCH_QUERY = `
  query GeneSearch($query: String!, $referenceGenome: ReferenceGenomeId!) {
    gene_search(query: $query, reference_genome: $referenceGenome) {
      ensembl_id
      symbol
    }
  }
`;

export function useGeneSearch() {
  const searchTerm = ref('');
  const debouncedTerm = ref('');

  const setSearchTerm = useDebounceFn((term: string) => {
    debouncedTerm.value = term;
  }, 300);

  const variables = computed(() => ({
    query: debouncedTerm.value,
    referenceGenome: 'GRCh38',
  }));

  const { data, isFetching, error } = useQuery({
    query: GENE_SEARCH_QUERY,
    variables,
    skip: () => debouncedTerm.value.length < 2,
  });

  return {
    searchTerm,
    setSearchTerm,
    results: computed(() => data.value?.gene_search ?? []),
    isLoading: isFetching,
    error,
  };
}
```

### Pattern 3: Pure Calculation Functions
**What:** Separate calculation logic from Vue reactivity
**When to use:** Carrier frequency calculation, variant filtering
**Example:**
```typescript
// src/utils/frequency-calc.ts
export interface PopulationFrequency {
  id: string;
  ac: number;
  an: number;
}

export function calculateAlleleFrequency(ac: number, an: number): number | null {
  if (an === 0) return null;
  return ac / an;
}

export function calculateCarrierFrequency(pathogenicAFs: number[]): number {
  const sumAF = pathogenicAFs.reduce((sum, af) => sum + af, 0);
  return 2 * sumAF;
}

export function frequencyToRatio(frequency: number): string {
  if (frequency === 0) return 'Not detected';
  const ratio = Math.round(1 / frequency);
  return `1:${ratio}`;
}

export function calculateRecurrenceRisk(
  carrierFrequency: number,
  indexStatus: 'heterozygous' | 'compound_het_homozygous'
): number {
  // Heterozygous carrier: risk = carrier_freq / 4
  // Compound het/homozygous affected: risk = carrier_freq / 2
  return indexStatus === 'heterozygous'
    ? carrierFrequency / 4
    : carrierFrequency / 2;
}
```

### Anti-Patterns to Avoid
- **Querying AF directly from populations:** gnomAD API does not expose `af` at population level - calculate from `ac/an`
- **Not handling AN=0:** When allele number is 0, frequency is undefined - display as "Not detected"
- **Blocking on slow queries:** Gene variant queries can be slow - always show loading state
- **Hardcoding population order:** Sort by frequency dynamically, not statically

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Debouncing | setTimeout wrapper | `useDebounceFn` from @vueuse/core | Edge cases with cleanup, cancellation |
| GraphQL client | fetch wrapper | villus | Caching, deduplication, reactive state |
| Gene validation | Regex matching | gnomAD `gene_search` API | Only API knows valid HGNC symbols |
| LoF classification | Custom annotation parser | Use gnomAD's `lof` field directly | LOFTEE is complex, trust gnomAD's annotation |

**Key insight:** The gnomAD API already does the heavy lifting for variant annotation. Don't re-implement LoF prediction or ClinVar parsing - use the pre-computed fields.

## Common Pitfalls

### Pitfall 1: Population AF Not Available Directly
**What goes wrong:** Querying `af` field inside `populations` returns error
**Why it happens:** gnomAD API only exposes `ac` and `an` at population level
**How to avoid:** Calculate AF as `ac / an` for each population
**Warning signs:** GraphQL error "Cannot query field 'af' on type 'VariantPopulation'"

### Pitfall 2: Rate Limiting
**What goes wrong:** API blocks requests after ~10 rapid queries
**Why it happens:** gnomAD has IP-level rate limiting to prevent abuse
**How to avoid:**
- Debounce autocomplete queries (300ms recommended)
- Cache results where possible
- Don't refetch on every keystroke
**Warning signs:** HTTP 429 errors, sudden API failures

### Pitfall 3: LoF Flags vs LoF Filter Confusion
**What goes wrong:** Excluding HC variants that have flags
**Why it happens:** `lof_flags` are informational warnings, not disqualifiers
**How to avoid:** Filter on `lof === "HC"`, ignore `lof_flags` (they're FYI only)
**Warning signs:** Missing known pathogenic variants

### Pitfall 4: ClinVar Review Status Interpretation
**What goes wrong:** Including low-confidence ClinVar assertions
**Why it happens:** Not filtering by review status
**How to avoid:** Require `gold_stars >= 1` (has assertion criteria)
**Warning signs:** Including VUS or conflicting variants

### Pitfall 5: AN=0 Edge Case
**What goes wrong:** Displaying 0% frequency when data is actually missing
**Why it happens:** Dividing by zero or treating undefined as 0
**How to avoid:** Check `an > 0` before calculating; display "Not detected" when AN=0
**Warning signs:** All populations showing 0% for rare genes

### Pitfall 6: Case Sensitivity in Gene Symbols
**What goes wrong:** User enters "cftr" and search fails or returns wrong results
**Why it happens:** Not normalizing input
**How to avoid:** Uppercase gene symbol before API query; let API handle matching
**Warning signs:** Valid genes returning no results

## Code Examples

Verified patterns from official sources:

### gnomAD Gene Variants Query
```typescript
// Source: https://www.biostars.org/p/9610668/ (verified structure)
// Note: Population AF must be calculated from ac/an
export const GENE_VARIANTS_QUERY = `
  query GeneVariants($geneSymbol: String!, $dataset: DatasetId!) {
    gene(gene_symbol: $geneSymbol, reference_genome: GRCh38) {
      gene_id
      symbol
      variants(dataset: $dataset) {
        variant_id
        pos
        ref
        alt
        exome {
          ac
          an
          populations {
            id
            ac
            an
          }
        }
        genome {
          ac
          an
          populations {
            id
            ac
            an
          }
        }
        transcript_consequences {
          gene_symbol
          transcript_id
          canonical
          consequence_terms
          lof
          lof_filter
          lof_flags
        }
      }
      clinvar_variants {
        variant_id
        clinical_significance
        gold_stars
        review_status
        pos
        ref
        alt
      }
    }
  }
`;
```

### Variant Filtering Logic
```typescript
// src/utils/variant-filters.ts
interface TranscriptConsequence {
  lof: string | null;
  lof_filter: string | null;
  lof_flags: string | null;
  canonical: boolean;
}

interface ClinVarVariant {
  variant_id: string;
  clinical_significance: string;
  gold_stars: number;
}

export function isHighConfidenceLoF(consequence: TranscriptConsequence): boolean {
  // HC = High Confidence LoF from LOFTEE
  // Only consider canonical transcript
  return consequence.canonical && consequence.lof === 'HC';
}

export function isPathogenicClinVar(variant: ClinVarVariant): boolean {
  const sig = variant.clinical_significance.toLowerCase();
  const isPathogenic = sig.includes('pathogenic') && !sig.includes('conflicting');
  const hasReview = variant.gold_stars >= 1;
  return isPathogenic && hasReview;
}

export function shouldIncludeVariant(
  variantId: string,
  transcriptConsequences: TranscriptConsequence[],
  clinvarVariants: ClinVarVariant[]
): boolean {
  // Include if: LoF HC OR ClinVar Pathogenic with >= 1 star
  const hasHCLoF = transcriptConsequences.some(isHighConfidenceLoF);
  const clinvarMatch = clinvarVariants.find(cv => cv.variant_id === variantId);
  const hasPathogenicClinVar = clinvarMatch ? isPathogenicClinVar(clinvarMatch) : false;

  return hasHCLoF || hasPathogenicClinVar;
}
```

### Population Frequency Aggregation
```typescript
// src/utils/frequency-calc.ts
interface PopulationData {
  id: string;
  ac: number;
  an: number;
}

interface VariantFrequencyData {
  exome?: { populations: PopulationData[] };
  genome?: { populations: PopulationData[] };
}

// gnomAD v4 population codes
export const POPULATION_CODES = ['afr', 'amr', 'asj', 'eas', 'fin', 'mid', 'nfe', 'sas'] as const;
export type PopulationCode = typeof POPULATION_CODES[number];

export const POPULATION_LABELS: Record<PopulationCode, string> = {
  afr: 'African/African-American',
  amr: 'Admixed American',
  asj: 'Ashkenazi Jewish',
  eas: 'East Asian',
  fin: 'Finnish',
  mid: 'Middle Eastern',
  nfe: 'Non-Finnish European',
  sas: 'South Asian',
};

export function aggregatePopulationFrequencies(
  variants: VariantFrequencyData[]
): Map<PopulationCode, { totalAC: number; totalAN: number }> {
  const result = new Map<PopulationCode, { totalAC: number; totalAN: number }>();

  // Initialize all populations
  for (const pop of POPULATION_CODES) {
    result.set(pop, { totalAC: 0, totalAN: 0 });
  }

  for (const variant of variants) {
    // Combine exome and genome data
    const populations = [
      ...(variant.exome?.populations ?? []),
      ...(variant.genome?.populations ?? []),
    ];

    for (const pop of populations) {
      const code = pop.id as PopulationCode;
      if (POPULATION_CODES.includes(code)) {
        const current = result.get(code)!;
        current.totalAC += pop.ac;
        // Note: AN should be max, not sum, for frequency calculation
        current.totalAN = Math.max(current.totalAN, pop.an);
      }
    }
  }

  return result;
}

export function calculatePopulationCarrierFrequencies(
  aggregated: Map<PopulationCode, { totalAC: number; totalAN: number }>
): Map<PopulationCode, number | null> {
  const result = new Map<PopulationCode, number | null>();

  for (const [pop, data] of aggregated) {
    if (data.totalAN === 0) {
      result.set(pop, null); // Not detected
    } else {
      const af = data.totalAC / data.totalAN;
      result.set(pop, 2 * af); // Carrier frequency = 2 * AF
    }
  }

  return result;
}
```

### villus useQuery with Error Handling
```typescript
// src/composables/useVariants.ts
// Source: https://villus.dev/api/use-query/
import { computed, ref } from 'vue';
import { useQuery } from 'villus';
import { GENE_VARIANTS_QUERY } from '../api/queries/gene-variants';

export function useGeneVariants(geneSymbol: Ref<string>) {
  const variables = computed(() => ({
    geneSymbol: geneSymbol.value.toUpperCase(),
    dataset: 'gnomad_r4',
  }));

  const { data, isFetching, error, execute } = useQuery({
    query: GENE_VARIANTS_QUERY,
    variables,
    skip: () => !geneSymbol.value,
    cachePolicy: 'cache-first',
  });

  const gene = computed(() => data.value?.gene ?? null);
  const variants = computed(() => gene.value?.variants ?? []);
  const clinvarVariants = computed(() => gene.value?.clinvar_variants ?? []);

  const hasError = computed(() => !!error.value);
  const errorMessage = computed(() => {
    if (!error.value) return null;
    // gnomAD returns specific error messages
    if (error.value.message.includes('not found')) {
      return `Gene "${geneSymbol.value}" not found in gnomAD`;
    }
    return 'Failed to load variant data. Please try again.';
  });

  return {
    gene,
    variants,
    clinvarVariants,
    isLoading: isFetching,
    hasError,
    errorMessage,
    refetch: execute,
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| gnomAD v2.1 (GRCh37) | gnomAD v4 (GRCh38) | Nov 2023 | 5x more samples, use `gnomad_r4` dataset |
| Apollo Client | villus | 2022+ | 4KB vs 31KB bundle size |
| REST-like queries | GraphQL native | Standard | Request only needed fields |

**Deprecated/outdated:**
- gnomAD v2.1 queries still work but v4 has more data
- `gnomad_r3` dataset deprecated in favor of `gnomad_r4`
- Python gnomad_python_api package is deprecated

## Open Questions

Things that couldn't be fully resolved:

1. **Exact rate limit threshold**
   - What we know: ~10 rapid queries can trigger blocking
   - What's unclear: Exact limit, reset time, whitelist process
   - Recommendation: Implement 300ms debounce, cache aggressively, handle 429 gracefully

2. **Joint exome+genome frequency calculation**
   - What we know: gnomAD v4.1 has `joint` field with combined data
   - What's unclear: Whether to use joint or sum exome+genome
   - Recommendation: Prefer `joint` if available, fall back to max(exome.an, genome.an) for AN

3. **CORS configuration**
   - What we know: API is accessible from browser (verified by gnomAD browser itself)
   - What's unclear: Any specific CORS restrictions
   - Recommendation: Test from development server early; should work since gnomAD browser is client-side

## Reference Implementation: gnomad-link

The sibling `gnomad-link` project provides production-tested patterns:

### GraphQL Query Organization
- Queries organized by gnomAD version (v2, v3, v4) with shared fragments
- Fragment system for reusability: `VariantIdFields`, `PopulationFields`, `FrequencyFields`, `TranscriptConsequenceFields`
- Versioned queries handle differences between gnomAD releases

### Key Query Patterns
```graphql
# Gene search
query gene_search($query: String!, $reference_genome: ReferenceGenomeId!) {
  gene_search(query: $query, reference_genome: $reference_genome) {
    ensembl_id, ensembl_version, symbol
  }
}

# Gene variants with LoF
query gene_variants($gene_id: String!, $dataset: DatasetId!) {
  gene(gene_id: $gene_id, reference_genome: GRCh38) {
    variants(dataset: $dataset) {
      variant_id, lof, consequence, ac, an
      populations { id, ac, an }
    }
  }
}
```

### Service Layer Patterns
- Async caching with configurable TTL (60 min default)
- Cache sizes: 1024 items (variants), 256 items (genes)
- Structured error handling: `GnomadApiError`, `DataNotFoundError`, `VariantNotFoundError`
- Variable processing: dataset → version mapping, reference genome auto-selection

### Data Models
- `PopulationFrequency`: name (id), allele_count (ac), allele_number (an), homozygote_count
- `VariantDataSource`: Wraps exome/genome with calculated `overall_frequency` property
- Separate tracking for exome vs genome sequencing data

### Applicable to Phase 1
- Query structure verified and production-tested
- Population frequency retrieval via `ac/an` calculation confirmed
- LoF filtering on `transcript_consequences.lof === "HC"` confirmed
- ClinVar integration via separate `clinvar_variant` query confirmed
- Cache strategy for browser performance

## Sources

### Primary (HIGH confidence)
- [gnomAD GraphQL API](https://gnomad.broadinstitute.org/api) - Interactive API explorer
- [gnomAD Browser GitHub](https://github.com/broadinstitute/gnomad-browser) - Source code with GraphQL schema
- [villus Documentation](https://villus.dev/) - Official villus docs
- [gnomAD v4.0 Announcement](https://gnomad.broadinstitute.org/news/2023-11-gnomad-v4-0/) - Population codes and structure

### Secondary (MEDIUM confidence)
- [Biostars: gnomAD Population AF Issue](https://www.biostars.org/p/9610668/) - Verified ac/an structure
- [gnomAD Python API Gist](https://gist.github.com/hliang/aad37d960adf42da16b3bad8677d7f19) - Query examples
- [gnomAD Changelog](https://gnomad.broadinstitute.org/news/changelog/) - API updates and changes
- [gnomAD Discuss: Rate Limiting](https://discuss.gnomad.broadinstitute.org/t/blocked-when-using-api-to-get-af/149) - Rate limit info

### Tertiary (LOW confidence)
- [gnomAD Methods Documentation](https://broadinstitute.github.io/gnomad_methods/) - Hail-based, but useful for understanding data structure

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - villus docs verified, gnomAD API accessible
- Architecture: MEDIUM - Based on Vue/villus patterns, not gnomAD-specific examples
- API structure: MEDIUM-HIGH - GitHub source confirms schema, some queries need runtime verification
- Pitfalls: MEDIUM - Community reports + official docs

**Research date:** 2026-01-18
**Valid until:** 2026-02-18 (30 days - gnomAD API is stable)
