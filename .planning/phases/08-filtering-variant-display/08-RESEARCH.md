# Phase 8: Filtering + Variant Display - Research

**Researched:** 2026-01-19
**Domain:** Vue 3 UI components (Vuetify 3), reactive filter state management, gnomAD variant data
**Confidence:** HIGH

## Summary

Phase 8 adds user-configurable variant filters and a variant detail modal to the existing carrier frequency calculation workflow. The current implementation has hardcoded filters in `variant-filters.ts`; this phase makes them configurable via UI controls with real-time feedback.

The research confirms:
1. **Vuetify 3 provides all required components** - `v-data-table` for sortable/expandable variant lists, `v-dialog` for modals, `v-slider` for star threshold, `v-expansion-panels` or custom collapsible for filter panel
2. **Pinia with Vue 3 reactivity** enables immediate filter updates via computed properties
3. **gnomAD GraphQL API** provides all needed fields for variant display; HGVS fields require extending the current query
4. **SettingsDialog.vue already has a "Filters" tab placeholder** - ready for filter defaults configuration

**Primary recommendation:** Create a dedicated filter composable (`useVariantFilters`) that wraps `variant-filters.ts` with reactive filter state, integrates with settings store for defaults, and provides filtered variants as computed properties for real-time updates.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vuetify | ^3.8.1 | UI components (data table, dialog, slider, chips) | Already in project, provides all needed components |
| Pinia | ^3.0.4 | State management for filter defaults | Already in project with persistence plugin |
| Vue | ^3.5.24 | Reactive computed properties for real-time updates | Core framework |

### Supporting (Already Installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @vueuse/core | ^12.7.0 | `useStorage`, `useDebounceFn` utilities | Debounce filter changes if needed |
| pinia-plugin-persistedstate | ^4.7.1 | Persist filter defaults | Already configured |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| v-expansion-panels | Custom collapsible with v-expand-transition | More control over styling but more code |
| v-data-table | v-simple-table | Less features, would need manual sorting |
| Pinia filter store | Composable-only state | Store enables persistence, composable does not |

**Installation:**
No new packages needed. All required components are already in the project.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── composables/
│   └── useVariantFilters.ts     # NEW: Reactive filter state + filtering logic
├── stores/
│   └── useFilterStore.ts        # NEW: Persistent filter defaults
├── components/
│   ├── FilterPanel.vue          # NEW: Collapsible filter controls
│   ├── FilterChips.vue          # NEW: Collapsed filter summary chips
│   ├── VariantModal.vue         # NEW: Large variant detail dialog
│   └── VariantTable.vue         # NEW: Sortable data table for variants
├── utils/
│   └── variant-filters.ts       # EXTEND: Add configurable filter functions
└── types/
    └── filter.ts                # NEW: Filter configuration types
```

### Pattern 1: Filter Composable with Reactive State

**What:** A composable that manages filter state and provides filtered variants as computed properties
**When to use:** When filter changes should immediately update results without explicit "apply"
**Example:**
```typescript
// Source: Pinia documentation pattern
import { computed, ref, type Ref } from 'vue';
import { useFilterStore } from '@/stores/useFilterStore';

export interface FilterConfig {
  lofHcEnabled: boolean;
  missenseEnabled: boolean;
  clinvarEnabled: boolean;
  clinvarStarThreshold: number; // 0-4
}

export function useVariantFilters(
  variants: Ref<GnomadVariant[]>,
  clinvarVariants: Ref<ClinVarVariant[]>
) {
  const filterStore = useFilterStore();

  // Local filter state (can override defaults)
  const filters = ref<FilterConfig>({ ...filterStore.defaults });

  // Filtered variants - computed, updates automatically
  const filteredVariants = computed(() => {
    return filterPathogenicVariants(
      variants.value,
      clinvarVariants.value,
      filters.value
    );
  });

  // Reset to defaults
  const resetFilters = () => {
    filters.value = { ...filterStore.defaults };
  };

  return {
    filters,
    filteredVariants,
    filteredCount: computed(() => filteredVariants.value.length),
    resetFilters,
  };
}
```

### Pattern 2: Filter Store with Persistence

**What:** Pinia store for persisted filter defaults, separate from per-calculation overrides
**When to use:** User preferences that persist across sessions
**Example:**
```typescript
// Source: Existing useTemplateStore.ts pattern in codebase
import { defineStore } from 'pinia';

