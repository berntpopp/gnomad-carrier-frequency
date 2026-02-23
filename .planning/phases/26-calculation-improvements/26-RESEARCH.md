# Phase 26: Calculation Improvements in Core - Research

**Researched:** 2026-02-23
**Domain:** Carrier frequency mathematics, Hardy-Weinberg genetics, gnomAD GraphQL API, Vue 3 + Pinia state management
**Confidence:** HIGH (formulas and API fields verified from peer-reviewed sources and gnomAD community discussion)

---

## Summary

Phase 26 replaces the current simplified `2 × ΣAF` formula with clinically-correct Hardy-Weinberg and inclusion-exclusion formulas, adds homozygote exclusion using gnomAD's `ac_hom` field, and adds genetic prevalence (q²) plus Bayesian penetrance-adjusted prevalence. All new calculation logic goes in `packages/core/src/calculations/` (the package created in Phase 25). The web app gains UI toggles for formula and homozygote exclusion in the existing FilterPanel, plus new prevalence rows in the summary card.

The mathematical formulas are well-established in peer-reviewed literature (Kandolin 2024, npj Genomic Medicine 2022, cureffi.org). The gnomAD GraphQL API exposes `ac_hom` at the population level — confirmed from actual API queries documented in the gnomAD community forum. The existing codebase patterns (FilterPanel switches, FilterConfig + FilterStore + URL state, summary card tooltips) provide clear implementation templates.

**Primary recommendation:** Implement calculations as pure functions in `@gnomad-cf/core/calculations`, with full golden-value unit tests for CFTR and HEXA reference values. Web app wires new toggles into the existing FilterPanel expansion panel following the established switch + tooltip pattern.

---

## Standard Stack

The phase builds on existing dependencies — no new packages needed.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | ~5.9.3 | Type-safe pure calculation functions | Already in use |
| Vitest | latest (Phase 25) | Unit tests for calculation functions | Configured in Phase 25 |
| Zod | ^4.3.5 | URL state schema extension for new params | Already in use |

### Supporting (Web App UI only)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vue 3 + Composition API | ^3.5.24 | Reactive wrapper composables | Web-only, not in core |
| Pinia | ^3.0.4 | CalcConfig store (formula, hom exclusion, penetrance) | Web-only persistence |
| pinia-plugin-persistedstate | ^4.7.1 | localStorage persistence for new calc settings | Already used for filters |
| Vuetify 3 | ^3.8.1 | v-switch, v-slider in FilterPanel | Already used |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Extending FilterConfig | Separate CalcConfig type | CalcConfig is cleaner — calc settings are conceptually separate from variant filter settings. Easier to version independently in Phase 28 gene configs. |
| Pinia store for calc settings | Reactive refs in composable | Store gives persistence and URL state wiring for free, consistent with existing pattern |

**Installation:** No new packages required.

---

## Architecture Patterns

### Recommended Project Structure (after Phase 25 monorepo)

```
packages/core/src/
├── calculations/
│   ├── carrier-frequency.ts     # HWE 2pq, simplified 2×ΣAF
│   ├── homozygote-exclusion.ts  # VCR, GCR formulas
│   ├── prevalence.ts            # q², Bayesian penetrance-adjusted
│   └── index.ts                 # Barrel re-export
├── types/
│   └── calculations.ts          # CalcConfig, CalcResult types
└── ...

packages/core/tests/
├── carrier-frequency.test.ts    # CFTR golden values
├── homozygote-exclusion.test.ts # VCR/GCR golden values
└── prevalence.test.ts           # q², Bayesian golden values

apps/web/src/
├── stores/
│   └── useCalcStore.ts          # Pinia store: useHWE, useHomExclusion, penetrance
├── composables/
│   └── useCarrierFrequency.ts   # Extended: reads CalcConfig from store
└── components/
    └── FilterPanel.vue          # Extended: formula switch + hom exclusion switch + penetrance slider
```

### Pattern 1: Pure Calculation Functions in Core

