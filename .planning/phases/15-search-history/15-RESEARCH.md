# Phase 15: Search History - Research

**Researched:** 2026-01-20
**Domain:** State persistence, UI patterns for history management
**Confidence:** HIGH

## Summary

Phase 15 implements a search history feature allowing users to browse, restore, and manage previous calculation results without re-querying the gnomAD API. The implementation leverages the existing Pinia persistence infrastructure (pinia-plugin-persistedstate v4.7.1) already used by 5 other stores in the application.

The user decisions from CONTEXT.md lock in key architectural choices: timeline layout with date grouping, right-side drawer (matching LogViewerPanel pattern), instant restore/delete without confirmation, auto-save at results step, and 50-entry default limit with FIFO cleanup. This research focuses on the data structures, state restoration patterns, and UI component choices required to implement these decisions.

**Primary recommendation:** Create a dedicated `useHistoryStore` Pinia store with persistence, following the established patterns from `useLogStore` (array management with ring buffer) and `useAppStore` (persistence configuration). Use `v-navigation-drawer` for the history panel (matching LogViewerPanel) and implement timeline visualization with `v-list` + date grouping headers rather than `v-timeline` for better mobile density.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Pinia | ^3.0.4 | State management | Already in use, Options API pattern established |
| pinia-plugin-persistedstate | ^4.7.1 | localStorage persistence | Already configured in main.ts |
| Vue 3 Composition API | ^3.5.24 | Reactive state | Project standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vuetify 3 | ^3.8.1 | UI components (v-navigation-drawer, v-list, v-list-item) | History drawer and list rendering |
| VueUse | @vueuse/core | useDisplay for responsive breakpoints | Full-width drawer on mobile |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| v-timeline | v-list with date headers | v-list is more compact, better for mobile density |
| IndexedDB | localStorage | IndexedDB is overkill for 50 entries, localStorage simpler and already in use |
| Separate composable | Pinia store | Store provides persistence and DevTools integration out of box |

**Installation:**
```bash
# No new dependencies required - all libraries already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── stores/
│   └── useHistoryStore.ts       # New Pinia store for history
├── types/
│   └── history.ts               # New type definitions for history entries
├── components/
│   ├── HistoryDrawer.vue        # Right-side drawer (like LogViewerPanel)
│   ├── HistoryPanel.vue         # Content panel inside drawer
│   └── HistoryEntryCard.vue     # Individual entry display
```

### Pattern 1: History Entry Data Structure

**What:** Comprehensive history entry capturing all state needed for restoration.

**When to use:** When saving completed calculations to history.

**Example:**
```typescript
// Source: Derived from existing WizardState, FilterConfig, ExclusionState types
export interface HistoryEntry {
  id: string;                    // UUID for unique identification
  timestamp: number;             // Date.now() when saved

  // Gene information (from GeneSearchResult)
  gene: {
    ensembl_id: string;
    symbol: string;
  };

  // Wizard state
  indexStatus: IndexPatientStatus;
  frequencySource: FrequencySource;
  literatureFrequency: number | null;
  literaturePmid: string | null;

  // Filter configuration snapshot
  filterConfig: FilterConfig;

  // Exclusion state (variant IDs only, reasons optional)
  excludedVariantIds: string[];

  // Results snapshot (for display without recalculation)
  results: {
    globalCarrierFrequency: number;
    qualifyingVariantCount: number;
    gnomadVersion: GnomadVersion;
  };
}
```

### Pattern 2: Pinia Store with Ring Buffer

**What:** Store pattern with automatic FIFO cleanup when limit exceeded.

**When to use:** Managing bounded history array with persistence.