interface FilterDefaults {
  lofHcEnabled: boolean;
  missenseEnabled: boolean;
  clinvarEnabled: boolean;
  clinvarStarThreshold: number;
}

export const useFilterStore = defineStore('filters', {
  state: (): { defaults: FilterDefaults } => ({
    defaults: {
      lofHcEnabled: true,
      missenseEnabled: false,
      clinvarEnabled: true,
      clinvarStarThreshold: 1,
    },
  }),

  actions: {
    setDefaults(newDefaults: Partial<FilterDefaults>) {
      Object.assign(this.defaults, newDefaults);
    },
    resetToFactoryDefaults() {
      this.defaults = {
        lofHcEnabled: true,
        missenseEnabled: false,
        clinvarEnabled: true,
        clinvarStarThreshold: 1,
      };
    },
  },

  persist: {
    key: 'carrier-freq-filters',
    storage: localStorage,
  },
});
```

### Pattern 3: Vuetify Data Table with Sortable Columns

**What:** v-data-table with custom headers for sortable, expandable variant display
**When to use:** Displaying variant list with sorting and expansion capability
**Example:**
```typescript
// Source: Vuetify 3 data table documentation
const headers = ref([
  { title: 'Variant ID', key: 'variant_id', sortable: true },
  { title: 'Consequence', key: 'consequence', sortable: true },
  { title: 'Allele Freq', key: 'allele_frequency', sortable: true, align: 'end' },
  { title: 'ClinVar', key: 'clinvar_status', sortable: true },
  { title: 'Stars', key: 'gold_stars', sortable: true, align: 'center' },
  { title: 'HGVS-c', key: 'hgvsc', sortable: false },
  { title: 'HGVS-p', key: 'hgvsp', sortable: false },
  { key: 'data-table-expand', title: '' }, // Expandable row trigger
]);
```

### Pattern 4: Large Responsive Dialog

**What:** v-dialog with width constraints and fullscreen on mobile
**When to use:** Variant modal that needs to show many columns
**Example:**
```vue
<!-- Source: Vuetify 3 dialog patterns -->
<template>
  <v-dialog
    v-model="open"
    :width="dialogWidth"
    :fullscreen="$vuetify.display.smAndDown"
    scrollable
  >
    <v-card>
      <v-card-title>
        Variants for {{ populationLabel || 'All Populations' }}
        <v-spacer />
        <v-btn icon @click="open = false"><v-icon>mdi-close</v-icon></v-btn>
      </v-card-title>
      <v-card-text>
        <v-data-table
          :headers="headers"
          :items="variants"
          :sort-by="sortBy"
          show-expand
          item-value="variant_id"
        >
          <!-- Custom slots for expansion -->
        </v-data-table>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup>
