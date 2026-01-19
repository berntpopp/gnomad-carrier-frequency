# Phase 13: Variant Exclusion - Research

**Researched:** 2026-01-20
**Domain:** Vue 3 table selection, state management, URL compression
**Confidence:** HIGH

## Summary

This phase adds manual variant exclusion to the existing carrier frequency calculator. The user will be able to exclude individual variants from calculations via checkboxes in the VariantTable component, with real-time recalculation of carrier frequencies. The implementation leverages existing patterns already established in the codebase.

The standard approach is:
1. Add a reactive exclusion state composable that tracks excluded variant IDs and optional reasons
2. Extend VariantTable with Vuetify's built-in row selection (`show-select`) pattern
3. Use VueUse's `watchDebounced` to throttle frequency recalculations
4. Add lz-string compression for URL sharing of excluded variant IDs
5. Extend export utilities to include exclusion status and reasons

**Primary recommendation:** Build an `useExclusionState` composable with a `Set<string>` for excluded variant IDs and a `Map<string, string>` for reasons. Use Vuetify's native `show-select` with `v-model` for checkbox UI. Modify `useCarrierFrequency` to accept excluded IDs and filter them before calculation.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @vueuse/core | ^12.7.0 | `watchDebounced` for recalculation throttling | Already in use, provides reactive debouncing |
| Vuetify | ^3.8.1 | `v-data-table` with `show-select` for checkbox UI | Already in use, native selection support |
| zod | ^4.3.5 | URL state validation schema extension | Already in use for URL parsing |

### New Dependency Required
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| lz-string | ^1.5.0 | URL compression for excluded variant IDs | 11.5M weekly downloads, built-in TypeScript types, `compressToEncodedURIComponent` method designed for URL state |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| lz-string | Base64 encoding | Base64 has no compression, would hit URL limit faster |
| lz-string | Custom bit-packing | Hand-rolled, harder to maintain, lz-string is battle-tested |
| watchDebounced | setTimeout in watcher | VueUse already installed, provides proper cleanup |

**Installation:**
```bash
bun add lz-string
```

Note: `lz-string` includes its own TypeScript types since v1.5.0 - do NOT install `@types/lz-string`.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── composables/
│   └── useExclusionState.ts    # NEW: Exclusion state management
├── types/
│   └── exclusion.ts            # NEW: Exclusion type definitions
├── utils/
│   └── exclusion-url.ts        # NEW: lz-string URL encode/decode
├── components/
│   └── VariantTable.vue        # MODIFY: Add checkbox column
└── config/
    └── exclusion-reasons.ts    # NEW: Predefined reason options
```

### Pattern 1: Exclusion State Composable (Singleton)
**What:** A Vue composable that manages excluded variant IDs and reasons
**When to use:** Provides shared state across VariantTable and frequency calculation
**Example:**
```typescript
// src/composables/useExclusionState.ts
import { reactive, computed } from 'vue';

interface ExclusionState {
  excluded: Set<string>;           // variant_id set
  reasons: Map<string, string>;    // variant_id -> reason
  geneSymbol: string | null;       // tracks which gene exclusions apply to
}

// Singleton state - shared across all useExclusionState() calls
const state = reactive<ExclusionState>({
  excluded: new Set(),
  reasons: new Map(),
  geneSymbol: null,
});

