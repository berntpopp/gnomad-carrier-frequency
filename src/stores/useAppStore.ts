import { defineStore } from 'pinia';

interface AppStoreState {
  disclaimerAcknowledged: boolean;
  disclaimerAcknowledgedAt: number | null; // Unix timestamp
}

export const useAppStore = defineStore('app', {
  state: (): AppStoreState => ({
    disclaimerAcknowledged: false,
    disclaimerAcknowledgedAt: null,
  }),

  getters: {
    /**
     * Check if disclaimer should be shown
     * Show if not acknowledged
     */
    shouldShowDisclaimer: (state): boolean => {
      return !state.disclaimerAcknowledged;
    },

    /**
     * Get human-readable acknowledgment date
     */
    acknowledgedDate: (state): string | null => {
      if (!state.disclaimerAcknowledgedAt) return null;
      return new Date(state.disclaimerAcknowledgedAt).toLocaleDateString();
    },
  },

  actions: {
    /**
     * Mark disclaimer as acknowledged
     */
    acknowledgeDisclaimer() {
      this.disclaimerAcknowledged = true;
      this.disclaimerAcknowledgedAt = Date.now();
    },

    /**
     * Reset disclaimer (for testing or re-showing)
     */
    resetDisclaimer() {
      this.disclaimerAcknowledged = false;
      this.disclaimerAcknowledgedAt = null;
    },
  },

  persist: {
    key: 'carrier-freq-app',
    storage: localStorage,
  },
});