const dialogWidth = computed(() =>
  $vuetify.display.lgAndUp ? '90%' : '95%'
);
</script>
```

### Anti-Patterns to Avoid

- **Mutating filter state in multiple places:** Keep filter state in composable, not scattered across components
- **Debouncing filter changes:** Per CONTEXT.md, results update immediately - no debounce needed
- **Creating separate "Apply" button:** Decisions specify real-time updates
- **Storing filtered variants in store:** Use computed properties for derived state

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sortable data table | Custom sort logic + table | `v-data-table` with `sortable: true` headers | Built-in multi-column sort, keyboard accessibility |
| Collapsible panel | DIY expand/collapse | `v-expansion-panels` or `v-expand-transition` | Handles animation, ARIA attributes |
| Star rating slider | Custom number input | `v-slider` with `tick-labels` and `step` | Touch-friendly, accessible, shows ticks |
| Modal focus trap | Manual focus management | Vuetify `v-dialog` built-in | Already handles focus, escape key, scroll lock |
| Persistent state | localStorage directly | Pinia + `pinia-plugin-persistedstate` | Reactive, typed, handles serialization |

**Key insight:** Vuetify 3 components handle accessibility (ARIA, keyboard navigation) automatically. Hand-rolling these would require extensive accessibility work.

## Common Pitfalls

### Pitfall 1: Filter State Desyncs from Results

**What goes wrong:** User changes filter, sees stale variant count
**Why it happens:** Filter state not reactive, or filtered variants computed separately
**How to avoid:** Use single `filteredVariants` computed that references reactive `filters` ref
**Warning signs:** Variant count doesn't update until page refresh

### Pitfall 2: Settings Defaults vs Per-Calculation Overrides Conflated

**What goes wrong:** Changing filter in UI changes stored defaults
**Why it happens:** Using same reactive state for both
**How to avoid:** Store has `defaults`, composable has local `filters` initialized from defaults
**Warning signs:** Filter changes persist to next calculation unexpectedly

### Pitfall 3: gnomAD HGVS Fields Not Fetched

**What goes wrong:** HGVS columns show undefined/empty
**Why it happens:** Current GraphQL query doesn't request `hgvsc`/`hgvsp` fields
**How to avoid:** Extend `GENE_VARIANTS_QUERY` to include HGVS fields in `transcript_consequence`
**Warning signs:** Console shows undefined for hgvs properties

### Pitfall 4: Data Table Performance with Large Variant Lists

**What goes wrong:** UI becomes sluggish with genes that have 1000+ variants
**Why it happens:** Rendering all rows without virtualization
**How to avoid:** Use `v-data-table` pagination or virtual scrolling; most genes have <500 qualifying variants
**Warning signs:** Browser freezes on high-variant genes like BRCA1

### Pitfall 5: ClinVar Matching Fails Silently

**What goes wrong:** ClinVar status shows "unknown" for variants that have ClinVar data
**Why it happens:** Variant ID format mismatch between gnomAD variants and ClinVar variants
**How to avoid:** Verify matching logic in `shouldIncludeVariant` handles ID format correctly
**Warning signs:** ClinVar filter doesn't change variant count

### Pitfall 6: Population Drill-Down Loses Filter Context

**What goes wrong:** Population modal shows unfiltered variants
**Why it happens:** Modal fetches variants independently instead of using filtered list
**How to avoid:** Pass filtered variants to modal, then filter by population within modal
**Warning signs:** Modal variant count differs from population row count

## Code Examples

Verified patterns from official sources and existing codebase:

### Extended Filter Function (Adding Missense Support)
```typescript
// Extend existing variant-filters.ts
export interface FilterConfig {
  lofHcEnabled: boolean;
  missenseEnabled: boolean;
  clinvarEnabled: boolean;
  clinvarStarThreshold: number;
}

const MISSENSE_CONSEQUENCES = [
  'missense_variant',
  'inframe_insertion',
  'inframe_deletion',
];

export function shouldIncludeVariantConfigurable(
  variant: GnomadVariant,
  clinvarVariants: ClinVarVariant[],
  config: FilterConfig
): boolean {
  const consequence = variant.transcript_consequence;

  // Check LoF HC
  const hasHCLoF = config.lofHcEnabled &&
    consequence?.canonical &&
    consequence?.lof === 'HC';

  // Check missense (new)
  const hasMissense = config.missenseEnabled &&
    consequence?.canonical &&
    consequence?.consequence_terms?.some(t => MISSENSE_CONSEQUENCES.includes(t));

  // Check ClinVar
  const clinvarMatch = clinvarVariants.find(cv => cv.variant_id === variant.variant_id);
  const hasPathogenicClinVar = config.clinvarEnabled &&
    clinvarMatch &&
    isPathogenicWithThreshold(clinvarMatch, config.clinvarStarThreshold);

  return hasHCLoF || hasMissense || hasPathogenicClinVar;
}