**What:** All math as pure TypeScript functions — no Vue/Pinia imports in core.
**When to use:** All new formula implementations.

```typescript
// packages/core/src/calculations/carrier-frequency.ts

/**
 * Hardy-Weinberg 2pq carrier frequency
 * q = sum of pathogenic allele frequencies, p = 1 - q
 * For small q: 2pq ≈ 2q, but full formula is more correct when q is large
 */
export function calculateHWECarrierFrequency(pathogenicAFs: number[]): number {
  const q = pathogenicAFs.reduce((sum, af) => sum + af, 0);
  const p = 1 - q;
  return 2 * p * q;
}

/**
 * Simplified carrier frequency (legacy formula)
 * Kept for toggle comparison: CF = 2 × Σ AF
 */
export function calculateSimplifiedCarrierFrequency(pathogenicAFs: number[]): number {
  const sumAF = pathogenicAFs.reduce((sum, af) => sum + af, 0);
  return 2 * sumAF;
}
```

### Pattern 2: VCR + GCR (Homozygote Exclusion)

**What:** Per-variant carrier rate excluding confirmed homozygotes, combined via inclusion-exclusion.
**When to use:** When homozygote exclusion toggle is ON.

```typescript
// packages/core/src/calculations/homozygote-exclusion.ts
// Source: PMC9763236 (npj Genomic Medicine 2022), formula verified

/**
 * Variant Carrier Rate (VCR) with homozygote exclusion
 *
 * VCR = (AC - 2 × Hom) / (AN / 2)
 *
 * AC: allele count (heterozygotes × 1 + homozygotes × 2)
 * Hom: number of homozygous individuals (ac_hom from gnomAD)
 * AN: allele number (total chromosomes sampled)
 * AN/2: diploid individual count
 *
 * Subtracting 2×Hom from AC isolates heterozygous allele copies.
 * Dividing by AN/2 gives the per-individual carrier rate.
 */
export function calculateVCR(ac: number, an: number, acHom: number): number {
  if (an === 0) return 0;
  const heterozygousAlleles = ac - 2 * acHom;
  const diploidCount = an / 2;
  return heterozygousAlleles / diploidCount;
}

/**
 * Gene Carrier Rate (GCR) via inclusion-exclusion product
 *
 * GCR = 1 - ∏(1 - VCRᵢ)
 *
 * Probability that an individual carries at least one pathogenic allele
 * across multiple variants in the gene. Avoids double-counting.
 */
export function calculateGCR(vcrs: number[]): number {
  if (vcrs.length === 0) return 0;
  const notCarrierProbability = vcrs.reduce((product, vcr) => product * (1 - vcr), 1);
  return 1 - notCarrierProbability;
}
```

### Pattern 3: Genetic Prevalence and Bayesian Prevalence

**What:** Disease frequency estimates from allele frequency data.
**When to use:** Always computed alongside carrier frequency.

```typescript
// packages/core/src/calculations/prevalence.ts

/**
 * Genetic prevalence as q²
 * For autosomal recessive: P(affected) = q²
 * where q = sum of pathogenic allele frequencies
 */
export function calculateGeneticPrevalence(pathogenicAFs: number[]): number {
  const q = pathogenicAFs.reduce((sum, af) => sum + af, 0);
  return q * q;
}

/**
 * Bayesian prevalence = genetic prevalence × penetrance
 * penetrance is 0-1 (1.0 = 100% penetrant, fully expressed condition)
 * Default penetrance = 1.0 (assume full penetrance unless gene config specifies otherwise)
 */
export function calculateBayesianPrevalence(
  geneticPrevalence: number,
  penetrance: number = 1.0
): number {
  return geneticPrevalence * penetrance;
}
```

### Pattern 4: CalcConfig Pinia Store (Web App)

**What:** Reactive store for calculation settings, persisted to localStorage, included in URL state.
**When to use:** Mirrors the existing useFilterStore pattern exactly.

