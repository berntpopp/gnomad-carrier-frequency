# Architecture Research: v1.6 Feature Integration

**Domain:** Integrating 7 new features into existing gnomAD carrier frequency monorepo
**Researched:** 2026-02-26
**Confidence:** HIGH (based on direct codebase analysis of all relevant source files)

---

## Existing Architecture Summary

The monorepo has a clean core/web boundary:

```
packages/core/     @gnomad-cf/core    Platform-neutral TypeScript
  src/types/       Shared interfaces (GnomadVariant, PopulationFrequency, etc.)
  src/config/      JSON configs + typed loaders (gnomad.json, settings.json)
  src/queries/     GraphQL query strings + response types
  src/filters/     Variant filtering (LoF HC, ClinVar P/LP, missense)
  src/calculations/ Carrier frequency math + formatters
  src/templates/   Clinical text rendering
  src/utils/       Pure utilities
  src/client/      fetch-based GraphQL client
  src/gene-config/ Gene-specific config profiles

apps/web/          Vue 3 + Vuetify 3 SPA
  src/composables/ Reactive wrappers around core (useCarrierFrequency, etc.)
  src/stores/      Pinia persisted stores (filter, calc, template, etc.)
  src/components/  Vuetify components (wizard steps, tables, modals)
  src/utils/       Web-only utilities (export-utils.ts)
```

Core has 10 tsdown entry points: index, types, config, queries, filters, calculations, templates, utils, client, gene-config.

**Key data flow:**
```
gnomAD GraphQL API
  -> useGeneVariants (villus query, raw variant data)
  -> filterPathogenicVariantsConfigurable (core/filters)
  -> aggregatePopulationFrequenciesWithConfig (core/calculations)
  -> buildPopulationFrequencies (core/calculations)
  -> PopulationFrequency[] -> displayed in StepResults.vue
```

---

## Feature-by-Feature Integration Analysis

### Feature 1: Variant Quality Flags (#12)

**What:** Annotate variants with quality indicators (low coverage, singleton, population-specific).

**Integration point:** After filtering, before display. The filtering pipeline (`filterPathogenicVariantsConfigurable`) produces `GnomadVariant[]`. The display layer transforms these to `DisplayVariant[]` via `toDisplayVariants()` in `core/filters/variant-display.ts`.

**Where new code goes:**

| Layer | File | Change |
|-------|------|--------|
| core/types | `types/display.ts` | Add quality flag fields to `DisplayVariant` |
| core/filters | NEW `variant-quality.ts` | Pure functions: `assessVariantQuality(variant) -> QualityFlags` |
| core/filters | `variant-display.ts` | Call quality assessment in `toDisplayVariant()` |
| web/components | `VariantTable.vue` | Render quality flag chips in expanded row |

**New types needed:**

```typescript
// packages/core/src/types/quality.ts (NEW)
export interface QualityFlags {
  /** Variant observed only once (AC=1 globally) */
  isSingleton: boolean;
  /** Low allele number indicates coverage gaps */
  isLowCoverage: boolean;
  /** Variant exists only in one population */
  isPopulationSpecific: boolean;
  /** The single population code, if population-specific */
  specificPopulationCode: string | null;
}
```

**Assessment function signature:**

```typescript
// packages/core/src/filters/variant-quality.ts (NEW)
export function assessVariantQuality(
  variant: GnomadVariant,
  version: GnomadVersion,
): QualityFlags;
```

**Rationale for placement:** Quality assessment is pure logic operating on `GnomadVariant` data. It belongs in core, not web. The function reads AC/AN from the variant's population arrays -- same data already available, no new API calls needed.

**Data already available:** The `GnomadVariant` type has `exome.ac`, `genome.ac`, `joint.ac` (global counts) and per-population `ac`/`an` arrays. All quality flags can be derived from existing data without additional GraphQL fields.

**What needs NO change:** The filtering pipeline itself. Quality flags are informational annotations, not filter criteria (at least in v1.6). They do not affect which variants are included in the carrier frequency calculation.

---

### Feature 2: Source Breakdown (#11)

