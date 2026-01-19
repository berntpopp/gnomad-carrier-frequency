import { defineStore } from 'pinia';
import type {
  ClingenCacheState,
  ClingenEntry,
  ClingenValidityResult,
} from '@/types';
import { CLINGEN_CACHE_EXPIRY_MS } from '@/types';

export const useClingenStore = defineStore('clingen', {
  state: (): ClingenCacheState => ({
    data: null,
    lastFetched: null,
    error: null,
  }),

  getters: {
    /**
     * Check if cache is expired (> 30 days old) or missing
     */
    isExpired: (state): boolean => {
      if (!state.lastFetched || !state.data) return true;
      return Date.now() - state.lastFetched > CLINGEN_CACHE_EXPIRY_MS;
    },

    /**
     * Check if cache has data (regardless of expiry)
     */
    hasData: (state): boolean => {
      return state.data !== null && state.data.length > 0;
    },

    /**
     * Get human-readable cache age
     */
    cacheAge: (state): string => {
      if (!state.lastFetched) return 'Never fetched';
      const days = Math.floor(
        (Date.now() - state.lastFetched) / (24 * 60 * 60 * 1000)
      );
      if (days === 0) return 'Today';
      if (days === 1) return '1 day ago';
      return `${days} days ago`;
    },

    /**
     * Total number of entries in cache
     */
    entryCount: (state): number => {
      return state.data?.length ?? 0;
    },
  },

  actions: {
    /**
     * Set cache data with timestamp
     */
    setData(entries: ClingenEntry[]) {
      this.data = entries;
      this.lastFetched = Date.now();
      this.error = null;
    },

    /**
     * Set error state
     */
    setError(message: string) {
      this.error = message;
    },

    /**
     * Clear cache (for manual refresh)
     */
    clearCache() {
      this.data = null;
      this.lastFetched = null;
      this.error = null;
    },

    /**
     * Look up gene validity in cached data
     */
    getGeneValidity(geneSymbol: string): ClingenValidityResult {
      if (!this.data) {
        return {
          found: false,
          hasAutosomalRecessive: false,
          entries: [],
          arEntries: [],
        };
      }

      const normalizedSymbol = geneSymbol.toUpperCase().trim();
      const entries = this.data.filter(
        (e) => e.geneSymbol.toUpperCase() === normalizedSymbol
      );

      // Check for AR inheritance patterns
      const arEntries = entries.filter((e) => {
        const moi = e.moi.toLowerCase();
        return moi.includes('recessive') || moi === 'ar';
      });

      return {
        found: entries.length > 0,
        hasAutosomalRecessive: arEntries.length > 0,
        entries,
        arEntries,
      };
    },
  },

  persist: {
    key: 'clingen-cache',
    storage: localStorage,
  },
});