**Example:**
```typescript
// Source: Pattern from useLogStore.ts lines 54-75
export const useHistoryStore = defineStore('history', {
  state: (): HistoryStoreState => ({
    entries: [],
    settings: {
      maxEntries: 50,  // Default from CONTEXT.md
    },
  }),

  actions: {
    addEntry(entry: Omit<HistoryEntry, 'id' | 'timestamp'>) {
      const newEntry: HistoryEntry = {
        ...entry,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
      };

      this.entries.unshift(newEntry);  // Newest first

      // Ring buffer: remove oldest when exceeding max
      while (this.entries.length > this.settings.maxEntries) {
        this.entries.pop();
      }
    },

    deleteEntry(id: string) {
      const index = this.entries.findIndex(e => e.id === id);
      if (index > -1) {
        this.entries.splice(index, 1);
      }
    },

    clearAll() {
      this.entries = [];
    },
  },

  persist: {
    key: 'carrier-freq-history',
    storage: localStorage,
  },
});
```

### Pattern 3: State Restoration

**What:** Restoring full application state from history entry.

**When to use:** When user clicks a history entry to restore.

**Example:**
```typescript
// Restoration composable
export function useHistoryRestore() {
  const { state: wizardState } = useWizard();
  const geneSearch = useGeneSearch();
  const filterStore = useFilterStore();
  const { setExclusions } = useExclusionState();
  const historyStore = useHistoryStore();

  async function restoreFromHistory(entryId: string): Promise<boolean> {
    const entry = historyStore.entries.find(e => e.id === entryId);
    if (!entry) return false;

    // Auto-save current state before restoring (CONTEXT.md decision)
    await autoSaveCurrentState();

    // Restore gene (triggers data fetch)
    const gene: GeneSearchResult = {
      ensembl_id: entry.gene.ensembl_id,
      symbol: entry.gene.symbol,
    };
    geneSearch.selectGene(gene);
    wizardState.gene = gene;

    // Restore wizard state
    wizardState.indexStatus = entry.indexStatus;
    wizardState.frequencySource = entry.frequencySource;
    wizardState.literatureFrequency = entry.literatureFrequency;
    wizardState.literaturePmid = entry.literaturePmid;

    // Restore filters (temporary, not saved to defaults)
    // filterStore.defaults stays unchanged, but active filters update

    // Restore exclusions
    setExclusions(entry.excludedVariantIds);

    // Navigate to results step
    wizardState.currentStep = 4;

    return true;
  }

  return { restoreFromHistory };
}
```

### Pattern 4: Date Grouping for Timeline Display

**What:** Grouping history entries by calendar date for visual scanning.

**When to use:** Rendering the history list with date headers.

**Example:**
```typescript
// Computed getter in store or composable
const groupedByDate = computed(() => {
  const groups = new Map<string, HistoryEntry[]>();

  for (const entry of historyStore.entries) {
    const dateKey = new Date(entry.timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(entry);
  }

  return Array.from(groups.entries()).map(([date, entries]) => ({
    date,
    entries,
  }));
});
```

### Anti-Patterns to Avoid

- **Storing full variant data:** Don't store complete variant arrays in history entries. Only store variant IDs for exclusions - full data is re-fetched on restore.
- **Persisting computed results:** Store only the key result values (carrier frequency, variant count) for display. Full population data is recalculated on restore.
- **Blocking UI on restore:** Use async restoration with loading indicator. Gene data fetch may take time.
- **Duplicating state:** Don't duplicate wizard state structure. Use the existing types and patterns.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UUID generation | Custom ID generation | `crypto.randomUUID()` | Browser API, cryptographically secure |
| Date formatting | Manual string formatting | `toLocaleDateString()` with options | Localization support, consistent formatting |
| Responsive drawer width | Manual viewport calculations | `useDisplay` from Vuetify | Already used in LogViewerPanel |
| Ring buffer | Custom array management | Simple `while` loop with `pop()` | Pattern established in useLogStore |
| State persistence | Manual localStorage calls | pinia-plugin-persistedstate | Already configured and tested |

**Key insight:** The existing codebase has established patterns for every required feature. Follow them for consistency and reduced bugs.