export function useExclusionState() {
  const excludedCount = computed(() => state.excluded.size);

  function excludeVariant(variantId: string, reason?: string) {
    state.excluded.add(variantId);
    if (reason) {
      state.reasons.set(variantId, reason);
    }
  }

  function includeVariant(variantId: string) {
    state.excluded.delete(variantId);
    state.reasons.delete(variantId);
  }

  function toggleVariant(variantId: string, reason?: string) {
    if (state.excluded.has(variantId)) {
      includeVariant(variantId);
    } else {
      excludeVariant(variantId, reason);
    }
  }

  function excludeAll(variantIds: string[]) {
    for (const id of variantIds) {
      state.excluded.add(id);
    }
  }

  function includeAll() {
    state.excluded.clear();
    state.reasons.clear();
  }

  function isExcluded(variantId: string): boolean {
    return state.excluded.has(variantId);
  }

  function resetForGene(geneSymbol: string) {
    if (state.geneSymbol !== geneSymbol) {
      state.excluded.clear();
      state.reasons.clear();
      state.geneSymbol = geneSymbol;
    }
  }

  return {
    excluded: computed(() => [...state.excluded]),
    reasons: state.reasons,
    excludedCount,
    excludeVariant,
    includeVariant,
    toggleVariant,
    excludeAll,
    includeAll,
    isExcluded,
    resetForGene,
  };
}
```

### Pattern 2: Vuetify Data Table with Selection
**What:** Using `show-select` prop with `v-model` for row selection
**When to use:** Adding checkboxes to the existing VariantTable
**Example:**
```vue
<!-- VariantTable.vue modification -->
<template>
  <v-data-table
    v-model="selected"
    :headers="headersWithSelect"
    :items="variants"
    show-select
    item-value="variant_id"
    density="compact"
    :item-class="getRowClass"
  >
    <!-- Custom checkbox slot for styling -->
    <template #item.data-table-select="{ isSelected, toggleSelect, item }">
      <v-checkbox-btn
        :model-value="!isSelected({ value: item.variant_id })"
        color="primary"
        @update:model-value="toggleSelect({ value: item.variant_id })"
      />
    </template>

    <!-- Header checkbox for bulk actions -->
    <template #header.data-table-select="{ allSelected, selectAll, someSelected }">
      <v-checkbox-btn
        :model-value="noneExcluded"
        :indeterminate="someSelected && !allSelected"
        @update:model-value="handleSelectAll"
      />
    </template>

    <!-- Excluded row styling -->
    <template #[`item.variant_id`]="{ item }">
      <span :class="{ 'text-decoration-line-through text-medium-emphasis': isExcluded(item.variant_id) }">
        {{ item.variant_id }}
      </span>
    </template>
  </v-data-table>
</template>
```

### Pattern 3: Debounced Frequency Recalculation
**What:** Using VueUse `watchDebounced` to throttle recalculations
**When to use:** When exclusion state changes, before updating carrier frequency
**Example:**
```typescript
// In useCarrierFrequency.ts or parent component
import { watchDebounced } from '@vueuse/core';

const { excluded } = useExclusionState();

// Watch exclusions with 500ms debounce
watchDebounced(
  excluded,
  (newExcluded) => {
    // Recalculate with excluded variants filtered out
    recalculateFrequency(newExcluded);
  },
  { debounce: 500, maxWait: 2000 }
);
```

### Pattern 4: URL Compression with lz-string
**What:** Compress excluded variant IDs for URL sharing
**When to use:** When generating shareable URLs with exclusion state
**Example:**
```typescript
// src/utils/exclusion-url.ts
import LZString from 'lz-string';

const MAX_URL_LENGTH = 2000; // Conservative URL length limit

export function encodeExclusions(variantIds: string[]): string | null {
  if (variantIds.length === 0) return null;

  const joined = variantIds.join(',');
  const compressed = LZString.compressToEncodedURIComponent(joined);

  // Check if compressed data is too long for URL
  if (compressed.length > MAX_URL_LENGTH) {
    return null; // Signal that exclusions won't fit
  }

  return compressed;
}