**What:** Show how much of the carrier frequency comes from ClinVar P/LP variants vs pLoF (LOFTEE HC) variants.

**Integration point:** Inside the aggregation step of `useCarrierFrequency.ts`. Currently `aggregatePopulationFrequenciesWithConfig()` sums allele frequencies across all qualifying variants without distinguishing their source. The breakdown needs a parallel computation tracking source attribution.

**Where new code goes:**

| Layer | File | Change |
|-------|------|--------|
| core/types | `types/frequency.ts` | Add `SourceBreakdown` interface |
| core/calculations | NEW `source-breakdown.ts` | Pure function to partition variants by source and sum AFs |
| core/calculations | `index.ts` | Export new module |
| web/composables | `useCarrierFrequency.ts` | Add computed for source breakdown (calls core function) |
| web/components | `StepResults.vue` | Display breakdown as sub-stats or mini chart |

**New types:**

```typescript
// Added to packages/core/src/types/frequency.ts
export interface SourceBreakdown {
  /** Fraction of carrier frequency from LoF HC variants */
  lofHcFraction: number;
  /** Fraction from ClinVar P/LP variants (excluding LoF HC overlap) */
  clinvarFraction: number;
  /** Fraction from missense with ClinVar evidence */
  missenseFraction: number;
  /** Raw sumAF contributions */
  lofHcSumAF: number;
  clinvarSumAF: number;
  missenseSumAF: number;
  /** Variant counts per source */
  lofHcCount: number;
  clinvarCount: number;
  missenseCount: number;
}
```

**Core function:**

```typescript
// packages/core/src/calculations/source-breakdown.ts (NEW)
export function calculateSourceBreakdown(
  variants: GnomadVariant[],
  clinvarVariants: ClinVarVariant[],
  version: GnomadVersion,
): SourceBreakdown;
```

**Key design decision:** A variant can be BOTH LoF HC AND ClinVar P/LP. The breakdown must handle overlap. Recommendation: classify each variant into its primary source using priority: LoF HC > missense > ClinVar-only. This avoids double-counting while giving LoF HC precedence (since it is the stronger evidence class).

**Data already available:** The classification functions `isHighConfidenceLoF()` and `isPathogenicClinVar()` already exist in `core/filters/variant-filters.ts`. The breakdown function calls these same functions to classify, then sums AFs per class.

---

### Feature 3: Display Formats (#10)

**What:** Allow users to toggle between percentage (4.00%), ratio (1:25), and scientific notation (4.00e-2) display formats.

**Integration point:** The formatter layer in `core/calculations/formatters.ts` and the display components (`StepResults.vue`, `VariantTable.vue`).

**Where new code goes:**

| Layer | File | Change |
|-------|------|--------|
| core/types | NEW `types/display-format.ts` or add to existing `types/calculations.ts` | Add `DisplayFormat` type |
| core/calculations | `formatters.ts` | Add `formatFrequencyAs(freq, format)` function |
| web/stores | `useCalcStore.ts` | Add `displayFormat` field (persisted preference) |
| web/components | `StepResults.vue` | Use dynamic formatter based on store preference |
| web/components | `VariantTable.vue` | Use dynamic formatter |
| web/components | `FilterPanel.vue` or new control | Add format toggle UI (3-way button group) |

**New types:**

```typescript
// packages/core/src/types/calculations.ts (extend existing)
export type DisplayFormat = 'percent' | 'ratio' | 'scientific';
```

**New formatter:**

```typescript
// packages/core/src/calculations/formatters.ts (extend existing)
export function formatFrequencyAs(
  frequency: number | null,
  format: DisplayFormat,
): string {
  if (frequency === null) return 'Not detected';
  switch (format) {
    case 'percent':
      return `${(frequency * 100).toFixed(frequencyDecimalPlaces)}%`;
    case 'ratio':
      return frequency > 0 ? `1:${Math.round(1 / frequency).toLocaleString()}` : '-';
    case 'scientific':
      return frequency > 0 ? frequency.toExponential(2) : '0';
  }
}
```

