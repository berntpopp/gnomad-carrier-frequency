import { defineStore } from "pinia";
import type { QualitySettings, QualityExclusionConfig } from "@gnomad-cf/core/types";
import {
  FACTORY_QUALITY_DEFAULTS,
  FACTORY_EXCLUSION_DEFAULTS,
} from "@gnomad-cf/core/types";

interface QualityStoreState {
  defaults: QualitySettings;
  exclusionDefaults: QualityExclusionConfig;
}

export const useQualityStore = defineStore("quality-settings", {
  state: (): QualityStoreState => ({
    defaults: { ...FACTORY_QUALITY_DEFAULTS },
    exclusionDefaults: { ...FACTORY_EXCLUSION_DEFAULTS },
  }),

  actions: {
    /**
     * Merge partial updates into quality settings defaults
     */
    setDefaults(partial: Partial<QualitySettings>) {
      this.defaults = { ...this.defaults, ...partial };
    },

    /**
     * Merge partial updates into quality exclusion config defaults
     */
    setExclusionDefaults(partial: Partial<QualityExclusionConfig>) {
      this.exclusionDefaults = { ...this.exclusionDefaults, ...partial };
    },

    /**
     * Reset both quality settings and exclusion config to factory defaults
     */
    resetToFactoryDefaults() {
      this.defaults = { ...FACTORY_QUALITY_DEFAULTS };
      this.exclusionDefaults = { ...FACTORY_EXCLUSION_DEFAULTS };
    },
  },

  persist: {
    key: "carrier-freq-quality",
    storage: localStorage,
  },
});