function isPathogenicWithThreshold(variant: ClinVarVariant, threshold: number): boolean {
  const sig = variant.clinical_significance.toLowerCase();
  const isPathogenic =
    (sig.includes('pathogenic') || sig.includes('likely_pathogenic')) &&
    !sig.includes('conflicting');
  return isPathogenic && variant.gold_stars >= threshold;
}
```

### Filter Panel Component Structure
```vue
<!-- FilterPanel.vue - Collapsible filter controls -->
<template>
  <v-expansion-panels v-model="expanded" variant="accordion">
    <v-expansion-panel value="filters">
      <v-expansion-panel-title>
        <template #default="{ expanded }">
          <span v-if="expanded">Filter Configuration</span>
          <FilterChips v-else :filters="filters" />
        </template>
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <v-row>
          <v-col cols="12" sm="6">
            <v-switch
              v-model="filters.lofHcEnabled"
              label="LoF High Confidence"
              color="primary"
              hide-details
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-switch
              v-model="filters.missenseEnabled"
              label="Include Missense"
              color="primary"
              hide-details
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-switch
              v-model="filters.clinvarEnabled"
              label="ClinVar P/LP"
              color="primary"
              hide-details
            />
          </v-col>
          <v-col cols="12">
            <v-slider
              v-model="filters.clinvarStarThreshold"
              :min="0"
              :max="4"
              :step="1"
              :tick-labels="['0', '1', '2', '3', '4']"
              ticks="always"
              label="ClinVar Min Stars"
              :disabled="!filters.clinvarEnabled"
            />
          </v-col>
        </v-row>
        <v-btn variant="text" @click="resetFilters">
          Reset to Defaults
        </v-btn>
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
</template>
```

### Variant Table with Expandable Rows
```vue
<!-- Source: Vuetify 3 data table documentation -->
<template>
  <v-data-table
    :headers="headers"
    :items="displayVariants"
    :sort-by="sortBy"
    show-expand
    item-value="variant_id"
    density="compact"
  >
    <template #item.clinvar_status="{ item }">
      <v-chip :color="getClinvarColor(item.clinvar_status)" size="small">
        {{ item.clinvar_status }}
      </v-chip>
    </template>
    <template #item.gold_stars="{ item }">
      <span v-if="item.gold_stars !== null">
        {{ '★'.repeat(item.gold_stars) }}{{ '☆'.repeat(4 - item.gold_stars) }}
      </span>
      <span v-else class="text-medium-emphasis">-</span>
    </template>
    <template #expanded-row="{ columns, item }">
      <tr>
        <td :colspan="columns.length">
          <div class="pa-4">
            <strong>Transcript:</strong> {{ item.transcript_id }}<br>
            <strong>Position:</strong> {{ item.pos }}<br>
            <strong>Ref/Alt:</strong> {{ item.ref }} / {{ item.alt }}<br>
            <!-- Additional details -->
          </div>
        </td>
      </tr>
    </template>
  </v-data-table>