## Common Pitfalls

### Pitfall 1: localStorage Quota Exceeded

**What goes wrong:** Storing too much data causes quota errors, corrupts persistence.

**Why it happens:** Each entry can be 2-5KB with gene info and filter config. 50 entries = ~250KB max, well under typical 5-10MB quota.

**How to avoid:**
- Keep 50-entry default limit (CONTEXT.md)
- Don't store variant arrays, only IDs
- Store minimal result snapshot, not full population data

**Warning signs:** `QuotaExceededError` in console, persistence stops working.

### Pitfall 2: State Desync During Restoration

**What goes wrong:** Restoring partial state leads to inconsistent UI.

**Why it happens:** Multiple composables/stores need coordinated updates.

**How to avoid:**
- Restore in correct order: gene first (triggers data fetch), then filters, then exclusions, then navigate to step
- Use async restoration with loading indicator
- Auto-save current state before restore (per CONTEXT.md)

**Warning signs:** Stale data displayed, filters not applied, wrong step shown.

### Pitfall 3: Duplicate Entries

**What goes wrong:** Same calculation saved multiple times clutters history.

**Why it happens:** Auto-save triggers on every visit to results step.

**How to avoid:**
- Only save when entering results step with valid calculation (not on re-entry)
- Consider comparing to most recent entry (same gene, similar timestamp)
- CONTEXT.md says "no deduplication by gene" - each search is separate, but avoid duplicate saves for same navigation

**Warning signs:** Identical entries seconds apart, history fills with duplicates.

### Pitfall 4: Memory Leaks from Reactive References

**What goes wrong:** History entries hold references to reactive objects.

**Why it happens:** Storing Vue reactive objects in Pinia state.

**How to avoid:**
- Use `toRaw()` or spread operator when creating entry
- Store plain objects, not reactive refs
- FilterConfig and other objects should be plain copies

**Warning signs:** Memory usage grows, DevTools shows retained objects.

## Code Examples

Verified patterns from official sources and existing codebase:

### History Drawer Component

```vue
<!-- Source: Pattern from LogViewerPanel.vue -->
<template>
  <v-navigation-drawer
    v-model="modelValue"
    location="right"
    temporary
    :width="drawerWidth"
    class="history-drawer"
  >
    <div class="pa-4">
      <HistoryPanel @close="modelValue = false" />
    </div>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useDisplay } from 'vuetify';
import HistoryPanel from '@/components/HistoryPanel.vue';

const { smAndDown, width: viewportWidth } = useDisplay();

// Full-width on mobile, fixed width on desktop (per CONTEXT.md)
const drawerWidth = computed(() => smAndDown.value ? viewportWidth.value : 450);

const modelValue = defineModel<boolean>();
</script>
```

### History Entry Card

```vue
<!-- Source: Derived from v-list-item patterns in Vuetify 3 -->
<template>
  <v-list-item
    :title="entry.gene.symbol"
    :subtitle="formatTime(entry.timestamp)"
    @click="emit('restore', entry.id)"
  >
    <template #prepend>
      <v-icon color="primary">mdi-history</v-icon>
    </template>

    <template #append>
      <v-chip size="small" color="success" variant="tonal">
        {{ formatFrequency(entry.results.globalCarrierFrequency) }}
      </v-chip>
      <v-btn
        icon="mdi-delete"
        variant="text"
        size="small"
        @click.stop="emit('delete', entry.id)"
      />
    </template>
  </v-list-item>
</template>
```

### AppBar Icon Integration

```vue
<!-- Source: Pattern from existing AppBar buttons -->
<v-tooltip
  text="History"
  location="bottom"
  aria-label="View search history"
>
  <template #activator="{ props }">
    <v-btn
      v-bind="props"
      icon
      variant="text"
      title="History"
      aria-label="View search history"
      @click="emit('openHistory')"
    >
      <v-icon>mdi-history</v-icon>
    </v-btn>
  </template>
</v-tooltip>
```