**Key design decision:** The format preference should live in `useCalcStore` (persisted Pinia store) alongside other calculation display preferences. It is NOT a filter or calculation parameter -- it only affects rendering. Adding it to `CalcConfig` would be wrong because `CalcConfig` flows into the calculation engine. Create a separate `displayFormat` field on the store state.

**Existing code to modify:** `StepResults.vue` currently calls local `formatPercent()` and `formatRatio()` helper functions defined inline. These should be replaced with calls to the core `formatFrequencyAs()` function using the store's preference. The `formatCarrierFrequency()` function in `core/calculations/formatters.ts` already returns both percent and ratio -- this can be extended to include scientific.

---

### Feature 4: TSV Export (#9)

**What:** Add TSV (tab-separated values) as an export format alongside existing JSON and Excel.

**Integration point:** The export system in `apps/web/src/utils/export-utils.ts` and `apps/web/src/composables/useExport.ts`.

**Where new code goes:**

| Layer | File | Change |
|-------|------|--------|
| web/utils | `export-utils.ts` | Add `buildTsvContent(data: ExportData): string` function |
| web/composables | `useExport.ts` | Add `exportToTsv()` method |
| web/components | `StepResults.vue` | Add TSV option to export dropdown menu |
| web/components | `VariantModal.vue` | Add TSV option to variant export dropdown |

**Why web-only, not core:** The existing `buildExportData()` in `export-utils.ts` already builds a platform-neutral `ExportData` structure (defined in core types). The TSV serializer is a display concern -- it converts `ExportData` to a tab-delimited string. The XLSX export already lives in web (uses `xlsx` library with DOM APIs). TSV follows the same pattern.

**Implementation sketch:**

```typescript
// apps/web/src/utils/export-utils.ts (extend existing)
export function buildTsvContent(data: ExportData): string {
  const lines: string[] = [];

  // Summary header
  lines.push(['Gene', 'Carrier Frequency', 'Carrier Frequency %',
    'Allele Count', 'Allele Number', 'Qualifying Variants'].join('\t'));
  lines.push([data.summary.gene, String(data.summary.globalCarrierFrequency ?? ''),
    data.summary.globalCarrierFrequencyPercent,
    String(data.summary.globalAlleleCount),
    String(data.summary.globalAlleleNumber),
    String(data.summary.qualifyingVariantCount)].join('\t'));
  lines.push(''); // blank separator

  // Population rows
  lines.push(['Population', 'Code', 'Carrier Frequency', '% ', 'Ratio',
    'AC', 'AN', 'Founder Effect'].join('\t'));
  for (const pop of data.populations) {
    lines.push([pop.label, pop.code,
      String(pop.carrierFrequency ?? ''),
      pop.carrierFrequencyPercent, pop.carrierFrequencyRatio,
      String(pop.alleleCount), String(pop.alleleNumber),
      String(pop.isFounderEffect)].join('\t'));
  }
  lines.push('');

  // Variant rows
  lines.push(['Variant ID', 'Consequence', 'Allele Freq', 'AF %',
    'AC', 'AN', 'HGVS-c', 'HGVS-p', 'ClinVar',
    'LoF', 'ClinVar P/LP', 'Excluded', 'Exclusion Reason'].join('\t'));
  for (const v of data.variants) {
    lines.push([v.variantId, v.consequence,
      String(v.alleleFrequency ?? ''), v.alleleFrequencyPercent,
      String(v.alleleCount), String(v.alleleNumber),
      v.hgvsC ?? '', v.hgvsP ?? '',
      v.clinvarStatus ?? '',
      String(v.isLoF), String(v.isClinvarPathogenic),
      String(v.excluded), v.exclusionReason ?? ''].join('\t'));
  }

  return lines.join('\n');
}
```

**No new core modules or types needed.** The `ExportData` type already captures everything TSV needs.

---

### Feature 5: Orphanet Integration (#6)

**What:** Fetch gene-disease associations and prevalence data from Orphanet's API to provide disease context alongside gnomAD frequency data.

**Integration point:** New parallel data source, fetched when a gene is selected. Does not modify the filtering or calculation pipeline -- it provides supplementary reference data displayed alongside results.

**Where new code goes:**