```typescript
// apps/web/src/stores/useCalcStore.ts
// Mirrors useFilterStore pattern

export interface CalcConfig {
  useHWEFormula: boolean;     // true = HWE 2pq (default), false = simplified 2×ΣAF
  useHomExclusion: boolean;   // true = VCR/GCR with ac_hom (default)
  penetrance: number;         // 0-1, default 1.0
}

export const FACTORY_CALC_DEFAULTS: CalcConfig = {
  useHWEFormula: true,
  useHomExclusion: true,
  penetrance: 1.0,
};

export const useCalcStore = defineStore('calc-settings', {
  state: (): { defaults: CalcConfig } => ({
    defaults: { ...FACTORY_CALC_DEFAULTS },
  }),
  // ... actions following FilterStore pattern
  persist: {
    key: 'carrier-freq-calc',
    storage: localStorage,
  },
});
```

### Pattern 5: GraphQL Query Extension

**What:** Add `ac_hom` to the existing gene-variants query at both top-level and population level.
**When to use:** Required for homozygote exclusion toggle.

```graphql
# In packages/core/src/queries/gene-variants.ts
# Add ac_hom to exome and genome blocks, and to populations arrays

exome {
  ac
  an
  ac_hom       # <-- ADD: homozygote count, global
  populations {
    id
    ac
    an
    ac_hom     # <-- ADD: homozygote count per population
  }
}
genome {
  ac
  an
  ac_hom       # <-- ADD
  populations {
    id
    ac
    an
    ac_hom     # <-- ADD
  }
}
```

### Pattern 6: URL State Extension

**What:** Add calc settings to UrlStateSchema using same compact encoding as existing filter flags.
**When to use:** All three calc settings (formula, hom exclusion, penetrance) get URL params.

```typescript
// Extend existing UrlStateSchema in packages/core/src/types/url-state.ts
// Follow existing pattern for optional params with defaults

hweFormula: z.enum(['0', '1']).optional(),        // '0' = simplified, '1' = HWE (default)
homExclusion: z.enum(['0', '1']).optional(),       // '0' = off, '1' = on (default)
penetrance: z.coerce.number().min(0).max(1).optional(), // 0.0-1.0, default 1.0
```

### Pattern 7: FilterPanel Extension

**What:** Add three controls inside the existing expansion panel — no new visual separator.
**When to use:** Formula toggle, homozygote exclusion toggle, penetrance slider.
**Established pattern from FilterPanel.vue:**

```vue
<!-- Inside v-expansion-panel-text, after existing filter switches -->
<!-- Same v-switch + tooltip pattern as existing LoF/ClinVar switches -->
<v-col cols="12" md="6">
  <div class="d-flex align-center">
    <v-switch
      :model-value="calcConfig.useHWEFormula"
      color="primary"
      label="HWE Formula (2pq)"
      density="compact"
      hide-details
      @update:model-value="updateCalcConfig('useHWEFormula', $event)"
    />
    <v-tooltip location="top">
      <template #activator="{ props: tooltipProps }">
        <v-icon v-bind="tooltipProps" size="x-small" class="ml-1">
          mdi-information-outline
        </v-icon>
      </template>
      <span class="tooltip-text">
        <strong>Hardy-Weinberg Formula (2pq)</strong><br>
        Uses the full Hardy-Weinberg equation for carrier frequency.
        When off, the simplified 2×ΣAF formula is used instead.
      </span>
    </v-tooltip>
  </div>
</v-col>
```

### Pattern 8: Non-Default Formula Warning Chip

**What:** Show warning chip near carrier frequency value when simplified formula is active.
**Pattern from StepResults.vue (existing sourceChipColor/sourceAttribution):**

```vue
<!-- In summary card, next to carrier frequency display -->
<v-chip
  v-if="!calcConfig.useHWEFormula"
  color="warning"
  size="x-small"
  class="ml-2"
>
  Simplified formula
</v-chip>
```

This mirrors the existing "Default (no gnomAD data)" chip pattern.

### Pattern 9: Penetrance Slider

