// Singleton composable for variant exclusion state management
import { reactive, computed, type ComputedRef } from 'vue';
import type { ExclusionState, ExclusionReason } from '@/types';

// Module-level singleton state - shared across all useExclusionState() calls
const state = reactive<ExclusionState>({
  excluded: new Set<string>(),
  reasons: new Map<string, ExclusionReason>(),
  geneSymbol: null,
});

export interface UseExclusionStateReturn {
  /** Array of excluded variant IDs (reactive) */
  excluded: ComputedRef<string[]>;
  /** Map of variant ID to reason (reactive) */
  reasons: Map<string, ExclusionReason>;
  /** Count of excluded variants */
  excludedCount: ComputedRef<number>;
  /** Current gene symbol exclusions apply to */
  currentGene: ComputedRef<string | null>;

  // Actions
  /** Exclude a variant with optional reason */
  excludeVariant: (variantId: string, reason?: ExclusionReason) => void;
  /** Include a variant (remove exclusion) */
  includeVariant: (variantId: string) => void;
  /** Toggle variant exclusion state */
  toggleVariant: (variantId: string, reason?: ExclusionReason) => void;
  /** Exclude multiple variants at once */
  excludeAll: (variantIds: string[]) => void;
  /** Include all variants (clear all exclusions) */
  includeAll: () => void;
  /** Check if variant is excluded */
  isExcluded: (variantId: string) => boolean;
  /** Get exclusion reason for variant */
  getReason: (variantId: string) => ExclusionReason | undefined;
  /** Set reason for already-excluded variant */
  setReason: (variantId: string, reason: ExclusionReason) => void;
  /** Reset exclusions when gene changes */
  resetForGene: (geneSymbol: string) => void;
  /** Set exclusions from external source (e.g., URL state) */
  setExclusions: (variantIds: string[], reasons?: Map<string, ExclusionReason>) => void;
}

/**
 * Composable for managing variant exclusion state.
 *
 * Uses singleton pattern - all calls share the same state.
 * Exclusions automatically reset when gene changes.
 *
 * @example
 * ```ts
 * const { excluded, excludeVariant, isExcluded, excludedCount } = useExclusionState();
 *
 * // Exclude a variant
 * excludeVariant('1-12345-A-G', { type: 'likely_benign' });
 *
 * // Check exclusion
 * if (isExcluded('1-12345-A-G')) { ... }
 *
 * // Get excluded IDs for filtering
 * const filteredVariants = allVariants.filter(v => !excluded.value.includes(v.variant_id));
 * ```
 */
export function useExclusionState(): UseExclusionStateReturn {
  // Computed values
  const excluded = computed(() => [...state.excluded]);
  const excludedCount = computed(() => state.excluded.size);
  const currentGene = computed(() => state.geneSymbol);

  // Actions
  function excludeVariant(variantId: string, reason?: ExclusionReason): void {
    state.excluded.add(variantId);
    if (reason) {
      state.reasons.set(variantId, reason);
    }
  }

  function includeVariant(variantId: string): void {
    state.excluded.delete(variantId);
    state.reasons.delete(variantId);
  }

  function toggleVariant(variantId: string, reason?: ExclusionReason): void {
    if (state.excluded.has(variantId)) {
      includeVariant(variantId);
    } else {
      excludeVariant(variantId, reason);
    }
  }

  function excludeAll(variantIds: string[]): void {
    for (const id of variantIds) {
      state.excluded.add(id);
    }
  }

  function includeAll(): void {
    state.excluded.clear();
    state.reasons.clear();
  }

  function isExcluded(variantId: string): boolean {
    return state.excluded.has(variantId);
  }

  function getReason(variantId: string): ExclusionReason | undefined {
    return state.reasons.get(variantId);
  }

  function setReason(variantId: string, reason: ExclusionReason): void {
    if (state.excluded.has(variantId)) {
      state.reasons.set(variantId, reason);
    }
  }

  function resetForGene(geneSymbol: string): void {
    // Only reset if gene actually changed
    if (state.geneSymbol !== geneSymbol) {
      state.excluded.clear();
      state.reasons.clear();
      state.geneSymbol = geneSymbol;
    }
  }

  function setExclusions(variantIds: string[], reasons?: Map<string, ExclusionReason>): void {
    state.excluded.clear();
    state.reasons.clear();
    for (const id of variantIds) {
      state.excluded.add(id);
    }
    if (reasons) {
      for (const [id, reason] of reasons) {
        state.reasons.set(id, reason);
      }
    }
  }

  return {
    excluded,
    reasons: state.reasons,
    excludedCount,
    currentGene,
    excludeVariant,
    includeVariant,
    toggleVariant,
    excludeAll,
    includeAll,
    isExcluded,
    getReason,
    setReason,
    resetForGene,
    setExclusions,
  };
}
