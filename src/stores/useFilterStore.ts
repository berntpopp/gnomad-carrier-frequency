import { defineStore } from 'pinia';
import type { FilterConfig, FilterDefaults } from '@/types';
import { FACTORY_FILTER_DEFAULTS } from '@/types';

interface FilterStoreState {
  defaults: FilterDefaults;
}

export const useFilterStore = defineStore('filters', {
  state: (): FilterStoreState => ({
    defaults: { ...FACTORY_FILTER_DEFAULTS },
  }),

  getters: {
    /**
     * Returns a human-readable summary of active filters
     * e.g., "LoF HC, ClinVar >= 1 star"
     */
    activeFiltersDescription: (state): string => {
      const parts: string[] = [];

      if (state.defaults.lofHcEnabled) {
        parts.push('LoF HC');
      }

      if (state.defaults.missenseEnabled) {
        parts.push('Missense');
      }

      if (state.defaults.clinvarEnabled) {
        const starText =
          state.defaults.clinvarStarThreshold === 1
            ? '1 star'
            : `${state.defaults.clinvarStarThreshold} stars`;
        parts.push(`ClinVar >= ${starText}`);

        if (state.defaults.clinvarIncludeConflicting) {
          parts.push(`Conflicting >= ${state.defaults.clinvarConflictingThreshold}% P/LP`);
        }
      }

      if (parts.length === 0) {
        return 'No filters active';
      }

      return parts.join(', ');
    },
  },

  actions: {
    /**
     * Merge partial updates into current defaults
     */
    setDefaults(newDefaults: Partial<FilterConfig>) {
      this.defaults = { ...this.defaults, ...newDefaults };
    },

    /**
     * Reset all defaults to factory settings
     */
    resetToFactoryDefaults() {
      this.defaults = { ...FACTORY_FILTER_DEFAULTS };
    },

    /**
     * Set LoF High Confidence filter enabled state
     */
    setLofHcEnabled(enabled: boolean) {
      this.defaults.lofHcEnabled = enabled;
    },

    /**
     * Set missense variants filter enabled state
     */
    setMissenseEnabled(enabled: boolean) {
      this.defaults.missenseEnabled = enabled;
    },

    /**
     * Set ClinVar filter enabled state
     */
    setClinvarEnabled(enabled: boolean) {
      this.defaults.clinvarEnabled = enabled;
    },

    /**
     * Set ClinVar star threshold (validated to 0-4 range)
     */
    setClinvarStarThreshold(threshold: number) {
      // Clamp to valid range 0-4
      const validThreshold = Math.max(0, Math.min(4, Math.round(threshold)));
      this.defaults.clinvarStarThreshold = validThreshold;
    },

    /**
     * Set whether to include conflicting classifications with majority P/LP
     */
    setClinvarIncludeConflicting(enabled: boolean) {
      this.defaults.clinvarIncludeConflicting = enabled;
    },

    /**
     * Set threshold percentage for conflicting classifications (validated to 50-100 range)
     */
    setClinvarConflictingThreshold(threshold: number) {
      // Clamp to valid range 50-100
      const validThreshold = Math.max(50, Math.min(100, Math.round(threshold)));
      this.defaults.clinvarConflictingThreshold = validThreshold;
    },
  },

  persist: {
    key: 'carrier-freq-filters',
    storage: localStorage,
  },
});