**What:** Slider in FilterPanel, 0-100% range in 5% steps. Phase 28 will auto-populate from gene config.
**Pattern from existing ClinVar star slider in FilterPanel.vue:**

```vue
<v-slider
  :model-value="Math.round(calcConfig.penetrance * 100)"
  :min="0"
  :max="100"
  :step="5"
  label="Penetrance %"
  density="compact"
  thumb-label
  color="primary"
  class="flex-grow-1"
  @update:model-value="updateCalcConfig('penetrance', $event / 100)"
/>
```

### Anti-Patterns to Avoid

- **Mixing formulas in one function:** VCR/GCR and HWE 2pq are separate formulas. Keep them as separate exported functions with no branching inside.
- **Inline `ac_hom` fallback:** CONTEXT.md states no fallback handling needed — `ac_hom` is always present. Do not add `?? 0` fallback that silently swallows missing data.
- **Recalculating q separately for HWE and GCR:** When homozygote exclusion is ON, carrier frequency should use GCR (not 2pq). When OFF, use 2pq (or simplified). The toggle selects the computation path, not just a formula parameter.
- **Computing prevalence before carrier frequency:** Prevalence uses q (the raw allele frequency sum), not carrier frequency. Compute q → prevalence independently of the carrier frequency formula choice.
- **Vue/Pinia imports in core package:** Core is Node/Bun/browser-agnostic. All reactive wrappers stay in apps/web/src/composables.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URL state compression | Custom compact encoding | Extend existing `encodeFilterFlags` / `UrlStateSchema` pattern | Already handles round-trip, Zod validation, defaults |
| Test data fixtures | Hard-coded raw numbers | Verified published reference values (CFTR, HEXA) as named test cases | Published values are the validation contract |
| Penetrance validation | Custom number parser | Zod `z.coerce.number().min(0).max(1)` | Already used for litFreq validation |
| localStorage key conflicts | New storage key | New Pinia store with distinct `key: 'carrier-freq-calc'` | Isolated from existing `carrier-freq-filters` |

**Key insight:** The calculation logic is genuinely simple algebra. The complexity is in correct typing, test coverage with verified reference values, and clean integration with the existing store/URL/FilterPanel patterns. Don't over-engineer the math layer.

---

## Common Pitfalls

### Pitfall 1: VCR Denominator is AN/2, not AN

**What goes wrong:** Using `ac / an` (allele frequency) instead of `(ac - 2*acHom) / (an / 2)` (carrier rate per individual).
**Why it happens:** The existing `aggregatePopulationFrequencies` works with allele frequency (per chromosome), but VCR is per diploid individual.
**How to avoid:** The formula in PMC9763236 is `(AC - 2×Hom) / (0.5 × AN)`. Write the denominator as `an / 2` explicitly in code. Add a test with known values.
**Warning signs:** VCR ≈ 2 × AF for variants with no homozygotes — this is correct and expected. VCR that equals AF is wrong.

### Pitfall 2: Homozygote Exclusion Changes the Calculation Path Completely

**What goes wrong:** Treating homozygote exclusion as a post-processing adjustment to the 2pq result.
**Why it happens:** Seems like you'd just subtract something from the final carrier frequency.
**How to avoid:** When homozygote exclusion is ON, the correct path is: compute VCRᵢ per variant → GCR via product formula. This replaces the allele-summing approach entirely — it does not compose with 2pq.
**Warning signs:** If you see `2pq - adjustment`, the implementation is wrong.

### Pitfall 3: ac_hom Field May be Zero (Not Null) for Rare Variants

**What goes wrong:** Checking `if (acHom !== null)` as a guard — this never triggers because the field is 0 when no homozygotes are observed, not null.
**Why it happens:** Confusion between "field missing" and "field = 0".
**How to avoid:** Treat `ac_hom = 0` as valid data (variant is rare, no observed homozygotes). The VCR formula handles this correctly: `(AC - 0) / (AN / 2)` = standard carrier frequency.
**Warning signs:** Unit tests that pass `null` for acHom to VCR — these test error handling, not the actual API data shape.

