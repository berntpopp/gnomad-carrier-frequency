# Phase 34: Quality Flags & Source Breakdown - Research

**Researched:** 2026-02-26
**Domain:** Vue 3 + Vuetify 3 UI enrichment, TypeScript core logic extension
**Confidence:** HIGH

## Summary

This phase adds quality transparency and source attribution to existing variant data — no new API calls, no new data sources. The research focused on the existing codebase architecture to understand exactly where new logic slots in and what patterns to follow.

The codebase is already well-structured for this extension. The filter pipeline (`shouldIncludeVariantConfigurable`) must not be touched (SRC-05). Quality flagging and source classification are pure functions that operate on `GnomadVariant` + `ClinVarVariant` data that is already in memory. The existing `useExclusionState` singleton handles per-variant manual exclusion; quality flag exclusion is a separate, flag-type-level concern that needs a new Pinia store.

The Vuetify `v-tooltip` with `#activator` slot pattern is used pervasively in this codebase and is the correct pattern for the warning icon + tooltip interaction. The `v-data-table` `expanded-row` template slot is already used for per-variant detail expansion; the population breakdown source split will use a different mechanism (expandable rows in the population table via `v-data-table`'s `show-expand` feature or a custom click-expand pattern already established in `StepResults.vue`).

**Primary recommendation:** Build quality flags and source classification as pure functions in `@gnomad-cf/core`, add a `useQualityStore` Pinia store for persisted settings, and wire UI into existing VariantTable + FilterPanel + SettingsDialog components following established patterns.

## Standard Stack

No new libraries required. Everything needed is already installed.

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vue 3 | ^3.5.24 | Reactivity, components | Project standard |
| Vuetify | ^3.8.1 | UI components (v-tooltip, v-chip, v-slider, v-tabs) | Project standard |
| Pinia | ^3.0.4 | State management with persistence | Project standard |
| pinia-plugin-persistedstate | ^4.7.1 | localStorage persistence | Already used by all stores |
| @vueuse/core | ^12.7.0 | watchDebounced and other utilities | Already used in useCarrierFrequency |
| TypeScript 5.9 | ~5.9 | Type safety | Project standard |

### No new dependencies needed
All required functionality — tooltips, sliders, tabs, chips, toggles — are already provided by Vuetify 3. The quality flagging math (HWE-relative homozygote check) is pure TypeScript with no library dependency.

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure for Phase 34 additions

```
packages/core/src/
├── filters/
│   ├── variant-filters.ts        # EXISTING — do NOT modify shouldIncludeVariantConfigurable
│   ├── variant-display.ts        # EXISTING — toDisplayVariant needs qualityFlags + sourceCategory
│   ├── quality-flags.ts          # NEW — pure functions: computeQualityFlags, isHighAF, isHighHom, etc.
│   └── source-classification.ts  # NEW — pure function: classifyVariantSource
├── types/
│   ├── display.ts                # EXTEND — add QualityFlag, SourceCategory to DisplayVariant
│   └── quality.ts                # NEW — QualityFlagType, QualityFlagResult, QualitySettings types

apps/web/src/
├── stores/
│   └── useQualityStore.ts        # NEW — QualitySettings defaults, persisted
├── components/
│   ├── VariantTable.vue          # MODIFY — add quality flag icon column + source badge column
│   ├── FilterPanel.vue           # MODIFY — add quality exclusion toggles section
│   └── SettingsDialog.vue        # MODIFY — add 4th "Quality" tab
└── composables/
    └── useCarrierFrequency.ts    # MODIFY — apply quality exclusions to pathogenicVariants
```

### Pattern 1: Pure Function Quality Flags (in @gnomad-cf/core)

**What:** Stateless functions that take a variant and return flags. These live in core, not web.
**When to use:** All quality logic — `isHighAF`, `isHighHom`, `computeQualityFlags`.

```typescript
// Source: codebase pattern (variant-filters.ts)
// packages/core/src/filters/quality-flags.ts

export type QualityFlagType = 'high_af' | 'high_hom' | 'gnomad_filtered' | 'genomes_only';

export interface QualityFlag {
  type: QualityFlagType;
  label: string;        // e.g., "High AF (BA1)"
  explanation: string;  // tooltip text
  severity: 'critical' | 'warning' | 'info';
}

export interface QualitySettings {
  highAfEnabled: boolean;
  highAfThreshold: number;      // default 0.05 (5% = ACMG BA1)
  highHomEnabled: boolean;
  highHomMethod: 'hwe_relative' | 'absolute';
  highHomAbsoluteThreshold: number;  // fallback if absolute method
  highHomHWEMultiplier: number;      // e.g., 5.0 — flag if hom > multiplier × expected
  gnomadFilteredEnabled: boolean;
  genomesOnlyEnabled: boolean;
}

export const FACTORY_QUALITY_DEFAULTS: QualitySettings = {
  highAfEnabled: true,
  highAfThreshold: 0.05,
  highHomEnabled: true,
  highHomMethod: 'hwe_relative',
  highHomAbsoluteThreshold: 10,
  highHomHWEMultiplier: 5.0,
  gnomadFilteredEnabled: true,
  genomesOnlyEnabled: true,
};

export function computeQualityFlags(
  variant: GnomadVariant,
  settings: QualitySettings,
): QualityFlag[] { ... }
```

### Pattern 2: Source Classification (in @gnomad-cf/core)

**What:** A separate function that classifies each variant's evidence source without touching the filter pipeline.
**When to use:** Computing the `sourceCategory` badge on each variant.

```typescript
// Source: codebase pattern (variant-filters.ts — isHighConfidenceLoF, isPathogenicClinVar)
// packages/core/src/filters/source-classification.ts

export type SourceCategory = 'clinvar_only' | 'plof_only' | 'both';

export function classifyVariantSource(
  variant: GnomadVariant,
  clinvarVariants: ClinVarVariant[],
  filterConfig: FilterConfig,
): SourceCategory {
  const isLoF = variant.transcript_consequence
    ? isHighConfidenceLoF(variant.transcript_consequence)
    : false;
  const clinvarMatch = clinvarVariants.find(cv => cv.variant_id === variant.variant_id);
  const isClinvar = clinvarMatch ? isPathogenicClinVar(clinvarMatch) : false;

  if (isLoF && isClinvar) return 'both';
  if (isLoF) return 'plof_only';
  return 'clinvar_only';
}
```

### Pattern 3: DisplayVariant Extension

**What:** Add `qualityFlags` and `sourceCategory` to `DisplayVariant` so the table can render them.
**When to use:** `toDisplayVariant` in `variant-display.ts` already computes `isLoF`, `isClinvarPathogenic`, etc. Add the new fields to the same function.

```typescript
// Source: packages/core/src/types/display.ts (existing pattern)
export interface DisplayVariant {
  // ... existing fields ...
  /** Quality flags raised for this variant */
  qualityFlags: QualityFlag[];
  /** Source classification (ClinVar-only, pLoF-only, or both) */
  sourceCategory: SourceCategory;
}
```

The `toDisplayVariant` function signature will need `QualitySettings` added as a parameter, or quality flags can be computed separately by a composable/component.

**Decision:** Compute quality flags OUTSIDE `toDisplayVariant` to keep core types stable. Pass flags as a derived Map keyed by `variant_id` to the VariantTable component prop.

### Pattern 4: Pinia Store for Quality Settings

**What:** A new `useQualityStore` following the exact pattern of `useFilterStore` and `useCalcStore`.
**When to use:** Storing global quality flag defaults with localStorage persistence.

```typescript
// Source: apps/web/src/stores/useFilterStore.ts (follow this exact pattern)
// apps/web/src/stores/useQualityStore.ts

import { defineStore } from 'pinia';
import type { QualitySettings } from '@gnomad-cf/core/filters';
import { FACTORY_QUALITY_DEFAULTS } from '@gnomad-cf/core/filters';

export const useQualityStore = defineStore('quality-settings', {
  state: (): { defaults: QualitySettings } => ({
    defaults: { ...FACTORY_QUALITY_DEFAULTS },
  }),
  actions: {
    setDefaults(partial: Partial<QualitySettings>) {
      this.defaults = { ...this.defaults, ...partial };
    },
    resetToFactoryDefaults() {
      this.defaults = { ...FACTORY_QUALITY_DEFAULTS };
    },
  },
  persist: {
    key: 'carrier-freq-quality',
    storage: localStorage,
  },
});
```

### Pattern 5: Quality Exclusions in useCarrierFrequency

**What:** Quality flag exclusions filter variants AFTER pathogenicity filtering, complementing manual exclusions.
**When to use:** The existing `pathogenicVariants` computed already filters out `debouncedExcluded`. Quality flag exclusions add another layer.

```typescript
// Source: apps/web/src/composables/useCarrierFrequency.ts (existing pattern)

// NEW: quality exclusion computed
const qualityExcludedIds = computed((): Set<string> => {
  const excluded = new Set<string>();
  const qualityDefaults = qualityStore.defaults; // per-analysis override from FilterPanel
  for (const variant of filteredByPathogenicity.value) {
    const flags = computeQualityFlags(variant, qualityDefaults);
    if (shouldExcludeByQuality(flags, qualityExclusionConfig.value)) {
      excluded.add(variant.variant_id);
    }
  }
  return excluded;
});

// pathogenicVariants then filters out BOTH manual exclusions AND quality exclusions
const pathogenicVariants = computed(() => {
  return filteredByPathogenicity.value.filter(v =>
    !debouncedExcluded.value.has(v.variant_id) &&
    !qualityExcludedIds.value.has(v.variant_id)
  );
});
```

**Key insight:** Quality exclusion state lives in FilterPanel (per-analysis) and is initialized from QualityStore (global defaults). It is separate from ExclusionState (manual per-variant checkboxes).

### Pattern 6: v-tooltip with activator (Vuetify 3)

The project already uses this pattern extensively. The warning icon in the variant table must use the same approach.

```vue
<!-- Source: apps/web/src/components/wizard/StepResults.vue (existing pattern) -->
<v-tooltip location="top">
  <template #activator="{ props: tooltipProps }">
    <v-btn
      v-bind="tooltipProps"
      icon
      size="x-small"
      :color="flagSeverityColor(flags)"
      density="compact"
    >
      <v-badge :content="flags.length" color="error" floating>
        <v-icon>mdi-alert</v-icon>
      </v-badge>
    </v-btn>
  </template>
  <!-- Tooltip content: list all flags -->
  <div class="tooltip-text">
    <div v-for="flag in flags" :key="flag.type">
      <strong>{{ flag.label }}</strong><br />
      {{ flag.explanation }}
    </div>
  </div>
</v-tooltip>
```

### Pattern 7: SettingsDialog Tab Addition

The `SettingsDialog.vue` uses `v-tabs` + `v-tabs-window`. Adding a 4th "Quality" tab follows the exact existing pattern.

```vue
<!-- Source: apps/web/src/components/SettingsDialog.vue (existing pattern) -->
<v-tabs v-model="activeTab">
  <v-tab value="general">General</v-tab>
  <v-tab value="filters">Filters</v-tab>
  <v-tab value="templates">Templates</v-tab>
  <v-tab value="quality">Quality</v-tab>  <!-- NEW -->
</v-tabs>
```

The Quality tab content uses `v-card variant="outlined"` card-style sections (same as existing tabs), one per flag type: High AF (slider + toggle), High Hom (toggle + method selector + multiplier slider), gnomAD Filtered (toggle only), Genomes Only (toggle only).

### Anti-Patterns to Avoid

- **Modifying `shouldIncludeVariantConfigurable`:** SRC-05 explicitly forbids this. Source classification and quality flags are read-only decorations on already-included variants.
- **Computing quality flags in the template:** Flags require access to `GnomadVariant` raw data (for `hom_count`, `AN`, `exome`/`genome` presence). The `DisplayVariant` type only has the flattened view. Quality flags must be computed from raw `GnomadVariant` data before display.
- **Storing quality exclusion state in `useExclusionState`:** The existing exclusion state is for manual per-variant checkboxes. Quality exclusions are per-flag-type toggles. Keep them separate.
- **Making quality flags part of the pathogenicity filter:** They are informational flags on variants that already passed filtering.
- **Adding quality flag computation to `toDisplayVariant`:** That function is in `@gnomad-cf/core` and would require `QualitySettings` parameter threading. Instead, compute flags separately in a composable with access to both raw variants and quality store.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tooltip with icon trigger | Custom popover component | `v-tooltip` with `#activator` slot | Already used 10+ times in codebase |
| Badge count on icon | Custom CSS badge | `v-badge` from Vuetify | Standard Vuetify component |
| Slider with configurable range | Custom range input | `v-slider` with `:min`, `:max`, `:step` | Already used for HWE, penetrance, star threshold |
| Tab navigation | Custom tab components | `v-tabs` + `v-tabs-window` | Established pattern in SettingsDialog |
| localStorage persistence | Manual JSON.stringify/parse | `pinia-plugin-persistedstate` | All stores already use `persist: { key, storage: localStorage }` |
| Expandable table rows | Custom accordion | `v-data-table` `show-expand` prop or click handler | Already demonstrated in VariantTable (expanded-row slot) |
| Colored chips | Custom badge components | `v-chip` with `color` prop + `variant="tonal"` | Extensively used in VariantTable and FilterPanel |

**Key insight:** The entire UI vocabulary for this feature already exists in the codebase. New components should be composites of existing Vuetify primitives following established patterns.

## Common Pitfalls

### Pitfall 1: Genomes Only Flag — What Data to Check

**What goes wrong:** Checking `variant.genome !== undefined` is insufficient. gnomAD v4 uses `joint` data. A variant could have `joint` data (combining exome + genome) but no separate `genome` entry.
**Why it happens:** The "Genomes Only" flag means no exome coverage — the variant was only observed in genome sequencing. This is available from gnomAD's `exome` field being absent/null.
**How to avoid:** Flag as "Genomes Only" when `variant.exome === undefined || variant.exome === null` (no exome data) while `variant.genome !== undefined && variant.genome !== null`.
**Warning signs:** Test with a variant that has `joint` data but no `exome` sub-object.

### Pitfall 2: HWE-Relative Homozygote Check — Expected vs Observed

**What goes wrong:** The HWE-relative method flags variants where observed homozygotes exceed HWE expectation. The formula is: `expected_hom = AF^2 * AN`. But `AF` and `AN` here must come from the same data source (joint preferred).
**Why it happens:** Mixing exome `AN` with joint `AF` gives nonsensical expected counts.
**How to avoid:**
```typescript
// Source: packages/core/src/calculations/frequency-calc.ts (joint-first pattern)
function isHighHom(variant: GnomadVariant, settings: QualitySettings): boolean {
  // Prefer joint data (gnomAD v4)
  const ac = variant.joint?.ac ?? ((variant.exome?.ac ?? 0) + (variant.genome?.ac ?? 0));
  const an = variant.joint?.an ?? ((variant.exome?.an ?? 0) + (variant.genome?.an ?? 0));
  const acHom = variant.joint?.homozygote_count
    ?? ((variant.exome?.ac_hom ?? 0) + (variant.genome?.ac_hom ?? 0));

  if (an === 0) return false;
  const af = ac / an;
  const expectedHom = af * af * an;
  return acHom > expectedHom * settings.highHomHWEMultiplier;
}
```
**Warning signs:** Flags showing up on very common variants, or no flags on variants with many observed homozygotes.

### Pitfall 3: High AF Check — Per-Population vs Global

**What goes wrong:** The ACMG BA1 criterion (AF >= 5%) should be checked against the GLOBAL allele frequency (any population), not just the combined global. A variant with 8% frequency in one population and 0.1% globally would still fail BA1 for that population.
**Why it happens:** Using only the combined global `joint.ac / joint.an` misses population-specific high frequencies.
**How to avoid:** Check global AF first, then also check per-population maximums. The user-facing explanation should say "in any population".
**Warning signs:** Variants with known population-specific high frequencies (e.g., founder variants) not being flagged.

### Pitfall 4: Quality Exclusion Count Display — "Excluding N variants"

**What goes wrong:** The count shown in "Excluding N variants (High AF)" must be computed from the flag-excluded set, NOT from the manually excluded set.
**Why it happens:** Both quality exclusions and manual exclusions reduce `pathogenicVariants`. Conflating them shows the wrong count.
**How to avoid:** Track quality exclusion count separately from `useExclusionState.excludedCount`. Create `qualityExcludedCount` as a separate computed.

### Pitfall 5: Source Classification for Missense Variants

**What goes wrong:** Missense variants that have ClinVar P/LP evidence are included by `shouldIncludeVariantConfigurable`. Their source should be `'clinvar_only'` even if they also happen to have `lof: 'LC'` (low confidence) annotation.
**Why it happens:** The source classification must mirror why the variant was included, not just what biological annotations it has.
**How to avoid:** Classify source based on the same criteria as `shouldIncludeVariantConfigurable`:
- `isHighConfidenceLoF(tc)` → counts as pLoF source
- `isPathogenicClinVar(clinvarMatch)` → counts as ClinVar source
- Both → 'both'
**Warning signs:** Missense variants showing `'both'` when they should be `'clinvar_only'`.

### Pitfall 6: SettingsDialog max-width for Quality Tab

**What goes wrong:** The `dialogMaxWidth` computed in `SettingsDialog.vue` returns 900 for templates, 600 for others. The Quality tab with grouped card sections may need 700 or the existing 600 is fine.
**Why it happens:** The tab-specific width logic: `activeTab.value === "templates" ? 900 : 600`.
**How to avoid:** Check if Quality tab needs wider dialog for sliders, or leave at 600 and rely on compact layout. The existing sliders (star threshold, penetrance) work fine at 600.

### Pitfall 7: FilterPanel per-analysis overrides need local state

**What goes wrong:** Quality flag exclusions in FilterPanel are "per-analysis overrides" — they should start from QualityStore defaults but be local to the current analysis, not persist back to the store on every toggle.
**Why it happens:** The FilterPanel follows `v-model` / emit pattern (see `FilterConfig` in FilterPanel). Quality exclusion state needs the same pattern — local state initialized from store, saved only when user explicitly saves.
**How to avoid:** Create `qualityExclusionConfig` as a local `ref` in `StepResults.vue` or `useCarrierFrequency`, initialized from `qualityStore.defaults`, mutated by FilterPanel toggles without writing back to store.

## Code Examples

### Quality Flag Logic (HWE-Relative Homozygote)

```typescript
// packages/core/src/filters/quality-flags.ts
// Source: derived from frequency-calc.ts joint-first pattern

export function computeQualityFlags(
  variant: GnomadVariant,
  settings: QualitySettings,
): QualityFlag[] {
  const flags: QualityFlag[] = [];

  // Use joint data (gnomAD v4) preferentially — same pattern as carrier-frequency.ts
  const ac = variant.joint?.ac ?? ((variant.exome?.ac ?? 0) + (variant.genome?.ac ?? 0));
  const an = variant.joint?.an ?? ((variant.exome?.an ?? 0) + (variant.genome?.an ?? 0));
  const acHom = variant.joint?.homozygote_count
    ?? ((variant.exome?.ac_hom ?? 0) + (variant.genome?.ac_hom ?? 0));

  const globalAF = an > 0 ? ac / an : 0;

  // QUAL-01: High AF (ACMG BA1)
  if (settings.highAfEnabled && globalAF >= settings.highAfThreshold) {
    flags.push({
      type: 'high_af',
      label: 'High AF (BA1)',
      explanation: `Allele frequency ${(globalAF * 100).toFixed(1)}% exceeds the ${(settings.highAfThreshold * 100).toFixed(0)}% BA1 threshold. This variant may be too common to cause a rare recessive disease.`,
      severity: 'critical',
    });
  }

  // QUAL-02: High Homozygote Count (HWE-relative)
  if (settings.highHomEnabled && an > 0) {
    const expectedHom = globalAF * globalAF * an;
    if (acHom > expectedHom * settings.highHomHWEMultiplier) {
      flags.push({
        type: 'high_hom',
        label: 'High Hom',
        explanation: `Observed homozygotes (${acHom}) exceed ${settings.highHomHWEMultiplier}× the HWE-expected count (${expectedHom.toFixed(1)}). This may indicate selection bias, data artifact, or recessive disease enrichment.`,
        severity: 'warning',
      });
    }
  }

  // QUAL-03: gnomAD Filtered — variant failed gnomAD QC filters
  // gnomAD quality filter info is available as variant.filters (check API schema)
  // NOTE: Need to verify field name in actual gnomAD GraphQL response
  if (settings.gnomadFilteredEnabled /* && variant.filters?.length > 0 */) {
    // Implementation depends on gnomAD API response shape for filter flags
  }

  // QUAL-04: Genomes Only — no exome data
  if (settings.genomesOnlyEnabled) {
    const hasExome = variant.exome !== null && variant.exome !== undefined && variant.exome.an > 0;
    const hasGenome = variant.genome !== null && variant.genome !== undefined && variant.genome.an > 0;
    if (!hasExome && hasGenome) {
      flags.push({
        type: 'genomes_only',
        label: 'Genomes Only',
        explanation: 'This variant was observed only in genome sequencing data, not exomes. Coverage and quality may differ from exome-sequenced variants.',
        severity: 'info',
      });
    }
  }

  return flags;
}
```

### Warning Icon Column in VariantTable

```vue
<!-- apps/web/src/components/VariantTable.vue — new column slot -->
<template #[`item.qualityFlags`]="{ item }">
  <v-tooltip v-if="getQualityFlags(item.variant_id).length > 0" location="top">
    <template #activator="{ props: tooltipProps }">
      <v-badge
        v-bind="tooltipProps"
        :content="getQualityFlags(item.variant_id).length"
        :color="flagBadgeColor(getQualityFlags(item.variant_id))"
        inline
      >
        <v-icon :color="flagBadgeColor(getQualityFlags(item.variant_id))" size="small">
          mdi-alert
        </v-icon>
      </v-badge>
    </template>
    <div class="tooltip-text" style="max-width: 320px">
      <div
        v-for="flag in getQualityFlags(item.variant_id)"
        :key="flag.type"
        class="mb-1"
      >
        <strong>{{ flag.label }}</strong><br />
        <span class="text-caption">{{ flag.explanation }}</span>
      </div>
    </div>
  </v-tooltip>
</template>
```

### Severity Color Mapping

```typescript
// Severity → Vuetify color (within red/orange/yellow/blue palette per CONTEXT.md)
export function flagSeverityColor(severity: 'critical' | 'warning' | 'info'): string {
  switch (severity) {
    case 'critical': return 'error';     // red — High AF
    case 'warning':  return 'warning';   // orange — High Hom
    case 'info':     return 'blue-grey'; // blue/grey — Genomes Only
    default:         return 'warning';
  }
}

// gnomAD Filtered gets yellow (warning between orange and yellow)
// Map: high_af=error, high_hom=warning, gnomad_filtered=amber, genomes_only=blue-grey
```

### Source Badge in VariantTable

```vue
<!-- Source badge column — same tooltip pattern as quality flags -->
<template #[`item.sourceCategory`]="{ item }">
  <v-tooltip location="top">
    <template #activator="{ props: tooltipProps }">
      <v-chip
        v-bind="tooltipProps"
        :color="sourceCategoryColor(item.sourceCategory)"
        size="x-small"
        variant="tonal"
      >
        {{ sourceCategoryLabel(item.sourceCategory) }}
      </v-chip>
    </template>
    <span class="tooltip-text">{{ sourceCategoryExplanation(item.sourceCategory) }}</span>
  </v-tooltip>
</template>

<script setup>
function sourceCategoryColor(cat: SourceCategory): string {
  switch (cat) {
    case 'clinvar_only': return 'blue';
    case 'plof_only':    return 'deep-purple';
    case 'both':         return 'green';
  }
}

function sourceCategoryLabel(cat: SourceCategory): string {
  switch (cat) {
    case 'clinvar_only': return 'ClinVar';
    case 'plof_only':    return 'pLoF';
    case 'both':         return 'Both';
  }
}
</script>
```

### Summary Count Enhancement

The `StepResults.vue` already has this line:
```vue
Based on {{ filteredCount }} qualifying variant(s)
<span v-if="excludedCount > 0" class="ml-1 text-warning">
  ({{ excludedCount }} manually excluded)
</span>
```

Extend it to also show quality-excluded count:
```vue
Based on {{ filteredCount }} qualifying variant(s)
<span v-if="qualityExcludedCount > 0" class="ml-1 text-warning">
  ({{ qualityExcludedCount }} quality-flagged excluded)
</span>
<span v-if="excludedCount > 0" class="ml-1 text-medium-emphasis">
  ({{ excludedCount }} manually excluded)
</span>
```

### Per-Population Source Split in Population Table

The population table row click already opens a modal. The "expandable population rows" with source breakdown adds a sub-table within the expanded row. Use a map keyed by `populationCode` + `sourceCategory`:

```typescript
// Computed: for each population × source, compute carrier frequency
// This requires filtering pathogenicVariants by source, then computing CF per population

interface PopulationSourceRow {
  sourceCategory: SourceCategory;
  label: string;
  carrierFrequency: number | null;
  variantCount: number;
}

function getPopulationSourceBreakdown(
  populationCode: string,
  variants: GnomadVariant[],
  clinvarVariants: ClinVarVariant[],
  filterConfig: FilterConfig,
  calcConfig: CalcConfig,
): PopulationSourceRow[] { ... }
```

This is a non-trivial computed that groups variants by source, then runs the population carrier frequency calculation per group.

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| No quality flags | Quality flags as pure functions in core | Planner builds new `quality-flags.ts` file |
| No source attribution | Source classification separate from filter pipeline | SRC-05 preserved |
| Manual exclusions only | Manual + quality-flag exclusions, two separate concerns | Needs two exclusion tracking systems |

**Deprecated/outdated:**
- None in this codebase — it is current.

## Open Questions

1. **gnomAD Filtered Flag (QUAL-03) — Query extension required (CONFIRMED)**
   - What we know: Inspected `packages/core/src/queries/gene-variants.ts` directly. The current `GENE_VARIANTS_QUERY` does NOT fetch a `filters` field on variants. The `GnomadVariant` type in `packages/core/src/types/variant.ts` has no `filters` field. gnomAD variants that fail quality filters (RF, AC0, InbreedingCoeff, allele_balance_het) have filter flags in the gnomAD API — they are just not currently fetched.
   - What is required: Add `filters` to the GraphQL query for both `exome { ... }` and `genome { ... }` sub-objects. Add `filters?: string[]` to the exome/genome sub-object types in `GnomadVariant`. This is the ONLY data pipeline change in this phase — all other quality flags (High AF, High Hom, Genomes Only) use data already fetched.
   - Recommendation: Add `filters` field to exome and genome blocks in `GENE_VARIANTS_QUERY`. Update `GnomadVariant` type. Flag logic checks `variant.exome?.filters?.length > 0 || variant.genome?.filters?.length > 0`.

2. **HWE Multiplier default value**
   - What we know: CONTEXT.md leaves the multiplier value to Claude's discretion.
   - Recommendation: Use 5.0 as the multiplier (flag if observed hom > 5× expected). This is conservative enough to avoid false positives on common variants while catching genuinely anomalous homozygote counts. A value of 10× would miss many real cases; 2× would flag too many. 5× is a reasonable clinical threshold.

3. **Per-population source breakdown computation complexity**
   - What we know: The source breakdown requires grouping pathogenic variants by source category, then computing carrier frequency per group per population — essentially running the aggregation function 3 times (once per source).
   - What's unclear: Whether this is precomputed in `useCarrierFrequency` or computed on-demand when a population row is expanded.
   - Recommendation: Compute on-demand (lazy) since most users won't expand all population rows. Use a `computed` map keyed by population code that computes breakdown only when accessed.

4. **Quality tab in SettingsDialog — dialog max-width**
   - What we know: Current template tab uses 900px, others use 600px.
   - Recommendation: Quality tab at 600px is sufficient. Sliders and toggles fit fine in the existing 600px layout as proven by the Filters tab.

## Sources

### Primary (HIGH confidence)
- Codebase inspection — `packages/core/src/queries/gene-variants.ts` — GENE_VARIANTS_QUERY (no filters field fetched)
- Codebase inspection — `packages/core/src/types/variant.ts` — GnomadVariant type (no `filters` field)
- Codebase inspection — `packages/core/src/filters/variant-filters.ts` — existing filter pipeline
- Codebase inspection — `packages/core/src/filters/variant-display.ts` — toDisplayVariant pattern
- Codebase inspection — `packages/core/src/calculations/frequency-calc.ts` — joint-first data access pattern
- Codebase inspection — `apps/web/src/components/VariantTable.vue` — v-data-table column slot pattern
- Codebase inspection — `apps/web/src/components/SettingsDialog.vue` — tab structure
- Codebase inspection — `apps/web/src/components/FilterPanel.vue` — existing exclusion controls
- Codebase inspection — `apps/web/src/composables/useCarrierFrequency.ts` — quality exclusion integration point
- Codebase inspection — `apps/web/src/composables/useExclusionState.ts` — singleton exclusion pattern
- Codebase inspection — `apps/web/src/stores/useFilterStore.ts` — Pinia store pattern with persist
- Codebase inspection — `apps/web/src/components/wizard/StepResults.vue` — v-tooltip pattern, population table

### Secondary (MEDIUM confidence)
- ACMG/AMP variant classification guidelines — BA1 criterion: allele frequency ≥5% in any well-powered general population is stand-alone benign. Default 5% threshold is clinically grounded.
- Hardy-Weinberg Equilibrium principle — `expected_hom = q^2 × N` formula is standard population genetics.

### Tertiary (LOW confidence)
- HWE multiplier of 5× for flagging — derived from general clinical judgment, not a published standard. Planner should treat as adjustable default.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, all existing
- Architecture: HIGH — derived from direct codebase reading
- Pitfalls: HIGH for pitfalls 1-5 (codebase-derived), MEDIUM for pitfall 6-7 (UI judgment)
- gnomAD filters field: HIGH — confirmed query extension needed (exome/genome filters field missing from query and type)

**Research date:** 2026-02-26
**Valid until:** 2026-03-28 (stable codebase, 30-day window)