</template>
```

## gnomAD Data Fields Analysis

### Currently Fetched (in GENE_VARIANTS_QUERY)
| Field | Location | Available for Display |
|-------|----------|----------------------|
| variant_id | root | Yes - primary identifier |
| pos | root | Yes - genomic position |
| ref, alt | root | Yes - alleles |
| ac, an | exome/genome | Yes - compute AF |
| populations[].id, ac, an | exome/genome | Yes - per-population |
| lof, lof_filter, lof_flags | transcript_consequence | Yes - LoF annotation |
| consequence_terms | transcript_consequence | Yes - consequence type |
| canonical | transcript_consequence | Yes - canonical flag |
| transcript_id | transcript_consequence | Yes - transcript |
| clinical_significance | clinvar_variants | Yes - ClinVar status |
| gold_stars, review_status | clinvar_variants | Yes - ClinVar review |

### Need to Fetch (extend query)
| Field | Location | Purpose |
|-------|----------|---------|
| hgvsc | transcript_consequence | HGVS coding notation |
| hgvsp | transcript_consequence | HGVS protein notation |
| gene_symbol | transcript_consequence | Already fetched |

### GraphQL Query Extension
```graphql
# Add to transcript_consequence in GENE_VARIANTS_QUERY
transcript_consequence {
  gene_symbol
  transcript_id
  canonical
  consequence_terms
  lof
  lof_filter
  lof_flags
  hgvsc    # ADD
  hgvsp    # ADD
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Vuetify 2 `text`/`value` headers | Vuetify 3 `title`/`key` headers | Vuetify 3.0 (2022) | Must use new property names |
| Options API stores | Composition API stores | Pinia 2.0 | Use `defineStore` with setup function |
| v-data-table-server | v-data-table with items | Vuetify 3.x | Client-side for small datasets |

**Deprecated/outdated:**
- Vuetify 2 `text`/`value` header properties - use `title`/`key` in Vuetify 3
- Vuetify 2 `sort-by` array of strings - use array of `{ key, order }` objects

## Open Questions

Things that couldn't be fully resolved:

1. **HGVS Field Availability**
   - What we know: gnomAD browser displays HGVS, so API likely provides it
   - What's unclear: Exact field names in current API version (hgvsc vs HGVSc)
   - Recommendation: Test query against gnomAD GraphQL explorer, update types accordingly

2. **Variant Count for High-Variant Genes**
   - What we know: Most genes have <500 qualifying variants
   - What's unclear: Performance with genes like TTN (thousands of variants)
   - Recommendation: Add pagination to data table if performance issues arise

3. **Population-Specific Variant Frequencies**
   - What we know: Current query fetches per-population AC/AN
   - What's unclear: Whether to pre-compute per-population AF or compute in display
   - Recommendation: Compute in display component (simple division, keeps data normalized)

## Sources

### Primary (HIGH confidence)
- Existing codebase files: `variant-filters.ts`, `useCarrierFrequency.ts`, `useTemplateStore.ts`, `gene-variants.ts`
- [Vuetify 3 Data Table Documentation](https://vuetifyjs.com/en/components/data-tables/basics/)
- [Vuetify 3 VDataTable API](https://vuetifyjs.com/api/VDataTable/)
- [Vuetify 3 Dialog Component](https://vuetifyjs.com/en/components/dialogs/)
- [Vuetify 3 Slider Component](https://vuetifyjs.com/en/components/sliders/)
- [Pinia State Management](https://pinia.vuejs.org/core-concepts/state.html)

### Secondary (MEDIUM confidence)
- [gnomAD Browser GitHub](https://github.com/broadinstitute/gnomad-browser) - HGVS field structure
- [Vuetify 3 Expansion Panels](https://vuetifyjs.com/en/components/expansion-panels/)
- [Vuetify 3 Chip Groups](https://vuetifyjs.com/en/components/chip-groups/)

### Tertiary (LOW confidence)
- gnomAD GraphQL schema for exact HGVS field names (needs verification against live API)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All components already in project, well-documented
- Architecture patterns: HIGH - Based on existing codebase patterns
- Vuetify components: HIGH - Official documentation verified
- gnomAD HGVS fields: MEDIUM - Likely available but field names need verification
- Pitfalls: HIGH - Based on codebase analysis and common Vue patterns

**Research date:** 2026-01-19
**Valid until:** 2026-02-19 (30 days - stable libraries)