### Pitfall 4: Genetic Prevalence is q², not (Carrier Frequency / 2)²

**What goes wrong:** Deriving prevalence from carrier frequency: `(carrierFreq / 2)²`.
**Why it happens:** Carrier frequency ≈ 2q, so `(2q / 2)² = q²` is mathematically equivalent for the simplified formula, but breaks when using GCR instead of 2pq.
**How to avoid:** Always compute prevalence directly from `q = ΣAF`, independently of which carrier frequency formula is active. Prevalence = q² regardless of formula choice.

### Pitfall 5: URL State Extension Must Not Break Existing Shared URLs

**What goes wrong:** Adding required URL params that cause Zod validation to fail on old URLs missing those params.
**Why it happens:** Adding new fields to UrlStateSchema without `.optional().default(...)`.
**How to avoid:** All new params (`hweFormula`, `homExclusion`, `penetrance`) must be optional with defaults matching `FACTORY_CALC_DEFAULTS`. Test by loading a URL with none of the new params.

### Pitfall 6: FilterPanel "No Separator" Decision

**What goes wrong:** Adding a `<v-divider>` between variant filter switches and calculation switches, or putting calculation settings in a separate expansion panel.
**Why it happens:** The calculation settings feel semantically different from variant filters.
**How to avoid:** CONTEXT.md explicitly states "All toggles in the filter panel stay flat (no visual separator between variant filters and calculation settings)." Follow this decision.

### Pitfall 7: Export Metadata Must Include Formula Choice

**What goes wrong:** Omitting formula choice from JSON/Excel export metadata.
**Why it happens:** `buildExportMetadata` in `export-utils.ts` currently only includes gnomAD version and filter config.
**How to avoid:** Extend `ExportMetadata` type and `buildExportMetadata` function to accept and include `CalcConfig`. Update `buildExportData` call in StepResults.vue to pass calc config.

---

## Code Examples

### Golden-Value Test Structure

```typescript
// packages/core/tests/carrier-frequency.test.ts
// Source: CFTR reference from Schmitz 2022 Clinical Genetics, gnomAD v4.0

import { describe, it, expect } from 'vitest';
import {
  calculateHWECarrierFrequency,
  calculateSimplifiedCarrierFrequency,
} from '../src/calculations/carrier-frequency';

describe('HWE Carrier Frequency', () => {
  it('CFTR global - HWE 2pq matches published estimate within tolerance', () => {
    // Published CFTR GCF (gnomAD v4.0): ~0.0454
    // Using representative pathogenic AFs summing to q ≈ 0.023
    // This is a structural test — exact AFs will come from live gnomAD data
    const q = 0.023; // approximate sum of CFTR pathogenic AFs globally
    const result = calculateHWECarrierFrequency([q]);
    // 2pq = 2 * (1 - 0.023) * 0.023 ≈ 0.04494
    expect(result).toBeCloseTo(2 * (1 - q) * q, 4);
    expect(result).toBeGreaterThan(0.04); // within expected range
    expect(result).toBeLessThan(0.06);
  });

  it('simplified formula gives 2×q result', () => {
    const result = calculateSimplifiedCarrierFrequency([0.01, 0.005]);
    expect(result).toBeCloseTo(0.03, 10); // 2 × 0.015
  });

  it('HWE and simplified converge for small q', () => {
    const smallQ = 0.001;
    const hwe = calculateHWECarrierFrequency([smallQ]);
    const simplified = calculateSimplifiedCarrierFrequency([smallQ]);
    // For small q, 2pq ≈ 2q (p ≈ 1)
    expect(Math.abs(hwe - simplified)).toBeLessThan(0.0001);
  });
});
```

### Golden-Value Test for VCR/GCR