| Layer | File | Change |
|-------|------|--------|
| core/types | NEW `types/orphanet.ts` | Orphanet response types |
| core/client | NEW `orphanet-client.ts` | Fetch client for Orphadata REST API |
| core | `tsdown.config.ts` | Add `orphanet` entry point (if separate subpath desired) |
| web/composables | NEW `useOrphanetData.ts` | Reactive wrapper, caching, error handling |
| web/components | NEW `OrphanetCard.vue` | Display diseases, prevalence, inheritance |
| web/components | `StepResults.vue` | Include OrphanetCard in results view |

**Orphadata API endpoints (verified):**

```
Base URL: https://api.orphadata.com

Gene -> Diseases:
  GET /rd-associated-genes/genes/symbols/{symbol}
  Returns: diseases associated with a gene symbol

Disease -> Epidemiology:
  GET /rd-epidemiology/orphacodes/{orphacode}
  Returns: prevalence, incidence, family count

Disease -> Natural History:
  GET /rd-natural_history/orphacodes/{orphacode}
  Returns: inheritance mode, age of onset
```

**New types:**

```typescript
// packages/core/src/types/orphanet.ts (NEW)
export interface OrphanetDisease {
  orphacode: number;
  preferredTerm: string;
  geneSymbol: string;
  associationType: string; // "Disease-causing germline mutation(s) in"
}

export interface OrphanetPrevalence {
  orphacode: number;
  preferredTerm: string;
  prevalenceType: string;  // "Point prevalence", "Birth prevalence"
  prevalenceClass: string; // ">1 / 1000", "1-9 / 100 000", etc.
  prevalenceGeographic: string; // "Europe", "Worldwide"
  prevalenceValidationStatus: string;
  source: string;
}

export interface OrphanetGeneResult {
  diseases: OrphanetDisease[];
  prevalences: OrphanetPrevalence[];  // aggregated from all disease orphacodes
}
```

**Core client:**

```typescript
// packages/core/src/client/orphanet-client.ts (NEW)
const ORPHADATA_BASE = 'https://api.orphadata.com';

export async function fetchOrphanetDiseases(
  geneSymbol: string,
): Promise<OrphanetDisease[]>;

export async function fetchOrphanetPrevalence(
  orphacode: number,
): Promise<OrphanetPrevalence[]>;

export async function fetchOrphanetGeneData(
  geneSymbol: string,
): Promise<OrphanetGeneResult>;
```

**Caching strategy:** Use the existing web-layer caching pattern (similar to ClinGen in `useClingenStore`). Orphanet data changes infrequently (yearly updates). Cache responses in a Pinia store with localStorage persistence and a 30-day expiry. The web composable manages cache-first fetching.

**Key design decision:** The Orphanet client goes in core (not web) because the CLI could also use it. The reactive caching wrapper stays in web.

**CORS consideration:** The Orphadata API at `api.orphadata.com` is a public REST API. Browser CORS policy must be verified. If CORS headers are not present, a proxy or server-side fetch would be needed. This is a **research flag** -- verify CORS headers before implementation.

---

### Feature 6: Subcontinental Populations (#5)

**What:** Show frequency breakdowns for subcontinental groups (e.g., NFE subdivided into North-Western European, Southern European, etc.).

**CRITICAL FINDING:** gnomAD v4.0/v4.1 does NOT include subcontinental populations in its API or data release. The v4.0 announcement explicitly states sub-genetic ancestry groups are "not yet in v4" and will come in future minor releases. gnomAD v2.1.1 DOES have subcontinental populations (e.g., `nfe_nwe`, `nfe_seu`, `nfe_bgr`, `eas_jpn`, `eas_kor`).

**This means:**
- For v4 users (default): subcontinental data is unavailable. The feature must gracefully show "not available for v4" or be hidden entirely.
- For v2 users: subcontinental data IS available in the existing GraphQL response (population IDs include subcontinental codes like `nfe_nwe`).

**Where new code goes:**