### Auto-Save Trigger in Wizard

```typescript
// Source: Pattern from useUrlState.ts watch patterns
watch(
  () => wizardState.currentStep,
  (newStep, oldStep) => {
    // Auto-save when entering results step with valid calculation
    if (newStep === 4 && oldStep !== 4 && result.value) {
      historyStore.addEntry({
        gene: wizardState.gene!,
        indexStatus: wizardState.indexStatus,
        frequencySource: wizardState.frequencySource,
        literatureFrequency: wizardState.literatureFrequency,
        literaturePmid: wizardState.literaturePmid,
        filterConfig: { ...filterConfig.value },
        excludedVariantIds: excluded.value,
        results: {
          globalCarrierFrequency: result.value.globalCarrierFrequency!,
          qualifyingVariantCount: result.value.qualifyingVariantCount,
          gnomadVersion: currentVersion.value,
        },
      });
    }
  }
);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| vuex-persistedstate | pinia-plugin-persistedstate | Pinia adoption | Same API style, better Pinia integration |
| v-timeline for lists | v-list with date headers | Vuetify 3 mobile focus | Better density and touch targets |
| Manual localStorage | Persistence plugin | Already established | Automatic serialization, simpler code |

**Deprecated/outdated:**
- Vuex: Project uses Pinia ^3.0.4
- Vuetify 2 timeline API: `dense` prop replaced with `density`

## Open Questions

Things that couldn't be fully resolved:

1. **Filter restoration scope**
   - What we know: Entry stores filterConfig snapshot
   - What's unclear: Should restoration modify filterStore.defaults or just session state?
   - Recommendation: Restore only to session (carrier frequency composable filterConfig ref), not to filterStore.defaults. User's saved defaults remain unchanged.

2. **Offline restoration**
   - What we know: HIST-10 requires history works offline
   - What's unclear: If user restores while offline, gene data won't be available
   - Recommendation: Show stored results immediately from history entry, with indicator that full data unavailable until online. Gene data refetches when connectivity returns.

3. **Auto-save timing edge cases**
   - What we know: Save when reaching results step with valid calculation
   - What's unclear: What if user visits step 4, goes back to step 3, changes filters, returns to step 4?
   - Recommendation: Compare against most recent entry - only save if gene differs OR if more than 30 seconds elapsed. Prevents duplicate entries from navigation back-and-forth.

## Sources

### Primary (HIGH confidence)
- Existing codebase stores: `useLogStore.ts`, `useAppStore.ts`, `useFilterStore.ts`
- Existing codebase composables: `useExclusionState.ts`, `useWizard.ts`, `useUrlState.ts`
- Existing codebase components: `LogViewerPanel.vue`, `SettingsDialog.vue`, `AppBar.vue`
- CONTEXT.md: User decisions for Phase 15

### Secondary (MEDIUM confidence)
- [pinia-plugin-persistedstate documentation](https://prazdevs.github.io/pinia-plugin-persistedstate/) - Configuration and persistence options
- [VueUse useStorage documentation](https://vueuse.org/core/useStorage/) - localStorage patterns and mergeDefaults
- [Vuetify 3 Timeline Component](https://vuetifyjs.com/en/components/timelines/) - API reference

### Tertiary (LOW confidence)
- WebSearch results for Vuetify 3 timeline props - Documentation pages failed to load completely, recommended verifying v-timeline-item props directly in project if timeline approach chosen

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use, versions verified from package.json
- Architecture patterns: HIGH - Derived directly from existing codebase patterns
- Data structure: HIGH - Types derived from existing WizardState, FilterConfig, ExclusionState
- Pitfalls: MEDIUM - Based on general localStorage/state management knowledge, not project-specific incidents

**Research date:** 2026-01-20
**Valid until:** Stable patterns, valid until major library upgrades (30+ days)