```typescript
// packages/core/tests/homozygote-exclusion.test.ts

import { describe, it, expect } from 'vitest';
import { calculateVCR, calculateGCR } from '../src/calculations/homozygote-exclusion';

describe('VCR formula', () => {
  it('VCR with zero homozygotes equals AC/AN * 2 (standard carrier freq per individual)', () => {
    // AC=10, AN=1000, acHom=0 → VCR = (10 - 0) / (1000/2) = 10/500 = 0.02
    expect(calculateVCR(10, 1000, 0)).toBeCloseTo(0.02, 10);
  });

  it('VCR excludes homozygotes from numerator', () => {
    // AC=12, AN=1000, acHom=1 → heterozygous alleles = 12 - 2 = 10
    // VCR = 10 / 500 = 0.02
    expect(calculateVCR(12, 1000, 1)).toBeCloseTo(0.02, 10);
  });

  it('VCR returns 0 for AN=0 (unsampled population)', () => {
    expect(calculateVCR(0, 0, 0)).toBe(0);
  });
});

describe('GCR formula', () => {
  it('GCR with single variant equals that VCR', () => {
    expect(calculateGCR([0.02])).toBeCloseTo(0.02, 10);
  });

  it('GCR with two variants is less than sum (inclusion-exclusion)', () => {
    const gcr = calculateGCR([0.02, 0.01]);
    // 1 - (1-0.02)(1-0.01) = 1 - 0.98*0.99 = 1 - 0.9702 = 0.0298
    expect(gcr).toBeCloseTo(0.0298, 4);
    expect(gcr).toBeLessThan(0.03); // less than naive 0.02 + 0.01 = 0.03
  });

  it('GCR with empty array returns 0', () => {
    expect(calculateGCR([])).toBe(0);
  });
});
```

### Prevalence Tests

```typescript
// packages/core/tests/prevalence.test.ts

import { describe, it, expect } from 'vitest';
import {
  calculateGeneticPrevalence,
  calculateBayesianPrevalence,
} from '../src/calculations/prevalence';

describe('Genetic prevalence (q²)', () => {
  it('computes q² from allele frequencies', () => {
    // q = 0.023, prevalence = 0.023² ≈ 0.000529
    expect(calculateGeneticPrevalence([0.023])).toBeCloseTo(0.023 * 0.023, 10);
  });

  it('HEXA Ashkenazi Jewish - prevalence matches ~1/3600 estimate', () => {
    // AJ Tay-Sachs: carrier freq ~1/29 ≈ 0.034, q ≈ 0.017
    // Published prevalence: ~1/3500 ≈ 0.000286
    const q = 1 / (2 * 29); // q from carrier frequency 1/29
    const prevalence = calculateGeneticPrevalence([q]);
    expect(prevalence).toBeCloseTo(1 / 3364, 6); // q² = (1/58)² = 1/3364
  });

  it('Bayesian prevalence with full penetrance equals genetic prevalence', () => {
    const genetic = calculateGeneticPrevalence([0.023]);
    expect(calculateBayesianPrevalence(genetic, 1.0)).toBeCloseTo(genetic, 10);
  });

  it('Bayesian prevalence with 80% penetrance reduces by 20%', () => {
    const genetic = calculateGeneticPrevalence([0.023]);
    const bayesian = calculateBayesianPrevalence(genetic, 0.8);
    expect(bayesian).toBeCloseTo(genetic * 0.8, 10);
  });
});
```

### Formatters for Prevalence Display

