import { defineStore } from 'pinia';

interface AppStoreState {
  disclaimerAcknowledged: boolean;
  disclaimerAcknowledgedAt: number | null; // Unix timestamp
  onboardingDismissed: boolean;
}

export const useAppStore = defineStore('app', {
  state: (): AppStoreState => ({
    disclaimerAcknowledged: false,
    disclaimerAcknowledgedAt: null,
    onboardingDismissed: false,
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

    /**
     * Show welcome onboarding card only after disclaimer accepted and not yet dismissed.
     * Ensures first-time users get guided entry after accepting the disclaimer.
     */
    shouldShowOnboarding: (state): boolean => {
      return state.disclaimerAcknowledged === true && state.onboardingDismissed === false;
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

    /**
     * Dismiss the onboarding welcome card permanently.
     * Persisted to localStorage so returning users never see it again.
     */
    dismissOnboarding() {
      this.onboardingDismissed = true;
    },
  },

  persist: {
    key: 'carrier-freq-app',
    storage: localStorage,
  },
});