| Layer | File | Change |
|-------|------|--------|
| core/config | `gnomad.json` | Add `subpopulations` nested array to v2 populations |
| core/config | `types.ts` | Extend `PopulationConfig` with optional `subpopulations` |
| core/config | `index.ts` | Add helpers: `getSubpopulations(code, version)`, `isSubpopulation(code)` |
| core/calculations | `frequency-calc.ts` | Extend aggregation to optionally include subpopulations |
| core/types | `types/frequency.ts` | Add optional `subpopulations` field to `PopulationFrequency` |
| web/components | `StepResults.vue` | Expandable rows for populations with subpopulations |

**Config extension:**

```json
{
  "code": "nfe",
  "label": "Non-Finnish European",
  "subpopulations": [
    { "code": "nfe_bgr", "label": "Bulgarian" },
    { "code": "nfe_est", "label": "Estonian" },
    { "code": "nfe_nwe", "label": "North-Western European" },
    { "code": "nfe_onf", "label": "Other Non-Finnish European" },
    { "code": "nfe_seu", "label": "Southern European" },
    { "code": "nfe_swe", "label": "Swedish" }
  ]
}
```

**Type extension:**

```typescript
// packages/core/src/config/types.ts (extend)
export interface PopulationConfig {
  code: string;
  label: string;
  description?: string;
  subpopulations?: PopulationConfig[];  // NEW - optional nested
}
```

**Data availability:** The existing `GENE_VARIANTS_QUERY` already requests ALL populations in the `populations { id ac an ac_hom }` array. Subcontinental codes (e.g., `nfe_nwe`) are returned by gnomAD v2 API in the same populations array. No GraphQL query change is needed -- the data is already fetched but currently ignored because `getPopulationCodes()` only returns top-level codes.

**Key design decision:** The aggregation function `aggregatePopulationFrequenciesWithConfig()` iterates over `getPopulationCodes(version)`. To add subpopulations, either:
1. Extend the function to accept an "include subpopulations" flag and iterate over nested codes too, OR
2. Build a separate `aggregateSubpopulationFrequencies()` that runs after the main aggregation.

Recommendation: Option 2 -- keep the main aggregation unchanged and add a separate function. This is safer and avoids changing tested calculation logic. The subpopulation aggregation uses the same math but different population codes.

---

### Feature 7: Bar Chart (#2)

**What:** Visualize population carrier frequencies as a horizontal bar chart.

**Integration point:** Pure UI concern. Consumes `PopulationFrequency[]` data that is already computed by `useCarrierFrequency`.

**Where new code goes:**

| Layer | File | Change |
|-------|------|--------|
| web/components | NEW `PopulationChart.vue` | Bar chart component |
| web/components | `StepResults.vue` | Include chart above or below population table |
| web (package.json) | `package.json` | Add chart library dependency (if using one) |

**No core changes needed.** The chart consumes existing `PopulationFrequency[]` data from `useCarrierFrequency.populations`.

**Library options:**

| Library | Size | Vuetify Integration | Recommendation |
|---------|------|---------------------|----------------|
| Chart.js + vue-chartjs | ~65KB | Manual theming | Good for simple charts |
| Lightweight-charts (TradingView) | ~45KB | None | Overkill -- finance-oriented |
| D3.js | ~90KB | None | Overkill for bar charts |
| Native SVG / CSS | 0KB | Perfect Vuetify theming | Best for this use case |

**Recommendation: Native SVG or CSS bars.** The chart is a simple horizontal bar chart with ~8-10 bars (one per population). There is no interactivity beyond tooltips. Using native SVG with Vuetify theme colors avoids a dependency and integrates perfectly with dark/light mode theming.

**Implementation sketch:**

```vue
<!-- apps/web/src/components/PopulationChart.vue -->
<template>
  <div class="population-chart">
    <div v-for="pop in sortedPopulations" :key="pop.code" class="chart-row">
      <span class="chart-label">{{ pop.label }}</span>
      <div class="chart-bar-container">
        <div
          class="chart-bar"
          :style="{ width: barWidth(pop.carrierFrequency) }"
          :class="{ 'founder-effect': pop.isFounderEffect }"
        />
      </div>
      <span class="chart-value">{{ formatFrequency(pop.carrierFrequency) }}</span>
    </div>
  </div>
</template>
```

**Data flow:**

