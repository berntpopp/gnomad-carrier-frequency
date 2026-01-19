import { computed, ref, type Ref, type ComputedRef } from 'vue';
import { useFilterStore } from '@/stores/useFilterStore';
import { filterPathogenicVariantsConfigurable } from '@/utils/variant-filters';
import type { FilterConfig, GnomadVariant, ClinVarVariant } from '@/types';

/**
 * Return type for useVariantFilters composable
 */
export interface UseVariantFiltersReturn {
  /** Current filter state (local, modifiable without affecting store) */
  filters: Ref<FilterConfig>;
  /** Filtered variants based on current filter settings */
  filteredVariants: ComputedRef<GnomadVariant[]>;
  /** Count of filtered variants for display */
  filteredCount: ComputedRef<number>;
  /** Reset local filters to store defaults */
  resetFilters: () => void;
  /** Save current filter settings as new defaults in store */
  saveAsDefaults: () => void;
  /** True if local filters differ from store defaults */
  isModifiedFromDefaults: ComputedRef<boolean>;
}

/**
 * Composable for managing variant filtering with local state
 *
 * Provides reactive filter state that starts from store defaults but can be
 * modified locally without affecting persisted settings. Users can reset to
 * defaults or save current settings as new defaults.
 *
 * @param variants - Ref to array of gnomAD variants to filter
 * @param clinvarVariants - Ref to array of ClinVar variants for cross-reference
 * @returns Object with filter state, filtered results, and control functions
 */
export function useVariantFilters(
  variants: Ref<GnomadVariant[]>,
  clinvarVariants: Ref<ClinVarVariant[]>
): UseVariantFiltersReturn {
  const filterStore = useFilterStore();

  // Initialize local filters from store defaults
  const filters = ref<FilterConfig>({
    lofHcEnabled: filterStore.defaults.lofHcEnabled,
    missenseEnabled: filterStore.defaults.missenseEnabled,
    clinvarEnabled: filterStore.defaults.clinvarEnabled,
    clinvarStarThreshold: filterStore.defaults.clinvarStarThreshold,
  });

  // Computed filtered variants based on current filter settings
  const filteredVariants = computed(() => {
    if (!variants.value.length) return [];
    return filterPathogenicVariantsConfigurable(
      variants.value,
      clinvarVariants.value,
      filters.value
    );
  });

  // Count for display
  const filteredCount = computed(() => filteredVariants.value.length);

  // Reset local filters to store defaults
  function resetFilters() {
    filters.value = {
      lofHcEnabled: filterStore.defaults.lofHcEnabled,
      missenseEnabled: filterStore.defaults.missenseEnabled,
      clinvarEnabled: filterStore.defaults.clinvarEnabled,
      clinvarStarThreshold: filterStore.defaults.clinvarStarThreshold,
    };
  }

  // Save current local filters as new defaults in store
  function saveAsDefaults() {
    filterStore.setDefaults(filters.value);
  }

  // Check if local filters differ from store defaults
  const isModifiedFromDefaults = computed(() => {
    const defaults = filterStore.defaults;
    return (
      filters.value.lofHcEnabled !== defaults.lofHcEnabled ||
      filters.value.missenseEnabled !== defaults.missenseEnabled ||
      filters.value.clinvarEnabled !== defaults.clinvarEnabled ||
      filters.value.clinvarStarThreshold !== defaults.clinvarStarThreshold
    );
  });

  return {
    filters,
    filteredVariants,
    filteredCount,
    resetFilters,
    saveAsDefaults,
    isModifiedFromDefaults,
  };
}