export function decodeExclusions(compressed: string): string[] {
  if (!compressed) return [];

  try {
    const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
    if (!decompressed) return [];
    return decompressed.split(',').filter(Boolean);
  } catch {
    console.warn('[Exclusion URL] Failed to decompress exclusion data');
    return [];
  }
}
```

### Anti-Patterns to Avoid
- **Storing full variant objects in exclusion state:** Only store variant_id strings - objects are large and unnecessary
- **Recalculating on every checkbox toggle:** Always debounce - rapid toggles cause jarring UI updates
- **Modifying useCarrierFrequency internal logic:** Pass excluded IDs as parameter, filter before aggregation
- **Coupling exclusion state to filter state:** Keep exclusion state separate from FilterConfig - different concerns

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Debounced reactivity | Custom setTimeout in watcher | VueUse `watchDebounced` | Proper cleanup, Vue integration, tested |
| URL-safe compression | Base64 + manual escaping | lz-string `compressToEncodedURIComponent` | Designed for this use case, handles edge cases |
| Table row selection | Custom checkbox column state | Vuetify `show-select` + `v-model` | Built-in select-all, proper accessibility |
| Set/Map reactivity | Array with .includes() | Vue `reactive(new Set())` | O(1) lookups vs O(n), Vue 3 tracks Set/Map |

**Key insight:** Vuetify's data table already has complete selection infrastructure. The work is connecting it to exclusion logic, not building selection from scratch.

## Common Pitfalls

### Pitfall 1: Exclusion State Not Resetting on Gene Change
**What goes wrong:** User excludes variants for Gene A, switches to Gene B, and exclusions persist incorrectly
**Why it happens:** Singleton state without gene tracking
**How to avoid:** Track current gene in exclusion state, call `resetForGene()` when wizard's gene changes
**Warning signs:** Excluded variant IDs don't exist in new gene's variant list

### Pitfall 2: Vuetify v-model Inversion
**What goes wrong:** Checked checkbox means "included" but v-model tracks "selected" items
**Why it happens:** Standard data table selection means "selected rows" - we want "included variants"
**How to avoid:** Invert the logic - selected items are INCLUDED, unselected are EXCLUDED. Or use custom slot with inverted model-value
**Warning signs:** Select-all excludes all instead of including all

### Pitfall 3: URL Length Overflow Silent Failure
**What goes wrong:** Long exclusion lists silently truncate or cause URL errors
**Why it happens:** URLs have browser-specific length limits (~2000-8000 chars)
**How to avoid:** Check compressed length before adding to URL, warn user if exclusions won't fit
**Warning signs:** Shared links don't restore exclusions, no error shown

### Pitfall 4: Pulse Animation on Every Render
**What goes wrong:** Frequency values constantly pulse even without changes
**Why it happens:** CSS animation class applied without change detection
**How to avoid:** Use transition key or apply animation class only when value actually changes
**Warning signs:** Values pulse on unrelated interactions like table sorting

### Pitfall 5: Reactivity Loss with Set/Map
**What goes wrong:** Exclusions change but UI doesn't update
**Why it happens:** Direct Set/Map mutation doesn't trigger Vue reactivity
**How to avoid:** Use `reactive()` wrapper for Set/Map, or use methods that Vue can track
**Warning signs:** Console shows updated Set but template shows old state

## Code Examples

Verified patterns from official sources and existing codebase:

### VueUse watchDebounced Usage
```typescript
// Source: https://vueuse.org/shared/watchDebounced/
import { watchDebounced } from '@vueuse/core'

watchDebounced(
  source,
  () => { console.log('changed!') },
  { debounce: 500, maxWait: 1000 },
)
```

### lz-string URL Compression
```typescript
// Source: https://pieroxy.net/blog/pages/lz-string/index.html
import LZString from 'lz-string';

// Compress for URL
const compressed = LZString.compressToEncodedURIComponent(data);
// Result is URL-safe, no need for encodeURIComponent

// Decompress from URL
const original = LZString.decompressFromEncodedURIComponent(compressed);
```

### Vuetify Data Table Selection Slot
```vue
<!-- Source: Vuetify GitHub issues and discussions -->
<template>
  <v-data-table
    v-model="selected"
    :items="items"
    show-select
    item-value="id"
  >
    <template #item.data-table-select="{ isSelected, toggleSelect, item }">
      <v-checkbox-btn
        :model-value="isSelected({ value: item.id })"
        @update:model-value="toggleSelect({ value: item.id })"
      />
    </template>
  </v-data-table>
</template>
```

### CSS Pulse Animation
```css
/* Source: CSS animation patterns */
@keyframes frequency-pulse {
  0% { opacity: 1; }
  50% { opacity: 0.6; background-color: rgba(var(--v-theme-primary), 0.1); }
  100% { opacity: 1; }
}

.frequency-updated {
  animation: frequency-pulse 0.5s ease-out;
}
```

### Excluded Row Styling
```css
/* Dimmed + strikethrough for excluded variants */
.excluded-row {
  opacity: 0.6;
}