```typescript
// Prevalence display: "1:10,000 (0.01%)" pattern
// Mirrors existing formatCarrierFrequency in formatters.ts

export function formatPrevalence(prevalence: number | null): {
  ratio: string;
  percent: string;
} {
  if (prevalence === null || prevalence === 0) {
    return { ratio: 'Not detected', percent: 'Not detected' };
  }
  const ratio = Math.round(1 / prevalence);
  return {
    ratio: `1:${ratio.toLocaleString()}`,
    percent: `${(prevalence * 100).toFixed(4)}%`,
  };
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 2 × ΣAF simplified formula | HWE 2pq (2pq where p = 1-q) | 2022-2024 peer-reviewed literature | More accurate for higher-frequency genes; nearly identical for rare diseases |
| No homozygote adjustment | VCR/GCR with ac_hom exclusion | Guo & Gregg 2019, adopted widely | Prevents double-counting confirmed homozygotes; clinically more defensible |
| No disease frequency display | Genetic prevalence q² + penetrance | GeniE tool launched June 2024 | Gives genetic counselors additional reference metric |
| Single carrier frequency formula | Formula toggle with warning chip | Phase 26 decision | Allows comparison; non-default usage flagged clearly |

**Deprecated/outdated:**
- `2 × AC / AN` formula (treats exome+genome incorrectly): Already replaced in current codebase by `Σ(AC_i / AN_i)`.
- Hard-coded global AC/AN ratio: Current code already correctly sums per-variant AFs. This is preserved correctly in the new formulas.

---

## Open Questions

1. **GCR vs HWE 2pq as the single carrier frequency shown**
   - What we know: When homozygote exclusion is ON, GCR replaces the allele-sum approach. When OFF, HWE 2pq (or simplified) applies.
   - What's unclear: Should GCR and HWE 2pq be independent axes (2×2 combinations: GCR + HWE, GCR + simplified, sum + HWE, sum + simplified)? Or is GCR always paired with sum-of-VCRs and HWE is always paired with raw allele sums?
   - Recommendation: Treat them as independent axes. GCR (inclusion-exclusion of VCRs) is the gene-level aggregation method; HWE 2pq vs simplified is the per-variant frequency interpretation. This gives maximum scientific flexibility. Default: GCR ON + HWE ON.

2. **ac_hom at the global exome/genome level vs population level**
   - What we know: `ac_hom` is confirmed available at `exome.populations[].ac_hom` and `genome.populations[].ac_hom`. The CONTEXT.md also mentions it at the variant top level (`exome.ac_hom`).
   - What's unclear: Is `exome.ac_hom` (global, not per-population) needed for the global GCR calculation, or should the global GCR be computed from the population-level sums?
   - Recommendation: Add `ac_hom` at both levels in the query. For the global carrier frequency, use global `exome.ac_hom + genome.ac_hom`. For per-population GCR, use `populations[].ac_hom`. This mirrors the existing `ac` / `an` pattern exactly.

3. **Penetrance slider range 0-100% vs 1-100%**
   - What we know: Penetrance 0% is mathematically valid (0 × prevalence = 0) but clinically meaningless.
   - What's unclear: Should the slider clamp at 1% (or 5%) to prevent nonsensical 0% input?
   - Recommendation: Allow 0-100% in 5% steps. 0% shows 0 prevalence, which correctly signals "non-penetrant variant." This is consistent with scientific usage. The UI makes it clear via label.

---

## gnomAD API: ac_hom Field Verification

**CONFIRMED HIGH CONFIDENCE:** `ac_hom` is the correct field name in the gnomAD GraphQL API at population level.

Source: gnomAD community forum thread "How to get genome ancestry group data statistics from api" (https://discuss.gnomad.broadinstitute.org/t/how-to-get-genome-ancestry-group-data-statistics-from-api/768) — shows working query with `ac_hom` in `exome.populations { id ac an ac_hom }` and confirms data is populated.

The field name `homozygote_count` is used internally in gnomAD's Hail backend structs, but the GraphQL API exposes it as `ac_hom`. Do not confuse these.

**Updated GraphQL query to add in Phase 26:**

```graphql
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
```

**Updated TypeScript types:**

```typescript
// packages/core/src/queries/types.ts
export interface GeneVariantPopulation {
  id: string;
  ac: number;
  an: number;
  ac_hom: number;  // ADD: homozygote count for homozygote exclusion
}

