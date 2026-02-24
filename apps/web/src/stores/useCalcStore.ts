import { defineStore } from 'pinia';
import { FACTORY_CALC_DEFAULTS } from '@gnomad-cf/core/types';
import type { CalcConfig } from '@gnomad-cf/core/types';

interface CalcStoreState {
  defaults: CalcConfig;
}

export const useCalcStore = defineStore('calc-settings', {
  state: (): CalcStoreState => ({
    defaults: { ...FACTORY_CALC_DEFAULTS },
  }),

  actions: {
    /**
     * Merge partial updates into current defaults
     */
    setDefaults(newDefaults: Partial<CalcConfig>) {
      this.defaults = { ...this.defaults, ...newDefaults };
    },

    /**
     * Reset all defaults to factory settings
     */
    resetToFactoryDefaults() {
      this.defaults = { ...FACTORY_CALC_DEFAULTS };
    },

    /**
     * Set whether to use HWE 2pq formula (true) or simplified 2*SumAF (false)
     */
    setUseHWEFormula(enabled: boolean) {
      this.defaults.useHWEFormula = enabled;
    },

    /**
     * Set whether to apply homozygote exclusion (VCR/GCR)
     */
    setUseHomExclusion(enabled: boolean) {
      this.defaults.useHomExclusion = enabled;
    },

    /**
     * Set penetrance fraction (clamped to 0-1 range)
     */
    setPenetrance(value: number) {
      this.defaults.penetrance = Math.max(0, Math.min(1, value));
    },
  },

  persist: {
    key: 'carrier-freq-calc',
    storage: localStorage,
  },
});