.excluded-row td {
  text-decoration: line-through;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

/* Maintain hover state for restore action */
.excluded-row:hover {
  opacity: 0.8;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| @types/lz-string | lz-string built-in types | v1.5.0 (2021) | Don't install @types package |
| Manual debounce | VueUse watchDebounced | VueUse v9+ | Cleaner, tested implementation |
| v-simple-checkbox | v-checkbox-btn | Vuetify 3 | API changed, use v-checkbox-btn in slots |

**Deprecated/outdated:**
- `@types/lz-string`: lz-string now ships its own TypeScript definitions
- `debouncedWatch`: Renamed to `watchDebounced` in VueUse (alias still works)

## Integration Points with Existing Code

### 1. useCarrierFrequency.ts Modification
The composable needs to accept excluded variant IDs and filter before aggregation:
```typescript
// Add to interface
export interface UseCarrierFrequencyReturn {
  // ... existing
  setExcludedVariants: (variantIds: string[]) => void;
}

// In composable
const excludedVariantIds = ref<Set<string>>(new Set());

const setExcludedVariants = (ids: string[]) => {
  excludedVariantIds.value = new Set(ids);
};

// Modify pathogenicVariants computed to filter excluded
const pathogenicVariants = computed(() => {
  if (!normalizedVariants.value.length) return [];
  const filtered = filterPathogenicVariantsConfigurable(/* ... */);
  // Filter out excluded variants
  return filtered.filter(v => !excludedVariantIds.value.has(v.variant_id));
});
```

### 2. export-utils.ts Extension
Add exclusion fields to ExportVariant:
```typescript
// Extend ExportVariant interface
export interface ExportVariant {
  // ... existing fields
  excluded: boolean;
  exclusionReason: string | null;
}

// Modify buildExportVariants
export function buildExportVariants(
  variants: DisplayVariant[],
  excludedIds: Set<string>,
  reasons: Map<string, string>
): ExportVariant[] {
  return variants.map((v) => ({
    // ... existing fields
    excluded: excludedIds.has(v.variant_id),
    exclusionReason: reasons.get(v.variant_id) ?? null,
  }));
}
```

### 3. useUrlState.ts Extension
Add exclusion encoding to URL state:
```typescript
// Add to URL schema
const UrlStateSchema = z.object({
  // ... existing
  excl: z.string().optional(), // Compressed excluded variant IDs
  exclWarn: z.enum(['0', '1']).optional(), // Warning if exclusions truncated
});

// In updateUrlFromState
if (exclusions.length > 0) {
  const encoded = encodeExclusions(exclusions);
  if (encoded) {
    params.excl = encoded;
  } else {
    params.exclWarn = '1'; // Signal that exclusions didn't fit
  }
}
```

## Open Questions

Things that couldn't be fully resolved:

1. **Exact exclusion reason options**
   - What we know: Context specifies "Likely benign", "Low quality", "Population-specific", "Other"
   - What's unclear: Should there be gene-specific or variant-type-specific reasons?
   - Recommendation: Start with the four specified reasons, allow free text for "Other"

2. **Pulse animation timing**
   - What we know: Context suggests subtle animation on frequency value change
   - What's unclear: Exact duration, easing, whether to use transform or opacity
   - Recommendation: Start with 500ms ease-out opacity pulse, iterate based on UX feedback

## Sources

### Primary (HIGH confidence)
- VueUse watchDebounced - https://vueuse.org/shared/watchDebounced/
- lz-string official docs - https://pieroxy.net/blog/pages/lz-string/index.html
- Existing codebase: useCarrierFrequency.ts, VariantTable.vue, useUrlState.ts

### Secondary (MEDIUM confidence)
- Vuetify GitHub issues for data table selection - https://github.com/vuetifyjs/vuetify/issues/11503
- lz-string npm package - https://www.npmjs.com/package/lz-string

### Tertiary (LOW confidence)
- CSS pulse animation patterns - community examples, needs testing

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already used or well-documented
- Architecture: HIGH - follows existing patterns in codebase
- Pitfalls: MEDIUM - some based on common Vue/Vuetify issues, needs validation
- URL compression: HIGH - lz-string is mature with clear documentation

**Research date:** 2026-01-20
**Valid until:** 2026-03-20 (60 days - stable libraries, established patterns)