export interface GeneVariantExomeGenome {
  ac: number;
  an: number;
  ac_hom: number;  // ADD: global homozygote count
  populations: GeneVariantPopulation[];
}
```

---

## Reference Values for Tests (CALC-09)

These are approximate values for test plausibility checks. Exact values should be queried from gnomAD at test-writing time and captured as golden values.

| Gene | Population | Published Carrier Freq | Source |
|------|-----------|----------------------|--------|
| CFTR | Global (gnomAD v4.0 GCF) | ~1:22 (0.0454) | Schmitz 2022 Clinical Genetics, gnomAD v4.0 |
| CFTR | European (non-Finnish) | ~1:26 (p.Phe508del allele freq ~1.5%) | ACMG 2023 position statement |
| HEXA | Ashkenazi Jewish | ~1:29 (0.034) | NTSAD 2019, multiple reviews |
| HEXA | Global non-AJ | ~1:300 | Wikipedia Tay-Sachs, NEJM 1990 |

**Important:** CALC-09 and TEST-02 through TEST-04 require golden values from actual gnomAD queries, not just formula correctness. The planner should include a task to query gnomAD for CFTR and HEXA, capture the variant-level AC/AN/ac_hom values, and hardcode those in tests so formula changes break tests predictably.

**SMN1 note:** SMN1 is NOT suitable as a reference gene for golden-value tests (paralog in repetitive region, gnomAD short-read data unreliable). CONTEXT.md says CALC-09 uses CFTR, HEXA, and PKD1. PKD1 is unusual (autosomal dominant, not recessive) — the planner should clarify whether PKD1 reference tests are for the calculation functions in isolation or for a different purpose.

---

## Sources

### Primary (HIGH confidence)
- gnomAD community forum — "How to get genome ancestry group data statistics from api" https://discuss.gnomad.broadinstitute.org/t/how-to-get-genome-ancestry-group-data-statistics-from-api/768 — confirmed `ac_hom` field name and population-level availability
- PMC9763236 (npj Genomic Medicine 2022) — VCR and GCR formula: `VCR = (AC - 2×Hom) / (0.5×AN)`, `GCR = 1 - ∏(1 - VCRᵢ)` https://pmc.ncbi.nlm.nih.gov/articles/PMC9763236/
- cureffi.org (Eric Vallabh Minikel, 2019) — `P(D) = P(G) × P(D|G)` Bayesian penetrance model https://www.cureffi.org/2019/06/05/using-genetic-data-to-estimate-disease-prevalence/
- Hardy-Weinberg principle — `2pq` carrier frequency, `q²` prevalence https://en.wikipedia.org/wiki/Hardy%E2%80%93Weinberg_principle

### Secondary (MEDIUM confidence)
- Schmitz 2022 Clinical Genetics — CFTR carrier frequency ~1:22 (0.0454) from gnomAD v4.0 https://onlinelibrary.wiley.com/doi/10.1111/cge.14148
- ACMG 2023 CFTR position statement — p.Phe508del AF ~1.5% in European non-Finnish https://www.gimjournal.org/article/S1098-3600(23)00880-8/fulltext
- NTSAD 2019 — HEXA Ashkenazi Jewish carrier frequency ~1:29 https://www.jewishgeneticdiseases.org/wp-content/uploads/NTSAD-Position-Statement-TS-Carrier-Screening.2019.11.13.FINAL_.pdf
- gnomAD GeniE tool announcement June 2024 — "multiple standardized methods for carrier frequency and genetic prevalence" https://gnomad.broadinstitute.org/news/2024-06-genie/

### Tertiary (LOW confidence)
- WebSearch results indicating `homozygote_count` as internal Hail field vs `ac_hom` in GraphQL — the forum source overrides this, confirming `ac_hom`

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, well-understood existing stack
- Mathematical formulas (VCR, GCR, HWE, q²): HIGH — verified from PMC9763236 and standard genetics texts
- gnomAD `ac_hom` field name: HIGH — confirmed from actual API query in community forum
- Architecture patterns: HIGH — directly observed from existing codebase code reading
- Reference values for tests: MEDIUM — published values exist but exact gnomAD query results must be captured at implementation time
- PKD1 as test gene: LOW — PKD1 is AD not AR; unclear what the requirement intends

**Research date:** 2026-02-23
**Valid until:** 2026-03-23 (gnomAD API schema is stable; check if v4.2 releases affect field names)