```
useCarrierFrequency.populations (Ref<PopulationFrequency[]>)
  -> passed as prop to PopulationChart.vue
  -> rendered as CSS/SVG bars
```

---

## Dependency Graph: Build Order

Features have dependencies on each other. This is the safe build order:

```
                    Independent (no feature deps)
                    /          |           \
            Display Formats  TSV Export  Bar Chart
                 (#10)         (#9)        (#2)
                    \          |
                     v         v
              Quality Flags  Source Breakdown
                   (#12)        (#11)
                                 |
                                 v
                         Subcontinental Pops    Orphanet
                              (#5)               (#6)
```

**Recommended implementation order:**

1. **Display Formats (#10)** -- Foundation. Other features display frequencies.
   - No deps on other features
   - Small scope: 1 core function + 1 store field + UI toggle
   - Enables all subsequent features to use the new format system

2. **TSV Export (#9)** -- Low risk, independent
   - No deps on other features
   - Extends existing export system
   - Pure web-layer change

3. **Bar Chart (#2)** -- Independent UI
   - No deps on other features
   - Consumes existing PopulationFrequency[] data
   - Pure web-layer component

4. **Quality Flags (#12)** -- Enriches variant display
   - No deps on other features (uses existing GnomadVariant data)
   - Extends DisplayVariant type (affects export, variant table)

5. **Source Breakdown (#11)** -- Depends on understanding filter classification
   - Benefits from quality flags being done (shared understanding of variant categories)
   - Extends calculation layer

6. **Orphanet Integration (#6)** -- New external dependency
   - Independent of other features but complex (new API, CORS, caching)
   - Benefits from display format being done

7. **Subcontinental Populations (#5)** -- Most complex, broadest impact
   - Benefits from all other features being stable
   - Touches config, types, calculations, and UI
   - Only available for gnomAD v2 (v4 data not yet released)

---

## Files Modified vs Created

### New Files

| File | Package | Purpose |
|------|---------|---------|
| `core/src/types/quality.ts` | core | QualityFlags interface |
| `core/src/types/orphanet.ts` | core | Orphanet API response types |
| `core/src/filters/variant-quality.ts` | core | Quality flag assessment |
| `core/src/calculations/source-breakdown.ts` | core | Source attribution for carrier frequency |
| `core/src/client/orphanet-client.ts` | core | Orphadata REST API client |
| `web/src/composables/useOrphanetData.ts` | web | Reactive Orphanet data fetching + caching |
| `web/src/components/PopulationChart.vue` | web | Bar chart visualization |
| `web/src/components/OrphanetCard.vue` | web | Orphanet disease/prevalence display |

### Modified Files

| File | Package | What Changes |
|------|---------|--------------|
| `core/src/types/index.ts` | core | Re-export new types (quality, orphanet) |
| `core/src/types/frequency.ts` | core | Add `SourceBreakdown`, optional `subpopulations` field |
| `core/src/types/display.ts` | core | Add `QualityFlags` field to `DisplayVariant` |
| `core/src/types/calculations.ts` | core | Add `DisplayFormat` type |
| `core/src/config/gnomad.json` | core | Add subpopulation arrays for v2 |
| `core/src/config/types.ts` | core | Add optional `subpopulations` to `PopulationConfig` |
| `core/src/config/index.ts` | core | Add subpopulation helper functions |
| `core/src/calculations/formatters.ts` | core | Add `formatFrequencyAs(freq, format)` |
| `core/src/calculations/index.ts` | core | Export source-breakdown module |
| `core/src/filters/variant-display.ts` | core | Integrate quality flags into `toDisplayVariant()` |
| `core/src/filters/index.ts` | core | Export variant-quality module |
| `core/tsdown.config.ts` | core | Potentially add orphanet entry point |
| `web/src/stores/useCalcStore.ts` | web | Add `displayFormat` field |
| `web/src/composables/useCarrierFrequency.ts` | web | Add source breakdown computed |
| `web/src/utils/export-utils.ts` | web | Add TSV builder + export quality flags + source breakdown |
| `web/src/composables/useExport.ts` | web | Add `exportToTsv()` method |
| `web/src/components/wizard/StepResults.vue` | web | Add chart, Orphanet card, format toggle, source display |
| `web/src/components/VariantTable.vue` | web | Render quality flag chips |
| `web/src/components/VariantModal.vue` | web | Add TSV export option |
| `web/src/components/FilterPanel.vue` | web | Add display format toggle |

### Unchanged Files (notable)

| File | Why Unchanged |
|------|---------------|
| `core/src/filters/variant-filters.ts` | Filter logic unchanged -- quality flags are display-only |
| `core/src/calculations/frequency-calc.ts` | Main aggregation unchanged -- subpops use separate function |
| `core/src/queries/gene-variants.ts` | GraphQL query already fetches all population data |
| `web/src/stores/useFilterStore.ts` | No new filter parameters |
| `web/src/stores/useTemplateStore.ts` | Template system not affected |
| `web/src/composables/useGeneVariants.ts` | Variant fetching unchanged |

---

## Core vs Web Boundary Rules

For each new piece of code, here is the boundary test:

| Code | Core or Web? | Why |
|------|-------------|-----|
| `QualityFlags` type | Core | Platform-neutral interface |
| `assessVariantQuality()` | Core | Pure function, no DOM/Vue |
| `SourceBreakdown` type | Core | Platform-neutral interface |
| `calculateSourceBreakdown()` | Core | Pure math function |
| `DisplayFormat` type | Core | Shared enum for CLI too |
| `formatFrequencyAs()` | Core | Pure formatter, CLI uses it |
| Orphanet types | Core | Platform-neutral interfaces |
| Orphanet fetch client | Core | Uses native fetch (no villus) |
| `buildTsvContent()` | Web | TSV is a download format, uses ExportData from core |
| `exportToTsv()` | Web | Triggers DOM download |
| `PopulationChart.vue` | Web | Vue component |
| `OrphanetCard.vue` | Web | Vue component |
| `useOrphanetData` composable | Web | Vue reactivity + caching |
| `displayFormat` store field | Web | Pinia persistence |
| Subpopulation config data | Core | JSON config, shared |

---

## Architecture Patterns to Follow

### Pattern 1: Extend, Do Not Replace

Every feature integrates by extending existing types and adding new functions. No existing function signatures change. This protects the tested calculation pipeline.

Example: `DisplayVariant` gets a new optional field `qualityFlags?: QualityFlags`. All existing code that reads `DisplayVariant` continues to work because the field is optional.

### Pattern 2: Separate Computation, Shared Display

Source breakdown and quality flags are computed separately from the main carrier frequency pipeline, then attached to the result for display. They do NOT inject into `aggregatePopulationFrequenciesWithConfig()`.

### Pattern 3: Progressive Enhancement for Subpopulations

Subcontinental data is only available for gnomAD v2. The UI must degrade gracefully:
- v4: Population table shows top-level groups only (current behavior)
- v2: Population table shows top-level groups with expandable subpopulation rows

The config drives this: `PopulationConfig.subpopulations` is optional. If absent, no expansion is offered.

### Pattern 4: External API as Optional Enrichment

Orphanet data is supplementary. If the API is down, unreachable, or CORS-blocked, the app must work exactly as it does today. The Orphanet card shows "loading", "error", or "no data" states without affecting the core calculation workflow.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Modifying the Aggregation Function for Source Breakdown

Do NOT add source tracking inside `aggregatePopulationFrequenciesWithConfig()`. That function is complex (200+ lines), well-tested, and handles three formula paths (simplified, HWE, VCR/GCR). Adding source tracking would complicate every path.

Instead: Run a separate `calculateSourceBreakdown()` function on the same input variants. It is a parallel computation, not a modification.

### Anti-Pattern 2: Adding Chart Library for a Simple Bar Chart

Do NOT add Chart.js, D3, or similar for ~8 horizontal bars. The overhead (bundle size, theming integration, resize handling) is not justified. Use native CSS/SVG bars that naturally inherit Vuetify theme variables.

### Anti-Pattern 3: Putting Orphanet Client in Web

Do NOT put the Orphanet fetch client in `apps/web`. The CLI will also want disease context. Follow the established pattern: fetch client in `core/client/`, reactive wrapper in `web/composables/`.

### Anti-Pattern 4: Blocking on gnomAD v4 Subpopulations

Do NOT defer subcontinental population work waiting for gnomAD v4 sub-ancestry release. Implement for v2 now. When v4 adds subpopulations, the same config+code structure will work -- just add entries to `gnomad.json` for v4.

---

## Scalability Considerations

| Concern | Current (8 pops) | With Subpopulations (~25 pops) | Mitigation |
|---------|-------------------|-------------------------------|------------|
| Table rows | 9 (global + 8) | ~30 (if all expanded) | Collapsible rows, expand on click |
| Aggregation time | <1ms | <3ms | Negligible -- math is simple |
| API response size | ~200KB for CFTR | Same (subpop data already returned) | No change |
| Export file size | ~50KB JSON | ~80KB with subpops | Still small |
| Orphanet API calls | 0 | 1-3 per gene (cached 30 days) | Caching prevents repeat calls |

---

## Open Questions / Research Flags

1. **Orphanet CORS**: Does `api.orphadata.com` return `Access-Control-Allow-Origin: *`? Must be verified before implementation. If not, need a proxy or pre-fetched data approach.

2. **gnomAD v4 subpopulation timeline**: When will gnomAD v4.x release sub-ancestry groups? This determines whether the v2-only approach is temporary or long-lived.

3. **Quality flag thresholds**: What AN threshold constitutes "low coverage"? What defines "population-specific"? These need clinical domain expert input, not just engineering decisions. Config-driven thresholds recommended.

4. **Source breakdown overlap**: How to handle a variant that is both LoF HC AND ClinVar P/LP? Priority-based classification (LoF HC wins) is the recommendation, but this is a domain decision that should be validated.

---

## Sources

All architectural findings derived from direct source code analysis of the following files:

| File | Key Insight |
|------|-------------|
| `packages/core/src/types/variant.ts` | GnomadVariant shape -- has per-population ac/an/ac_hom arrays |
| `packages/core/src/types/frequency.ts` | PopulationFrequency and CarrierFrequencyResult structure |
| `packages/core/src/types/display.ts` | DisplayVariant -- extension point for quality flags |
| `packages/core/src/types/export.ts` | ExportData -- TSV can reuse this structure directly |
| `packages/core/src/filters/variant-filters.ts` | Classification functions available for source breakdown |
| `packages/core/src/filters/variant-display.ts` | toDisplayVariant() -- integration point for quality flags |
| `packages/core/src/calculations/frequency-calc.ts` | Aggregation function -- should NOT be modified |
| `packages/core/src/calculations/formatters.ts` | Existing formatters -- extension point for display formats |
| `packages/core/src/config/gnomad.json` | Population config structure -- extension point for subpops |
| `packages/core/src/config/types.ts` | PopulationConfig -- needs optional subpopulations field |
| `packages/core/tsdown.config.ts` | Entry points -- may need orphanet addition |
| `apps/web/src/composables/useCarrierFrequency.ts` | Singleton orchestrator -- add source breakdown computed |
| `apps/web/src/components/wizard/StepResults.vue` | Primary results display -- multiple integration points |
| `apps/web/src/components/VariantTable.vue` | Variant display -- quality flags rendering |
| `apps/web/src/utils/export-utils.ts` | Export builder -- TSV extension point |
| `apps/web/src/stores/useCalcStore.ts` | Calc preferences -- add displayFormat |
| `packages/core/src/queries/gene-variants.ts` | GraphQL query already fetches all population data |

External sources:
- [gnomAD v4.0 release announcement](https://gnomad.broadinstitute.org/news/2023-11-gnomad-v4-0/) - Confirmed subcontinental pops not in v4
- [gnomAD ancestry documentation](https://gnomad.broadinstitute.org/help/ancestry) - Population structure reference
- [Orphadata API GitHub](https://github.com/Orphanet/API_Orphadata) - API architecture and endpoints
- [Orphadata API](https://api.orphadata.com/) - Verified endpoint paths for gene-disease and prevalence queries
